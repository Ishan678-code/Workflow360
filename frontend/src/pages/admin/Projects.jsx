import { useEffect, useState } from "react";
import AdminLayout from "../../layouts/AdminLayout";
import { departmentApi, projectApi } from "../../services/api";
import { formatCurrency, formatDate } from "../../utils/formatters";

const MANUAL_PROJECTS_STORAGE_KEY = "admin_projects_manual_projects";

const defaultDepartmentOptions = [
  { _id: "default-backend", name: "Backend Department" },
  { _id: "default-frontend", name: "Frontend Department" },
  { _id: "default-fullstack", name: "Full Stack Department" },
  { _id: "default-mobile", name: "Mobile App Department" },
  { _id: "default-devops", name: "DevOps Department" },
  { _id: "default-qa", name: "QA Department" },
  { _id: "default-uiux", name: "UI/UX Department" },
  { _id: "default-product", name: "Product Department" },
  { _id: "default-hr", name: "HR Department" },
  { _id: "default-finance", name: "Finance Department" },
  { _id: "default-operations", name: "Operations Department" },
];

const statusOptions = ["ACTIVE", "COMPLETED", "ON_HOLD", "CANCELLED"];
const priorityOptions = ["LOW", "MEDIUM", "HIGH", "URGENT"];

function progressTone(progress) {
  if (progress >= 80) return "bg-emerald-500";
  if (progress >= 50) return "bg-blue-500";
  if (progress >= 25) return "bg-amber-500";
  return "bg-rose-500";
}

