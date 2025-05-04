// routes/pollRoutes.js
import express from "express";
import multer from "multer";
import {
  createPoll,
  updatePollSubmission,
  votePoll,
  getPolls,
  getPollById,
  finalizePoll,
  cancelPoll,
} from "../controllers/pollController.js";
import protectRoute from "../middlewares/protectRoute.js";

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "public/uploads/"),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage });

const router = express.Router();

// Create a new challenge; challenger's image uploaded under "challengerSubmission"
router.post("/", protectRoute, upload.single("challengerSubmission"), createPoll);

// Update challenged user's submission; image uploaded under "challengedSubmission"
router.put("/:pollId/submission", protectRoute, upload.single("challengedSubmission"), updatePollSubmission);

// Vote on a challenge
router.put("/:pollId/vote", protectRoute, votePoll);

// Finalize a challenge (determine winner and award points)
router.put("/:pollId/finalize", protectRoute, finalizePoll);

// Cancel a pending challenge
router.delete("/cancel", protectRoute, cancelPoll);

// Get all challenges (active and pending from last 24 hours)
router.get("/", protectRoute, getPolls);

// Get a specific challenge by id
router.get("/:pollId", protectRoute, getPollById);

export default router;
