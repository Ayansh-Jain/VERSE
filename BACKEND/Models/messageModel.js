import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    sender:   { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    receiver: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    text:     { type: String },
    file:     { type: String },
    read:     { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

// Compound index for fetching conversation
messageSchema.index({ sender: 1, receiver: 1, createdAt: 1 });

const Message = mongoose.models.Message || mongoose.model("Message", messageSchema);
export default Message;
