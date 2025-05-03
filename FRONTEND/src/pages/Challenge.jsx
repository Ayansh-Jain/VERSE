// src/models/challengeModel.js
import mongoose from "mongoose";

const challengeSchema = new mongoose.Schema({
  skill: { type: String, required: true }, // Skill type of challenge
  challenger: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  opponent: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  challengerImage: { type: String, required: true }, // Challenger's submission
  opponentImage: { type: String, required: true }, // Will be updated by opponent
  votesChallenger: { type: Number, default: 0 },
  votesOpponent: { type: Number, default: 0 },
  status: { type: String, enum: ["open", "closed"], default: "open" }
}, { timestamps: true });

const Challenge = mongoose.model("Challenge", challengeSchema);
export default Challenge;
