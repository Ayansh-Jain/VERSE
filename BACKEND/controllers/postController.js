import Post from "../Models/postModel.js";
import User from "../Models/userModel.js";

// Create post — image/video upload field “img” via Cloudinary
export const createPost = async (req, res) => {
  try {
    const { text } = req.body;
    const imgUrl = req.file ? req.file.path : null;

    const newPost = new Post({
      postedBy: req.user._id,
      text,
      img: imgUrl,
    });
    await newPost.save();

    // Add post ID to user
    await User.findByIdAndUpdate(req.user._id, {
      $push: { posts: newPost._id },
    });

    res.status(201).json(newPost);
  } catch (error) {
    console.error("createPost error:", error);
    res.status(500).json({ message: error.message });
  }
};

// Fetch feed: posts by following first, then others
export const getFeed = async (req, res) => {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip  = (page - 1) * limit;

    const feedUsers = req.user.following.map((id) => id.toString());
    feedUsers.push(req.user._id.toString());

    const followingPosts = await Post.find({
      postedBy: { $in: feedUsers },
    })
      .populate("postedBy", "username profilePic")
      .sort({ createdAt: -1 });

    const nonFollowingPosts = await Post.find({
      postedBy: { $nin: feedUsers },
    })
      .populate("postedBy", "username profilePic")
      .sort({ createdAt: -1 });

    const allPosts = [...followingPosts, ...nonFollowingPosts];
    const paginated = allPosts.slice(skip, skip + limit);

    res.status(200).json(paginated);
  } catch (error) {
    console.error("getFeed error:", error);
    res.status(500).json({ message: error.message });
  }
};

// Like / Unlike a post
export const likePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: "Post not found." });
    }

    const userId = req.user._id;
    const isLiked = post.likes.some((id) => id.toString() === userId.toString());
    const update  = isLiked
      ? { $pull:   { likes: userId } }
      : { $addToSet: { likes: userId } };

    const updatedPost = await Post.findByIdAndUpdate(req.params.id, update, {
      new: true,
    });

    res.status(200).json({ message: "Post updated.", likes: updatedPost.likes });
  } catch (error) {
    console.error("likePost error:", error);
    res.status(500).json({ message: error.message });
  }
};