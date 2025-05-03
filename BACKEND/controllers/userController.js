// src/controllers/userController.js
import User from "../Models/userModel.js";
import upload from "../middlewares/upload.js";
import bcrypt from "bcrypt";
import generateTokenAndSetCookie from "../generateTokenAndSetCookie.js";

// Multer middleware for profile picture upload
export const uploadProfilePic = upload.single("profilePic");

export const getCurrentUser = async (req, res) => {
  try {
    const me = await User.findById(req.user._id)
      .select("-password")
      .populate("followers", "username profilePic")
      .populate("following", "username profilePic")
      .populate({ path: "posts", select: "img text" });
    if (!me) return res.status(404).json({ message: "User not found." });
    return res.status(200).json(me);
  } catch (err) {
    console.error("getCurrentUser error:", err);
    return res.status(500).json({ message: "Server error." });
  }
};

export const getUserById = async (req, res) => {
  try {
    const userFound = await User.findById(req.params.id)
      .select("-password")
      .populate("followers", "username profilePic")
      .populate("following", "username profilePic")
      .populate({ path: "posts", select: "img text" });
    if (!userFound) return res.status(404).json({ message: "User not found." });
    return res.status(200).json(userFound);
  } catch (err) {
    console.error("getUserById error:", err);
    return res.status(500).json({ message: err.message });
  }
};

export const updateProfilePicture = async (req, res) => {
  try {
    if (req.params.id !== req.user._id.toString()) {
      return res.status(403).json({ message: "Unauthorized" });
    }
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found." });

    if (req.file) user.profilePic = `/uploads/${req.file.filename}`;
    if (req.body.bio !== undefined) user.bio = req.body.bio;
    if (req.body.organization !== undefined) user.organization = req.body.organization;
    if (req.body.skills !== undefined) user.skills = JSON.parse(req.body.skills);

    await user.save();
    const updatedUser = await User.findById(req.user._id)
      .select("-password")
      .populate("followers", "username profilePic")
      .populate("following", "username profilePic")
      .populate({ path: "posts", select: "img text" });

    return res.status(200).json(updatedUser);
  } catch (err) {
    console.error("updateProfilePicture error:", err);
    return res.status(500).json({ message: err.message });
  }
};

export const signup = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res
        .status(400)
        .json({ message: "Username, email, and password are required." });
    }
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res
        .status(400)
        .json({ message: "User with this email already exists." });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const newUser = new User({ username, email, password: hashedPassword });
    await newUser.save();

    const token = generateTokenAndSetCookie(newUser._id, res);
    return res.status(201).json({
      _id: newUser._id,
      username: newUser.username,
      email: newUser.email,
      profilePic: newUser.profilePic,
      followers: newUser.followers,
      following: newUser.following,
      token,
    });
  } catch (err) {
    console.error("signup error:", err);
    return res.status(500).json({ message: "Server error during signup." });
  }
};

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

    const token = generateTokenAndSetCookie(user._id, res);
    return res.status(200).json({
      _id: user._id,
      username: user.username,
      email: user.email,
      profilePic: user.profilePic,
      followers: user.followers,
      following: user.following,
      token,
    });
  } catch (err) {
    console.error("login error:", err);
    return res.status(500).json({ message: "Server error during login." });
  }
};

export const logout = (req, res) => {
  try {
    res.clearCookie("jwt");
    return res.status(200).json({ message: "Logged out successfully." });
  } catch (err) {
    console.error("logout error:", err);
    return res
      .status(500)
      .json({ message: "Server error during logout." });
  }
};

export const followUser = async (req, res) => {
  try {
    const targetUser = await User.findById(req.params.id);
    const currentUser = await User.findById(req.user._id);
    if (!targetUser)
      return res.status(404).json({ message: "User not found." });

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

    return res.status(200).json({
      message: isFollowing
        ? "Unfollowed successfully."
        : "Followed successfully.",
    });
  } catch (err) {
    console.error("followUser error:", err);
    return res
      .status(500)
      .json({ message: "Server error during follow/unfollow." });
  }
};
