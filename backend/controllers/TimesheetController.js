import Timesheet from "../models/Timesheet.js";
import Project from "../models/Project.js";
import { getFreelancerProfileByUserId } from "../utils/profileRefs.js";

function startOfDay(value) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

async function canApproveTimesheet(user, timesheet) {
  if (user.role === "ADMIN") return true;
  const project = await Project.findById(timesheet.project).select("manager ownerManager");
  if (!project) return false;
  return [project.manager, project.ownerManager].some((id) => id?.toString() === user.id);
}

export const logTime = async (req, res) => {
  try {
    const freelancerProfile = await getFreelancerProfileByUserId(req.user.id);
    if (!freelancerProfile) {
      return res.status(404).json({ message: "Freelancer profile not found" });
    }

    const { project, hours, date } = req.body;

    if (!project || !hours || !date) {
      return res.status(400).json({ message: "project, hours, and date are required" });
    }

    const numericHours = Number(hours);
    if (numericHours <= 0 || numericHours > 24) {
      return res.status(400).json({ message: "Hours must be between 0 and 24" });
    }

    const entryDate = startOfDay(date);
    const today = startOfDay(new Date());
    if (Number.isNaN(entryDate.getTime())) {
      return res.status(400).json({ message: "date must be valid" });
    }
    if (entryDate > today) {
      return res.status(400).json({ message: "Future timesheets are not allowed" });
    }

    const assignedProject = await Project.findOne({
      _id: project,
      freelancers: freelancerProfile._id
    });
    if (!assignedProject) {
      return res.status(403).json({ message: "You can only log time for projects assigned to you" });
    }

    const existing = await Timesheet.findOne({
      freelancer: freelancerProfile._id,
      project,
      date: entryDate
    });
    if (existing) {
      return res.status(400).json({ message: "Timesheet already submitted for this project and date" });
    }

    const timesheet = await Timesheet.create({
      freelancer: freelancerProfile._id,
      project,
      hours: numericHours,
      date: entryDate,
      status: "PENDING"
    });

    res.status(201).json({ message: "Time logged", timesheet });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getMyTimesheets = async (req, res) => {
  try {
    const freelancerProfile = await getFreelancerProfileByUserId(req.user.id);
    if (!freelancerProfile) {
      return res.status(404).json({ message: "Freelancer profile not found" });
    }

    const { projectId } = req.query;
    const filter = { freelancer: freelancerProfile._id };
    if (projectId) filter.project = projectId;

    const timesheets = await Timesheet
      .find(filter)
      .populate("project", "name deadline")
      .populate({ path: "freelancer", populate: { path: "userId", select: "name email" } })
      .sort({ date: -1 });

    res.json(timesheets);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getAllTimesheets = async (req, res) => {
  try {
    const { freelancerId, projectId, status } = req.query;
    const filter = {};

    if (freelancerId) filter.freelancer = freelancerId;
    if (projectId) filter.project = projectId;
    if (status) filter.status = status;

    const timesheets = await Timesheet
      .find(filter)
      .populate({ path: "freelancer", populate: { path: "userId", select: "name email" } })
      .populate("project", "name")
      .sort({ date: -1 });

    res.json(timesheets);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const approveTimesheet = async (req, res) => {
  try {
    const timesheet = await Timesheet.findById(req.params.id);
    if (!timesheet) {
      return res.status(404).json({ message: "Timesheet not found" });
    }

    if (timesheet.status !== "PENDING") {
      return res.status(400).json({ message: "Only pending timesheets can be approved" });
    }

    if (!(await canApproveTimesheet(req.user, timesheet))) {
      return res.status(403).json({ message: "You can only approve timesheets for projects you manage" });
    }

    timesheet.status = "APPROVED";
    await timesheet.save();

    res.json({ message: "Timesheet approved", timesheet });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
