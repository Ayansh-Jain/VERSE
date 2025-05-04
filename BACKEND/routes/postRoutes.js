import express from "express";
import protectRoute from "../middlewares/protectRoute.js";
import upload from "../middlewares/uploadCloudinary.js";  // NEW
import {
  createPost,
  getFeed,
  likePost,
} from "../controllers/postController.js";

const router = express.Router();

// Create a post with text + single image/video under field "img"
router.post("/", protectRoute, upload.single("img"), createPost);

// Get paginated feed
router.get("/feed", protectRoute, getFeed);

// Like/unlike a post
router.put("/like/:id", protectRoute, likePost);

export default router;
