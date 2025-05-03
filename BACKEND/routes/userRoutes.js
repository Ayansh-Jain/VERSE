// src/routes/userRoutes.js
import express from "express";
import User from "../Models/userModel.js"; // Import the User model!
import { getUserById, updateProfilePicture, uploadProfilePic, signup, login, logout, followUser,getCurrentUser } from "../controllers/userController.js";
import protectRoute from "../middlewares/protectRoute.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);
router.get("/me", protectRoute, getCurrentUser);

// Get a single user by ID (protected route)
router.get("/:id", protectRoute, getUserById);

// Update profile for a user (protected route)
// This route now updates profile picture, bio, and organization.
router.put("/:id/update-profile", protectRoute, uploadProfilePic, updateProfilePicture);

// Follow/Unfollow a user (protected route)
router.put("/:id/follow", protectRoute, followUser);

// NEW: Route to get all users (for suggestions)
router.get("/", async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
