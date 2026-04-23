import mongoose from "mongoose";

const checkoutConfigSchema = new mongoose.Schema(
  {
    scope: { type: String, default: "default", unique: true },
    deliveryChargeEnabled: { type: Boolean, default: false },
    deliveryChargeAmount: { type: Number, default: 0, min: 0 }
  },
  { timestamps: true }
);

export const CheckoutConfig = mongoose.model("CheckoutConfig", checkoutConfigSchema);