function readManualProjects() {
  try {
    const stored = localStorage.getItem(MANUAL_PROJECTS_STORAGE_KEY);
    const parsed = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function mergeProjects(baseProjects, manualProjects) {
  const merged = new Map();

  baseProjects.forEach((project) => {
    const key = String(project.code || project._id || project.name || "").trim().toLowerCase();
    merged.set(key, project);
  });

  manualProjects.forEach((project) => {
    const key = String(project.code || project._id || project.name || "").trim().toLowerCase();
    merged.set(key, project);
  });

  return Array.from(merged.values());
}

function createEmptyForm() {
  return {
    code: "",
    name: "",
    description: "",
    clientName: "",
    departmentId: "",
    ownerName: "",
    startDate: "",
    deadline: "",
    budget: "",
    status: "ACTIVE",
    priority: "MEDIUM",
    averageUtilization: "",
    employeeCount: "",
    freelancerCount: "",
    requiredSkills: "",
  };
}

export default function AdminProjects() {
  const [projects, setProjects] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [manualProjects, setManualProjects] = useState(() => readManualProjects());
  const [error, setError] = useState("");
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isSavingProject, setIsSavingProject] = useState(false);
  const [projectNotice, setProjectNotice] = useState("");
  const [form, setForm] = useState(createEmptyForm());

  useEffect(() => {
    let active = true;

    async function loadProjects() {
      try {
        const [projectData, departmentData] = await Promise.allSettled([
          projectApi.getAll(),
          departmentApi.getAll(),
        ]);

        if (!active) return;

        const projectList =
          projectData.status === "fulfilled"
            ? Array.isArray(projectData.value)
              ? projectData.value
              : projectData.value?.data || []
            : [];
        const departmentList =
          departmentData.status === "fulfilled"
            ? Array.isArray(departmentData.value)
              ? departmentData.value
              : departmentData.value?.data || []
            : [];

        setProjects(mergeProjects(projectList, manualProjects));
        setDepartments(departmentList);

        if (projectData.status === "rejected" && departmentData.status === "rejected") {
          setError("Unable to load project data.");
        }
      } catch (err) {
        if (active) setError(err.message || "Unable to load project data.");
      }
    }

    loadProjects();
    return () => {
      active = false;
    };
  }, [manualProjects]);

  useEffect(() => {
    localStorage.setItem(MANUAL_PROJECTS_STORAGE_KEY, JSON.stringify(manualProjects));
  }, [manualProjects]);

  const departmentOptions = [
    ...departments,
    ...defaultDepartmentOptions.filter(
      (defaultDepartment) =>
        !departments.some(
          (department) =>
            String(department.name || "").trim().toLowerCase() === defaultDepartment.name.toLowerCase()
        )
    ),
  ];

  function openProjectModal() {
    setForm(createEmptyForm());
    setProjectNotice("");
    setIsProjectModalOpen(true);
  }

  function closeProjectModal() {
    if (isSavingProject) return;
    setIsProjectModalOpen(false);
    setProjectNotice("");
  }

  function updateForm(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleProjectSubmit(event) {
    event.preventDefault();

    if (!form.name.trim() || !form.code.trim() || !form.deadline || !form.ownerName.trim()) {
      setProjectNotice("Enter the project name, code, owner, and deadline first.");
      return;
    }

    setIsSavingProject(true);
    setProjectNotice("");

    try {
      const selectedDepartment = departmentOptions.find((department) => department._id === form.departmentId);
      const manualProject = {
        _id: `manual-project-${Date.now()}`,
        code: form.code.trim().toUpperCase(),
        name: form.name.trim(),
        description: form.description.trim(),
        clientName: form.clientName.trim() || "Workforce360",
        department: selectedDepartment ? { _id: selectedDepartment._id, name: selectedDepartment.name } : null,
        ownerManager: form.ownerName.trim() ? { name: form.ownerName.trim() } : null,
        manager: form.ownerName.trim() ? { name: form.ownerName.trim() } : null,
        startDate: form.startDate || new Date().toISOString().slice(0, 10),
        deadline: form.deadline,
        budget: Number(form.budget || 0),
        status: form.status,
        priority: form.priority,
        requiredSkills: form.requiredSkills
          .split(",")
          .map((skill) => skill.trim())
          .filter(Boolean),
        summary: {
          averageUtilization: Number(form.averageUtilization || 0),
          utilizationFormula: "completed_tasks / total_tasks * 100",
          employeeCount: Number(form.employeeCount || 0),
          freelancerCount: Number(form.freelancerCount || 0),
        },
        employees: Array.from({ length: Number(form.employeeCount || 0) }),
        freelancers: Array.from({ length: Number(form.freelancerCount || 0) }),
      };

      setManualProjects((current) => {
        const next = [...current];
        const existingIndex = next.findIndex(
          (project) => String(project.code || "").trim().toLowerCase() === manualProject.code.toLowerCase()
        );

        if (existingIndex >= 0) {
          next[existingIndex] = { ...next[existingIndex], ...manualProject };
        } else {
          next.unshift(manualProject);
        }

        return next;
      });

      setProjects((current) => mergeProjects(current, [manualProject]));
      setProjectNotice(`Project saved for ${manualProject.name}.`);
      setTimeout(() => {
        setIsProjectModalOpen(false);
        setProjectNotice("");
      }, 700);
    } finally {
      setIsSavingProject(false);
    }
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900">Projects</h1>
            <p className="mt-2 text-sm text-slate-500">Admin oversight into delivery status, ownership, utilization, and staffing.</p>
          </div>
          <button
            type="button"
            onClick={openProjectModal}
            className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
          >
            Add Project
          </button>
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
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-rose-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-rose-700">
                    {project.status || "ACTIVE"}
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-700">
                    {project.priority || "MEDIUM"} Priority
                  </span>
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-blue-700">
                    {project.code || "WF-PROJ"}
                  </span>
                </div>

                <h2 className="mt-4 text-2xl font-black tracking-tight text-slate-900">{project.name || "Untitled Project"}</h2>
                <p className="mt-2 text-sm text-slate-500">{project.description || "Detailed project summary not added yet."}</p>

                <div className="mt-5 space-y-3 rounded-2xl bg-slate-50 p-4 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Client</span>
                    <span className="font-semibold text-slate-800">{project.clientName || project.client?.name || "Workforce360"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Department</span>
                    <span className="font-semibold text-slate-800">{project.department?.name || "Unassigned"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Owner</span>
                    <span className="font-semibold text-slate-800">{project.ownerManager?.name || project.manager?.name || "Manager pending"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Start</span>
                    <span className="font-semibold text-slate-800">{formatDate(project.startDate || project.createdAt)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Deadline</span>
                    <span className="font-semibold text-slate-800">{formatDate(project.deadline || project.endDate)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Budget</span>
                    <span className="font-semibold text-slate-800">{formatCurrency(project.budget || 0)}</span>
                  </div>
                </div>

                <div className="mt-5 rounded-2xl border border-slate-100 p-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-slate-700">Average Utilization</span>
                    <span className="font-black text-slate-900">{project.summary?.averageUtilization ?? 0}%</span>
                  </div>
                  <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${progressTone(project.summary?.averageUtilization ?? 0)}`}
                      style={{ width: `${Math.min(project.summary?.averageUtilization ?? 0, 100)}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    Formula: {project.summary?.utilizationFormula || "completed_tasks / total_tasks * 100"}
                  </p>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-2xl bg-slate-50 p-3">
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Employees</p>
                    <p className="mt-2 text-lg font-black text-slate-900">{project.summary?.employeeCount ?? project.employees?.length ?? 0}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-3">
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Freelancers</p>
                    <p className="mt-2 text-lg font-black text-slate-900">{project.summary?.freelancerCount ?? project.freelancers?.length ?? 0}</p>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  {(project.requiredSkills || []).length ? (project.requiredSkills || []).map((skill) => (
                    <span key={`${project._id}-${skill}`} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                      {skill}
                    </span>
                  )) : (
                    <span className="text-sm text-slate-400">No required skills listed yet.</span>
                  )}
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

      {isProjectModalOpen ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/50 px-4 backdrop-blur-sm">
          <div className="w-full max-w-4xl rounded-[28px] border border-slate-200 bg-white p-6 shadow-2xl sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-rose-600">Project Setup</p>
                <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900">Add project details</h2>
                <p className="mt-2 text-sm text-slate-500">
                  Fill in the project information shown in the admin project cards and save it to display instantly.
                </p>
              </div>
              <button
                type="button"
                onClick={closeProjectModal}
                className="rounded-full bg-slate-100 px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-slate-500 transition hover:bg-slate-200"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleProjectSubmit} className="mt-6 space-y-5">
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                <label className="block">
                  <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Project Name</span>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(event) => updateForm("name", event.target.value)}
                    placeholder="Enter project name"
                    className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-300 focus:border-rose-300 focus:bg-white"
                  />
                </label>

                <label className="block">
                  <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Project Code</span>
                  <input
                    type="text"
                    value={form.code}
                    onChange={(event) => updateForm("code", event.target.value.toUpperCase())}
                    placeholder="WF-PROJ"
                    className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold uppercase text-slate-700 outline-none transition placeholder:text-slate-300 focus:border-rose-300 focus:bg-white"
                  />
                </label>

                <label className="block">
                  <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Client</span>
                  <input
                    type="text"
                    value={form.clientName}
                    onChange={(event) => updateForm("clientName", event.target.value)}
                    placeholder="Enter client name"
                    className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-300 focus:border-rose-300 focus:bg-white"
                  />
                </label>
              </div>

              <label className="block">
                <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Description</span>
                <textarea
                  value={form.description}
                  onChange={(event) => updateForm("description", event.target.value)}
                  rows={3}
                  placeholder="Enter project description"
                  className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-300 focus:border-rose-300 focus:bg-white"
                />
              </label>

              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                <label className="block">
                  <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Department</span>
                  <select
                    value={form.departmentId}
                    onChange={(event) => updateForm("departmentId", event.target.value)}
                    className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-rose-300 focus:bg-white"
                  >
                    <option value="">Select department</option>
                    {departmentOptions.map((department) => (
                      <option key={department._id} value={department._id}>
                        {department.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Owner</span>
                  <input
                    type="text"
                    value={form.ownerName}
                    onChange={(event) => updateForm("ownerName", event.target.value)}
                    placeholder="Enter owner name"
                    className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-300 focus:border-rose-300 focus:bg-white"
                  />
                </label>

                <label className="block">
                  <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Status</span>
                  <select
                    value={form.status}
                    onChange={(event) => updateForm("status", event.target.value)}
                    className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-rose-300 focus:bg-white"
                  >
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Priority</span>
                  <select
                    value={form.priority}
                    onChange={(event) => updateForm("priority", event.target.value)}
                    className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-rose-300 focus:bg-white"
                  >
                    {priorityOptions.map((priority) => (
                      <option key={priority} value={priority}>
                        {priority}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                <label className="block">
                  <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Start Date</span>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(event) => updateForm("startDate", event.target.value)}
                    className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-rose-300 focus:bg-white"
                  />
                </label>

                <label className="block">
                  <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Deadline</span>
                  <input
                    type="date"
                    value={form.deadline}
                    onChange={(event) => updateForm("deadline", event.target.value)}
                    className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-rose-300 focus:bg-white"
                  />
                </label>

                <label className="block">
                  <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Budget</span>
                  <input
                    type="number"
                    min="0"
                    value={form.budget}
                    onChange={(event) => updateForm("budget", event.target.value)}
                    placeholder="0"
                    className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-300 focus:border-rose-300 focus:bg-white"
                  />
                </label>

                <label className="block">
                  <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Utilization %</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={form.averageUtilization}
                    onChange={(event) => updateForm("averageUtilization", event.target.value)}
                    placeholder="0"
                    className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-300 focus:border-rose-300 focus:bg-white"
                  />
                </label>
              </div>

              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                <label className="block">
                  <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Employee Count</span>
                  <input
                    type="number"
                    min="0"
                    value={form.employeeCount}
                    onChange={(event) => updateForm("employeeCount", event.target.value)}
                    placeholder="0"
                    className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-300 focus:border-rose-300 focus:bg-white"
                  />
                </label>

                <label className="block">
                  <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Freelancer Count</span>
                  <input
                    type="number"
                    min="0"
                    value={form.freelancerCount}
                    onChange={(event) => updateForm("freelancerCount", event.target.value)}
                    placeholder="0"
                    className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-300 focus:border-rose-300 focus:bg-white"
                  />
                </label>

                <label className="block">
                  <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Skills</span>
                  <input
                    type="text"
                    value={form.requiredSkills}
                    onChange={(event) => updateForm("requiredSkills", event.target.value)}
                    placeholder="React, Node.js, QA"
                    className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-300 focus:border-rose-300 focus:bg-white"
                  />
                </label>
              </div>

              {projectNotice ? (
                <div className={`rounded-2xl px-4 py-3 text-sm font-medium ${projectNotice.toLowerCase().includes("enter") || projectNotice.toLowerCase().includes("select") ? "border border-amber-200 bg-amber-50 text-amber-800" : "border border-emerald-200 bg-emerald-50 text-emerald-800"}`}>
                  {projectNotice}
                </div>
              ) : null}

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeProjectModal}
                  disabled={isSavingProject}
                  className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingProject}
                  className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSavingProject ? "Saving Changes..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </AdminLayout>
  );
}
