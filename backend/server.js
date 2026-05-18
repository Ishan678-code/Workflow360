import dotenv from "dotenv";
dotenv.config();
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import http from "http";
import router from "./routes/index.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { initSocket } from "./services/socketService.js";

const app = express();
app.use(cors({
  origin: [
    process.env.CLIENT_BASE_URL,
    'https://workflow360-git-main-ishan678-codes-projects.vercel.app',
    'http://localhost:5173'
  ],
  credentials: true
}));
app.use(express.json());

app.use("/api", router);
app.use(errorHandler);

const server = http.createServer(app);
initSocket(server);

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("MongoDB connected");

    // Optional: seed demo data automatically (for empty DBs / demos)
if (process.env.SEED_DEMO_DATA === "true") {
      try {
        console.log("SEED_DEMO_DATA=true => running demo seed...");
        const { default: runSeed } = await import("./scripts/seedDemoDataRunner.js");
        await runSeed();
        console.log("Demo seed completed.");
      } catch (seedErr) {
        console.error("Demo seed failed:", seedErr?.message || seedErr);
      }
    }
  })
  .catch((err) => console.error("MongoDB connection error:", err));


const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;