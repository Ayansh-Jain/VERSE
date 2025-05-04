//Routes/messageRoutes.js
import express from "express";
import multer from "multer";
import protectRoute from "../middlewares/protectRoute.js";
import { 
  sendMessage, 
  getConversation, 
  markConversationRead, 
  getThreads 
} from "../controllers/messageController.js";

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "public/uploads/"),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
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
