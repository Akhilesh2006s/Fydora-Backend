import "dotenv/config";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import { connectDB } from "./config/db.js";
import { seedSuperAdmin } from "./bootstrap/seedSuperAdmin.js";
import authRoutes from "./routes/auth.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import catalogRoutes from "./routes/catalog.routes.js";
import orderRoutes from "./routes/order.routes.js";

const app = express();
const port = process.env.PORT || 5000;

const configuredOrigins = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsOptions = {
  origin(origin, callback) {
    if (!origin) return callback(null, true);

    const isConfigured = configuredOrigins.includes(origin);
    const isLocalhost = /^https?:\/\/localhost:\d+$/.test(origin);
    if (isConfigured || isLocalhost) return callback(null, true);

    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(express.json({ limit: "25mb" }));
app.use(morgan("dev"));

app.get("/api/health", (_req, res) => res.json({ ok: true, service: "fashionforge-backend" }));
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/catalog", catalogRoutes);
app.use("/api/orders", orderRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  return res.status(500).json({ message: "Internal server error" });
});

async function bootstrap() {
  await connectDB(process.env.MONGO_URI);
  await seedSuperAdmin();
  app.listen(port, () => {
    console.log(`FashionForge backend running on ${port}`);
  });
}

bootstrap();
