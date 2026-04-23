import { Router } from "express";
import { protect, allowRoles } from "../middleware/auth.js";
import { Order } from "../models/Order.js";
import { Promotion } from "../models/Promotion.js";
import { Product } from "../models/Product.js";
import { CheckoutConfig } from "../models/CheckoutConfig.js";

const router = Router();

router.use(protect, allowRoles("USER"));

router.get("/mine", async (req, res) => {
  const orders = await Order.find({ user: req.user.id }).populate("items.product", "name images").sort({ createdAt: -1 });
  return res.json(orders);
});

router.post("/", async (req, res) => {
  const { items = [], couponCode, shippingAddress } = req.body;
  if (!items.length) return res.status(400).json({ message: "Cart is empty" });

  const productIds = items.map((i) => i.product);
  const products = await Product.find({ _id: { $in: productIds } });

  let subtotal = 0;
  const normalizedItems = items.map((item) => {
    const product = products.find((p) => p._id.toString() === item.product);
    const unitPrice = product?.price || 0;
    subtotal += unitPrice * item.quantity;
    return {
      product: item.product,
      quantity: item.quantity,
      size: item.size,
      color: item.color,
      unitPrice
    };
  });

  let discountAmount = 0;
  let normalizedCouponCode;
  if (couponCode) {
    const promotion = await Promotion.findOne({
      name: String(couponCode).trim(),
      active: true,
      startsAt: { $lte: new Date() },
      endsAt: { $gte: new Date() }
    });
    if (promotion) {
      discountAmount = (subtotal * promotion.discountPercent) / 100;
      normalizedCouponCode = promotion.name;
    }
  }

  const checkoutConfig = await CheckoutConfig.findOne({ scope: "default" });
  const deliveryChargeApplied = Boolean(checkoutConfig?.deliveryChargeEnabled);
  const deliveryCharge = deliveryChargeApplied ? Number(checkoutConfig?.deliveryChargeAmount || 0) : 0;
  const total = Math.max(0, subtotal + deliveryCharge - discountAmount);

  const order = await Order.create({
    user: req.user.id,
    items: normalizedItems,
    subtotal,
    deliveryCharge,
    deliveryChargeApplied,
    discountAmount,
    total,
    shippingAddress,
    couponCode: normalizedCouponCode
  });

  return res.status(201).json(order);
});

router.post("/checkout/cashfree/session", async (req, res) => {
  const { items = [], customerPhone, customerName, customerEmail, shippingAddress, couponCode } = req.body;
  if (!Array.isArray(items) || !items.length) {
    return res.status(400).json({ message: "Cart is empty" });
  }
  if (items.some((item) => !(item.productId || item.product))) {
    return res.status(400).json({ message: "Each cart item must include a product id" });
  }

  if (!shippingAddress || typeof shippingAddress !== "object") {
    return res.status(400).json({ message: "Shipping address is required" });
  }

  const requiredAddressFields = ["fullName", "line1", "city", "state", "postalCode", "country"];
  const hasMissingAddressField = requiredAddressFields.some((field) => !String(shippingAddress[field] || "").trim());
  if (hasMissingAddressField) {
    return res.status(400).json({ message: "Please fill complete shipping address details" });
  }

  if (!process.env.CASHFREE_APP_ID || !process.env.CASHFREE_SECRET_KEY) {
    return res.status(500).json({ message: "Cashfree credentials are not configured" });
  }

  const subtotal = Number(items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.qty || 1), 0).toFixed(2));

  const checkoutConfig = await CheckoutConfig.findOne({ scope: "default" });
  const deliveryChargeApplied = Boolean(checkoutConfig?.deliveryChargeEnabled);
  const deliveryCharge = deliveryChargeApplied ? Number(checkoutConfig?.deliveryChargeAmount || 0) : 0;

  let discountAmount = 0;
  let normalizedCouponCode;
  if (couponCode) {
    const promotion = await Promotion.findOne({
      name: String(couponCode).trim(),
      active: true,
      startsAt: { $lte: new Date() },
      endsAt: { $gte: new Date() }
    });
    if (promotion) {
      discountAmount = Number(((subtotal * promotion.discountPercent) / 100).toFixed(2));
      normalizedCouponCode = promotion.name;
    }
  }

  const orderAmount = Number(Math.max(0, subtotal + deliveryCharge - discountAmount).toFixed(2));

  if (!orderAmount || orderAmount <= 0) {
    return res.status(400).json({ message: "Invalid order amount" });
  }

  const orderId = `ff_${Date.now()}`;
  const environment = process.env.CASHFREE_ENVIRONMENT === "production" ? "production" : "sandbox";
  const cashfreeBaseUrl = environment === "production" ? "https://api.cashfree.com/pg/orders" : "https://sandbox.cashfree.com/pg/orders";

  const payload = {
    order_id: orderId,
    order_amount: orderAmount,
    order_currency: "INR",
    customer_details: {
      customer_id: req.user.id,
      customer_name: customerName || "FashionForge User",
      customer_email: customerEmail || req.user.email || "user@example.com",
      customer_phone: customerPhone || "9999999999"
    },
    order_meta: {
      return_url: `${process.env.CASHFREE_RETURN_URL || "http://localhost:3001/cart"}?order_id={order_id}`
    }
  };

  const cfResponse = await fetch(cashfreeBaseUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-version": "2023-08-01",
      "x-client-id": process.env.CASHFREE_APP_ID,
      "x-client-secret": process.env.CASHFREE_SECRET_KEY
    },
    body: JSON.stringify(payload)
  });

  const data = await cfResponse.json().catch(() => ({}));
  if (!cfResponse.ok) {
    const details = data?.message || data?.error_description || data?.type || "Unknown error";
    console.error("Cashfree session creation failed", {
      status: cfResponse.status,
      environment,
      details
    });
    return res.status(502).json({
      message: "Cashfree order session creation failed",
      details,
      cashfreeStatus: cfResponse.status
    });
  }

  const normalizedItems = items.map((item) => ({
    product: item.productId || item.product || undefined,
    quantity: Math.max(1, Number(item.qty || item.quantity || 1)),
    size: item.size,
    color: item.color,
    unitPrice: Number(item.price || item.unitPrice || 0)
  }));

  await Order.create({
    user: req.user.id,
    items: normalizedItems,
    subtotal,
    deliveryCharge,
    deliveryChargeApplied,
    discountAmount,
    total: orderAmount,
    couponCode: normalizedCouponCode,
    shippingAddress: {
      fullName: String(shippingAddress.fullName || customerName || "FashionForge User").trim(),
      phone: String(customerPhone || shippingAddress.phone || "9999999999").trim(),
      line1: String(shippingAddress.line1 || "").trim(),
      line2: String(shippingAddress.line2 || "").trim(),
      city: String(shippingAddress.city || "").trim(),
      state: String(shippingAddress.state || "").trim(),
      postalCode: String(shippingAddress.postalCode || "").trim(),
      country: String(shippingAddress.country || "India").trim()
    },
    cashfreeOrderId: data.order_id
  });

  return res.status(201).json({
    orderId: data.order_id,
    paymentSessionId: data.payment_session_id,
    environment,
    amounts: {
      subtotal,
      deliveryCharge,
      discountAmount,
      total: orderAmount
    }
  });
});

export default router;
