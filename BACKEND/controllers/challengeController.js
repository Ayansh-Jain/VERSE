// controllers/challengeController.js
import mongoose from "mongoose";
import Challenge from "../Models/challengeModel.js";
import User from "../Models/userModel.js";

// ─── 1) Start or match a challenge ─────────────────────────────────────────────
export const startChallenge = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    let { skill } = req.body;
    if (!skill) return res.status(400).json({ message: "Skill is required." });
    skill = skill.toLowerCase();

    const me = req.user._id;

    // 1a) Quick load of versePoints
    const meData = await User.findById(me).select("versePoints").lean();
    if (!meData) return res.status(404).json({ message: "User not found." });
    if (meData.versePoints < 10) {
      return res.status(400).json({ message: "Not enough versePoints." });
    }

    // 1b) Daily limit
    const startOfDay = new Date();
    startOfDay.setHours(0,0,0,0);
    const used = await Challenge.countDocuments({
      challenger: me,
      createdAt: { $gte: startOfDay }
    });
    if (used >= 3) {
      return res.status(400).json({ message: "3 challenges per day max." });
    }
    const attemptsLeft = 3 - used - 1;

    // 1c) Try to match an existing open challenge
    const since = new Date(Date.now() - 24*60*60*1000);
    const challengerImage = req.file?.path || "";

    let challenge;
    await session.withTransaction(async () => {
      challenge = await Challenge.findOneAndUpdate(
        {
          skill,
          status:    "open",
          challenger: { $ne: me },
          createdAt:  { $gte: since }
        },
        {
          $set: {
            opponent:      me,
            opponentImage: challengerImage,
            status:        "closed"
          },
          $inc: { votesChallenger: 0 } // no-op, just to get updated doc
        },
        { new: true, session }
      )
      .populate("challenger opponent", "username profilePic versePoints")
      .lean();

      if (challenge) {
        // Deduct only from the matcher (you)
        await User.updateOne({ _id: me }, { $inc: { versePoints: -10 } }, { session });
        // Also deduct from original challenger
        await User.updateOne(
          { _id: challenge.challenger._id },
          { $inc: { versePoints: -10 } },
          { session }
        );
      } else {
        // No match: create a new open challenge
        const [newC] = await Challenge.create(
          [
            {
              skill,
              challenger:      me,
              opponent:        null,
              challengerImage,
              opponentImage:   "",
              status:          "open",
            }
          ],
          { session }
        );
        challenge = newC.toObject();
        await User.updateOne({ _id: me }, { $inc: { versePoints: -10 } }, { session });
      }
    });
    session.endSession();

    const message = challenge.opponent
      ? "Challenge matched! You can vote."
      : "Challenge started. Waiting for opponent.";

    return res.status(challenge.opponent ? 200 : 201).json({
      message,
      challenge,
      attemptsLeft
    });

  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error("startChallenge error:", err);
    return res.status(500).json({ message: err.message });
  }
};

// ─── 2) Submit opponent’s image ────────────────────────────────────────────────
export const submitOpponentImage = async (req, res) => {
  try {
    const me = req.user._id;
    const { challengeId } = req.body;
    const img = req.file?.path;
    if (!img) return res.status(400).json({ message: "No file uploaded." });

    // Atomically set the opponentImage and close
    const updated = await Challenge.findOneAndUpdate(
      { _id: challengeId, opponent: me, status: "open" },
      { $set: { opponentImage: img, status: "closed" } },
      { new: true }
    )
    .populate("challenger opponent", "username profilePic")
    .lean();

    if (!updated) {
      const exists = await Challenge.exists({ _id: challengeId });
      return res.status(exists ? 403 : 404).json({
        message: exists
          ? "Not authorized or already submitted."
          : "Challenge not found."
      });
    }

    return res.status(200).json({ message: "Image submitted.", challenge: updated });
  } catch (err) {
    console.error("submitOpponentImage error:", err);
    return res.status(500).json({ message: err.message });
  }
};

