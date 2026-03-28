import { useEffect, useState } from "react";
import FreelancerLayout from "../../layouts/FreelancerLayout";
import { projectApi } from "../../services/api";
import { formatDate } from "../../utils/formatters";

const fallbackProjects = [
  { _id: "proj-1", name: "Mobile Redesign", status: "ACTIVE", deadline: "2026-04-15", client: "Northstar Labs" },
  { _id: "proj-2", name: "Analytics Dashboard", status: "REVIEW", deadline: "2026-04-02", client: "Helio Systems" },
];

export default function FreelancerProjects() {
  const [projects, setProjects] = useState(fallbackProjects);

  useEffect(() => {
    let active = true;

    async function loadProjects() {
      try {
        const data = await projectApi.getAll();
        if (!active) return;
        setProjects(Array.isArray(data) ? data : data?.data || fallbackProjects);
      } catch {}
    }

    loadProjects();
    return () => {
      active = false;
    };
  }, []);

  return (
    <FreelancerLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Projects</h1>
          <p className="mt-2 text-sm text-slate-500">Current client work, delivery timing, and stage at a glance.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {projects.map((project) => (
            <article key={project._id || project.name} className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
              <span className="rounded-full bg-amber-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-amber-700">
                {project.status || "ACTIVE"}
              </span>
              <h2 className="mt-4 text-2xl font-black tracking-tight text-slate-900">{project.name || "Untitled Project"}</h2>
              <div className="mt-5 space-y-3 rounded-2xl bg-slate-50 p-4 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Client</span>
                  <span className="font-semibold text-slate-800">{project.client?.name || project.client || "Workforce360"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Deadline</span>
                  <span className="font-semibold text-slate-800">{formatDate(project.deadline || project.endDate)}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </FreelancerLayout>
  );
}
