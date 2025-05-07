// controllers/pollController.js

import mongoose from "mongoose";
import Poll from "../Models/pollModel.js";
import User from "../Models/userModel.js";

/**
 * Create a new poll challenge or match an existing one.
 */
export const createPoll = async (req, res) => {
  try {
    let { category } = req.body;
    if (!category) {
      return res.status(400).json({ message: "Category is required." });
    }
    category = category.trim().toLowerCase();

    // Load only versePoints field
    const user = await User.findById(req.user._id).select("versePoints").lean();
    if (!user) return res.status(404).json({ message: "User not found." });
    if (user.versePoints < 10) {
      return res.status(400).json({ message: "Not enough versePoints." });
    }

    // Check daily limit
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const countToday = await Poll.countDocuments({
      challenger: req.user._id,
      createdAt: { $gte: startOfDay },
    });
    if (countToday >= 3) {
      return res.status(400).json({ message: "3 polls per day max." });
    }
    const attemptsLeft = 3 - countToday - 1;

    // Try to match a pending poll from last 24h
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const pending = await Poll.findOne({
      category,
      status: "pending",
      challenger: { $ne: req.user._id },
      createdAt: { $gte: since },
    })
      .select("challenger")
      .lean();

    const submission = req.file ? req.file.path : "";

    if (pending) {
      // Matched: deduct points from both
      await User.updateOne({ _id: req.user._id }, { $inc: { versePoints: -10 } });
      await User.updateOne({ _id: pending.challenger }, { $inc: { versePoints: -10 } });

      // Update existing poll
      const updated = await Poll.findByIdAndUpdate(
        pending._id,
        {
          challenged: req.user._id,
          opponentImage: submission,
          status: submission ? "closed" : "open",
        },
        { new: true }
      )
        .populate("challenger challenged", "username profilePic versePoints")
        .lean();

      return res.status(200).json({
        message: "Matched! You can vote now.",
        challenge: updated,
        attemptsLeft,
      });
    }

    // No match: create new pending poll
    await User.updateOne({ _id: req.user._id }, { $inc: { versePoints: -10 } });

    const newPoll = await Poll.create({
      category,
      challenger: req.user._id,
      challengerSubmission: submission,
      status: "pending",
    });

    res.status(201).json({
      message: "Poll created. Waiting for match.",
      challenge: newPoll,
      attemptsLeft,
    });
  } catch (err) {
    console.error("createPoll error:", err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * Update the challenged user's submission on a matched poll.
 */
export const updatePollSubmission = async (req, res) => {
  try {
    const { pollId } = req.params;
    const submission = req.file?.path;
    if (!submission) {
      return res.status(400).json({ message: "No file uploaded." });
    }

    // Atomically find the poll where this user is the challenged party and it's still open/pending,
    // then set the opponentImage and close it.
    const updated = await Poll.findOneAndUpdate(
      {
        _id:       pollId,
        challenged: req.user._id,
        status:    { $in: ["pending", "open"] }
      },
      {
        $set: {
          opponentImage: submission,
          status:        "closed"
        }
      },
      {
        new:    true,   // return the updated doc
        lean:   true,   // return a plain JS object
        select: "challenger challenged challengerSubmission opponentImage status votes createdAt updatedAt"
      }
    )
      .populate("challenger challenged", "username profilePic");

    // If no document was found, either it doesn't exist or user isn't authorized
    if (!updated) {
      // Check existence
      const exists = await Poll.exists({ _id: pollId });
      return res
        .status(exists ? 403 : 404)
        .json({ message: exists ? "Not authorized to submit." : "Poll not found." });
    }

    return res.status(200).json({
      message:   "Submission updated.",
      challenge: updated
    });
  } catch (err) {
    console.error("updatePollSubmission error:", err);
    return res.status(500).json({ message: err.message });
  }
};
/**
 * Vote on a poll (one vote per user, no self-vote).
 */
export const votePoll = async (req, res) => {
  try {
    const { pollId } = req.params;
    const { option } = req.body;
    if (!["challenger", "challenged"].includes(option)) {
      return res.status(400).json({ message: "Invalid vote option." });
    }

    // Load poll metadata
    const poll = await Poll.findById(pollId)
      .select("challenger challenged votes")
      .lean();
    if (!poll) {
      return res.status(404).json({ message: "Poll not found." });
    }

    const me = String(req.user._id);
    // Prevent self-vote
    if ([poll.challenger, poll.challenged].map(String).includes(me)) {
      return res.status(400).json({ message: "Cannot vote your own poll." });
    }
    // Prevent double-vote
    if (poll.votes.some((v) => String(v.voter) === me)) {
      return res.status(400).json({ message: "Already voted." });
    }

    // Append vote
    const updated = await Poll.findByIdAndUpdate(
      pollId,
      { $push: { votes: { voter: req.user._id, option } } },
      { new: true, select: "votes" }
    )
      .lean();

    res.status(200).json({ message: "Vote counted.", votes: updated.votes });
  } catch (err) {
    console.error("votePoll error:", err);
    res.status(500).json({ message: err.message });
  }
};

// Get active, pending, and past polls separately
export const getPolls = async (req, res) => {
  try {
    const me = req.user._id;
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Run queries in parallel
    const [active, pending, past] = await Promise.all([
      Poll.find({
        status: { $in: ["open", "closed"] },
        createdAt: { $gte: since }
      })
        .populate("challenger challenged", "username profilePic versePoints")
        .sort({ createdAt: -1 })
        .lean(),

      Poll.find({ status: "pending" })
        .populate("challenger", "username profilePic versePoints")
        .sort({ createdAt: -1 })
        .lean(),

      Poll.find({
        $or: [{ challenger: me }, { challenged: me }]
      })
        .populate("challenger challenged", "username profilePic versePoints")
        .sort({ createdAt: -1 })
        .lean(),
    ]);

    // Annotate hasVoted
    const annotate = (arr) =>
      arr.map((p) => ({
        ...p,
        hasVoted: p.votes.some((v) => String(v.voter) === String(me)),
      }));

    res.status(200).json({
      active: annotate(active),
      pending: pending,
      past: annotate(past),
    });
  } catch (err) {
    console.error("getPolls error:", err);
    res.status(500).json({ message: err.message });
  }
};

// Finalize a poll and award points
export const finalizePoll = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const { pollId } = req.params;

    await session.withTransaction(async () => {
      // Fetch poll
      const poll = await Poll.findById(pollId)
        .select("status finalized votes challenger challenged")
        .lean()
        .session(session);
      if (!poll) {
        return res.status(404).json({ message: "Poll not found." });
      }
      if (poll.finalized) {
        return res.status(400).json({ message: "Already finalized." });
      }
      if (poll.status !== "closed") {
        return res.status(400).json({ message: "Still open." });
      }

      // Determine winner
      const count = (opt) => poll.votes.filter((v) => v.option === opt).length;
      let winnerId = null;
      if (count("challenger") > count("challenged")) winnerId = poll.challenger;
      else if (count("challenged") > count("challenger")) winnerId = poll.challenged;

      // Award points if winner exists
      if (winnerId) {
        await User.updateOne(
          { _id: winnerId },
          { $inc: { versePoints: 10 } },
          { session }
        );
      }

      // Mark finalized
      await Poll.updateOne(
        { _id: pollId },
        { $set: { finalized: true } },
        { session }
      );
    });

    session.endSession();

    // Return updated poll
    const updatedPoll = await Poll.findById(pollId)
      .populate("challenger challenged", "username versePoints")
      .lean();

    res.status(200).json({ message: "Poll finalized.", challenge: updatedPoll });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error("finalizePoll error:", err);
    res.status(500).json({ message: err.message });
  }
};

// Cancel a pending poll and refund the user
export const cancelPoll = async (req, res) => {
  try {
    const me = req.user._id;
    const poll = await Poll.findOne({ challenger: me, status: "pending" }).lean();
    if (!poll) {
      return res.status(404).json({ message: "No pending poll to cancel." });
    }

    // Delete and refund
    await Promise.all([
      Poll.deleteOne({ _id: poll._id }),
      User.updateOne({ _id: me }, { $inc: { versePoints: 10 } }),
    ]);

    res.status(200).json({ message: "Poll cancelled and refunded." });
  } catch (err) {
    console.error("cancelPoll error:", err);
    res.status(500).json({ message: err.message });
  }
};







