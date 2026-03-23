import mongoose from "mongoose";

export const performanceSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  reviewer: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  rating: Number,
  feedback: String,
  period: String
}, { timestamps: true });

export default mongoose.model("PerformanceReview", performanceSchema);
