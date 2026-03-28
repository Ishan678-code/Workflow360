import { useState, useRef, useEffect } from "react";
import EmployeeLayout from "../../layouts/EmployeeLayout";
import {
  ChevronDown,
  Search,
  Filter
} from "lucide-react";
import { taskApi } from "../../services/api";
import { formatDate } from "../../utils/formatters";

// ── Priority Badge Component ────────────────────────────────────────────────
const PriorityBadge = ({ level }) => {
  const styles = {
    HIGH: "bg-rose-500 text-white",
    MEDIUM: "bg-orange-500 text-white",
    LOW: "bg-emerald-500 text-white",
  };
  return (
    <span className={`px-2 py-0.5 rounded text-[9px] font-black tracking-wider ${styles[level]}`}>
      {level}
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

  const counts = {
    "To Do":       tasks.filter(t => t.status === "To Do").length,
    "In Progress": tasks.filter(t => t.status === "In Progress").length,
    "Completed":   tasks.filter(t => t.status === "Completed").length,
  };

  return (
    <EmployeeLayout>
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header Section */}
        <div className="space-y-1">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">My Tasks</h1>
          <p className="text-slate-500 text-sm font-medium">Manage and track your assigned tasks</p>
        </div>

        {/* Task List Container */}
        <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">
          
          {/* Table Header / Action Bar */}
          <div className="p-6 border-b border-slate-50 flex justify-between items-center">
            <div className="flex items-center gap-3">
               <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight">Task List</h2>
               <span className="px-3 py-1 bg-slate-100 rounded-full text-[10px] font-bold text-slate-500">
                 {tasks.length} tasks
               </span>
            </div>
            <div className="flex gap-2">
              <button className="p-2 text-slate-400 hover:text-slate-600 transition-colors"><Search size={18}/></button>
              <button className="p-2 text-slate-400 hover:text-slate-600 transition-colors"><Filter size={18}/></button>
            </div>
          </div>

          {/* Table Content */}
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-1/2">Task Name</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">AI Priority</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Deadline</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {tasks.map((task, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/30 transition-colors group">
                    <td className="px-6 py-5">
                      <span className="text-[13px] font-bold text-blue-600 cursor-pointer hover:underline">
                        {task.name}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <PriorityBadge level={task.priority} />
                    </td>
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

                          const current = tasks[idx];
                          setTasks((prev) =>
                            prev.map((t, i) => i === idx ? { ...t, status: newStatus } : t)
                          );

                          if (current?.id) {
                            try {
                              await taskApi.updateStatus(current.id, apiStatus);
                            } catch {}
                          }
                        }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Status Summary Cards ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(counts).map(([label, count]) => (
            <StatusSummaryCard key={label} label={label} count={count} />
          ))}
        </div>

      </div>
    </EmployeeLayout>
  );
}
