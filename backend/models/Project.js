import mongoose from "mongoose";

const projectSchema = new mongoose.Schema({
  code: { type: String, trim: true, uppercase: true },
  name: { type: String, required: true },
  description: String,
  clientName: String,
  budget: Number,
  startDate: Date,
  deadline: { type: Date, required: true },
  status: {
    type: String,
    enum: ["ACTIVE", "COMPLETED", "ON_HOLD", "CANCELLED"],
    default: "ACTIVE"
  },
  manager: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  department: { type: mongoose.Schema.Types.ObjectId, ref: "Department" },
  ownerManager: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  priority: {
    type: String,
    enum: ["LOW", "MEDIUM", "HIGH", "URGENT"],
    default: "MEDIUM"
  },
  estimatedHours: Number,
  utilizationTarget: { type: Number, default: 75 },
  requiredSkills: [String],
  employees: [{ type: mongoose.Schema.Types.ObjectId, ref: "Employee" }],
  milestones: [String],
  freelancers: [{ type: mongoose.Schema.Types.ObjectId, ref: "Freelancer" }]
}, { timestamps: true });

export default mongoose.model("Project", projectSchema);
