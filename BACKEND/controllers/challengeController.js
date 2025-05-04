// controllers/challengeController.js
import mongoose from "mongoose";
import Challenge from "../Models/challengeModel.js";
import User from "../Models/userModel.js";

export const startChallenge = async (req, res) => {
  try {
    let { skill } = req.body;
    if (!skill) {
      return res.status(400).json({ message: "Skill is required." });
    }
    skill = skill.toLowerCase();

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "Challenger not found." });
    if (user.versePoints < 10) {
      return res.status(400).json({ message: "Not enough versePoints to challenge." });
    }

    // Daily limit
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const challengeCount = await Challenge.countDocuments({
      challenger: user._id,
      createdAt: { $gte: startOfDay },
    });
    const maxChallenges = 3;
    if (challengeCount >= maxChallenges) {
      return res.status(400).json({ message: "Maximum 3 challenges per day reached." });
    }

    // Find random opponent
    const searchOpponent = async (range) => {
      return await User.aggregate([
        {
          $match: {
            _id: { $ne: new mongoose.Types.ObjectId(user._id) },
            skills: { $in: [skill] },
            versePoints: { $gte: user.versePoints - range, $lte: user.versePoints + range },
          },
        },
        { $sample: { size: 1 } },
      ]);
    };

    let range = 10;
    let opponentResults = await searchOpponent(range);
    if (opponentResults.length === 0) {
      range = 20;
      opponentResults = await searchOpponent(range);
    }
    if (opponentResults.length === 0) {
      return res.status(404).json({ message: "No opponent found. Try again later." });
    }

    const opponent = await User.findById(opponentResults[0]._id);
    if (opponent.versePoints < 10) {
      return res.status(400).json({ message: "Selected opponent doesn't have enough versePoints." });
    }

    const opponentChallengeCount = await Challenge.countDocuments({
      opponent: opponent._id,
      createdAt: { $gte: startOfDay },
    });
    if (opponentChallengeCount >= maxChallenges) {
      return res.status(400).json({ message: "Selected opponent has reached maximum challenges for today." });
    }

    // Use Cloudinary URL if uploaded
    const challengerImage = req.file ? req.file.path : "";

    const newChallenge = new Challenge({
      skill,
      challenger: user._id,
      opponent:   opponent._id,
      challengerImage,
      opponentImage: "",
      status: "open",
    });

    // Deduct points
    user.versePoints     -= 10;
    opponent.versePoints -= 10;
    await user.save();
    await opponent.save();
    await newChallenge.save();

    const attemptsLeft = maxChallenges - challengeCount - 1;
    res.status(200).json({
      message: "Challenge started!",
      challenge: newChallenge,
      attemptsLeft,
    });
  } catch (error) {
    console.error("startChallenge error:", error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Submit opponent's image/video for a challenge.
 */
export const submitOpponentImage = async (req, res) => {
  try {
    const { challengeId } = req.body;
    const challenge = await Challenge.findById(challengeId);
    if (!challenge) return res.status(404).json({ message: "Challenge not found" });

    if (challenge.opponent.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Only the opponent can submit their image" });
    }

    // Use Cloudinary URL
    if (req.file) {
      challenge.opponentImage = req.file.path;
      challenge.status        = "closed";
      await challenge.save();
    }

    res.status(200).json({ message: "Image submitted", challenge });
  } catch (error) {
    console.error("submitOpponentImage error:", error);
    res.status(500).json({ message: error.message });
  }
};
/**
 * Vote on a challenge.
 * Earns 1 versePoint per vote (max 10 per day) for the voter.
 * Each user can only vote once per challenge.
 */
export const voteChallenge = async (req, res) => {
  try {
    const { challengeId, voteFor } = req.body;
    const userId = req.user._id;
    
    const challenge = await Challenge.findById(challengeId);
    if (!challenge) return res.status(404).json({ message: "Challenge not found" });

    // Check if user has already voted on this challenge
    const hasVoted = challenge.voters.includes(userId.toString());
    if (hasVoted) {
      return res.status(400).json({ message: "You have already voted on this challenge" });
    }

    // Add the vote
    if (voteFor === "challenger") {
      challenge.votesChallenger++;
    } else if (voteFor === "opponent") {
      challenge.votesOpponent++;
    } else {
      return res.status(400).json({ message: "Invalid vote option" });
    }

    // Record that this user has voted
    challenge.voters.push(userId);
    await challenge.save();

    // Award vote points (max 10 per day)
    const user = await User.findById(userId);
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
    }

    res.status(200).json({ 
      message: "Vote counted!",
      challenge,
      hasVoted: true
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Get all challenges for the current user.
 * Includes active and past challenges where the user is either challenger or opponent.
 */
export const getChallenges = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Get all challenges where the user is either challenger or opponent
    const challenges = await Challenge.find({
      $or: [
        { challenger: userId },
        { opponent: userId }
      ]
    })
    .populate("challenger", "username profilePic versePoints")
    .populate("opponent", "username profilePic versePoints")
    .sort({ createdAt: -1 });

    // Get challenges from the last 24 hours for active challenges
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    // Split challenges into active and past
    const activePolls = challenges.filter(
      challenge => challenge.status === "open" || 
                  (challenge.status === "closed" && new Date(challenge.createdAt) >= twentyFourHoursAgo)
    );
    
    // Past polls include all completed challenges and expired open challenges
    const pastPolls = challenges.filter(
      challenge => challenge.status === "closed" && new Date(challenge.createdAt) < twentyFourHoursAgo
    );

    // Get the user's vote status for each challenge
    const enhancedActivePolls = activePolls.map(poll => {
      const hasVoted = poll.voters.includes(userId.toString());
      return {
        ...poll.toObject(),
        hasVoted
      };
    });

    const enhancedPastPolls = pastPolls.map(poll => {
      const hasVoted = poll.voters.includes(userId.toString());
      return {
        ...poll.toObject(),
        hasVoted
      };
    });

    res.status(200).json({
      active: enhancedActivePolls,
      past: enhancedPastPolls
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Finalize a challenge - determine winner and award 20 versePoints to the winner.
 */
export const finalizeChallenge = async (req, res) => {
  try {
    const { challengeId } = req.params;
    
    const challenge = await Challenge.findById(challengeId)
      .populate("challenger", "username versePoints")
      .populate("opponent", "username versePoints");
    
    if (!challenge) return res.status(404).json({ message: "Challenge not found" });
    
    if (challenge.finalized) {
      return res.status(400).json({ message: "Challenge already finalized" });
    }
    
    if (challenge.status !== "closed") {
      return res.status(400).json({ message: "Challenge must be closed to finalize" });
    }
    
    // Determine the winner
    let winnerId = null;
    if (challenge.votesChallenger > challenge.votesOpponent) {
      winnerId = challenge.challenger._id;
    } else if (challenge.votesOpponent > challenge.votesChallenger) {
      winnerId = challenge.opponent._id;
    }
    
    // Award 20 versePoints to the winner
    if (winnerId) {
      const winner = await User.findById(winnerId);
      winner.versePoints += 20;
      await winner.save();
    }
    
    challenge.finalized = true;
    await challenge.save();
    
    res.status(200).json({
      message: "Challenge finalized",
      challenge
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};