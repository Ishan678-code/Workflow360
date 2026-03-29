import mongoose from "mongoose";

export const payrollSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },
  month: { type: String, required: true },
  payrollNumber: { type: String, unique: true, sparse: true },
  status: {
    type: String,
    enum: ["GENERATED", "PAID"],
    default: "GENERATED"
  },
  grossSalary: { type: Number, default: 0 },
  deductions: { type: Number, default: 0 },
  netSalary: { type: Number, default: 0 },
  generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  breakdown: {
    totalDaysInMonth: Number,
    daysAttended: Number,
    leaveDays: Number,
    lopDays: Number,
    lopDeduction: Number,
    taxDeduction: Number,
    lateDays: Number,
    lateMinutes: Number,
    overtimeHours: Number
  }
}, { timestamps: true });

export default mongoose.model("Payroll", payrollSchema);
