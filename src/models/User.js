import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    uid: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    picture: String,
    isBanned: { type: Boolean, default: false },
    lastLoginAt: Date
  },
  { timestamps: true }
);

export const User = mongoose.model("User", userSchema);
