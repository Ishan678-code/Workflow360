import mongoose from "mongoose";

const freelancerSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  hourlyRate: { type: Number, min: 0, default: 0 },
  skills: [String],
  portfolioUrl: String,
  timezone: String
}, { timestamps: true });

const Freelancer=mongoose.model("Freelancer",freelancerSchema);
export default Freelancer;
