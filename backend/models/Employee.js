import mongoose from "mongoose";

const employeeSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  employeeCode: String,
  department: { type: mongoose.Schema.Types.ObjectId, ref: "Department" },
  designation: { type: mongoose.Schema.Types.ObjectId, ref: "Role" },
  manager: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  salary: Number,
  joiningDate: Date,
  phone: String,
  emergencyContact: String,
  employmentType: {
    type: String,
    enum: ["FULL_TIME", "PART_TIME", "CONTRACT", "INTERN"],
    default: "FULL_TIME"
  },
  workMode: {
    type: String,
    enum: ["ONSITE", "HYBRID", "REMOTE"],
    default: "ONSITE"
  },
  officeHours: {
    start: { type: String, default: "09:00" },
    end: { type: String, default: "17:00" }
  },
  leaveBalance: {
    annual: { type: Number, default: 30 },
    sick: { type: Number, default: 12 },
    casual: { type: Number, default: 12 }
  }
}, { timestamps: true });

const Employee=mongoose.model("Employee",employeeSchema);
export default Employee;
