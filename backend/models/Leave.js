import mongoose from "mongoose";

const leaveSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: "Employee" },
  type: { type: String, enum: ["SICK", "CASUAL", "VACATION"] },
  from: Date,
  to: Date,
  totalDays: Number,
  reason: String,
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
