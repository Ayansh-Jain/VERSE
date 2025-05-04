// Models/challengeModel.js
import mongoose from "mongoose";

const challengeSchema = new mongoose.Schema(
  {
    skill: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    },
    challenger: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    opponent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    challengerImage: {
      type: String,
      default: ""
    },
    opponentImage: {
      type: String,
      default: ""
    },
    status: {
      type: String,
      enum: ["open", "closed"],
      default: "open"
    },
    votesChallenger: {
      type: Number,
      default: 0
    },
    votesOpponent: {
      type: Number,
      default: 0
    },
    voters: {
      type: [String],
      default: []
    },
    finalized: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

const Challenge = mongoose.model("Challenge", challengeSchema);
export default Challenge;