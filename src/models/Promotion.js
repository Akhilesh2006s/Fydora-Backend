import mongoose from "mongoose";

const promotionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: String,
    discountPercent: { type: Number, required: true, min: 1, max: 100 },
    productIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
    brandIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Brand" }],
    startsAt: { type: Date, required: true },
    endsAt: { type: Date, required: true },
    active: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export const Promotion = mongoose.model("Promotion", promotionSchema);
