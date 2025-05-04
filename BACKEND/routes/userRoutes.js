// src/routes/userRoutes.js
import express from "express";
import User from "../Models/userModel.js"; 
import {
  getUserById,
  getCurrentUser,
  signup,
  login,
  logout,
  uploadProfilePic,
  updateProfilePicture,
  followUser,
} from "../controllers/userController.js";
import protectRoute from "../middlewares/protectRoute.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);
router.get("/me", protectRoute, getCurrentUser);
router.get("/:id", protectRoute, getUserById);
router.put("/:id/update-profile", protectRoute, uploadProfilePic, updateProfilePicture);
router.put("/:id/follow", protectRoute, followUser);
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
