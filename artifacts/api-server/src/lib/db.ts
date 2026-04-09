import mongoose from "mongoose";
import { logger } from "./logger.js";

const MONGODB_URI = process.env["MONGODB_URI"];

if (!MONGODB_URI) {
  throw new Error("MONGODB_URI environment variable is required but was not provided.");
}

let isConnected = false;

export async function connectDB(): Promise<void> {
  if (isConnected) return;
  await mongoose.connect(MONGODB_URI, { dbName: "attendance_portal" });
  isConnected = true;
  logger.info("Connected to MongoDB");
}

export default mongoose;
