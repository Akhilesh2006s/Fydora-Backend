import mongoose from "mongoose";

export async function connectDB(uri) {
  try {
    await mongoose.connect(uri, {
      dbName: "FashionForge"
    });
    console.log("MongoDB connected");
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  }
}
