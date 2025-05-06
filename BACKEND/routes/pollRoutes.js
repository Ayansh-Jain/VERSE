// routes/pollRoutes.js
import express from "express";
import protectRoute from "../middlewares/protectRoute.js";
import upload from "../middlewares/uploadCloudinary.js"; // Updated middleware with file validation
import {
  createPoll,
  updatePollSubmission,
  votePoll,
  getPolls,
  getPollById,
  finalizePoll,
  cancelPoll,
} from "../controllers/pollController.js";

const router = express.Router();

// Create a new challenge; challenger's image under "challengerSubmission"
router.post(
  "/",
  protectRoute,
  upload.single("challengerSubmission"),   // now Cloudinary
  createPoll
);

// Update challenged user's submission
router.put(
  "/:pollId/submission",
  protectRoute,
  upload.single("challengedSubmission"),   // now Cloudinary
  updatePollSubmission
);

// Vote on a challenge
router.put("/:pollId/vote", protectRoute, votePoll);

// Finalize a challenge
router.put("/:pollId/finalize", protectRoute, finalizePoll);

// Cancel a pending challenge
router.delete("/cancel", protectRoute, cancelPoll);

// Get all challenges
router.get("/", protectRoute, getPolls);

// Get a specific challenge by id
router.get("/:pollId", protectRoute, getPollById);

export default router;
