import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    images: [{ type: String }],
    price: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0, max: 100 },
    description: String,
    sizes: [{ type: String }],
    colors: [{ type: String }],
    colorImageMap: [
      {
        color: { type: String, trim: true },
        images: [{ type: String }]
      }
    ],
    stockCount: { type: Number, default: 0, min: 0 },
    productType: {
      type: String,
      enum: ["apparel", "footwear", "eyewear", "accessories"],
      default: "apparel"
    },
    typeAttributes: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    category: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
    brand: { type: mongoose.Schema.Types.ObjectId, ref: "Brand" },
    tags: [{ type: String }],
    rating: { type: Number, default: 0 },
    isFeatured: { type: Boolean, default: false },
    isTrending: { type: Boolean, default: false },
    status: { type: String, enum: ["active", "inactive"], default: "active" }
  },
  { timestamps: true }
);

export const Product = mongoose.model("Product", productSchema);
