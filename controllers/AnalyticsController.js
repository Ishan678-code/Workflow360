import Attendance from "../models/Attendance.js";
import Leave from "../models/Leave.js";
import Task from "../models/Task.js";
import Timesheet from "../models/Timesheet.js";
import Project from "../models/Project.js";
import Employee from "../models/Employee.js";
import Freelancer from "../models/Freelancer.js";
import Invoice from "../models/Invoice.js";
import { computePerformanceScore, computeTeamPerformance } from "../services/Performanceservice.js";

// ── F5.1 & F5.2 — Role-based dashboard analytics ─────────────────────────────
export const getDashboardStats = async (req, res) => {
  try {
    const { role, id } = req.user;

    if (role === "ADMIN" || role === "MANAGER") {
      const [
        totalEmployees,
        totalFreelancers,
        totalProjects,
        activeProjects,
        pendingLeaves,
        pendingTimesheets,
        taskStats
      ] = await Promise.all([
        Employee.countDocuments(),
        Freelancer.countDocuments(),
        Project.countDocuments(),
        Project.countDocuments({ status: "ACTIVE" }),
        Leave.countDocuments({ status: "PENDING" }),
        Timesheet.countDocuments({ status: "PENDING" }),
        Task.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }])
      ]);

      const taskSummary = { TODO: 0, IN_PROGRESS: 0, COMPLETED: 0 };
      taskStats.forEach(t => { taskSummary[t._id] = t.count; });

      return res.json({
        totalEmployees, totalFreelancers, totalProjects,
        activeProjects, pendingLeaves, pendingTimesheets, taskSummary
      });
    }

    if (role === "EMPLOYEE") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [attendance, pendingLeaves, myTasks] = await Promise.all([
        Attendance.findOne({ employee: id, date: { $gte: today } }),
        Leave.countDocuments({ employee: id, status: "PENDING" }),
        Task.countDocuments({ assignee: id, status: { $ne: "COMPLETED" } })
      ]);

      return res.json({
        clockedInToday  : !!attendance?.clockIn,
        clockedOutToday : !!attendance?.clockOut,
        pendingLeaves,
        openTasks       : myTasks
      });
    }

    if (role === "FREELANCER") {
      const [activeProjects, pendingTimesheets, pendingInvoices, openTasks] = await Promise.all([
        Project.countDocuments({ freelancers: id, status: "ACTIVE" }),
        Timesheet.countDocuments({ freelancer: id, status: "PENDING" }),
        Invoice.countDocuments({ freelancer: id, status: "PENDING" }),
        Task.countDocuments({ assignee: id, status: { $ne: "COMPLETED" } })
      ]);

      return res.json({ activeProjects, pendingTimesheets, pendingInvoices, openTasks });
    }

    res.status(400).json({ message: "Unknown role" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── F5.2 — Employee vs Freelancer performance comparison ─────────────────────
export const getPerformanceReport = async (req, res) => {
  try {
    const [employeeTaskStats, freelancerHourStats] = await Promise.all([
      Task.aggregate([
        { $match: { status: "COMPLETED" } },
        { $group: { _id: "$assignee", completedTasks: { $sum: 1 } } },
        { $sort: { completedTasks: -1 } },
        { $limit: 10 }
      ]),
      Timesheet.aggregate([
        { $match: { status: "APPROVED" } },
        { $group: { _id: "$freelancer", totalHours: { $sum: "$hours" } } },
        { $sort: { totalHours: -1 } },
        { $limit: 10 }
      ])
    ]);

    res.json({
      topEmployeesByCompletedTasks : employeeTaskStats,
      topFreelancersByHoursLogged  : freelancerHourStats
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// AI PRODUCTIVITY INSIGHTS (Algorithm 2: Performance Score + Z-Score)
// GET /api/analytics/productivity/:userId
//
// Query params:
//   ?period=30   (days to look back, default 30)
// ─────────────────────────────────────────────────────────────────────────────
export const getProductivityInsights = async (req, res) => {
  try {
    const { userId }  = req.params;
    const periodDays  = parseInt(req.query.period) || 30;
    const since       = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);

    // ── Ownership guard: employees/freelancers can only view their own ────────
    if (req.user.role === "EMPLOYEE" || req.user.role === "FREELANCER") {
      if (req.user.id !== userId) {
        return res.status(403).json({ message: "You can only view your own insights" });
      }
    }

    // ── Fetch user's task data ─────────────────────────────────────────────
    const [userTasks, allUserTaskCounts, timesheets] = await Promise.all([
      Task.find({ assignee: userId, createdAt: { $gte: since } }),

      // Team context: how many tasks did each user complete in the same period?
      Task.aggregate([
        { $match: { status: "COMPLETED", createdAt: { $gte: since } } },
        { $group: { _id: "$assignee", count: { $sum: 1 } } }
      ]),

      Timesheet.find({ freelancer: userId, status: "APPROVED", date: { $gte: since } })
    ]);

    // ── Build user metrics ─────────────────────────────────────────────────
    const completedTasks  = userTasks.filter(t => t.status === "COMPLETED").length;
    const totalTasks      = userTasks.length;

    const now             = new Date();
    const missedDeadlines = userTasks.filter(t =>
      t.deadline &&
      new Date(t.deadline) < now &&
      t.status !== "COMPLETED"
    ).length;
    const totalDeadlines  = userTasks.filter(t => t.deadline).length;

    // Quality ratings from timesheets (for freelancers)
    const qualityRatings  = timesheets
      .filter(t => t.qualityRating != null)
      .map(t => t.qualityRating);

    // ── Build team context (Tavg) ──────────────────────────────────────────
    const teamCompletions   = allUserTaskCounts.map(u => u.count);
    const avgTasksCompleted = teamCompletions.length > 0
      ? teamCompletions.reduce((s, c) => s + c, 0) / teamCompletions.length
      : completedTasks || 1;

    // All user scores for Z-score baseline (first pass without Z)
    const allUserScores = allUserTaskCounts.map(u => {
      const ratio = Math.min(u.count / avgTasksCompleted, 2);
      return 0.40 * ratio;   // simplified first-pass for baseline
    });

    // ── Compute Performance Score ──────────────────────────────────────────
    const result = computePerformanceScore(
      { completedTasks, totalTasks, qualityRatings, missedDeadlines, totalDeadlines },
      { avgTasksCompleted, allUserScores }
    );

    // ── Timesheet summary ──────────────────────────────────────────────────
    const totalHoursLogged  = timesheets.reduce((s, t) => s + t.hours, 0);
    const avgHoursPerEntry  = timesheets.length > 0
      ? +(totalHoursLogged / timesheets.length).toFixed(1)
      : 0;

    // ── Overdue tasks ──────────────────────────────────────────────────────
    const overdueTasks = userTasks.filter(t =>
      t.deadline && new Date(t.deadline) < now && t.status !== "COMPLETED"
    ).length;

    res.json({
      userId,
      period          : `${periodDays} days`,
      performanceScore: result.score,
      components      : result.components,
      rawMetrics      : result.rawMetrics,
      anomaly         : result.anomaly,
      insight         : result.insight,
      taskSummary: {
        total     : totalTasks,
        completed : completedTasks,
        overdue   : overdueTasks,
        completionRate: totalTasks > 0
          ? `${Math.round((completedTasks / totalTasks) * 100)}%`
          : "0%"
      },
      timesheetSummary: {
        totalHoursLogged,
        avgHoursPerEntry,
        totalEntries: timesheets.length
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// TEAM PERFORMANCE LEADERBOARD (Algorithm 2 applied to all users)
// GET /api/analytics/team-performance
//
// Query: ?period=30
// ─────────────────────────────────────────────────────────────────────────────
export const getTeamPerformanceLeaderboard = async (req, res) => {
  try {
    const periodDays = parseInt(req.query.period) || 30;
    const since      = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);
    const now        = new Date();

    // Aggregate all users' task data in the period
    const taskAggregation = await Task.aggregate([
      { $match: { createdAt: { $gte: since } } },
      {
        $group: {
          _id             : "$assignee",
          totalTasks      : { $sum: 1 },
          completedTasks  : { $sum: { $cond: [{ $eq: ["$status", "COMPLETED"] }, 1, 0] } },
          // Count missed deadlines: has deadline, not completed, deadline passed
          missedDeadlines : {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ["$status", "COMPLETED"] },
                    { $lt: ["$deadline", now] },
                    { $ne: ["$deadline", null] }
                  ]
                },
                1, 0
              ]
            }
          },
          totalDeadlines  : {
            $sum: { $cond: [{ $ne: ["$deadline", null] }, 1, 0] }
          }
        }
      }
    ]);

    if (taskAggregation.length === 0) {
      return res.json({ message: "No activity data found", leaderboard: [] });
    }

    // Build usersMetrics array for batch processing
    const usersMetrics = taskAggregation.map(u => ({
      userId          : u._id,
      completedTasks  : u.completedTasks,
      totalTasks      : u.totalTasks,
      qualityRatings  : [],   // can be extended when PerformanceReview is connected
      missedDeadlines : u.missedDeadlines,
      totalDeadlines  : u.totalDeadlines
    }));

    // Run batch performance scoring with team context + Z-scores
    const leaderboard = computeTeamPerformance(usersMetrics);

    res.json({
      period      : `${periodDays} days`,
      totalUsers  : leaderboard.length,
      leaderboard,
      anomalies: {
        exceptional     : leaderboard.filter(u => u.anomaly.flag === "EXCEPTIONAL").length,
        underperforming : leaderboard.filter(u => u.anomaly.flag === "UNDERPERFORMING").length
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};