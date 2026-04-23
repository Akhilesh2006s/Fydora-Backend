import mongoose from "mongoose";

const filterItemSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
    type: { type: String, enum: ["category", "price", "size", "color", "brand", "rating", "custom"], default: "custom" },
    enabled: { type: Boolean, default: true },
    options: [{ type: String }],
    order: { type: Number, default: 0 }
  },
  { _id: false }
);

const filterConfigSchema = new mongoose.Schema(
  {
    scope: { type: String, default: "storefront", unique: true },
    filters: [filterItemSchema]
  },
  { timestamps: true }
);

export const FilterConfig = mongoose.model("FilterConfig", filterConfigSchema);
