// src/models/userModel.js
import mongoose from "mongoose";
import bcrypt from "bcrypt";

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    profilePic: { type: String, default: "" },
    bio: { type: String, default: "" },
    organization: { type: String, default: "" },
    skills: { type: [String], default: [] },
    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", default: [] }],
    following: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", default: [] }],
    posts: [{ type: mongoose.Schema.Types.ObjectId, ref: "Post" }],
    versePoints: { type: Number, default: 50},
   
  },
  { timestamps: true }
);

// Pre-save hook: Hash password if modified and normalize skills to lower case.
userSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 12);
  }
  if (this.skills && Array.isArray(this.skills)) {
    this.skills = this.skills.map((skill) => skill.toLowerCase());
  }
  next();
});

const User = mongoose.models.User || mongoose.model("User", userSchema);
export default User;

