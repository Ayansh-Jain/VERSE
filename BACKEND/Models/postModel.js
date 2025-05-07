// Models/postModel.js
import mongoose from "mongoose";

const postSchema = new mongoose.Schema(
  {
    postedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: {
      type: String,
      maxLength: 500,
    },
    img: {
      type: String,
    },
    likes: {
      type: [mongoose.Schema.Types.ObjectId],
      default: [],
      ref: "User",
    },
    replies: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        text: {
          type: String,
          required: true,
        },
        userProfilePic: String,
        username: String,
      },
    ],
  },
  { timestamps: true }
);

// Add index for efficient "feed" queries (by poster and recency)
postSchema.index({ postedBy: 1, createdAt: -1 });

// Use existing model if already registered (prevents overwrite errors in hot reload)
const Post = mongoose.models.Post || mongoose.model("Post", postSchema);

export default Post;
