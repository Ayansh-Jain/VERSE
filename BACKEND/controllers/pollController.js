import mongoose from "mongoose";
import Poll from "../Models/pollModel.js";
import User from "../Models/userModel.js";

/**
 * Create a new challenge.
 */
export const createPoll = async (req, res) => {
  try {
    let { category } = req.body;
    if (!category) {
      return res.status(400).json({ message: "Category is required." });
    }
    const normalizedCategory = category.trim().toLowerCase();

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found." });
    if (user.versePoints < 10) {
      return res.status(400).json({ message: "Not enough versePoints to challenge." });
    }

    // Daily limit check
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const challengeCount = await Poll.countDocuments({
      challenger: user._id,
      createdAt: { $gte: startOfDay },
    });
    const maxChallenges = 3;
    if (challengeCount >= maxChallenges) {
      return res.status(400).json({ message: "Maximum 3 challenges per day reached." });
    }
    const attemptsLeft = maxChallenges - challengeCount - 1;

    // Look for a pending match in last 24h
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const existingChallenge = await Poll.findOne({
      category: normalizedCategory,
      status: "pending",
      challenger: { $ne: user._id },
      createdAt: { $gte: twentyFourHoursAgo },
    });

    // Use Cloudinary URL if file was uploaded
    const currentUserSubmission = req.file ? req.file.path : "";

    if (existingChallenge) {
      const challengedUser = await User.findById(existingChallenge.challenger);
      if (!challengedUser) {
        await Poll.findByIdAndDelete(existingChallenge._id);
        return res.status(404).json({ message: "Original challenger not found." });
      }

      // Deduct points
      user.versePoints -= 10;
      challengedUser.versePoints -= 10;
      await user.save();
      await challengedUser.save();

      existingChallenge.challenged = user._id;
      existingChallenge.opponentImage = currentUserSubmission;
      existingChallenge.status = currentUserSubmission ? "closed" : "open";
      await existingChallenge.save();

      return res.status(200).json({
        message: "Challenge matched! You can now vote.",
        challenge: existingChallenge,
        attemptsLeft,
      });
    } else {
      // Create new pending
      user.versePoints -= 10;
      await user.save();

      const newChallenge = new Poll({
        category: normalizedCategory,
        challenger: user._id,
        challenged: null,
        challengerSubmission: currentUserSubmission,
        opponentImage: "",
        status: "pending",
      });
      await newChallenge.save();

      return res.status(201).json({
        message: "Challenge created. You will be notified when matched.",
        challenge: newChallenge,
        attemptsLeft,
      });
    }
  } catch (error) {
    console.error("createPoll error:", error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Update challenged user's submission.
 */
export const updatePollSubmission = async (req, res) => {
  try {
    const { pollId } = req.params;
    const poll = await Poll.findById(pollId);
    if (!poll) return res.status(404).json({ message: "Challenge not found." });

    if (poll.challenged.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized to submit to this challenge." });
    }

    if (req.file) {
      poll.opponentImage = req.file.path;
      poll.status = "closed";
    }
    await poll.save();

    res.status(200).json({ message: "Submission updated.", challenge: poll });
  } catch (error) {
    console.error("updatePollSubmission error:", error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Vote on a challenge.
 */
export const votePoll = async (req, res) => {
  try {
    const { pollId } = req.params;
    const { option } = req.body;
    if (!["challenger", "challenged"].includes(option)) {
      return res.status(400).json({ message: "Invalid vote option." });
    }

    const poll = await Poll.findById(pollId);
    if (!poll) return res.status(404).json({ message: "Challenge not found." });

    // Prevent self-vote
    if (
      poll.challenger.toString() === req.user._id.toString() ||
      (poll.challenged && poll.challenged.toString() === req.user._id.toString())
    ) {
      return res.status(400).json({ message: "You cannot vote on your own challenge." });
    }

    // One vote per user
    if (poll.votes.some((v) => v.voter.toString() === req.user._id.toString())) {
      return res.status(400).json({ message: "You have already voted on this challenge." });
    }
    poll.votes.push({ voter: req.user._id, option });
    await poll.save();

    // Award voting points (max 10/day)
    const user = await User.findById(req.user._id);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (!user.lastVoteDate || new Date(user.lastVoteDate) < today) {
      user.votePointsEarnedToday = 0;
      user.lastVoteDate = new Date();
    }
    let message = "Vote counted!";
    if (user.votePointsEarnedToday < 10) {
      user.versePoints += 1;
      user.votePointsEarnedToday += 1;
      await user.save();
      message += " You earned 1 versePoint.";
    } else {
      message += " (Daily limit reached.)";
    }

    res.status(200).json({
      message,
      votes: poll.votes,
      hasVoted: true,
    });
  } catch (error) {
    console.error("votePoll error:", error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Finalize challenge.
 */
export const finalizePoll = async (req, res) => {
  try {
    const { pollId } = req.params;
    const poll = await Poll.findById(pollId)
      .populate("challenger challenged", "username versePoints");
    if (!poll) return res.status(404).json({ message: "Challenge not found." });
    if (poll.finalized) {
      return res.status(400).json({ message: "Challenge already finalized." });
    }
    if (poll.status !== "closed") {
      return res.status(400).json({ message: "Challenge is still open." });
    }

    const challengerVotes = poll.votes.filter((v) => v.option === "challenger").length;
    const challengedVotes = poll.votes.filter((v) => v.option === "challenged").length;
    let winnerUser = null;
    if (challengerVotes > challengedVotes) winnerUser = poll.challenger;
    else if (challengedVotes > challengerVotes) winnerUser = poll.challenged;

    if (winnerUser) {
      const wu = await User.findById(winnerUser._id);
      wu.versePoints += 10;
      await wu.save();
    }

    poll.finalized = true;
    await poll.save();

    res.status(200).json({ message: "Challenge finalized.", challenge: poll });
  } catch (error) {
    console.error("finalizePoll error:", error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Cancel a pending challenge.
 */
export const cancelPoll = async (req, res) => {
  try {
    const poll = await Poll.findOne({
      challenger: req.user._id,
      status: "pending",
    });
    if (!poll) {
      return res.status(404).json({ message: "No pending challenge to cancel." });
    }

    const user = await User.findById(req.user._id);
    user.versePoints += 10;
    await user.save();

    await Poll.findByIdAndDelete(poll._id);
    res.status(200).json({
      message: "Challenge cancelled successfully. 10 versePoints refunded.",
    });
  } catch (error) {
    console.error("cancelPoll error:", error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Get all polls.
 */
export const getPolls = async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const allPolls = await Poll.find()
      .populate("challenger", "username profilePic versePoints")
      .populate("challenged", "username profilePic versePoints")
      .sort({ createdAt: -1 });

    const active = allPolls.filter(
      (p) =>
        (p.status === "open" || p.status === "closed") &&
        new Date(p.createdAt) >= twentyFourHoursAgo
    );
    const pending = allPolls.filter((p) => p.status === "pending");
    const past = allPolls.filter(
      (p) =>
        (p.challenger && p.challenger._id.toString() === userId) ||
        (p.challenged && p.challenged._id.toString() === userId)
    );

    active.forEach((p) => {
      p._doc.hasVoted = p.votes.some((v) => v.voter.toString() === userId);
    });
    past.forEach((p) => {
      p._doc.hasVoted = p.votes.some((v) => v.voter.toString() === userId);
    });

    res.status(200).json({ active, pending, past });
  } catch (error) {
    console.error("getPolls error:", error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Get a single poll by ID.
 */
export const getPollById = async (req, res) => {
  try {
    const poll = await Poll.findById(req.params.pollId)
      .populate("challenger", "username profilePic versePoints")
      .populate("challenged", "username profilePic versePoints");
    if (!poll) return res.status(404).json({ message: "Challenge not found." });

    poll._doc.hasVoted = poll.votes.some(
      (v) => v.voter.toString() === req.user._id.toString()
    );

    res.status(200).json(poll);
  } catch (error) {
    console.error("getPollById error:", error);
    res.status(500).json({ message: error.message });
  }
};
