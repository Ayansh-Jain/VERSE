// routes/userRoutes.js
import express from "express";
import User from "../Models/userModel.js"; 
import {
  getUserById,
  getCurrentUser,
  signup,
  login,
  logout,
  updateProfilePicture,
  followUser,
} from "../controllers/userController.js";
import upload from "../middlewares/uploadCloudinary.js";
import protectRoute from "../middlewares/protectRoute.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);

// Get current logged-in user
router.get("/me", protectRoute, getCurrentUser);

// Get any user by ID
router.get("/:id", protectRoute, getUserById);

// Update profile picture (accepts image OR video, up to 50MB)
router.put(
  "/:id/update-profile",
  protectRoute,
  upload.single("profilePic"),
  updateProfilePicture
);

// Follow / unfollow a user
router.put("/:id/follow", protectRoute, followUser);

// List all users (excluding passwords)
router.get(
  "/",
  protectRoute,
  async (req, res) => {
    try {
      const users = await User.find().select("-password");
      return res.status(200).json(users);
    } catch (error) {
      console.error("getAllUsers error:", error);
      return res.status(500).json({ message: error.message });
    }
  }
);

export default router;
