import mongoose from "mongoose";
import Employee from "../models/Employee.js";
import Role from "../models/Role.js";
import User from "../models/User.js";
import Department from "../models/Department.js";

const MANAGER_ALLOWED_UPDATE_FIELDS = new Set(["departmentId", "department", "designation", "workMode", "officeHours"]);

async function resolveDepartmentReference(department) {
  if (!department) return undefined;
  if (mongoose.Types.ObjectId.isValid(department)) return department;

  const name = String(department).trim();
  if (!name) return undefined;

  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const departmentNameRegex = new RegExp(`^${escapedName}$`, "i");

  let departmentRecord = await Department.findOne({ name: departmentNameRegex });
  if (!departmentRecord) {
    departmentRecord = await Department.create({ name });
  }

  return departmentRecord._id;
}

function isNonNegativeNumber(value) {
  return value === undefined || value === null || value === "" || Number(value) >= 0;
}

function sanitizeManagerEmployeeUpdates(payload) {
  return Object.fromEntries(
    Object.entries(payload).filter(([key]) => MANAGER_ALLOWED_UPDATE_FIELDS.has(key))
  );
}

export const createEmployee = async (req, res) => {
  try {
    const {
      userId,
      employeeCode,
      department,
      designation,
      manager,
      salary,
      joiningDate,
      phone,
      emergencyContact,
      employmentType,
      workMode,
      officeHours,
      leaveBalance
    } = req.body;

    if (!userId || !employeeCode) {
      return res.status(400).json({ message: "userId and employeeCode are required" });
    }

    if (!isNonNegativeNumber(salary)) {
      return res.status(400).json({ message: "salary cannot be negative" });
    }

    const [user, existingEmployee, existingCode] = await Promise.all([
      User.findById(userId),
      Employee.findOne({ userId }),
      Employee.findOne({ employeeCode })
    ]);

    if (!user) {
      return res.status(404).json({ message: "User account not found" });
    }
    if (existingEmployee) {
      return res.status(400).json({ message: "Employee profile already exists for this user" });
    }
    if (existingCode) {
      return res.status(400).json({ message: "Employee code is already in use" });
    }

    let designationId = designation;
    if (designation && typeof designation === "string" && !mongoose.Types.ObjectId.isValid(designation)) {
      let roleRecord = await Role.findOne({ title: designation.trim() });
      if (!roleRecord) {
        roleRecord = await Role.create({ title: designation.trim(), level: "CUSTOM" });
      }
      designationId = roleRecord._id;
    }

    const departmentId = await resolveDepartmentReference(department);

    const employee = await Employee.create({
      userId,
      employeeCode,
      department: departmentId,
      designation: designationId,
      manager,
      salary,
      joiningDate,
      phone,
      emergencyContact,
      employmentType,
      workMode,
      officeHours,
      leaveBalance
    });

    res.status(201).json({ message: "Employee created", employee });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getEmployees = async (req, res) => {
  try {
    const filter = {};
    if (req.user.role === "MANAGER") {
      const [managedEmployees, headedDepartments] = await Promise.all([
        Employee.find({ manager: req.user.id }).select("_id"),
        Department.find({ head: req.user.id }).select("_id")
      ]);

      const managedEmployeeIds = managedEmployees.map((employee) => employee._id.toString());
      const departmentEmployeeIds = headedDepartments.length
        ? (await Employee.find({ department: { $in: headedDepartments.map((department) => department._id) } }).select("_id"))
            .map((employee) => employee._id.toString())
        : [];

      const visibleEmployeeIds = [...new Set([...managedEmployeeIds, ...departmentEmployeeIds])];
      if (visibleEmployeeIds.length === 0) {
        return res.json([]);
      }

      filter._id = { $in: visibleEmployeeIds };
    }

    const employees = await Employee
      .find(filter)
      .populate("userId", "-password")
      .populate("department")
      .populate("designation")
      .populate("manager", "name email");
    res.json(employees);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getEmployeeById = async (req, res) => {
  try {
    const employee = await Employee
      .findById(req.params.id)
      .populate("userId", "-password")
      .populate("department")
      .populate("designation")
      .populate("manager", "name email");

    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    if (req.user.role === "EMPLOYEE" && employee.userId?._id?.toString() !== req.user.id) {
      return res.status(403).json({ message: "You can only view your own profile" });
    }

    if (req.user.role === "MANAGER") {
      const isAssignedManager = employee.manager?._id?.toString() === req.user.id;
      const isDepartmentHead = employee.department?.head?._id?.toString() === req.user.id || employee.department?.head?.toString() === req.user.id;
      if (!isAssignedManager && !isDepartmentHead) {
        return res.status(403).json({ message: "You can only view employees you manage" });
      }
    }

    res.json(employee);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateEmployee = async (req, res) => {
  try {
    const existing = await Employee.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ message: "Employee not found" });
    }

    if (req.user.role === "MANAGER") {
      const isAssignedManager = existing.manager?.toString() === req.user.id;
      const isDepartmentHead = existing.department && (await Department.findById(existing.department).select("head")).head?.toString() === req.user.id;
      if (!isAssignedManager && !isDepartmentHead) {
        return res.status(403).json({ message: "You can only update employees you manage" });
      }
    }

    const updates = req.user.role === "MANAGER"
      ? sanitizeManagerEmployeeUpdates(req.body)
      : { ...req.body };

    if (updates.departmentId) {
      if (typeof updates.departmentId === "string" && !mongoose.Types.ObjectId.isValid(updates.departmentId)) {
        updates.departmentId = await resolveDepartmentReference(updates.departmentId);
      }
      updates.department = updates.departmentId;
      delete updates.departmentId;
    }

    if (!isNonNegativeNumber(updates.salary)) {
      return res.status(400).json({ message: "salary cannot be negative" });
    }

    if (req.user.role === "MANAGER" && Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "No permitted employee fields provided" });
    }

    const employee = await Employee.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    )
      .populate("userId", "-password")
      .populate("department")
      .populate("designation")
      .populate("manager", "name email");

    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    res.json({ message: "Employee updated", employee });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deactivateEmployee = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);

    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    await User.findByIdAndUpdate(employee.userId, { isActive: false });

    res.json({ message: "Employee deactivated successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
