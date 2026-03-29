import Project from "../models/Project.js";
import Task from "../models/Task.js";
import Employee from "../models/Employee.js";
import { getFreelancerProfileByUserId } from "../utils/profileRefs.js";

async function buildProjectSummary(projectDoc) {
  const project = projectDoc.toObject ? projectDoc.toObject() : projectDoc;
  const [taskStats, employeeCount] = await Promise.all([
    Task.aggregate([
      { $match: { project: projectDoc._id } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $eq: ["$status", "COMPLETED"] }, 1, 0] }
          }
        }
      }
    ]),
    Employee.countDocuments({ _id: { $in: projectDoc.employees || [] } })
  ]);

  const totalTasks = taskStats[0]?.total || 0;
  const completedTasks = taskStats[0]?.completed || 0;
  const utilization = totalTasks > 0
    ? +((completedTasks / totalTasks) * 100).toFixed(1)
    : 0;

  return {
    ...project,
    summary: {
      totalTasks,
      completedTasks,
      employeeCount,
      freelancerCount: projectDoc.freelancers?.length || 0,
      averageUtilization: utilization,
      utilizationFormula: "completed_tasks / total_tasks * 100"
    }
  };
}

export const createProject = async (req, res) => {
  try {
    const {
      name,
      code,
      budget,
      deadline,
      startDate,
      freelancers,
      employees,
      description,
      clientName,
      requiredSkills,
      priority,
      department,
      ownerManager,
      estimatedHours,
      utilizationTarget,
      milestones
    } = req.body;

    if (!name || !deadline) {
      return res.status(400).json({ message: "name and deadline are required" });
    }

    const project = await Project.create({
      code,
      name,
      description,
      clientName,
      budget,
      startDate,
      deadline,
      freelancers: freelancers || [],
      employees: employees || [],
      manager: ownerManager || req.user.id,
      ownerManager: ownerManager || req.user.id,
      department,
      requiredSkills: requiredSkills || [],
      priority: priority || "MEDIUM",
      estimatedHours,
      utilizationTarget,
      milestones: milestones || [],
      status: "ACTIVE"
    });

    const populatedProject = await Project.findById(project._id)
      .populate("manager", "-password")
      .populate("ownerManager", "-password")
      .populate("department", "name code")
      .populate({ path: "employees", populate: { path: "userId", select: "name email" } })
      .populate({ path: "freelancers", populate: { path: "userId", select: "name email" } });

    res.status(201).json({ message: "Project created", project: await buildProjectSummary(populatedProject) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getProjects = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};

    if (status) filter.status = status;

    if (req.user.role === "FREELANCER") {
      const freelancerProfile = await getFreelancerProfileByUserId(req.user.id);
      if (!freelancerProfile) {
        return res.status(404).json({ message: "Freelancer profile not found" });
      }
      filter.freelancers = freelancerProfile._id;
    }

    const projects = await Project
      .find(filter)
      .populate("manager", "-password")
      .populate("ownerManager", "-password")
      .populate("department", "name code")
      .populate({ path: "employees", populate: { path: "userId", select: "name email" } })
      .populate({ path: "freelancers", populate: { path: "userId", select: "name email" } })
      .sort({ deadline: 1 });

    res.json(await Promise.all(projects.map(buildProjectSummary)));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getProjectById = async (req, res) => {
  try {
    const project = await Project
      .findById(req.params.id)
      .populate("manager", "-password")
      .populate("ownerManager", "-password")
      .populate("department", "name code")
      .populate({ path: "employees", populate: { path: "userId", select: "name email" } })
      .populate({ path: "freelancers", populate: { path: "userId", select: "name email" } });

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    res.json(await buildProjectSummary(project));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateProject = async (req, res) => {
  try {
    const project = await Project.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
      .populate("manager", "-password")
      .populate("ownerManager", "-password")
      .populate("department", "name code")
      .populate({ path: "employees", populate: { path: "userId", select: "name email" } })
      .populate({ path: "freelancers", populate: { path: "userId", select: "name email" } });

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    res.json({ message: "Project updated", project: await buildProjectSummary(project) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const assignFreelancer = async (req, res) => {
  try {
    const { freelancerId } = req.body;

    const project = await Project.findByIdAndUpdate(
      req.params.id,
      { $addToSet: { freelancers: freelancerId } },
      { new: true }
    ).populate("freelancers", "-password");

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    res.json({ message: "Freelancer assigned to project", project });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteProject = async (req, res) => {
  try {
    const project = await Project.findByIdAndDelete(req.params.id);

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    res.json({ message: "Project deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
