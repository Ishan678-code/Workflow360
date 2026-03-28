import Leave from "../models/Leave.js";
import { getEmployeeProfileByUserId } from "../utils/profileRefs.js";

export const applyLeave = async (req, res) => {
  try {
    const employeeProfile = await getEmployeeProfileByUserId(req.user.id);
    if (!employeeProfile) {
      return res.status(404).json({ message: "Employee profile not found" });
    }

    const { type, from, to, reason } = req.body;

    if (!type || !from || !to) {
      return res.status(400).json({ message: "type, from, and to are required" });
    }

    const leave = await Leave.create({
      employee: employeeProfile._id,
      type,
      from,
      to,
      reason,
      status: "PENDING"
    });

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

    const leaves = await Leave.find({ employee: employeeProfile._id }).sort({ createdAt: -1 });
    res.json(leaves);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getAllLeaves = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};
    const leaves = await Leave.find(filter).populate({
      path: "employee",
      populate: [
        { path: "userId", select: "name email" },
        { path: "department", select: "name" },
      ],
    }).sort({ createdAt: -1 });
    res.json(leaves);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const approveLeave = async (req, res) => {
  try {
    const { comment } = req.body;

    const leave = await Leave.findByIdAndUpdate(
      req.params.id,
      { status: "APPROVED", approvedBy: req.user.id, comment: comment || "" },
      { new: true }
    );

    if (!leave) {
      return res.status(404).json({ message: "Leave request not found" });
    }

    res.json({ message: "Leave approved", leave });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const rejectLeave = async (req, res) => {
  try {
    const { comment } = req.body;

    const leave = await Leave.findByIdAndUpdate(
      req.params.id,
      { status: "REJECTED", approvedBy: req.user.id, comment: comment || "" },
      { new: true }
    );

    if (!leave) {
      return res.status(404).json({ message: "Leave request not found" });
    }

    res.json({ message: "Leave rejected", leave });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
