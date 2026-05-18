import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

// Runs the existing seedDemoData.js logic by importing it.
// This file exists so backend/server.js can `await` a seed function.

export default async function seedDemoDataRunner() {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is missing; cannot seed demo data.");
  }

  // If mongoose is not connected yet, connect (safe if already connected)
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGO_URI);
  }

  // Importing the seed script will execute it (it calls main())
  // We rely on the script to upsert demo data.
  const module = await import("./seedDemoData.js");

  // seedDemoData.js does not export anything; import is enough to run.
  return module;
}

