import { Router } from "express";
import bcrypt from "bcryptjs";
import { protect, allowRoles } from "../middleware/auth.js";
import { Admin } from "../models/Admin.js";
import { User } from "../models/User.js";
import { Brand } from "../models/Brand.js";
import { Category } from "../models/Category.js";
import { Product } from "../models/Product.js";
import { Banner } from "../models/Banner.js";
import { FilterConfig } from "../models/FilterConfig.js";
import { LayoutConfig } from "../models/LayoutConfig.js";
import { Promotion } from "../models/Promotion.js";
import { Order } from "../models/Order.js";
import { CheckoutConfig } from "../models/CheckoutConfig.js";

const router = Router();

router.use(protect, allowRoles("SUPER_ADMIN", "ADMIN"));

function toSlug(value = "") {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

router.get("/dashboard", async (_req, res) => {
  const [totalUsers, totalOrders, products, revenueResult] = await Promise.all([
    User.countDocuments(),
    Order.countDocuments(),
    Product.countDocuments({ status: "active" }),
    Order.aggregate([{ $group: { _id: null, revenue: { $sum: "$total" } } }])
  ]);

  return res.json({
    totalUsers,
    totalOrders,
    activeProducts: products,
    revenue: revenueResult[0]?.revenue || 0
  });
});

router.post("/admins", allowRoles("SUPER_ADMIN"), async (req, res) => {
  const { name, email, password, permissions = [] } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ message: "name, email and password are required" });
  }

  const exists = await Admin.findOne({ email: email.toLowerCase() });
  if (exists) return res.status(409).json({ message: "Admin already exists" });

  const passwordHash = await bcrypt.hash(password, 10);
  const admin = await Admin.create({
    name,
    email: email.toLowerCase(),
    passwordHash,
    role: "ADMIN",
    permissions
  });

  return res.status(201).json(admin);
});

router.get("/users", async (_req, res) => {
  const users = await User.find().sort({ createdAt: -1 }).lean();
  return res.json(users);
});

router.patch("/users/:id/ban", async (req, res) => {
  const { isBanned } = req.body;
  const user = await User.findByIdAndUpdate(req.params.id, { isBanned: !!isBanned }, { new: true });
  return res.json(user);
});

router.get("/orders", async (_req, res) => {
  const orders = await Order.find().populate("user", "name email").populate("items.product", "name").sort({ createdAt: -1 });
  return res.json(orders);
});

router.patch("/orders/:id/status", async (req, res) => {
  const { status } = req.body;
  const order = await Order.findByIdAndUpdate(req.params.id, { status }, { new: true });
  return res.json(order);
});

router.get("/brands", async (_req, res) => res.json(await Brand.find().sort({ createdAt: -1 })));
router.post("/brands", async (req, res) => res.status(201).json(await Brand.create(req.body)));
router.put("/brands/:id", async (req, res) => res.json(await Brand.findByIdAndUpdate(req.params.id, req.body, { new: true })));
router.delete("/brands/:id", async (req, res) => {
  await Brand.findByIdAndDelete(req.params.id);
  return res.json({ ok: true });
});

router.get("/categories", async (_req, res) => res.json(await Category.find().sort({ createdAt: -1 })));
router.post("/categories", async (req, res) => {
  try {
    const payload = { ...req.body };
    if (!payload.slug && payload.name) {
      payload.slug = toSlug(payload.name);
    }
    const created = await Category.create(payload);
    return res.status(201).json(created);
  } catch (error) {
    if (error?.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }
    if (error?.code === 11000) {
      return res.status(409).json({ message: "Category slug already exists" });
    }
    return res.status(500).json({ message: "Failed to create category" });
  }
});
router.put("/categories/:id", async (req, res) => {
  try {
    const payload = { ...req.body };
    if ("name" in payload && !payload.slug) {
      payload.slug = toSlug(payload.name);
    }
    const updated = await Category.findByIdAndUpdate(req.params.id, payload, {
      new: true,
      runValidators: true
    });
    return res.json(updated);
  } catch (error) {
    if (error?.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }
    if (error?.code === 11000) {
      return res.status(409).json({ message: "Category slug already exists" });
    }
    return res.status(500).json({ message: "Failed to update category" });
  }
});
router.delete("/categories/:id", async (req, res) => {
  await Category.findByIdAndDelete(req.params.id);
  return res.json({ ok: true });
});

router.get("/products", async (_req, res) => res.json(await Product.find().populate("category brand").sort({ createdAt: -1 })));
router.post("/products", async (req, res) => res.status(201).json(await Product.create(req.body)));
router.put("/products/:id", async (req, res) => res.json(await Product.findByIdAndUpdate(req.params.id, req.body, { new: true })));
router.delete("/products/:id", async (req, res) => {
  await Product.findByIdAndDelete(req.params.id);
  return res.json({ ok: true });
});

router.get("/banners", async (_req, res) => res.json(await Banner.find().sort({ order: 1, createdAt: -1 })));
router.post("/banners", async (req, res) => res.status(201).json(await Banner.create(req.body)));
router.put("/banners/:id", async (req, res) => res.json(await Banner.findByIdAndUpdate(req.params.id, req.body, { new: true })));
router.delete("/banners/:id", async (req, res) => {
  await Banner.findByIdAndDelete(req.params.id);
  return res.json({ ok: true });
});

router.get("/filters", async (_req, res) => {
  const config = await FilterConfig.findOne({ scope: "storefront" });
  return res.json(config);
});

router.put("/filters", async (req, res) => {
  const config = await FilterConfig.findOneAndUpdate(
    { scope: "storefront" },
    { filters: req.body.filters || [] },
    { new: true, upsert: true }
  );
  return res.json(config);
});

router.get("/layout", async (_req, res) => {
  const layout = await LayoutConfig.findOne({ scope: "homepage" });
  return res.json(layout);
});

router.get("/checkout-config", async (_req, res) => {
  const config = await CheckoutConfig.findOne({ scope: "default" });
  return res.json(config || { scope: "default", deliveryChargeEnabled: false, deliveryChargeAmount: 0 });
});

router.put("/checkout-config", async (req, res) => {
  const deliveryChargeEnabled = Boolean(req.body.deliveryChargeEnabled);
  const deliveryChargeAmount = Math.max(0, Number(req.body.deliveryChargeAmount || 0));
  const config = await CheckoutConfig.findOneAndUpdate(
    { scope: "default" },
    { deliveryChargeEnabled, deliveryChargeAmount },
    { new: true, upsert: true }
  );
  return res.json(config);
});

router.put("/layout", async (req, res) => {
  const layout = await LayoutConfig.findOneAndUpdate(
    { scope: "homepage" },
    { sections: req.body.sections || [] },
    { new: true, upsert: true }
  );
  return res.json(layout);
});

router.get("/promotions", async (_req, res) => res.json(await Promotion.find().sort({ createdAt: -1 })));
router.post("/promotions", async (req, res) => res.status(201).json(await Promotion.create(req.body)));
router.put("/promotions/:id", async (req, res) => res.json(await Promotion.findByIdAndUpdate(req.params.id, req.body, { new: true })));
router.delete("/promotions/:id", async (req, res) => {
  await Promotion.findByIdAndDelete(req.params.id);
  return res.json({ ok: true });
});

router.get("/analytics/sales", async (_req, res) => {
  const byDay = await Order.aggregate([
    { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, revenue: { $sum: "$total" }, orders: { $sum: 1 } } },
    { $sort: { _id: 1 } }
  ]);
  return res.json(byDay);
});

export default router;
