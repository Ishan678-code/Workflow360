import mongoose from "mongoose";

const leaveSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },
  type: { type: String, enum: ["SICK", "CASUAL", "VACATION"], required: true },
  from: { type: Date, required: true },
  to: { type: Date, required: true },
  totalDays: { type: Number, min: 1, required: true },
  reason: { type: String, required: true, trim: true },
  status: {
    type: String,
    enum: ["PENDING", "APPROVED", "REJECTED"],
    default: "PENDING"
  },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  comment: String,
  approvalDepartment: { type: mongoose.Schema.Types.ObjectId, ref: "Department" }
}, { timestamps: true });

export default mongoose.model("Leave", leaveSchema);
