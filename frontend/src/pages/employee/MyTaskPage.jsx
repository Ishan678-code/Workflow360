import { useState, useRef, useEffect } from "react";
import EmployeeLayout from "../../layouts/EmployeeLayout";
import {
  ChevronDown,
  Search,
  Filter,
  Download
} from "lucide-react";
import { taskApi, analyticsApi } from "../../services/api";
import { formatDate, downloadBlob } from "../../utils/formatters";

// ── Priority Badge Component ────────────────────────────────────────────────
const PriorityBadge = ({ level }) => {
  const styles = {
    HIGH: "bg-rose-500 text-white",
    MEDIUM: "bg-orange-500 text-white",
    LOW: "bg-emerald-500 text-white",
  };
  return (
    <span className={`px-2 py-0.5 rounded text-[9px] font-black tracking-wider ${styles[level] || styles.LOW}`}>
      {level}
    </span>
  );
};

// ── Quadrant Badge ──────────────────────────────────────────────────────────
const quadrantStyles = {
  Q1: { bg: "bg-rose-100 text-rose-700",   label: "Q1 · Do First" },
  Q2: { bg: "bg-blue-100 text-blue-700",   label: "Q2 · Schedule" },
  Q3: { bg: "bg-orange-100 text-orange-700", label: "Q3 · Delegate" },
  Q4: { bg: "bg-slate-100 text-slate-500", label: "Q4 · Eliminate" },
};

const QuadrantBadge = ({ quadrant }) => {
  const cfg = quadrantStyles[quadrant] || quadrantStyles.Q4;
  return (
    <span className={`px-2 py-0.5 rounded text-[9px] font-black tracking-wider ${cfg.bg}`}>
      {cfg.label}
    </span>
  );
};

// ── Status Dropdown Component ───────────────────────────────────────────────
const STATUS_OPTIONS = ["In Progress", "Completed"];

const statusStyles = {
  "In Progress": { trigger: "bg-slate-800 text-white", dot: "bg-slate-400" },
  "Completed":   { trigger: "bg-emerald-500 text-white", dot: "bg-emerald-200" },
  "To Do":       { trigger: "bg-white text-slate-400 border border-slate-200", dot: "bg-slate-300" },
};

