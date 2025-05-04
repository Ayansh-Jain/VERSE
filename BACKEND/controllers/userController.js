// controllers/userController.js
import User from "../Models/userModel.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES = "20d";

// Get the currently authenticated user
export const getCurrentUser = async (req, res) => {
  try {
    const me = await User.findById(req.user._id)
      .select("-password")
      .populate("followers", "username profilePic")
      .populate("following", "username profilePic")
      .populate({ path: "posts", select: "img text" });

    if (!me) {
      return res.status(404).json({ message: "User not found." });
    }
    res.status(200).json(me);
  } catch (err) {
    console.error("getCurrentUser error:", err);
    res.status(500).json({ message: "Server error." });
  }
};

// Get any user by ID
export const getUserById = async (req, res) => {
  try {
    const userFound = await User.findById(req.params.id)
      .select("-password")
      .populate("followers", "username profilePic")
      .populate("following", "username profilePic")
      .populate({ path: "posts", select: "img text" });

    if (!userFound) {
      return res.status(404).json({ message: "User not found." });
    }
    res.status(200).json(userFound);
  } catch (err) {
    console.error("getUserById error:", err);
    res.status(500).json({ message: err.message });
  }
};

// Update profile picture, bio, organization, skills
export const updateProfilePicture = async (req, res) => {
  try {
    console.log("🔍 REQ.FILE:", req.file);
    const userId = req.params.id;
    if (userId !== req.user._id.toString()) {
      return res.status(403).json({ message: "Unauthorized." });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Cloudinary URL if uploaded
    if (req.file) {
      user.profilePic = req.file.path;
    }
    if (req.body.bio !== undefined) {
      user.bio = req.body.bio;
    }
    if (req.body.organization !== undefined) {
      user.organization = req.body.organization;
    }
    if (req.body.skills !== undefined) {
      // Expecting a JSON-stringified array
      user.skills = JSON.parse(req.body.skills);
    }

    await user.save();

    // Return updated user (without password)
    const updated = await User.findById(userId)
      .select("-password")
      .populate("followers", "username profilePic")
      .populate("following", "username profilePic")
      .populate({ path: "posts", select: "img text" });

    res.status(200).json(updated);
  } catch (err) {
    console.error("updateProfilePicture error:", err);
    res.status(500).json({ message: err.message });
  }
};

// Sign up a new user
export const signup = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res
        .status(400)
        .json({ message: "Username, email, and password are required." });
    }

    if (await User.findOne({ email })) {
      return res
        .status(400)
        .json({ message: "User with this email already exists." });
    }

    // Create with raw password; pre-save hook will hash it once
    const newUser = await User.create({ username, email, password });

    const token = jwt.sign({ id: newUser._id }, JWT_SECRET, { expiresIn: JWT_EXPIRES });

    res.status(201).json({
      token,
      user: {
        _id:       newUser._id,
        username:  newUser.username,
        email:     newUser.email,
        profilePic:newUser.profilePic,
        followers: newUser.followers,
        following: newUser.following,
      },
    });
  } catch (err) {
    console.error("signup error:", err);
    res.status(500).json({ message: "Server error during signup." });
  }
};

// Log in
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required." });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(401)
        .json({ message: "Invalid email or password." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res
        .status(401)
        .json({ message: "Invalid email or password." });
    }

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: JWT_EXPIRES });

    res.status(200).json({
      token,
      user: {
        _id:       user._id,
        username:  user.username,
        email:     user.email,
        profilePic:user.profilePic,
        followers: user.followers,
        following: user.following,
      },
    });
  } catch (err) {
    console.error("login error:", err);
    res.status(500).json({ message: "Server error during login." });
  }
};

// Logout (client-side only)
export const logout = async (req, res) => {
  res.status(200).json({ message: "Logged out successfully." });
};

// Follow / Unfollow a user
export const followUser = async (req, res) => {
  try {
    const targetUser  = await User.findById(req.params.id);
    const currentUser = await User.findById(req.user._id);

    if (!targetUser) {
      return res.status(404).json({ message: "User not found." });
    }

    const isFollowing = currentUser.following.includes(targetUser._id);
    if (isFollowing) {
      currentUser.following.pull(targetUser._id);
      targetUser.followers.pull(currentUser._id);
    } else {
      currentUser.following.push(targetUser._id);
      targetUser.followers.push(currentUser._id);
    }

    await currentUser.save();
    await targetUser.save();

    res.status(200).json({
      message: isFollowing ? "Unfollowed successfully." : "Followed successfully.",
    });
  } catch (err) {
    console.error("followUser error:", err);
    res.status(500).json({ message: "Server error during follow/unfollow." });
  }
};
