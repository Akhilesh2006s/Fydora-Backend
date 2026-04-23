import mongoose from "mongoose";

const adminSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["SUPER_ADMIN", "ADMIN"], default: "ADMIN" },
    permissions: [{ type: String, trim: true }],
    active: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export const Admin = mongoose.model("Admin", adminSchema);
