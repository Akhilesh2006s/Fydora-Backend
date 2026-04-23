import mongoose from "mongoose";

const sectionSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    title: String,
    enabled: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
    displayStyle: { type: String, enum: ["grid", "list", "carousel"], default: "grid" },
    itemLimit: { type: Number, default: 8 }
  },
  { _id: false }
);

const layoutConfigSchema = new mongoose.Schema(
  {
    scope: { type: String, default: "homepage", unique: true },
    sections: [sectionSchema]
  },
  { timestamps: true }
);

export const LayoutConfig = mongoose.model("LayoutConfig", layoutConfigSchema);
