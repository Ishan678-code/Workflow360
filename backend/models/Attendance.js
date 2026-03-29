import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: "Employee" },
  date: Date,
  clockIn: Date,
  clockOut: Date,
  terminalId: String,
  officeStart: String,
  officeEnd: String,
  lateMinutes: { type: Number, default: 0 },
  earlyExitMinutes: { type: Number, default: 0 },
  overtimeHours: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ["ON_TIME", "LATE", "EARLY_EXIT", "COMPLETED"],
    default: "ON_TIME"
  }
}, { timestamps: true });

const Attendance=mongoose.model('Attendance',attendanceSchema);
export default Attendance;
