import mongoose from "mongoose";

const bannerSchema = new mongoose.Schema(
  {
    image: { type: String, required: true },
    title: String,
    subtitle: String,
    ctaText: String,
    ctaLink: String,
    position: {
      type: String,
      enum: ["top-slider", "mid-section", "footer"],
      default: "top-slider"
    },
    type: { type: String, enum: ["carousel", "static"], default: "carousel" },
    order: { type: Number, default: 0 },
    visible: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export const Banner = mongoose.model("Banner", bannerSchema);
