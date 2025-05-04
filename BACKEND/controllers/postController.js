//controllers/postController.js
import Post from "../Models/postModel.js";
import User from "../Models/userModel.js"; // Ensure you import User model
import upload from "../middlewares/upload.js";

// Multer middleware for post image upload
export const uploadPostImage = upload.single("img");

export const createPost = async (req, res) => {
  try {
    const { text } = req.body;
    const newPost = new Post({
      postedBy: req.user._id,
      text,
      img: req.file ? `/uploads/${req.file.filename}` : null
    });
    await newPost.save();

    // Add the new post's ID to the user's posts array
    await User.findByIdAndUpdate(req.user._id, { $push: { posts: newPost._id } });

    res.status(201).json(newPost);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Updated getFeed to include posts from following and non-following accounts
export const getFeed = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Get IDs of accounts the user follows and their own ID
    const feedUsers = req.user.following.map(id => id.toString());
    feedUsers.push(req.user._id.toString());

    // Fetch posts from following accounts
    const followingPosts = await Post.find({ postedBy: { $in: feedUsers } })
      .populate("postedBy", "username profilePic")
      .sort({ createdAt: -1 });

    // Fetch posts from non-following accounts
    const nonFollowingPosts = await Post.find({ postedBy: { $nin: feedUsers } })
      .populate("postedBy", "username profilePic")
      .sort({ createdAt: -1 });

    // Combine both sets of posts
    const allPosts = [...followingPosts, ...nonFollowingPosts];

    // Apply pagination manually
    const paginatedPosts = allPosts.slice(skip, skip + limit);

    res.status(200).json(paginatedPosts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


export const likePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post)
      return res.status(404).json({ message: "Post not found." });
    const userId = req.user._id;
    const isLiked = post.likes.some(id => id.toString() === userId.toString());
    const update = isLiked
      ? { $pull: { likes: userId } }
      : { $addToSet: { likes: userId } };

    const updatedPost = await Post.findByIdAndUpdate(req.params.id, update, { new: true });
    res.status(200).json({ message: "Post updated.", likes: updatedPost.likes });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
