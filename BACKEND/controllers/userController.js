import User from "../Models/userModel.js";
import upload from "../middlewares/upload.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import generateTokenAndSetCookie from "../generateTokenandSetCookie.js";

// Multer middleware for profile picture upload
export const uploadProfilePic = upload.single("profilePic");
export const getCurrentUser = async (req, res) => {
  try {
    // req.user._id is set by your protectRoute middleware
    const me = await User.findById(req.user._id)
      .select("-password")
      .populate("followers", "username profilePic")
      .populate("following", "username profilePic")
      .populate({
        path: "posts",
        select: "img text",
      });

    if (!me) {
      return res.status(404).json({ message: "User not found." });
    }

    res.status(200).json(me);
  } catch (err) {
    console.error("getCurrentUser error:", err);
    res.status(500).json({ message: "Server error." });
  }
};
export const getUserById = async (req, res) => {
  try {
    const userFound = await User.findById(req.params.id)
      .select("-password")
      .populate("followers", "username profilePic",)
      .populate({
        path: "posts",
        select: "img text", // Add any fields you want to include
      });
    if (!userFound) {
      return res.status(404).json({ message: "User not found." });
    }
    res.status(200).json(userFound);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// UPDATED: Update profile (profile picture, bio, organization, etc.)
export const updateProfilePicture = async (req, res) => {
  try {
    // Ensure that the authenticated user is updating their own profile.
    if (req.params.id !== req.user._id.toString()) {
      return res.status(403).json({ message: "Unauthorized" });
    }
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }
    // Update profile picture if provided.
    if (req.file) {
      user.profilePic = `/uploads/${req.file.filename}`;
    }
    // Update bio and organization if provided.
    if (req.body.bio !== undefined) {
      user.bio = req.body.bio;
    }
    if (req.body.organization !== undefined) {
      user.organization = req.body.organization;
    }
    // *** NEW: Update skills if provided.
    if (req.body.skills !== undefined) {
      user.skills = JSON.parse(req.body.skills);
    }
    await user.save();

    // Re-fetch the user with populated posts and followers.
    const updatedPopulatedUser = await User.findById(req.user._id)
      .select("-password")
      .populate("followers", "username profilePic")
      .populate({
        path: "posts",
        select: "img text", // Add any additional fields if needed.
      });

    res.status(200).json(updatedPopulatedUser);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const signup = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ message: "User with this email already exists." });

    const hashedPassword = await bcrypt.hash(password, 12);
    const newUser = new User({ username, email, password: hashedPassword });
    await newUser.save();

    // Generate token, set cookie, and include token in response
    generateTokenAndSetCookie(newUser._id, res);
    const token = jwt.sign(
      { _id: newUser._id, username: newUser.username, email: newUser.email },
      process.env.JWT_SECRET,
      { expiresIn: "10y" }
    );
    res.status(201).json({
      _id: newUser._id,
      username: newUser.username,
      email: newUser.email,
      profilePic: newUser.profilePic,
      followers: newUser.followers,
      following: newUser.following,
      token, // Include the token here
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user)
      return res.status(400).json({ message: "Invalid email or password." });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid email or password." });

    // Generate token, set cookie, and include token in response
    generateTokenAndSetCookie(user._id, res);
    const token = jwt.sign(
      { _id: user._id, username: user.username, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "10y" }
    );
    res.status(200).json({
      _id: user._id,
      username: user.username,
      email: user.email,
      profilePic: user.profilePic,
      followers: user.followers,
      following: user.following,
      token, // Include the token here
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const logout = (req, res) => {
  res.clearCookie("jwt");
  res.status(200).json({ message: "Logged out successfully." });
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
    res.status(200).json({ message: isFollowing ? "Unfollowed successfully." : "Followed successfully." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
