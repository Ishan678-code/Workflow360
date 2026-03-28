import { useEffect, useState } from "react";
import FreelancerLayout from "../../layouts/FreelancerLayout";
import { taskApi } from "../../services/api";

const fallbackTasks = [
  { _id: "task-1", title: "Finalize onboarding flow copy", status: "IN_PROGRESS", priority: "HIGH" },
  { _id: "task-2", title: "Ship analytics chart refinements", status: "TODO", priority: "MEDIUM" },
  { _id: "task-3", title: "Prepare handoff notes", status: "DONE", priority: "LOW" },
];

export default function FreelancerTasks() {
  const [tasks, setTasks] = useState(fallbackTasks);

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

  return (
    <FreelancerLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Tasks</h1>
          <p className="mt-2 text-sm text-slate-500">Your immediate deliverables, ordered for fast execution.</p>
        </div>
        <div className="space-y-4">
          {tasks.map((task) => (
            <article key={task._id || task.title} className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-lg font-black text-slate-900">{task.title || "Untitled task"}</h2>
                  <p className="mt-1 text-sm text-slate-500">Priority: {task.priority || "MEDIUM"}</p>
                </div>
                <span className="rounded-full bg-amber-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-amber-700">
                  {task.status || "TODO"}
                </span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </FreelancerLayout>
  );
}
