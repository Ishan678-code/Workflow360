import mongoose from "mongoose";

const departmentSchema = new mongoose.Schema({
  code: {
    type: String,
    trim: true,
    uppercase: true
  },
  name: {
    type: String,
    required: true,
    unique: true
  },
  description: String,
  head: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  parentDepartment: { type: mongoose.Schema.Types.ObjectId, ref: "Department", default: null },
  location: String
}, { timestamps: true });

const Department = mongoose.model("Department", departmentSchema);
export default Department;
