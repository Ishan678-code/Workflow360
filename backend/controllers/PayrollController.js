import Payroll from "../models/Payroll.js";
import Employee from "../models/Employee.js";
import Attendance from "../models/Attendance.js";
import Leave from "../models/Leave.js";
import { generatePayslipPDF } from "../services/pdfService.js";
import { getEmployeeProfileByUserId } from "../utils/profileRefs.js";

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

    // Parse month range
    const [year, mon]  = month.split("-").map(Number);
    const from         = new Date(year, mon - 1, 1);
    const to           = new Date(year, mon, 0, 23, 59, 59);
    const totalDaysInMonth = to.getDate();

    // Count working days attended
    const attendanceRecords = await Attendance.find({
      employee : employeeId,
      date     : { $gte: from, $lte: to },
      clockIn  : { $exists: true }
    });
    const daysAttended = attendanceRecords.length;

    // Count approved leave days in the month
    const leaves = await Leave.find({
      employee : employeeId,
      status   : "APPROVED",
      from     : { $lte: to },
      to       : { $gte: from }
    });
    const leaveDays = leaves.reduce((sum, l) => {
      const leaveFrom = new Date(Math.max(l.from, from));
      const leaveTo   = new Date(Math.min(l.to, to));
      const days = Math.ceil((leaveTo - leaveFrom) / (1000 * 60 * 60 * 24)) + 1;
      return sum + Math.max(days, 0);
    }, 0);

    // ── Payroll calculation ────────────────────────────────────────────────
    const grossSalary   = employee.salary || 0;
    const perDayRate    = grossSalary / totalDaysInMonth;
    const paidDays      = daysAttended + leaveDays;
    const lopDays       = Math.max(totalDaysInMonth - paidDays, 0);   // Loss of Pay
    const lopDeduction  = +(perDayRate * lopDays).toFixed(2);

    // Tax deduction: flat 10% (can be made configurable)
    const taxDeduction  = +(grossSalary * 0.10).toFixed(2);
    const totalDeductions = +(lopDeduction + taxDeduction).toFixed(2);
    const netSalary       = +(grossSalary - totalDeductions).toFixed(2);

    const payroll = await Payroll.create({
      employee    : employeeId,
      month,
      grossSalary,
      deductions  : totalDeductions,
      netSalary,
      breakdown: {
        totalDaysInMonth,
        daysAttended,
        leaveDays,
        lopDays,
        lopDeduction,
        taxDeduction
      }
    });

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

        const [year, mon]       = month.split("-").map(Number);
        const from              = new Date(year, mon - 1, 1);
        const to                = new Date(year, mon, 0, 23, 59, 59);
        const totalDaysInMonth  = to.getDate();

        const [attendanceRecords, leaves] = await Promise.all([
          Attendance.find({ employee: emp._id, date: { $gte: from, $lte: to }, clockIn: { $exists: true } }),
          Leave.find({ employee: emp._id, status: "APPROVED", from: { $lte: to }, to: { $gte: from } })
        ]);

        const daysAttended  = attendanceRecords.length;
        const leaveDays     = leaves.reduce((sum, l) => {
          const lf   = new Date(Math.max(l.from, from));
          const lt   = new Date(Math.min(l.to, to));
          return sum + Math.max(Math.ceil((lt - lf) / 86400000) + 1, 0);
        }, 0);

        const grossSalary     = emp.salary || 0;
        const perDayRate      = grossSalary / totalDaysInMonth;
        const lopDays         = Math.max(totalDaysInMonth - daysAttended - leaveDays, 0);
        const lopDeduction    = +(perDayRate * lopDays).toFixed(2);
        const taxDeduction    = +(grossSalary * 0.10).toFixed(2);
        const totalDeductions = +(lopDeduction + taxDeduction).toFixed(2);
        const netSalary       = +(grossSalary - totalDeductions).toFixed(2);

        await Payroll.create({
          employee: emp._id, month, grossSalary,
          deductions: totalDeductions, netSalary,
          breakdown: { totalDaysInMonth, daysAttended, leaveDays, lopDays, lopDeduction, taxDeduction }
        });

        return { employeeId: emp._id, status: "generated", netSalary };
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

    res.json(payrolls);
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
      .sort({ month: -1 });

    res.json(payrolls);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/payroll/:id
export const getPayrollById = async (req, res) => {
  try {
    const payroll = await Payroll
      .findById(req.params.id)
      .populate("employee");

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

    res.json(payroll);
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
