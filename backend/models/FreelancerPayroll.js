import mongoose from "mongoose";

const freelancerPayrollSchema = new mongoose.Schema(
  {
    freelancer: { type: mongoose.Schema.Types.ObjectId, ref: "Freelancer", required: true },
    month: { type: String, required: true },
    payrollNumber: { type: String, unique: true, sparse: true },
    status: {
      type: String,
      enum: ["GENERATED", "PAID"],
      default: "GENERATED",
    },
    grossPay: { type: Number, default: 0 },
    deductions: { type: Number, default: 0 },
    netPay: { type: Number, default: 0 },
    generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    breakdown: {
      totalHours: { type: Number, default: 0 },
      hourlyRate: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

export default mongoose.model("FreelancerPayroll", freelancerPayrollSchema);

