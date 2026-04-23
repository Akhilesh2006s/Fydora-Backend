import bcrypt from "bcryptjs";
import { Admin } from "../models/Admin.js";

export async function seedSuperAdmin() {
  const email = process.env.SUPER_ADMIN_EMAIL?.toLowerCase();
  const password = process.env.SUPER_ADMIN_PASSWORD;

  if (!email || !password) return;

  const exists = await Admin.findOne({ email });
  if (exists) return;

  const passwordHash = await bcrypt.hash(password, 10);
  await Admin.create({
    name: "Super Admin",
    email,
    passwordHash,
    role: "SUPER_ADMIN",
    permissions: ["*"],
    active: true
  });

  console.log("Super admin seeded");
}
