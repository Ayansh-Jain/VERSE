// controllers/postController.js

import Post from "../Models/postModel.js";
import User from "../Models/userModel.js";
import { transformUrl } from "../middlewares/Cloudinary.js";  // ensure this path is correct

/**
 * Create a new post (image or video).
 * Uploaded via Cloudinary; we store the raw URL in MongoDB,
 * then transform it before returning to the client.
 */
export const createPost = async (req, res) => {
  try {
    const { text } = req.body;
    const imgUrl = req.file ? req.file.path : null;

    // Save raw URL
    const newPost = new Post({
      postedBy: req.user._id,
      text,
      img: imgUrl,
    });
    await newPost.save();

    // Add post ID to user's posts array
    await User.findByIdAndUpdate(req.user._id, {
      $push: { posts: newPost._id },
    });

    // Prepare return object
    const returned = newPost.toObject();
    if (returned.img) {
      returned.img = transformUrl(returned.img);
    }

    res.status(201).json(returned);
  } catch (error) {
    console.error("createPost error:", error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Fetch paginated feed:
 *  - First posts by users you follow,
 *  - Then fill the remainder with posts by others.
 * Uses skip/limit + .lean() for performance.
 * Transforms each img URL before returning.
 */
export const getFeed = async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page, 10)  || 1);
    const limit = Math.min(50, parseInt(req.query.limit, 10) || 10);
    const skip  = (page - 1) * limit;

    // Build list of followed user IDs (strings)
    const feedUsers = req.user.following.map(String);
    feedUsers.push(String(req.user._id));

    // Count how many posts by followed users exist
    const totalFollowingPosts = await Post.countDocuments({
      postedBy: { $in: feedUsers }
    });

    // Query posts by followed users
    const followingPosts = await Post.find({
      postedBy: { $in: feedUsers }
    })
      .select("text img likes postedBy createdAt")
      .populate("postedBy", "username profilePic")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    let posts = followingPosts;

    // If not enough, fetch posts from non-followed users
    if (followingPosts.length < limit) {
      const nonFollowSkip = Math.max(0, skip - totalFollowingPosts);
      const nonFollowLimit = limit - followingPosts.length;

      const nonFollowingPosts = await Post.find({
        postedBy: { $nin: feedUsers }
      })
        .select("text img likes postedBy createdAt")
        .populate("postedBy", "username profilePic")
        .sort({ createdAt: -1 })
        .skip(nonFollowSkip)
        .limit(nonFollowLimit)
        .lean();

      posts = posts.concat(nonFollowingPosts);
    }

    // Transform each img URL
    const transformed = posts.map((p) => {
      if (p.img) {
        return { ...p, img: transformUrl(p.img) };
      }
      return p;
    });

    return res.status(200).json(transformed);
  } catch (error) {
    console.error("getFeed error:", error);
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Toggle like/unlike on a post.
 */
export const likePost = async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user._id;

    // Fetch post (lean for speed)
    const post = await Post.findById(postId).lean();
    if (!post) {
      return res.status(404).json({ message: "Post not found." });
    }

    const hasLiked = post.likes.some((id) => id.toString() === userId.toString());
    const update = hasLiked
      ? { $pull:   { likes: userId } }
      : { $addToSet:{ likes: userId } };

    const updated = await Post.findByIdAndUpdate(postId, update, { new: true })
      .select("likes")
      .lean();

    return res.status(200).json({
      message: hasLiked ? "Post unliked." : "Post liked.",
      likes: updated.likes
    });
  } catch (error) {
    console.error("likePost error:", error);
    return res.status(500).json({ message: error.message });
  }
};
