import { useEffect, useState } from "react";
import {
  Briefcase,
  CalendarCheck,
  Clock3,
  TrendingUp,
  Users,
} from "lucide-react";
import ManagerLayout from "../../layouts/ManagerLayout";
import { analyticsApi } from "../../services/api";

const fallbackStats = [
  { label: "Team Members", value: "24", icon: Users, tone: "bg-violet-100 text-violet-700" },
  { label: "Pending Leaves", value: "6", icon: CalendarCheck, tone: "bg-amber-100 text-amber-700" },
  { label: "Open Tasks", value: "18", icon: Briefcase, tone: "bg-sky-100 text-sky-700" },
  { label: "Avg. Utilization", value: "91%", icon: TrendingUp, tone: "bg-emerald-100 text-emerald-700" },
];

const priorities = [
  "Review leave requests before noon",
  "Follow up on payroll exceptions",
  "Check delivery risk for the mobile redesign sprint",
];

export default function ManagerDashboard() {
  const [stats, setStats] = useState(fallbackStats);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      try {
        const data = await analyticsApi.getDashboard();
        if (!active || !data || typeof data !== "object") return;

        setStats([
          { label: "Team Members", value: String(data.totalEmployees ?? data.employees ?? 24), icon: Users, tone: "bg-violet-100 text-violet-700" },
          { label: "Pending Leaves", value: String(data.pendingLeaves ?? 6), icon: CalendarCheck, tone: "bg-amber-100 text-amber-700" },
          { label: "Open Tasks", value: String(data.openTasks ?? data.pendingTasks ?? 18), icon: Briefcase, tone: "bg-sky-100 text-sky-700" },
          { label: "Avg. Utilization", value: `${Math.round(data.productivity ?? data.utilization ?? 91)}%`, icon: TrendingUp, tone: "bg-emerald-100 text-emerald-700" },
        ]);
      } catch (err) {
        if (active) setError(err.message || "Live dashboard data is unavailable.");
      }
    }

    loadDashboard();
    return () => {
      active = false;
    };
  }, []);

  return (
    <ManagerLayout>
      <div className="space-y-8">
        <section className="rounded-[32px] border border-violet-100 bg-gradient-to-br from-violet-950 via-violet-900 to-fuchsia-900 px-8 py-10 text-white shadow-2xl">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.3em] text-violet-200">Manager Overview</p>
              <h1 className="mt-3 text-4xl font-black tracking-tight">Lead the week with clarity.</h1>
              <p className="mt-3 max-w-2xl text-sm text-violet-100/80">
                A quick pulse on approvals, staffing, and delivery pressure so the team can keep moving.
              </p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/10 px-5 py-4 backdrop-blur">
              <div className="flex items-center gap-3">
                <Clock3 size={18} className="text-violet-200" />
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-violet-200">Focus Window</p>
                  <p className="text-lg font-black">09:00 AM to 01:00 PM</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {error ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
            {error} Showing fallback metrics for now.
          </div>
        ) : null}

        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {stats.map(({ label, value, icon: Icon, tone }) => (
            <article key={label} className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between">
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

        <section className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
          <article className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-slate-900">Team Momentum</h2>
                <p className="mt-1 text-sm text-slate-500">This week’s priorities and current operating rhythm.</p>
              </div>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-700">
                On Track
              </span>
            </div>
            <div className="mt-6 space-y-3">
              {priorities.map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-4">
                  <div className="h-2.5 w-2.5 rounded-full bg-violet-600" />
                  <p className="text-sm font-semibold text-slate-700">{item}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-black text-slate-900">Approvals Snapshot</h2>
            <div className="mt-6 space-y-4">
              {[
                ["Leave approvals pending", "6"],
                ["Timesheets awaiting review", "4"],
                ["Performance notes due", "3"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-slate-100 px-4 py-4">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">{label}</p>
                  <p className="mt-2 text-2xl font-black text-slate-900">{value}</p>
                </div>
              ))}
            </div>
          </article>
        </section>
      </div>
    </ManagerLayout>
  );
}
