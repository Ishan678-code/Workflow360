import { useEffect, useState } from "react";
import AdminLayout from "../../layouts/AdminLayout";
import { projectApi } from "../../services/api";
import { formatDate } from "../../utils/formatters";

export default function AdminProjects() {
  const [projects, setProjects] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadProjects() {
      try {
        const data = await projectApi.getAll();
        if (!active) return;
        setProjects(Array.isArray(data) ? data : data?.data || []);
      } catch (err) {
        if (active) setError(err.message || "Unable to load project data.");
      }
    }

    loadProjects();
    return () => {
      active = false;
    };
  }, []);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Projects</h1>
          <p className="mt-2 text-sm text-slate-500">Admin oversight into delivery status and deadlines.</p>
        </div>

        {error ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
            {error}
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
          {projects.length ? (
            projects.map((project) => (
              <article key={project._id || project.name} className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
                <span className="rounded-full bg-rose-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-rose-700">
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
            ))
          ) : (
            <div className="rounded-3xl bg-slate-50 px-4 py-12 text-center text-sm text-slate-400">
              No projects available.
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
