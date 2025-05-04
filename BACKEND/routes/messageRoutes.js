import express from "express";
import multer from "multer";
import protectRoute from "../middlewares/protectRoute.js";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import {
  sendMessage,
  getConversation,
  markConversationRead,
  getThreads,
} from "../controllers/messageController.js";

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Cloudinary storage configuration
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "verse_uploads", // All uploads will go into the 'verse_uploads' folder
    resource_type: "auto",   // Auto-detect the resource type (image/video)
    public_id: (req, file) =>
      `${Date.now()}-${file.originalname.replace(/\.[^/.]+$/, "")}`, // Prevent overwriting of files
  },
});

const upload = multer({ storage });

const router = express.Router();

// GET /api/messages/threads - Get conversation threads
router.get("/threads", protectRoute, getThreads);

// POST /api/messages - Send a new message
router.post("/", protectRoute, upload.single("file"), sendMessage);

// GET /api/messages/conversation/:userId - Get conversation with a given user
router.get("/conversation/:userId", protectRoute, getConversation);

// PUT /api/messages/conversation/:userId/read - Mark conversation messages as read
router.put("/conversation/:userId/read", protectRoute, markConversationRead);

export default router;
