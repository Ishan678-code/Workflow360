import Task from "../models/Task.js";
import User from "../models/User.js";
import Project from "../models/Project.js";
import { prioritizeTasks, quadrantSummary } from "../services/taskPriorityService.js";
import { createNotification } from "../services/notificationService.js";

const VALID_STATUSES = ["TODO", "IN_PROGRESS", "COMPLETED"];
const VALID_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"];

function startOfDay(value) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

async function canManageProject(user, projectId) {
  if (user.role === "ADMIN") return true;
  const project = await Project.findById(projectId).select("manager ownerManager");
  if (!project) return false;
  return [project.manager, project.ownerManager].some((id) => id?.toString() === user.id);
}

export const createTask = async (req, res) => {
  try {
    const { title, description, project, assignee, priority, deadline, tags } = req.body;

    if (!title || !project) {
      return res.status(400).json({ message: "title and project are required" });
    }

    if (priority && !VALID_PRIORITIES.includes(priority)) {
      return res.status(400).json({ message: "Invalid priority" });
    }

    if (deadline) {
      const deadlineDate = startOfDay(deadline);
      const today = startOfDay(new Date());
      if (Number.isNaN(deadlineDate.getTime())) {
        return res.status(400).json({ message: "deadline must be a valid date" });
      }
      if (deadlineDate < today) {
        return res.status(400).json({ message: "deadline cannot be in the past" });
      }
    }

    if (!(await canManageProject(req.user, project))) {
      return res.status(403).json({ message: "You can only create tasks for projects you manage" });
    }

    const task = await Task.create({
      title: String(title).trim(),
      description,
      project,
      assignee,
      createdBy: req.user.id,
      priority: priority || "MEDIUM",
      deadline,
      tags: tags || [],
      status: "TODO"
    });

    if (assignee) {
      const creator = await User.findById(req.user.id).select("name");
      const creatorName = creator?.name || "A team member";

      await createNotification(
        assignee,
        "New task assigned",
        `${creatorName} assigned you a new task: ${title}.`,
        "TASK",
        { taskId: task._id.toString(), project }
      );
    }

    res.status(201).json({ message: "Task created", task });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getTasksByProject = async (req, res) => {
  try {
    const { status, priority } = req.query;
    const filter = { project: req.params.projectId };

    if (status) filter.status = status;
    if (priority) filter.priority = priority;

    const tasks = await Task
      .find(filter)
      .populate("assignee", "-password")
      .populate("createdBy", "-password")
      .sort({ deadline: 1 });

    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getMyTasks = async (req, res) => {
  try {
    const { includeCompleted } = req.query;
    const shouldIncludeCompleted = String(includeCompleted).toLowerCase() === "true";

    const statusFilter = shouldIncludeCompleted
      ? {}
      : { status: { $ne: "COMPLETED" } };

    const tasks = await Task
      .find({ assignee: req.user.id, ...statusFilter })
      .populate("project", "name deadline")
      .sort({ deadline: 1 });

    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


export const updateTaskStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    const isAssignee = task.assignee?.toString() === req.user.id;
    const isProjectManager = await canManageProject(req.user, task.project);
    if (!isAssignee && !isProjectManager) {
      return res.status(403).json({ message: "You can only update tasks assigned to you or projects you manage" });
    }

    task.status = status;
    await task.save();

    res.json({ message: "Task status updated", task });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateTask = async (req, res) => {
  try {
    const existing = await Task.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ message: "Task not found" });
    }
    if (!(await canManageProject(req.user, existing.project))) {
      return res.status(403).json({ message: "You can only update tasks for projects you manage" });
    }

    const updates = { ...req.body };
    if (updates.status && !VALID_STATUSES.includes(updates.status)) {
      return res.status(400).json({ message: "Invalid status" });
    }
    if (updates.priority && !VALID_PRIORITIES.includes(updates.priority)) {
      return res.status(400).json({ message: "Invalid priority" });
    }
    if (updates.deadline) {
      const deadlineDate = startOfDay(updates.deadline);
      if (Number.isNaN(deadlineDate.getTime())) {
        return res.status(400).json({ message: "deadline must be a valid date" });
      }
    }

    const task = await Task.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    res.json({ message: "Task updated", task });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }
    if (!(await canManageProject(req.user, task.project))) {
      return res.status(403).json({ message: "You can only delete tasks for projects you manage" });
    }

    await task.deleteOne();

    res.json({ message: "Task deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// F4.4 — AI-powered task prioritization
export const getPrioritizedTasks = async (req, res) => {
  try {
    const filter = {};

    if (req.user.role === "EMPLOYEE" || req.user.role === "FREELANCER") {
      filter.assignee = req.user.id;
    }

    const tasks = await Task
      .find(filter)
      .populate("assignee", "name")
      .populate("project", "name");

    const prioritized = prioritizeTasks(tasks);
    const summary     = quadrantSummary(prioritized);

    res.json({
      message          : "Tasks ranked by AI priority score (Eisenhower Matrix)",
      totalTasks       : tasks.length,
      activeTasks      : prioritized.length,
      quadrantSummary  : summary,
      tasks            : prioritized
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
