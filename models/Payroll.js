import mongoose from "mongoose";

 export const payrollSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: "Employee" },
  month: String,
  grossSalary: Number,
  deductions: Number,
  netSalary: Number
}, { timestamps: true });

export default mongoose.model("Payroll", payrollSchema);