// ─── 3) Vote on a challenge ───────────────────────────────────────────────────
export const voteChallenge = async (req, res) => {
  try {
    const me = req.user._id;
    const { challengeId, voteFor } = req.body;
    if (!["challenger","opponent"].includes(voteFor)) {
      return res.status(400).json({ message: "Invalid vote option." });
    }

    // Atomic update: prevent self-vote and double-vote
    const update = {};
    update[voteFor === "challenger" ? "votesChallenger" : "votesOpponent"] = 1;
    const updated = await Challenge.findOneAndUpdate(
      {
        _id: challengeId,
        status: "closed",
        voters: { $ne: String(me) },
        $expr: { $ne: ["$challenger", mongoose.Types.ObjectId(me)] },
        $expr: { $ne: ["$opponent", mongoose.Types.ObjectId(me)] }
      },
      {
        $inc:  update,
        $push: { voters: me }
      },
      { new: true }
    ).lean();

    if (!updated) {
      const exists = await Challenge.exists({ _id: challengeId });
      return res.status(exists ? 400 : 404).json({
        message: exists
          ? "Cannot vote (self or already voted)."
          : "Challenge not found."
      });
    }

    // Award vote point if under daily limit
    const today = new Date();
    today.setHours(0,0,0,0);
    const user = await User.findById(me).select("versePoints lastVoteDate votePointsEarnedToday");
    if (!user.lastVoteDate || user.lastVoteDate < today) {
      user.votePointsEarnedToday = 0;
      user.lastVoteDate = new Date();
    }
    if (user.votePointsEarnedToday < 10) {
      user.versePoints += 1;
      user.votePointsEarnedToday += 1;
      await user.save();
    }

    return res.status(200).json({ message: "Vote counted.", challenge: updated });
  } catch (err) {
    console.error("voteChallenge error:", err);
    return res.status(500).json({ message: err.message });
  }
};

// ─── 4) Fetch active & past challenges ────────────────────────────────────────
export const getChallenges = async (req, res) => {
  try {
    const me = String(req.user._id);
    const since = new Date(Date.now() - 24*60*60*1000);

    // Parallel queries
    const [active, past] = await Promise.all([
      Challenge.find({
        status: { $in: ["open","closed"] },
        $or: [ { challenger: me }, { opponent: me } ],
        createdAt: { $gte: since }
      })
      .populate("challenger opponent", "username profilePic versePoints")
      .lean(),

      Challenge.find({
        status: "closed",
        $or: [ { challenger: me }, { opponent: me } ],
        createdAt: { $lt: since }
      })
      .populate("challenger opponent", "username profilePic versePoints")
      .lean()
    ]);

    const annotate = arr =>
      arr.map(c => ({
        ...c,
        hasVoted: c.voters.includes(me)
      }));

    return res.status(200).json({
      active: annotate(active),
      past:   annotate(past)
    });

  } catch (err) {
    console.error("getChallenges error:", err);
    return res.status(500).json({ message: err.message });
  }
};

// ─── 5) Finalize and award points ────────────────────────────────────────────
export const finalizeChallenge = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const { challengeId } = req.params;
    let result;

    await session.withTransaction(async () => {
      const ch = await Challenge.findById(challengeId)
        .select("status finalized votesChallenger votesOpponent challenger opponent")
        .lean()
        .session(session);
      if (!ch) return res.status(404).json({ message: "Challenge not found." });
      if (ch.finalized) return res.status(400).json({ message: "Already finalized." });
      if (ch.status !== "closed") return res.status(400).json({ message: "Still open." });

      // Determine winner
      let winner = null;
      if (ch.votesChallenger > ch.votesOpponent) winner = ch.challenger;
      else if (ch.votesOpponent > ch.votesChallenger) winner = ch.opponent;

      // Award 20 if winner
      if (winner) {
        await User.updateOne({ _id: winner }, { $inc: { versePoints: 20 } }, { session });
      }

      // Mark finalized
      await Challenge.updateOne(
        { _id: challengeId },
        { $set: { finalized: true } },
        { session }
      );

      result = await Challenge.findById(challengeId)
        .populate("challenger opponent", "username versePoints")
        .lean();
    });

    session.endSession();
    return res.status(200).json({ message: "Challenge finalized.", challenge: result });

  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error("finalizeChallenge error:", err);
    return res.status(500).json({ message: err.message });
  }
};
