import { useEffect, useState } from "react";
import FreelancerLayout from "../../layouts/FreelancerLayout";
import { taskApi, analyticsApi } from "../../services/api";
import { formatDate, downloadBlob } from "../../utils/formatters";
import { Download } from "lucide-react";

const fallbackTasks = [
  { _id: "task-1", title: "Finalize onboarding flow copy", status: "IN_PROGRESS", priority: "HIGH" },
  { _id: "task-2", title: "Ship analytics chart refinements", status: "TODO", priority: "MEDIUM" },
  { _id: "task-3", title: "Prepare handoff notes", status: "DONE", priority: "LOW" },
];

const quadrantStyles = {
  Q1: { bg: "bg-rose-50",   text: "text-rose-700",   label: "Q1 · Do First" },
  Q2: { bg: "bg-amber-50",  text: "text-amber-700",  label: "Q2 · Schedule" },
  Q3: { bg: "bg-orange-50", text: "text-orange-700", label: "Q3 · Delegate" },
  Q4: { bg: "bg-slate-50",  text: "text-slate-500",  label: "Q4 · Eliminate" },
};

export default function FreelancerTasks() {
  const [tasks, setTasks] = useState(fallbackTasks);
  const [prioritizedTasks, setPrioritizedTasks] = useState([]);
  const [viewMode, setViewMode] = useState("standard");
  const [loadingPriority, setLoadingPriority] = useState(false);
  const [downloadingReport, setDownloadingReport] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadTasks() {
      try {
        const data = await taskApi.getMyTasks();
        if (!active) return;
        setTasks(Array.isArray(data) ? data : data?.data || fallbackTasks);
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
      setPrioritizedTasks(rows);
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

  const displayedTasks = viewMode === "priority" ? prioritizedTasks : tasks;

  return (
    <FreelancerLayout>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900">Tasks</h1>
            <p className="mt-2 text-sm text-slate-500">Your immediate deliverables, ordered for fast execution.</p>
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
                ? "bg-amber-500 text-white"
                : "bg-slate-100 text-slate-500 hover:bg-slate-200"
            }`}
          >
            AI Priority View
          </button>
        </div>

        {/* Loading */}
        {viewMode === "priority" && loadingPriority ? (
          <div className="rounded-3xl border border-slate-100 bg-white p-12 text-center shadow-sm">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-amber-500 mx-auto" />
            <p className="mt-3 text-sm text-slate-400">Running AI prioritization...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {displayedTasks.length ? displayedTasks.map((task, idx) => {
              const q = task.quadrant;
              const qCfg = q ? quadrantStyles[q] : null;
              return (
                <article key={task._id || task.title} className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-start gap-3">
                      {viewMode === "priority" && (
                        <span className="mt-0.5 text-[11px] font-black text-slate-300">#{idx + 1}</span>
                      )}
                      <div>
                        <h2 className="text-lg font-black text-slate-900">{task.title || "Untitled task"}</h2>
                        <div className="mt-1 flex items-center gap-2 flex-wrap">
                          {viewMode === "priority" && qCfg ? (
                            <span className={`rounded-full px-3 py-0.5 text-[10px] font-black uppercase tracking-[0.16em] ${qCfg.bg} ${qCfg.text}`}>
                              {qCfg.label}
                            </span>
                          ) : (
                            <p className="text-sm text-slate-500">Priority: {task.priority || "MEDIUM"}</p>
                          )}
                          {viewMode === "priority" && typeof task.priorityScore === "number" && (
                            <span className="text-[11px] font-bold text-slate-400">
                              Score: {task.priorityScore.toFixed(1)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <span className="rounded-full bg-amber-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-amber-700">
                      {task.status || "TODO"}
                    </span>
                  </div>
                </article>
              );
            }) : (
              <div className="rounded-3xl border border-slate-100 bg-white px-4 py-12 text-center text-sm text-slate-400 shadow-sm">
                No tasks available.
              </div>
            )}
          </div>
        )}

        {/* Quadrant legend (priority view) */}
        {viewMode === "priority" && !loadingPriority && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(quadrantStyles).map(([q, cfg]) => (
              <div key={q} className={`rounded-2xl px-4 py-3 ${cfg.bg}`}>
                <p className={`text-[10px] font-black uppercase tracking-widest ${cfg.text}`}>{q}</p>
                <p className="mt-1 text-xs font-semibold text-slate-700">{cfg.label.split(" · ")[1]}</p>
              </div>
            ))}
          </div>
        )}

      </div>
    </FreelancerLayout>
  );
}
