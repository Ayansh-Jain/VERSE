// File: pollModel.js
import mongoose from "mongoose";

const pollSchema = new mongoose.Schema(
  {
    category: { type: String, required: true },
    challenger: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    challenged: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false },
    challengerSubmission: { type: String, default: "" },
    opponentImage: { type: String, default: "" },
    votes: [
      {
        voter: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        option: { type: String, enum: ["challenger", "challenged"] },
      },
    ],
    status: { type: String, enum: ["pending", "open", "closed"], default: "pending" },
    finalized: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Use the existing model if available, otherwise create it.
const Poll = mongoose.models.Poll || mongoose.model("Poll", pollSchema);
export default Poll;
