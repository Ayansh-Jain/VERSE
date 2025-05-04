//controllers/pollController.js
import mongoose from "mongoose";
import Poll from "../Models/pollModel.js";
import User from "../Models/userModel.js";

/**
 * Create a new challenge.
 * - Checks if the user has reached the daily limit (3 challenges).
 * - Searches for an existing pending challenge with the same normalized category (same skill).
 * - If found, matches automatically and deducts versePoints from both users.
 * - Otherwise, creates a new pending challenge and deducts from initiator.
 * - Returns the remaining attempts.
 */
export const createPoll = async (req, res) => {
  try {
    let { category } = req.body;
    if (!category) {
      return res.status(400).json({ message: "Category is required." });
    }
    // Normalize category to ensure consistent matching
    const normalizedCategory = category.trim().toLowerCase();

    const user = await User.findById(req.user._id);
    if (!user)
      return res.status(404).json({ message: "User not found." });
    if (user.versePoints < 10) {
      return res.status(400).json({ message: "Not enough versePoints to challenge." });
    }

    // Check daily challenge count (max 3 per day)
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
    const attemptsLeft = maxChallenges - challengeCount - 1; // Subtract 1 to account for the new challenge

    // Only consider pending challenges from the last 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Look for an existing pending challenge with the same normalized category (same skill),
    // not created by the current user, and created within the last 24 hours.
    const existingChallenge = await Poll.findOne({
      category: normalizedCategory,
      status: "pending",
      challenger: { $ne: user._id },
      createdAt: { $gte: twentyFourHoursAgo }
    });

    const currentUserSubmission = req.file ? `/uploads/${req.file.filename}` : "";

    if (existingChallenge) {
      // Match found: update the pending challenge with the current user as challenged.
      
      // Check if the challenger of the existing challenge has reached their daily limit
      const challengedUser = await User.findById(existingChallenge.challenger);
      if (!challengedUser) {
        // If challenger no longer exists, remove the pending challenge
        await Poll.findByIdAndDelete(existingChallenge._id);
        return res.status(404).json({ message: "Original challenger not found." });
      }
      
      // Deduct versePoints from both users
      user.versePoints -= 10;
      challengedUser.versePoints -= 10;
      
      await user.save();
      await challengedUser.save();
      
      existingChallenge.challenged = user._id;
      existingChallenge.opponentImage = currentUserSubmission;
      // If the new challenger provided a submission, mark as "closed"; otherwise, mark as "open".
      existingChallenge.status = currentUserSubmission ? "closed" : "open";
      await existingChallenge.save();
      
      return res.status(200).json({
        message: "Challenge matched! You can now vote.",
        challenge: existingChallenge,
        attemptsLeft,
      });
    } else {
      // No match found: create a new pending challenge.
      // Deduct versePoints from the challenger only at this point
      user.versePoints -= 10;
      await user.save();
      
      const newChallenge = new Poll({
        category: normalizedCategory,
        challenger: user._id,
        challenged: null, // No opponent yet
        challengerSubmission: currentUserSubmission,
        opponentImage: "",
        status: "pending"
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
    
    // Check if the current user is indeed the challenged person
    if (poll.challenged.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "You are not authorized to submit to this challenge." });
    }
    
    if (req.file) {
      poll.opponentImage = `/uploads/${req.file.filename}`;
      poll.status = "closed";
    }
    await poll.save();
    res.status(200).json({ message: "Submission updated.", challenge: poll });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Vote on a challenge.
 * Also awards 1 verse point per vote (max 10 per day) to the voter.
 * Ensures a user can only vote once per challenge.
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
    
    // Check if user is trying to vote on their own challenge
    if (poll.challenger.toString() === req.user._id.toString() || 
        (poll.challenged && poll.challenged.toString() === req.user._id.toString())) {
      return res.status(400).json({ message: "You cannot vote on your own challenge." });
    }
    
    // Check if user has already voted
    const existingVoteIndex = poll.votes.findIndex(
      (v) => v.voter.toString() === req.user._id.toString()
    );
    
    if (existingVoteIndex !== -1) {
      return res.status(400).json({ message: "You have already voted on this challenge." });
    } else {
      // Add the new vote
      poll.votes.push({ voter: req.user._id, option });
    }
    
    await poll.save();

    // Award vote points (max 10 per day)
    const user = await User.findById(req.user._id);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (!user.lastVoteDate || new Date(user.lastVoteDate) < today) {
      user.votePointsEarnedToday = 0;
      user.lastVoteDate = new Date();
    }
    if (user.votePointsEarnedToday < 10) {
      user.versePoints += 1;
      user.votePointsEarnedToday += 1;
      await user.save();
      res.status(200).json({ 
        message: "Vote counted! You earned 1 versePoint.", 
        votes: poll.votes,
        hasVoted: true 
      });
    } else {
      res.status(200).json({ 
        message: "Vote counted! (Daily limit of 10 versePoints reached)", 
        votes: poll.votes,
        hasVoted: true
      });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Finalize challenge: Determine the winner and award the winner 10 verse points.
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
    const challengerVotes = poll.votes.filter(v => v.option === "challenger").length;
    const challengedVotes = poll.votes.filter(v => v.option === "challenged").length;
    let winner = null;
    if (challengerVotes > challengedVotes) {
      winner = poll.challenger;
    } else if (challengedVotes > challengerVotes) {
      winner = poll.challenged;
    }
    if (winner) {
      const winnerUser = await User.findById(winner._id);
      winnerUser.versePoints += 10;
      await winnerUser.save();
    }
    poll.finalized = true;
    await poll.save();
    res.status(200).json({ message: "Challenge finalized.", challenge: poll });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Cancel a pending challenge.
 * Returns the 10 versePoints to the user.
 */
export const cancelPoll = async (req, res) => {
  try {
    const poll = await Poll.findOne({
      challenger: req.user._id,
      status: "pending"
    });
    if (!poll) {
      return res.status(404).json({ message: "No pending challenge found to cancel." });
    }
    
    // Return the versePoints to the user
    const user = await User.findById(req.user._id);
    user.versePoints += 10;
    await user.save();
    
    await Poll.findByIdAndDelete(poll._id);
    res.status(200).json({ message: "Challenge cancelled successfully. 10 versePoints refunded." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};



export const getPolls = async (req, res) => {
  try {
    const userId = req.user._id;
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    // Get all polls
    let allPolls = await Poll.find()
      .populate("challenger", "username profilePic versePoints")
      .populate("challenged", "username profilePic versePoints")
      .sort({ createdAt: -1 });
    
    // Filter active polls (open or closed, less than 24 hours old)
    const activePolls = allPolls.filter(poll => 
      (poll.status === "open" || poll.status === "closed") && 
      new Date(poll.createdAt) >= twentyFourHoursAgo
    );
    
    // Filter pending polls (waiting for match)
    const pendingPolls = allPolls.filter(poll => poll.status === "pending");
    
    // Filter past polls (including currently ongoing polls) where user participated
    const pastPolls = allPolls.filter(poll => 
      // Include all polls (active, closed, or finalized) where user participated
      (poll.challenger && poll.challenger._id && poll.challenger._id.toString() === userId.toString()) || 
      (poll.challenged && poll.challenged._id && poll.challenged._id.toString() === userId.toString())
    );
    
    // Mark if the current user has voted on each poll
    if (userId) {
      activePolls.forEach(poll => {
        poll._doc.hasVoted = poll.votes.some(v => v.voter.toString() === userId.toString());
      });
      pastPolls.forEach(poll => {
        poll._doc.hasVoted = poll.votes.some(v => v.voter.toString() === userId.toString());
      });
    }
    
    res.status(200).json({ 
      active: activePolls, 
      pending: pendingPolls,
      past: pastPolls
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getPollById = async (req, res) => {
  try {
    const poll = await Poll.findById(req.params.pollId)
      .populate("challenger", "username profilePic versePoints")
      .populate("challenged", "username profilePic versePoints");
    if (!poll) return res.status(404).json({ message: "Challenge not found." });
    
    // Add hasVoted flag for the current user
    if (req.user) {
      poll._doc.hasVoted = poll.votes.some(v => v.voter.toString() === req.user._id.toString());
    }
    
    res.status(200).json(poll);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};