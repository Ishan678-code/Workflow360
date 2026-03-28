import { useEffect, useState } from "react";
import {
  Activity,
  Briefcase,
  Receipt,
  ShieldCheck,
  UserRoundCog,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";
import AdminLayout from "../../layouts/AdminLayout";
import {
  analyticsApi,
  employeeApi,
  freelancerApi,
  payrollApi,
  projectApi,
} from "../../services/api";
import { formatCurrency } from "../../utils/formatters";

const defaultSummary = {
  totalEmployees: 0,
  totalFreelancers: 0,
  totalProjects: 0,
  activeProjects: 0,
  pendingLeaves: 0,
  pendingTimesheets: 0,
  payrollTotal: 0,
};

export default function AdminDashboard() {
  const [summary, setSummary] = useState(defaultSummary);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      const [analytics, employees, freelancers, projects, payroll] = await Promise.allSettled([
        analyticsApi.getDashboard(),
        employeeApi.getAll(),
        freelancerApi.getAll(),
        projectApi.getAll(),
        payrollApi.getAll(),
      ]);

      if (!active) return;

      const dashboard = analytics.status === "fulfilled" && analytics.value ? analytics.value : {};
      const employeeList = employees.status === "fulfilled" ? (Array.isArray(employees.value) ? employees.value : employees.value?.data || []) : [];
      const freelancerList = freelancers.status === "fulfilled" ? (Array.isArray(freelancers.value) ? freelancers.value : freelancers.value?.data || []) : [];
      const projectList = projects.status === "fulfilled" ? (Array.isArray(projects.value) ? projects.value : projects.value?.data || []) : [];
      const payrollList = payroll.status === "fulfilled" ? (Array.isArray(payroll.value) ? payroll.value : payroll.value?.data || []) : [];

      if (
        analytics.status === "rejected" &&
        employees.status === "rejected" &&
        freelancers.status === "rejected" &&
        projects.status === "rejected" &&
        payroll.status === "rejected"
      ) {
        setError("Live admin data is unavailable right now.");
      }

      setSummary({
        totalEmployees: dashboard.totalEmployees ?? employeeList.length,
        totalFreelancers: dashboard.totalFreelancers ?? freelancerList.length,
        totalProjects: dashboard.totalProjects ?? projectList.length,
        activeProjects:
          dashboard.activeProjects ??
          projectList.filter((project) => String(project.status || "").toUpperCase() === "ACTIVE").length,
        pendingLeaves: dashboard.pendingLeaves ?? 0,
        pendingTimesheets: dashboard.pendingTimesheets ?? 0,
        payrollTotal: payrollList.reduce((total, item) => total + Number(item.netSalary || item.amount || 0), 0),
      });
    }

    loadDashboard().catch(() => {
      if (active) setError("Live admin data is unavailable right now.");
    });

    return () => {
      active = false;
    };
  }, []);

  const statCards = [
    { label: "Employees", value: summary.totalEmployees, icon: Users, tone: "bg-rose-100 text-rose-700" },
    { label: "Freelancers", value: summary.totalFreelancers, icon: UserRoundCog, tone: "bg-orange-100 text-orange-700" },
    { label: "Projects", value: summary.totalProjects, icon: Briefcase, tone: "bg-sky-100 text-sky-700" },
    { label: "Active Delivery", value: summary.activeProjects, icon: Activity, tone: "bg-emerald-100 text-emerald-700" },
  ];

  const operationalCards = [
    { label: "Pending Leaves", value: summary.pendingLeaves },
    { label: "Pending Timesheets", value: summary.pendingTimesheets },
    { label: "Payroll Exposure", value: formatCurrency(summary.payrollTotal) },
  ];

  return (
    <AdminLayout>
      <div className="space-y-8">
        <section className="overflow-hidden rounded-[34px] border border-rose-100 bg-gradient-to-br from-rose-700 via-rose-600 to-orange-500 px-8 py-10 text-white shadow-2xl">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.32em] text-rose-100">Executive Overview</p>
              <h1 className="mt-3 text-4xl font-black tracking-tight">Admin command center for the whole operation.</h1>
              <p className="mt-3 max-w-2xl text-sm text-rose-50/90">
                Monitor headcount, throughput, approvals, and payroll from one place without dropping into each role portal.
              </p>
            </div>
            <div className="rounded-3xl border border-white/15 bg-white/10 px-5 py-4 backdrop-blur">
              <div className="flex items-center gap-3">
                <ShieldCheck size={18} className="text-rose-100" />
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-rose-100">System Status</p>
                  <p className="text-lg font-black">Admin Access Active</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {error ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
            {error} Showing whatever summary data could be assembled.
          </div>
        ) : null}

        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {statCards.map(({ label, value, icon: Icon, tone }) => (
            <article key={label} className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">{label}</p>
                  <p className="mt-3 text-4xl font-black tracking-tight text-slate-900">{value}</p>
                </div>
                <div className={`rounded-2xl p-3 ${tone}`}>
                  <Icon size={22} />
                </div>
              </div>
            </article>
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
          <article className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-black text-slate-900">Operational Pressure</h2>
            <p className="mt-1 text-sm text-slate-500">The admin-level items most likely to need attention today.</p>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {operationalCards.map((card) => (
                <div key={card.label} className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">{card.label}</p>
                  <p className="mt-3 text-2xl font-black tracking-tight text-slate-900">{card.value}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-rose-100 p-3 text-rose-700">
                <Receipt size={20} />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900">Quick Admin Paths</h2>
                <p className="text-sm text-slate-500">Jump into the existing admin-authorized sections.</p>
              </div>
            </div>
            <div className="mt-6 space-y-3">
              {[
                { href: "/admin/people", label: "Manage employees and roster" },
                { href: "/admin/payroll", label: "Review payroll records" },
                { href: "/admin/performance", label: "Inspect performance trends" },
                { href: "/admin/projects", label: "See active project load" },
              ].map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  className="flex items-center justify-between rounded-2xl border border-slate-100 px-4 py-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                >
                  <span>{item.label}</span>
                  <span className="text-rose-600">Open</span>
                </Link>
              ))}
            </div>
          </article>
        </section>
      </div>
    </AdminLayout>
  );
}
