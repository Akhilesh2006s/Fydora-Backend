import { Router } from "express";
import { Banner } from "../models/Banner.js";
import { Brand } from "../models/Brand.js";
import { Category } from "../models/Category.js";
import { Product } from "../models/Product.js";
import { FilterConfig } from "../models/FilterConfig.js";
import { LayoutConfig } from "../models/LayoutConfig.js";
import { Promotion } from "../models/Promotion.js";
import { CheckoutConfig } from "../models/CheckoutConfig.js";

const router = Router();

router.get("/homepage", async (_req, res) => {
  const [banners, brands, trending, featured, layout] = await Promise.all([
    Banner.find({ visible: true }).sort({ order: 1 }),
    Brand.find({ status: "active" }).limit(12),
    Product.find({ status: "active", isTrending: true }).limit(10).populate("brand"),
    Product.find({ status: "active", isFeatured: true }).limit(10).populate("brand"),
    LayoutConfig.findOne({ scope: "homepage" })
  ]);

  return res.json({ banners, brands, trending, featured, layout });
});

router.get("/filters", async (_req, res) => {
  const filters = await FilterConfig.findOne({ scope: "storefront" });
  return res.json(filters);
});

router.get("/products", async (req, res) => {
  const { q, category, brand, minPrice, maxPrice, size, color, sort = "newest", page = 1, limit = 12 } = req.query;
  const query = { status: "active" };

  if (q) query.name = { $regex: q, $options: "i" };
  if (category) query.category = category;
  if (brand) query.brand = brand;
  if (size) query.sizes = size;
  if (color) query.colors = color;
  if (minPrice || maxPrice) {
    query.price = {};
    if (minPrice) query.price.$gte = Number(minPrice);
    if (maxPrice) query.price.$lte = Number(maxPrice);
  }

  const sortMap = {
    newest: { createdAt: -1 },
    priceAsc: { price: 1 },
    priceDesc: { price: -1 },
    popularity: { rating: -1 }
  };

  const pageNumber = Number(page);
  const pageLimit = Number(limit);
  const [items, total] = await Promise.all([
    Product.find(query)
      .populate("brand category")
      .sort(sortMap[sort] || sortMap.newest)
      .skip((pageNumber - 1) * pageLimit)
      .limit(pageLimit),
    Product.countDocuments(query)
  ]);

  return res.json({ items, total, page: pageNumber, pages: Math.ceil(total / pageLimit) });
});

router.get("/products/:id", async (req, res) => {
  const product = await Product.findById(req.params.id).populate("brand category");
  if (!product) return res.status(404).json({ message: "Product not found" });
  return res.json(product);
});

router.get("/categories", async (_req, res) => res.json(await Category.find({ status: "active" })));
router.get("/brands", async (_req, res) => res.json(await Brand.find({ status: "active" })));

router.get("/checkout-config", async (_req, res) => {
  const config = await CheckoutConfig.findOne({ scope: "default" });
  return res.json(config || { scope: "default", deliveryChargeEnabled: false, deliveryChargeAmount: 0 });
});

router.get("/coupons/active", async (_req, res) => {
  const now = new Date();
  const coupons = await Promotion.find({
    active: true,
    startsAt: { $lte: now },
    endsAt: { $gte: now }
  })
    .sort({ createdAt: -1 })
    .select("name description discountPercent startsAt endsAt");
  return res.json(coupons);
});

export default router;
