import Payroll from "../models/Payroll.js";
import Employee from "../models/Employee.js";
import Attendance from "../models/Attendance.js";
import Leave from "../models/Leave.js";
import { generatePayslipPDF } from "../services/pdfService.js";
import { getEmployeeProfileByUserId } from "../utils/profileRefs.js";

function getMonthRange(month) {
  const [year, mon] = month.split("-").map(Number);
  const from = new Date(year, mon - 1, 1);
  const to = new Date(year, mon, 0, 23, 59, 59);
  return { from, to, totalDaysInMonth: to.getDate() };
}

function countLeaveDays(leaves, from, to) {
  return leaves.reduce((sum, leave) => {
    const leaveFrom = new Date(Math.max(new Date(leave.from), from));
    const leaveTo = new Date(Math.min(new Date(leave.to), to));
    const days = Math.ceil((leaveTo - leaveFrom) / 86400000) + 1;
    return sum + Math.max(days, 0);
  }, 0);
}

function buildPayrollNumber(employee, month) {
  return `PAY-${month.replace("-", "")}-${employee.employeeCode || employee._id.toString().slice(-6).toUpperCase()}`;
}

function calculatePayrollForEmployee(employee, attendanceRecords, approvedLeaves, month, generatedBy = null) {
  const { from, to, totalDaysInMonth } = getMonthRange(month);
  const daysAttended = attendanceRecords.length;
  const leaveDays = countLeaveDays(approvedLeaves, from, to);
  const lateDays = attendanceRecords.filter((record) => (record.lateMinutes || 0) > 0).length;
  const totalLateMinutes = attendanceRecords.reduce((sum, record) => sum + (record.lateMinutes || 0), 0);
  const overtimeHours = +attendanceRecords.reduce((sum, record) => sum + (record.overtimeHours || 0), 0).toFixed(2);

  const grossSalary = employee.salary || 0;
  const perDayRate = totalDaysInMonth > 0 ? grossSalary / totalDaysInMonth : 0;
  const paidDays = daysAttended + leaveDays;
  const lopDays = Math.max(totalDaysInMonth - paidDays, 0);
  const lopDeduction = +(perDayRate * lopDays).toFixed(2);
  const taxDeduction = +(grossSalary * 0.10).toFixed(2);
  const deductions = +(lopDeduction + taxDeduction).toFixed(2);
  const netSalary = +(grossSalary - deductions).toFixed(2);

  return {
    employee: employee._id,
    month,
    payrollNumber: buildPayrollNumber(employee, month),
    status: "GENERATED",
    grossSalary,
    deductions,
    netSalary,
    generatedBy,
    breakdown: {
      totalDaysInMonth,
      daysAttended,
      leaveDays,
      lopDays,
      lopDeduction,
      taxDeduction,
      lateDays,
      lateMinutes: totalLateMinutes,
      overtimeHours
    }
  };
}

function serializePayrollRecord(payrollDoc) {
  const payroll = payrollDoc.toObject ? payrollDoc.toObject() : payrollDoc;
  return {
    ...payroll,
    employeeName: payroll.employee?.userId?.name || payroll.employee?.name || "Team Member",
    departmentName: payroll.employee?.department?.name || "Unassigned",
    designationTitle: payroll.employee?.designation?.title || payroll.employee?.designation || "Role pending"
  };
}