const StatusDropdown = ({ status, onChange }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const current = statusStyles[status] ?? statusStyles["To Do"];

  return (
    <div ref={ref} className="relative w-36">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center justify-between gap-2 px-3 py-1.5 rounded-md transition-all hover:opacity-90 ${current.trigger}`}
      >
        <div className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${current.dot}`} />
          <span className="text-[11px] font-bold whitespace-nowrap">{status}</span>
        </div>
        <ChevronDown size={12} strokeWidth={3} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute top-full mt-1 left-0 w-full bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden">
          {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt}
                onClick={() => { onChange(opt); setOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-slate-50 transition-colors text-left"
              >
                <span className={`w-2 h-2 rounded-full ${opt === "Completed" ? "bg-emerald-500" : "bg-slate-600"}`} />
                <span className="text-[12px] font-bold text-slate-700">{opt}</span>
              </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Status Summary Card ─────────────────────────────────────────────────────
const statusCardConfig = {
  "To Do":       { badge: "bg-slate-100 text-slate-500" },
  "In Progress": { badge: "bg-blue-50 text-blue-500" },
  "Completed":   { badge: "bg-emerald-50 text-emerald-500" },
};

const StatusSummaryCard = ({ label, count }) => {
  const cfg = statusCardConfig[label] ?? statusCardConfig["To Do"];
  return (
    <div className="bg-white border border-slate-100 rounded-2xl px-6 py-5 flex items-center justify-between shadow-sm">
      <div>
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">{label}</p>
        <p className="text-3xl font-black text-slate-800 tracking-tight">{count}</p>
      </div>
      <span className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-black ${cfg.badge}`}>
        {count}
      </span>
    </div>
  );
};

export default function MyTasks() {
  const [tasks, setTasks] = useState([
    { name: "Complete API Integration", priority: "HIGH", deadline: "Mar 12, 2026", status: "In Progress" },
    { name: "Review Code PR #245", priority: "HIGH", deadline: "Mar 11, 2026", status: "In Progress" },
    { name: "Update Documentation", priority: "MEDIUM", deadline: "Mar 15, 2026", status: "To Do" },
    { name: "Team Meeting Preparation", priority: "MEDIUM", deadline: "Mar 10, 2026", status: "Completed" },
    { name: "Research New Framework", priority: "LOW", deadline: "Mar 20, 2026", status: "To Do" },
    { name: "Fix Login Bug", priority: "HIGH", deadline: "Mar 13, 2026", status: "To Do" },
    { name: "Write Unit Tests", priority: "MEDIUM", deadline: "Mar 18, 2026", status: "To Do" },
    { name: "Deploy to Staging", priority: "LOW", deadline: "Mar 25, 2026", status: "To Do" },
  ]);
  const [prioritizedTasks, setPrioritizedTasks] = useState([]);
  const [viewMode, setViewMode] = useState("standard"); // "standard" | "priority"
  const [loadingPriority, setLoadingPriority] = useState(false);
  const [downloadingReport, setDownloadingReport] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadTasks() {
      try {
        const data = await taskApi.getMyTasks();
        if (!active) return;
        const rows = Array.isArray(data) ? data : data?.data || [];
        if (!rows.length) return;
        setTasks(rows.map((task) => ({
          id: task._id,
          name: task.title,
          priority: task.priority || "MEDIUM",
          deadline: task.deadline ? formatDate(task.deadline) : "No deadline",
          status:
            task.status === "IN_PROGRESS"
              ? "In Progress"
              : task.status === "COMPLETED"
                ? "Completed"
                : "To Do",
        })));
      } catch {}
    }

    loadTasks();
    return () => {
      active = false;
    };
  }, []);

  async function loadPrioritizedView() {
    setLoadingPriority(true);
    try {
      const data = await taskApi.getPrioritized();
      const rows = Array.isArray(data) ? data : data?.tasks || data?.data || [];
      setPrioritizedTasks(rows.map((task) => ({
        id: task._id,
        name: task.title,
        priority: task.priority || "MEDIUM",
        deadline: task.deadline ? formatDate(task.deadline) : "No deadline",
        status:
          task.status === "IN_PROGRESS"
            ? "In Progress"
            : task.status === "COMPLETED"
              ? "Completed"
              : "To Do",
        priorityScore: typeof task.priorityScore === "number" ? task.priorityScore.toFixed(1) : null,
        quadrant: task.quadrant || null,
        quadrantLabel: task.quadrantLabel || null,
      })));
    } catch {
      setPrioritizedTasks([]);
    } finally {
      setLoadingPriority(false);
    }
  }

  function handleViewToggle(mode) {
    setViewMode(mode);
    if (mode === "priority" && prioritizedTasks.length === 0) {
      loadPrioritizedView();
    }
  }

  async function handleDownloadReport() {
    setDownloadingReport(true);
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const userId = user.id || user._id;
      if (!userId) return;
      const blob = await analyticsApi.downloadPerformanceReport(userId, 30);
      downloadBlob(blob, `performance-report-${userId}.pdf`);
    } catch {} finally {
      setDownloadingReport(false);
    }
  }

  const counts = {
    "To Do":       tasks.filter(t => t.status === "To Do").length,
    "In Progress": tasks.filter(t => t.status === "In Progress").length,
    "Completed":   tasks.filter(t => t.status === "Completed").length,
  };

  const displayedTasks = viewMode === "priority" ? prioritizedTasks : tasks;

  return (
    <EmployeeLayout>
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header Section */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">My Tasks</h1>
            <p className="text-slate-500 text-sm font-medium">Manage and track your assigned tasks</p>
          </div>
          <button
            onClick={handleDownloadReport}
            disabled={downloadingReport}
            className="flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
          >
            <Download size={15} />
            {downloadingReport ? "Downloading..." : "Performance Report"}
          </button>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleViewToggle("standard")}
            className={`rounded-full px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] transition ${
              viewMode === "standard"
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-500 hover:bg-slate-200"
            }`}
          >
            Standard View
          </button>
          <button
            onClick={() => handleViewToggle("priority")}
            className={`rounded-full px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] transition ${
              viewMode === "priority"
                ? "bg-blue-600 text-white"
                : "bg-slate-100 text-slate-500 hover:bg-slate-200"
            }`}
          >
            AI Priority View
          </button>
          {viewMode === "priority" && (
            <span className="text-[11px] text-slate-400 font-medium ml-1">
              Ranked by urgency · importance · effort
            </span>
          )}
        </div>

        {/* Task List Container */}
        <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">

          {/* Table Header / Action Bar */}
          <div className="p-6 border-b border-slate-50 flex justify-between items-center">
            <div className="flex items-center gap-3">
               <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight">
                 {viewMode === "priority" ? "Priority-Ranked Tasks" : "Task List"}
               </h2>
               <span className="px-3 py-1 bg-slate-100 rounded-full text-[10px] font-bold text-slate-500">
                 {displayedTasks.length} tasks
               </span>
            </div>
            <div className="flex gap-2">
              <button className="p-2 text-slate-400 hover:text-slate-600 transition-colors"><Search size={18}/></button>
              <button className="p-2 text-slate-400 hover:text-slate-600 transition-colors"><Filter size={18}/></button>
            </div>
          </div>

          {/* Loading state for priority view */}
          {viewMode === "priority" && loadingPriority ? (
            <div className="py-16 text-center">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600 mx-auto" />
              <p className="mt-3 text-sm text-slate-400">Running AI prioritization...</p>
            </div>
          ) : (
            /* Table Content */
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/50">
                    {viewMode === "priority" && (
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-8">Rank</th>
                    )}
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-1/2">Task Name</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      {viewMode === "priority" ? "Quadrant" : "AI Priority"}
                    </th>
                    {viewMode === "priority" && (
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Score</th>
                    )}
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Deadline</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {displayedTasks.length ? displayedTasks.map((task, idx) => (
                    <tr key={task.id || idx} className="hover:bg-slate-50/30 transition-colors group">
                      {viewMode === "priority" && (
                        <td className="px-6 py-5">
                          <span className="text-[11px] font-black text-slate-400">#{idx + 1}</span>
                        </td>
                      )}
                      <td className="px-6 py-5">
                        <span className="text-[13px] font-bold text-blue-600 cursor-pointer hover:underline">
                          {task.name}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        {viewMode === "priority"
                          ? <QuadrantBadge quadrant={task.quadrant} />
                          : <PriorityBadge level={task.priority} />
                        }
                      </td>
                      {viewMode === "priority" && (
                        <td className="px-6 py-5">
                          <span className="text-[12px] font-black text-slate-700">
                            {task.priorityScore ?? "—"}
                          </span>
                        </td>
                      )}
                      <td className="px-6 py-5">
                        <span className="text-[12px] font-medium text-slate-500">{task.deadline}</span>
                      </td>
                      <td className="px-6 py-5">
                        <StatusDropdown
                          status={task.status}
                          onChange={async (newStatus) => {
                            const apiStatus =
                              newStatus === "In Progress"
                                ? "IN_PROGRESS"
                                : newStatus === "Completed"
                                  ? "COMPLETED"
                                  : "TODO";

                            const setter = viewMode === "priority" ? setPrioritizedTasks : setTasks;
                            setter((prev) =>
                              prev.map((t, i) => i === idx ? { ...t, status: newStatus } : t)
                            );

                            if (task.id) {
                              try {
                                await taskApi.updateStatus(task.id, apiStatus);
                              } catch {}
                            }
                          }}
                        />
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={viewMode === "priority" ? 6 : 4} className="px-6 py-10 text-center text-sm text-slate-400">
                        No tasks available.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Quadrant Legend (priority view only) */}
        {viewMode === "priority" && !loadingPriority && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(quadrantStyles).map(([q, cfg]) => (
              <div key={q} className={`rounded-2xl px-4 py-3 ${cfg.bg.split(" ")[0]} border border-slate-100`}>
                <p className={`text-[10px] font-black uppercase tracking-widest ${cfg.bg.split(" ")[1]}`}>{q}</p>
                <p className="mt-1 text-xs font-semibold text-slate-700">{cfg.label.split(" · ")[1]}</p>
              </div>
            ))}
          </div>
        )}

        {/* ── Status Summary Cards ── */}
        {viewMode === "standard" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(counts).map(([label, count]) => (
              <StatusSummaryCard key={label} label={label} count={count} />
            ))}
          </div>
        )}

      </div>
    </EmployeeLayout>
  );
}
