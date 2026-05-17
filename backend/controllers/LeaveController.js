import Leave from "../models/Leave.js";
import Employee from "../models/Employee.js";
import Department from "../models/Department.js";
import User from "../models/User.js";
import { getEmployeeProfileByUserId } from "../utils/profileRefs.js";
import { createNotification } from "../services/notificationService.js";

const LEAVE_LIMITS = {
  VACATION: { balanceKey: "annual", maxPerRequest: 10 },
  CASUAL: { balanceKey: "casual", maxPerRequest: 5 },
  SICK: { balanceKey: "sick", maxPerRequest: 7 }
};

function startOfDay(value) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function countDays(from, to) {
  return Math.floor((startOfDay(to) - startOfDay(from)) / 86400000) + 1;
}

export const applyLeave = async (req, res) => {
  try {
    const employeeProfile = await Employee.findOne({ userId: req.user.id })
      .populate("department", "name head")
      .populate("userId", "name");
    if (!employeeProfile) {
      return res.status(404).json({ message: "Employee profile not found" });
    }

    const { type, from, to, reason } = req.body;

    if (!type || !from || !to) {
      return res.status(400).json({ message: "type, from, and to are required" });
    }

    if (!String(reason || "").trim()) {
      return res.status(400).json({ message: "reason is required" });
    }

    const normalizedType = String(type).toUpperCase();
    const policy = LEAVE_LIMITS[normalizedType];
    if (!policy) {
      return res.status(400).json({ message: "Invalid leave type" });
    }

    const fromDate = startOfDay(from);
    const toDate = startOfDay(to);
    const today = startOfDay(new Date());

    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
      return res.status(400).json({ message: "Invalid leave date provided" });
    }
    if (fromDate < today) {
      return res.status(400).json({ message: "Backdated leave requests are not allowed" });
    }
    if (toDate < fromDate) {
      return res.status(400).json({ message: "Leave end date must be on or after the start date" });
    }

    const totalDays = countDays(fromDate, toDate);
    if (totalDays > policy.maxPerRequest) {
      return res.status(400).json({
        message: `${normalizedType} leave cannot exceed ${policy.maxPerRequest} days per request`
      });
    }

    const remainingBalance = employeeProfile.leaveBalance?.[policy.balanceKey] ?? 0;
    if (remainingBalance < totalDays) {
      return res.status(400).json({
        message: `Insufficient ${policy.balanceKey} leave balance. Remaining balance: ${remainingBalance}`
      });
    }

    const overlappingLeave = await Leave.findOne({
      employee: employeeProfile._id,
      status: { $in: ["PENDING", "APPROVED"] },
      from: { $lte: toDate },
      to: { $gte: fromDate }
    });
    if (overlappingLeave) {
      return res.status(400).json({ message: "A pending or approved leave already overlaps this date range" });
    }

    const leave = await Leave.create({
      employee: employeeProfile._id,
      type: normalizedType,
      from: fromDate,
      to: toDate,
      totalDays,
      reason: String(reason).trim(),
      status: "PENDING",
      approvalDepartment: employeeProfile.department?._id
    });

    const applicantName = employeeProfile.userId?.name || "A colleague";
    const recipients = new Set();
    if (employeeProfile.manager) recipients.add(employeeProfile.manager.toString());
    if (employeeProfile.department?.head) recipients.add(employeeProfile.department.head.toString());

    await Promise.all(
      [...recipients].map((recipientId) =>
        createNotification(
          recipientId,
          "Leave request submitted",
          `${applicantName} has requested ${normalizedType.toLowerCase()} leave from ${fromDate.toDateString()} to ${toDate.toDateString()}.`,
          "LEAVE",
          { leaveId: leave._id.toString() }
        )
      )
    );

    res.status(201).json({ message: "Leave applied", leave });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getMyLeaves = async (req, res) => {
  try {
    const employeeProfile = await getEmployeeProfileByUserId(req.user.id);
    if (!employeeProfile) {
      return res.status(404).json({ message: "Employee profile not found" });
    }

    const leaves = await Leave.find({ employee: employeeProfile._id })
      .populate("approvalDepartment", "name")
      .sort({ createdAt: -1 });
    res.json(leaves);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getAllLeaves = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};

    if (req.user.role === "MANAGER") {
      const [managedEmployees, headedDepartments] = await Promise.all([
        Employee.find({ manager: req.user.id }).select("_id"),
        Department.find({ head: req.user.id }).select("_id")
      ]);

      const managedEmployeeIds = managedEmployees.map((employee) => employee._id);
      const departmentEmployeeIds = headedDepartments.length
        ? (await Employee.find({ department: { $in: headedDepartments.map((department) => department._id) } }).select("_id"))
          .map((employee) => employee._id)
        : [];

      const visibleEmployeeIds = [...new Set([...managedEmployeeIds, ...departmentEmployeeIds].map(String))];
      filter.employee = { $in: visibleEmployeeIds };
    }

    const leaves = await Leave.find(filter).populate({
      path: "employee",
      populate: [
        { path: "userId", select: "name email" },
        { path: "department", select: "name" },
        { path: "manager", select: "name email" }
      ],
    })
      .populate("approvedBy", "name email")
      .populate("approvalDepartment", "name")
      .sort({ createdAt: -1 });
    res.json(leaves);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const approveLeave = async (req, res) => {
  try {
    const { comment } = req.body;

    const leave = await Leave.findById(req.params.id).populate({
      path: "employee",
      populate: { path: "department", select: "name head" }
    });

    if (!leave) {
      return res.status(404).json({ message: "Leave request not found" });
    }
    if (leave.status !== "PENDING") {
      return res.status(400).json({ message: "Only pending leaves can be approved" });
    }

    if (req.user.role === "MANAGER") {
      const isDepartmentHead = leave.employee?.department?.head && leave.employee.department.head.toString() === req.user.id;
      const isAssignedManager = leave.employee?.manager && leave.employee.manager.toString() === req.user.id;
      if (!isAssignedManager && !isDepartmentHead) {
        return res.status(403).json({ message: "You can only approve leave for employees you manage" });
      }
    }

    const policy = LEAVE_LIMITS[leave.type];
    const balanceKey = policy?.balanceKey;
    const currentBalance = leave.employee?.leaveBalance?.[balanceKey] ?? 0;

    if (currentBalance < leave.totalDays) {
      return res.status(400).json({ message: `Insufficient ${balanceKey} leave balance to approve this request` });
    }

    leave.status = "APPROVED";
    leave.approvedBy = req.user.id;
    leave.comment = comment || "";
    await leave.save();

    leave.employee.leaveBalance[balanceKey] = currentBalance - leave.totalDays;
    await leave.employee.save();

    if (leave.employee?.userId) {
      await createNotification(
        leave.employee.userId._id || leave.employee.userId,
        "Leave approved",
        `Your ${leave.type.toLowerCase()} leave request has been approved.`,
        "LEAVE",
        { leaveId: leave._id.toString() }
      );
    }

    res.json({ message: "Leave approved", leave });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const rejectLeave = async (req, res) => {
  try {
    const { comment } = req.body;

    const leave = await Leave.findById(req.params.id).populate({
      path: "employee",
      populate: { path: "department", select: "name head" }
    });

    if (!leave) {
      return res.status(404).json({ message: "Leave request not found" });
    }
    if (leave.status !== "PENDING") {
      return res.status(400).json({ message: "Only pending leaves can be rejected" });
    }

    if (req.user.role === "MANAGER") {
      const isDepartmentHead = leave.employee?.department?.head && leave.employee.department.head.toString() === req.user.id;
      const isAssignedManager = leave.employee?.manager && leave.employee.manager.toString() === req.user.id;
      if (!isAssignedManager && !isDepartmentHead) {
        return res.status(403).json({ message: "You can only reject leave for employees you manage" });
      }
    }

    leave.status = "REJECTED";
    leave.approvedBy = req.user.id;
    leave.comment = comment || "";
    await leave.save();

    if (leave.employee?.userId) {
      await createNotification(
        leave.employee.userId._id || leave.employee.userId,
        "Leave rejected",
        `Your ${leave.type.toLowerCase()} leave request has been rejected.`,
        "LEAVE",
        { leaveId: leave._id.toString() }
      );
    }

    res.json({ message: "Leave rejected", leave });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