// POST /api/payroll/generate  (ADMIN only)
// Auto-calculates based on salary, attendance, and approved leaves
export const generatePayroll = async (req, res) => {
  try {
    const { employeeId, month } = req.body;   // month format: "2025-06"

    if (!employeeId || !month) {
      return res.status(400).json({ message: "employeeId and month are required" });
    }

    // Prevent duplicate payroll for same employee+month
    const existing = await Payroll.findOne({ employee: employeeId, month });
    if (existing) {
      return res.status(400).json({ message: `Payroll for ${month} already generated` });
    }

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    const { from, to } = getMonthRange(month);

    const [attendanceRecords, leaves] = await Promise.all([
      Attendance.find({
        employee: employeeId,
        date: { $gte: from, $lte: to },
        clockIn: { $exists: true }
      }),
      Leave.find({
        employee: employeeId,
        status: "APPROVED",
        from: { $lte: to },
        to: { $gte: from }
      })
    ]);

    const payroll = await Payroll.create(
      calculatePayrollForEmployee(employee, attendanceRecords, leaves, month, req.user.id)
    );

    res.status(201).json({ message: "Payroll generated", payroll });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/payroll/generate-bulk  (ADMIN — run payroll for ALL employees)
export const generateBulkPayroll = async (req, res) => {
  try {
    const { month } = req.body;
    if (!month) {
      return res.status(400).json({ message: "month is required (format: YYYY-MM)" });
    }

    const employees = await Employee.find();
    if (employees.length === 0) {
      return res.json({ message: "No employees found", results: [] });
    }

    const results = await Promise.allSettled(
      employees.map(async (emp) => {
        const existing = await Payroll.findOne({ employee: emp._id, month });
        if (existing) return { employeeId: emp._id, status: "skipped", reason: "already exists" };

        const { from, to } = getMonthRange(month);

        const [attendanceRecords, leaves] = await Promise.all([
          Attendance.find({ employee: emp._id, date: { $gte: from, $lte: to }, clockIn: { $exists: true } }),
          Leave.find({ employee: emp._id, status: "APPROVED", from: { $lte: to }, to: { $gte: from } })
        ]);

        const payrollPayload = calculatePayrollForEmployee(emp, attendanceRecords, leaves, month, req.user.id);
        await Payroll.create(payrollPayload);

        return { employeeId: emp._id, status: "generated", netSalary: payrollPayload.netSalary };
      })
    );

    const summary = {
      total     : results.length,
      generated : results.filter(r => r.value?.status === "generated").length,
      skipped   : results.filter(r => r.value?.status === "skipped").length,
      failed    : results.filter(r => r.status === "rejected").length
    };

    res.json({ message: "Bulk payroll completed", month, summary, results: results.map(r => r.value || r.reason) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/payroll  (ADMIN/MANAGER)
export const getAllPayroll = async (req, res) => {
  try {
    const { month, employeeId } = req.query;
    const filter = {};

    if (month)      filter.month = month;
    if (employeeId) filter.employee = employeeId;

    const payrolls = await Payroll
      .find(filter)
      .populate({
        path: "employee",
        populate: [
          { path: "userId", select: "name email" },
          { path: "department", select: "name" },
          { path: "designation", select: "title" }
        ]
      })
      .sort({ month: -1, createdAt: -1 });

    res.json(payrolls.map(serializePayrollRecord));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/payroll/my  (EMPLOYEE — own payslips)
export const getMyPayroll = async (req, res) => {
  try {
    const employeeProfile = await getEmployeeProfileByUserId(req.user.id);
    if (!employeeProfile) {
      return res.status(404).json({ message: "Employee profile not found" });
    }

    const payrolls = await Payroll
      .find({ employee: employeeProfile._id })
      .populate({
        path: "employee",
        populate: [
          { path: "userId", select: "name email" },
          { path: "department", select: "name" },
          { path: "designation", select: "title" }
        ]
      })
      .sort({ month: -1 });

    res.json(payrolls.map(serializePayrollRecord));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/payroll/:id
export const getPayrollById = async (req, res) => {
  try {
    const payroll = await Payroll
      .findById(req.params.id)
      .populate({
        path: "employee",
        populate: [
          { path: "userId", select: "name email" },
          { path: "department", select: "name" },
          { path: "designation", select: "title" }
        ]
      });

    if (!payroll) {
      return res.status(404).json({ message: "Payroll record not found" });
    }

    // Employees can only see their own payslip
    if (
      req.user.role === "EMPLOYEE"
    ) {
      const employeeProfile = await getEmployeeProfileByUserId(req.user.id);
      if (!employeeProfile || payroll.employee._id.toString() !== employeeProfile._id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }
    }

    res.json(serializePayrollRecord(payroll));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/payroll/:id/payslip  — download payslip as PDF
export const downloadPayslip = async (req, res) => {
  try {
    const payroll = await Payroll
      .findById(req.params.id)
      .populate({
        path    : "employee",
        populate: [
          { path: "userId",      select: "name email" },
          { path: "department",  select: "name" },
          { path: "designation", select: "title" }
        ]
      });

    if (!payroll) {
      return res.status(404).json({ message: "Payroll record not found" });
    }

    if (
      req.user.role === "EMPLOYEE"
    ) {
      const employeeProfile = await getEmployeeProfileByUserId(req.user.id);
      if (!employeeProfile || payroll.employee._id.toString() !== employeeProfile._id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }
    }

    const pdfBuffer = await generatePayslipPDF(payroll, payroll.employee);
    const filename  = `payslip-${payroll.employee?.employeeCode || payroll.employee._id}-${payroll.month}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(pdfBuffer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
