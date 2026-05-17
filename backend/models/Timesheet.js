import mongoose from "mongoose";

const timesheetSchema = new mongoose.Schema({
  freelancer: { type: mongoose.Schema.Types.ObjectId, ref: "Freelancer", required: true },
  project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true },
  hours: { type: Number, required: true, min: 0.01, max: 24 },
  date: { type: Date, required: true },
  description: String,
  qualityRating: { type: Number, min: 1, max: 5 },
  status: {
    type: String,
    enum: ["PENDING", "APPROVED", "REJECTED"],
    default: "PENDING"
  }
}, { timestamps: true });

timesheetSchema.index({ freelancer: 1, project: 1, date: 1 }, { unique: true });

export default mongoose.model("Timesheet", timesheetSchema);
