import Task from "../models/Task.js";
import User from "../models/User.js";
import { prioritizeTasks, quadrantSummary } from "../services/taskPriorityService.js";
import { createNotification } from "../services/notificationService.js";

export const createTask = async (req, res) => {
  try {
    const { title, description, project, assignee, priority, deadline, tags } = req.body;

    if (!title || !project) {
      return res.status(400).json({ message: "title and project are required" });
    }

    const task = await Task.create({
      title,
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
    const tasks = await Task
      .find({ assignee: req.user.id, status: { $ne: "COMPLETED" } })
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

    const validStatuses = ["TODO", "IN_PROGRESS", "COMPLETED"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const task = await Task.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    res.json({ message: "Task status updated", task });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateTask = async (req, res) => {
  try {
    const task = await Task.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

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
    const task = await Task.findByIdAndDelete(req.params.id);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

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