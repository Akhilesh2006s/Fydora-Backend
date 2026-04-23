import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    quantity: { type: Number, required: true, min: 1 },
    size: String,
    color: String,
    unitPrice: { type: Number, required: true, min: 0 }
  },
  { _id: false }
);

const shippingAddressSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    line1: { type: String, required: true, trim: true },
    line2: { type: String, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    postalCode: { type: String, required: true, trim: true },
    country: { type: String, default: "India", trim: true }
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    items: [orderItemSchema],
    subtotal: { type: Number, default: 0 },
    deliveryCharge: { type: Number, default: 0 },
    deliveryChargeApplied: { type: Boolean, default: false },
    discountAmount: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    shippingAddress: shippingAddressSchema,
    cashfreeOrderId: String,
    couponCode: String,
    status: { type: String, enum: ["Pending", "Shipped", "Delivered"], default: "Pending" }
  },
  { timestamps: true }
);

export const Order = mongoose.model("Order", orderSchema);
