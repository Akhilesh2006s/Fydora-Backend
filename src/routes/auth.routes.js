import { Router } from "express";
import bcrypt from "bcryptjs";
import { Admin } from "../models/Admin.js";
import { User } from "../models/User.js";
import { signToken } from "../utils/auth.js";
import { protect } from "../middleware/auth.js";

const router = Router();

router.post("/admin/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  const admin = await Admin.findOne({ email: email.toLowerCase() });
  if (!admin || !admin.active) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const isValid = await bcrypt.compare(password, admin.passwordHash);
  if (!isValid) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const token = signToken({
    id: admin._id.toString(),
    role: admin.role,
    email: admin.email,
    permissions: admin.permissions
  });

  return res.json({
    token,
    admin: {
      id: admin._id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      permissions: admin.permissions
    }
  });
});

router.post("/google/session", async (req, res) => {
  const { uid, name, email, picture } = req.body;
  if (!uid || !email || !name) {
    return res.status(400).json({ message: "uid, name and email are required" });
  }

  const user = await User.findOneAndUpdate(
    { uid },
    { uid, name, email: email.toLowerCase(), picture, lastLoginAt: new Date() },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  if (user.isBanned) {
    return res.status(403).json({ message: "User account is banned" });
  }

  const token = signToken({ id: user._id.toString(), role: "USER", email: user.email, uid: user.uid });
  return res.json({ token, user });
});

router.get("/me", protect, async (req, res) => {
  if (req.user.role === "USER") {
    const user = await User.findById(req.user.id);
    return res.json({ role: "USER", profile: user });
  }
  const admin = await Admin.findById(req.user.id);
  return res.json({ role: admin?.role, profile: admin });
});

export default router;
