import mongoose from "mongoose";
import Poll from "../Models/pollModel.js";
import User from "../Models/userModel.js";

export const createPoll = async (req, res) => {
  try {
    let { category } = req.body;
    if (!category) {
      return res.status(400).json({ message: "Category is required." });
    }
    category = category.trim().toLowerCase();
    const me = req.user._id;

    // 1) Check creator's balance
    const meData = await User.findById(me).select("versePoints").lean();
    if (!meData) return res.status(404).json({ message: "User not found." });
    if (meData.versePoints < 10) {
      return res.status(400).json({ message: "Not enough versePoints." });
    }

    // 2) Daily limit
    const startOfDay = new Date();
    startOfDay.setHours(0,0,0,0);
    const todayCount = await Poll.countDocuments({
      challenger: me,
      createdAt:  { $gte: startOfDay }
    });
    if (todayCount >= 3) {
      return res.status(400).json({ message: "3 polls per day max." });
    }
    const attemptsLeft = 3 - todayCount - 1;

    // 3) Look for a pending poll in the last 24h
    const since = new Date(Date.now() - 24*60*60*1000);
    const existing = await Poll.findOne({
      category,
      status:     "pending",
      challenger: { $ne: me },
      createdAt:  { $gte: since }
    })
    .select("challenger")
    .lean();

    const submission = req.file?.path || "";

    if (existing) {
      // — MATCHING BRANCH —
      // Only deduct from the matcher (you)
      await User.updateOne({ _id: me }, { $inc: { versePoints: -10 } });

      // Update the existing poll
      const updated = await Poll.findByIdAndUpdate(
        existing._id,
        {
          challenged:    me,
          opponentImage: submission,
          status:        submission ? "closed" : "open"
        },
        { new: true }
      )
      .populate("challenger challenged", "username profilePic versePoints")
      .lean();

      return res.status(200).json({
        message:    "Matched! You can vote now.",
        challenge:  updated,
        attemptsLeft
      });
    }

    // — CREATION BRANCH —
    // Deduct 10 from the creator
    await User.updateOne({ _id: me }, { $inc: { versePoints: -10 } });

    // Create new pending poll
    const newPoll = await Poll.create({
      category,
      challenger:           me,
      challengerSubmission: submission,
      status:               "pending"
    });

    return res.status(201).json({
      message:    "Poll created. Waiting for match.",
      challenge:  newPoll,
      attemptsLeft
    });

  } catch (err) {
    console.error("createPoll error:", err);
    return res.status(500).json({ message: err.message });
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
    const me = String(req.user._id);

    if (!["challenger","challenged"].includes(option)) {
      return res.status(400).json({ message: "Invalid option." });
    }

    // Atomically push if not self and not already voted
    const updated = await Poll.findOneAndUpdate(
      {
        _id: pollId,
        challenger: { $ne: me },
        challenged: { $ne: me },
        "votes.voter": { $ne: me }
      },
      { $push: { votes: { voter: me, option } } },
      { new: true, select: "votes" }
    ).lean();

    if (!updated) {
      // Determine reason
      const exists = await Poll.exists({ _id: pollId });
      if (!exists) {
        return res.status(404).json({ message: "Poll not found." });
      }
      // Either self‐vote or already voted
      return res.status(400).json({ message: "Cannot vote (self or duplicate)." });
    }

    return res.status(200).json({ message: "Vote counted.", votes: updated.votes });
  } catch (err) {
    console.error("votePoll error:", err);
    return res.status(500).json({ message: err.message });
  }
};

// Get active, pending, and past polls separately
export const getPolls = async (req, res) => {
  try {
    const me    = req.user._id;
    const since = new Date(Date.now() - 24*60*60*1000);

    const [active, pending, past] = await Promise.all([
      Poll.find({ status: { $in: ["open","closed"] }, createdAt: { $gte: since } })
        .populate("challenger challenged","username profilePic versePoints")
        .lean(),

      Poll.find({ status: "pending" })
        .populate("challenger","username profilePic versePoints")
        .lean(),

      Poll.find({ $or: [{ challenger: me }, { challenged: me }] })
        .populate("challenger challenged","username profilePic versePoints")
        .lean()
    ]);

    const annotate = arr =>
      arr.map(p => ({
        ...p,
        hasVoted: p.votes.some(v => String(v.voter) === String(me))
      }));

    return res.status(200).json({
      active: annotate(active),
      pending,
      past:   annotate(past)
    });
  } catch (err) {
    console.error("getPolls error:", err);
    return res.status(500).json({ message: err.message });
  }
};
    // Annotate hasVoted

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







