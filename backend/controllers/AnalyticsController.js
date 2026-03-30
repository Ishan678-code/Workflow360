import Attendance from "../models/Attendance.js";
import Leave from "../models/Leave.js";
import Task from "../models/Task.js";
import Timesheet from "../models/Timesheet.js";
import Project from "../models/Project.js";
import Employee from "../models/Employee.js";
import Freelancer from "../models/Freelancer.js";
import Invoice from "../models/Invoice.js";
import User from "../models/User.js";
import Department from "../models/Department.js";
import PerformanceReview from "../models/Performance.js";
import { computePerformanceScore, computeTeamPerformance } from "../services/Performanceservice.js";
import { generateAttendanceReportPDF, generatePerformanceReportPDF } from "../services/pdfService.js";
import { getEmployeeProfileByUserId, getFreelancerProfileByUserId } from "../utils/profileRefs.js";

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
        taskStats,
        totalDepartments
      ] = await Promise.all([
        Employee.countDocuments(),
        Freelancer.countDocuments(),
        Project.countDocuments(),
        Project.countDocuments({ status: "ACTIVE" }),
        Leave.countDocuments({ status: "PENDING" }),
        Timesheet.countDocuments({ status: "PENDING" }),
        Task.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
        Department.countDocuments()
      ]);

      const projectTaskStats = await Task.aggregate([
        {
          $group: {
            _id: "$project",
            total: { $sum: 1 },
            completed: {
              $sum: { $cond: [{ $eq: ["$status", "COMPLETED"] }, 1, 0] }
            }
          }
        }
      ]);

      const taskSummary = { TODO: 0, IN_PROGRESS: 0, COMPLETED: 0 };
      taskStats.forEach(t => { taskSummary[t._id] = t.count; });
      const averageUtilization = projectTaskStats.length > 0
        ? +(projectTaskStats.reduce((sum, item) => sum + (item.total > 0 ? (item.completed / item.total) * 100 : 0), 0) / projectTaskStats.length).toFixed(1)
        : 0;

      return res.json({
        totalEmployees, totalFreelancers, totalProjects,
        activeProjects, pendingLeaves, pendingTimesheets, taskSummary,
        totalDepartments,
        averageUtilization,
        utilizationFormula: "Average utilization = average of (completed tasks / total tasks) * 100 across projects"
      });
    }

    if (role === "EMPLOYEE") {
      const employeeProfile = await getEmployeeProfileByUserId(id);
      if (!employeeProfile) {
        return res.status(404).json({ message: "Employee profile not found" });
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [attendance, pendingLeaves, myTasks] = await Promise.all([
        Attendance.findOne({ employee: employeeProfile._id, date: { $gte: today } }),
        Leave.countDocuments({ employee: employeeProfile._id, status: "PENDING" }),
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
      const freelancerProfile = await getFreelancerProfileByUserId(id);
      if (!freelancerProfile) {
        return res.status(404).json({ message: "Freelancer profile not found" });
      }

      const [activeProjects, pendingTimesheets, pendingInvoices, openTasks] = await Promise.all([
        Project.countDocuments({ freelancers: freelancerProfile._id, status: "ACTIVE" }),
        Timesheet.countDocuments({ freelancer: freelancerProfile._id, status: "PENDING" }),
        Invoice.countDocuments({ freelancer: freelancerProfile._id, status: "PENDING" }),
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

    const employeeUserIds = employeeTaskStats.map((entry) => entry._id).filter(Boolean);
    const freelancerProfileIds = freelancerHourStats.map((entry) => entry._id).filter(Boolean);

    const [users, freelancerProfiles] = await Promise.all([
      User.find({ _id: { $in: employeeUserIds } }).select("name email"),
      Freelancer.find({ _id: { $in: freelancerProfileIds } }).populate("userId", "name email"),
    ]);

    const userMap = new Map(users.map((user) => [String(user._id), user]));
    const freelancerMap = new Map(freelancerProfiles.map((profile) => [String(profile._id), profile]));

    const topEmployeesByCompletedTasks = employeeTaskStats.map((entry) => {
      const user = userMap.get(String(entry._id));
      return {
        ...entry,
        userId: entry._id,
        name: user?.name || "Unknown User",
        email: user?.email || "",
      };
    });

    const topFreelancersByHoursLogged = freelancerHourStats.map((entry) => {
      const freelancer = freelancerMap.get(String(entry._id));
      return {
        ...entry,
        freelancerId: entry._id,
        name: freelancer?.userId?.name || "Unknown Freelancer",
        email: freelancer?.userId?.email || "",
      };
    });

    res.json({
      topEmployeesByCompletedTasks,
      topFreelancersByHoursLogged,
      algorithm: {
        performanceScoreFormula: "0.40 * taskCompletionRatio + 0.35 * qualityScore + 0.25 * deadlineAdherence",
        averageUtilizationFormula: "completed_tasks / total_tasks * 100"
      }
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
      },
      algorithm: {
        performanceScoreFormula: "0.40 * taskCompletionRatio + 0.35 * qualityScore + 0.25 * deadlineAdherence",
        zScoreRule: "Absolute z-score above 2 flags an anomaly"
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

    // Fetch quality ratings from both sources in parallel
    const [reviewRatings, timesheetRatings] = await Promise.all([
      PerformanceReview.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: "$user", ratings: { $push: "$rating" } } }
      ]),
      Timesheet.aggregate([
        { $match: { status: "APPROVED", date: { $gte: since }, qualityRating: { $ne: null } } },
        { $group: { _id: "$freelancer", ratings: { $push: "$qualityRating" } } }
      ])
    ]);

    const reviewMap   = new Map(reviewRatings.map(r => [String(r._id), r.ratings]));
    const timesheetMap = new Map(timesheetRatings.map(r => [String(r._id), r.ratings]));

    // Build usersMetrics array for batch processing
    const usersMetrics = taskAggregation.map(u => ({
      userId          : u._id,
      completedTasks  : u.completedTasks,
      totalTasks      : u.totalTasks,
      qualityRatings  : [
        ...(reviewMap.get(String(u._id)) || []),
        ...(timesheetMap.get(String(u._id)) || [])
      ],
      missedDeadlines : u.missedDeadlines,
      totalDeadlines  : u.totalDeadlines
    }));

    // Run batch performance scoring with team context + Z-scores
    const leaderboard = computeTeamPerformance(usersMetrics);
    const users = await User.find({ _id: { $in: leaderboard.map((entry) => entry.userId).filter(Boolean) } }).select("name email");
    const userMap = new Map(users.map((user) => [String(user._id), user]));
    const enrichedLeaderboard = leaderboard.map((entry) => ({
      ...entry,
      name: userMap.get(String(entry.userId))?.name || "Unknown User",
      email: userMap.get(String(entry.userId))?.email || ""
    }));

    res.json({
      period      : `${periodDays} days`,
      totalUsers  : enrichedLeaderboard.length,
      leaderboard: enrichedLeaderboard,
      anomalies: {
        exceptional     : enrichedLeaderboard.filter(u => u.anomaly.flag === "EXCEPTIONAL").length,
        underperforming : enrichedLeaderboard.filter(u => u.anomaly.flag === "UNDERPERFORMING").length
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PDF REPORT: Attendance
// GET /api/analytics/report/attendance/:employeeId?month=6&year=2025
// ─────────────────────────────────────────────────────────────────────────────
export const downloadAttendanceReport = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const now   = new Date();
    const m     = parseInt(req.query.month) || now.getMonth() + 1;
    const y     = parseInt(req.query.year)  || now.getFullYear();
    const from  = new Date(y, m - 1, 1);
    const to    = new Date(y, m, 0, 23, 59, 59);

    if (req.user.role === "EMPLOYEE" && req.user.id !== employeeId) {
      return res.status(403).json({ message: "Access denied" });
    }

    const records = await Attendance.find({
      employee : employeeId,
      date     : { $gte: from, $lte: to }
    }).sort({ date: 1 });

    const presentDays   = records.filter(r => r.clockIn).length;
    const completedDays = records.filter(r => r.clockIn && r.clockOut).length;
    const totalHours    = records.reduce((sum, r) => {
      if (r.clockIn && r.clockOut) return sum + (r.clockOut - r.clockIn) / 36e5;
      return sum;
    }, 0);

    const summary = {
      period           : `${y}-${String(m).padStart(2, "0")}`,
      totalDays        : records.length,
      presentDays,
      completedDays,
      totalHoursWorked : +totalHours.toFixed(2),
      avgHoursPerDay   : completedDays > 0 ? +(totalHours / completedDays).toFixed(2) : 0
    };

    const user      = await User.findById(employeeId).select("name");
    const pdfBuffer = await generateAttendanceReportPDF(
      records.map(r => r.toObject()),
      summary,
      user?.name || employeeId
    );

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="attendance-${employeeId}-${summary.period}.pdf"`
    );
    res.send(pdfBuffer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PDF REPORT: Individual Performance
// GET /api/analytics/report/performance/:userId?period=30
// ─────────────────────────────────────────────────────────────────────────────
export const downloadPerformanceReport = async (req, res) => {
  try {
    const { userId }  = req.params;
    const periodDays  = parseInt(req.query.period) || 30;
    const since       = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);

    if (req.user.role === "EMPLOYEE" || req.user.role === "FREELANCER") {
      if (req.user.id !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
    }

    const [userTasks, allUserTaskCounts, timesheets] = await Promise.all([
      Task.find({ assignee: userId, createdAt: { $gte: since } }),
      Task.aggregate([
        { $match: { status: "COMPLETED", createdAt: { $gte: since } } },
        { $group: { _id: "$assignee", count: { $sum: 1 } } }
      ]),
      Timesheet.find({ freelancer: userId, status: "APPROVED", date: { $gte: since } })
    ]);

    const completedTasks  = userTasks.filter(t => t.status === "COMPLETED").length;
    const totalTasks      = userTasks.length;
    const now             = new Date();
    const missedDeadlines = userTasks.filter(t =>
      t.deadline && new Date(t.deadline) < now && t.status !== "COMPLETED"
    ).length;
    const totalDeadlines  = userTasks.filter(t => t.deadline).length;
    const qualityRatings  = timesheets.filter(t => t.qualityRating != null).map(t => t.qualityRating);

    const teamCompletions   = allUserTaskCounts.map(u => u.count);
    const avgTasksCompleted = teamCompletions.length > 0
      ? teamCompletions.reduce((s, c) => s + c, 0) / teamCompletions.length
      : completedTasks || 1;
    const allUserScores = allUserTaskCounts.map(u =>
      0.40 * Math.min(u.count / avgTasksCompleted, 2)
    );

    const result = computePerformanceScore(
      { completedTasks, totalTasks, qualityRatings, missedDeadlines, totalDeadlines },
      { avgTasksCompleted, allUserScores }
    );

    const totalHoursLogged = timesheets.reduce((s, t) => s + t.hours, 0);
    const overdueTasks     = userTasks.filter(t =>
      t.deadline && new Date(t.deadline) < now && t.status !== "COMPLETED"
    ).length;

    const insights = {
      period           : `${periodDays} days`,
      performanceScore : result.score,
      components       : result.components,
      insight          : result.insight,
      anomaly          : result.anomaly,
      taskSummary      : {
        total          : totalTasks,
        completed      : completedTasks,
        overdue        : overdueTasks,
        completionRate : totalTasks > 0
          ? `${Math.round((completedTasks / totalTasks) * 100)}%`
          : "0%"
      },
      timesheetSummary : {
        totalHoursLogged,
        avgHoursPerEntry : timesheets.length > 0
          ? +(totalHoursLogged / timesheets.length).toFixed(1)
          : 0,
        totalEntries: timesheets.length
      }
    };

    const user      = await User.findById(userId).select("name");
    const pdfBuffer = await generatePerformanceReportPDF(insights, user?.name || userId);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="performance-${userId}-${periodDays}d.pdf"`
    );
    res.send(pdfBuffer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
