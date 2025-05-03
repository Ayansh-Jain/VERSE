// src/routes/postRoutes.js
import express from "express"; 
import { createPost, uploadPostImage, getFeed, likePost } from "../controllers/postController.js";
import protectRoute from "../middlewares/protectRoute.js";

const router = express.Router();

router.post("/", protectRoute, uploadPostImage, createPost);
router.get("/feed", protectRoute, getFeed);
router.put("/like/:id", protectRoute, likePost);

export default router;
