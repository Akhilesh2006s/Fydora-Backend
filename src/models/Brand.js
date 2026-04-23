import mongoose from "mongoose";

const brandSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    logo: String,
    description: String,
    status: { type: String, enum: ["active", "inactive"], default: "active" }
  },
  { timestamps: true }
);

brandSchema.index({ name: 1 }, { unique: true });

export const Brand = mongoose.model("Brand", brandSchema);
