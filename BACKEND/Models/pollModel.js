import mongoose from "mongoose";

const pollSchema = new mongoose.Schema(
  {
    category:            { type: String, required: true, index: true },
    challenger:          { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    challenged:          { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    challengerSubmission:{ type: String, default: "" },
    opponentImage:       { type: String, default: "" },
    votes: [
      {
        voter:  { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
        option: { type: String, enum: ["challenger","challenged"] }
      },
    ],
    status:              { type: String, enum: ["pending","open","closed"], default: "pending", index: true },
    finalized:           { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Compound index for finding pending matches quickly
pollSchema.index({ category: 1, status: 1, createdAt: 1 });

const Poll = mongoose.models.Poll || mongoose.model("Poll", pollSchema);
export default Poll;
