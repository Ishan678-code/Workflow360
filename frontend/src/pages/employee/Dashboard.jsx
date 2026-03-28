import { useState, useEffect } from "react";
import EmployeeLayout from "../../layouts/EmployeeLayout";
import { analyticsApi } from "../../services/api";
import {
  Clock,
  Settings,
  CalendarCheck,
  Briefcase,
  CheckCircle2,
  ArrowUpRight,
  Zap,
  MapPin,
  ShieldCheck
} from "lucide-react";

const StatCard = ({ label, value, sub, icon: Icon, color }) => (
  <div className="group relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-md">
    <div className="mb-4 flex items-start justify-between">
      <div className={`rounded-xl p-3 ${color} bg-opacity-10 transition-transform group-hover:scale-110 group-hover:rotate-3`}>
        <Icon size={22} className={color.replace("bg-", "text-")} />
      </div>
      <div className="flex items-center gap-1 text-slate-300 transition-colors group-hover:text-blue-500">
        <span className="text-[10px] font-bold uppercase tracking-tighter">View Details</span>
        <ArrowUpRight size={14} />
      </div>
    </div>
    <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400">{label}</p>
    <div className="mt-1 flex items-baseline gap-2">
      <p className="text-3xl font-black tracking-tight text-slate-800">{value}</p>
      {sub ? <p className="text-xs font-medium text-slate-400">{sub}</p> : null}
    </div>
    <div className={`absolute bottom-0 left-0 h-1 w-0 transition-all duration-500 group-hover:w-full ${color}`} />
  </div>
);

export default function EmployeeDashboard() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const [clockedIn, setClockedIn] = useState(false);
  const [clockInTime, setClockInTime] = useState(null);
  const [hoursToday, setHoursToday] = useState(0);
  const [loading, setLoading] = useState(false);
  const [liveTime, setLiveTime] = useState(new Date());
  const [dashboardStats, setDashboardStats] = useState(null);
  const [productivity, setProductivity] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [analyticsError, setAnalyticsError] = useState("");

  useEffect(() => {
    const t = setInterval(() => setLiveTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!clockedIn || !clockInTime) return;
    const t = setInterval(() => {
      const diff = (Date.now() - clockInTime) / 3600000;
      setHoursToday(+diff.toFixed(2));
    }, 5000);
    return () => clearInterval(t);
  }, [clockedIn, clockInTime]);

  useEffect(() => {
    let active = true;

    async function loadAnalytics() {
      if (!user.id) {
        if (active) {
          setAnalyticsError("Employee profile is unavailable.");
          setAnalyticsLoading(false);
        }
        return;
      }

      try {
        const [dashboardRes, productivityRes] = await Promise.allSettled([
          analyticsApi.getDashboard(),
          analyticsApi.getProductivity(user.id, 30)
        ]);

        if (!active) return;

        if (dashboardRes.status === "fulfilled") {
          setDashboardStats(dashboardRes.value || null);
        }

        if (productivityRes.status === "fulfilled") {
          setProductivity(productivityRes.value || null);
        }

        if (dashboardRes.status === "rejected" && productivityRes.status === "rejected") {
          setAnalyticsError("Live performance insights are unavailable right now.");
        }
      } catch (error) {
        if (active) {
          setAnalyticsError(error.message || "Live performance insights are unavailable right now.");
        }
      } finally {
        if (active) setAnalyticsLoading(false);
      }
    }

    loadAnalytics();
    return () => {
      active = false;
    };
  }, [user.id]);

  const handleClockIn = async () => {
    setLoading(true);
    setTimeout(() => {
      setClockedIn(true);
      setClockInTime(Date.now());
      setLoading(false);
    }, 800);
  };

  const handleClockOut = async () => {
    setLoading(true);
    setTimeout(() => {
      setClockedIn(false);
      setLoading(false);
    }, 800);
  };

  const formatTime = (d) =>
    d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true
    });

  const employeeName = user.name || "Employee";
  const employeeInitials = employeeName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const openTasks = dashboardStats?.openTasks ?? productivity?.taskSummary?.total ?? 0;
  const performanceScore = productivity?.performanceScore ?? 0;
  const anomalyFlag = productivity?.anomaly?.flag || "NORMAL";
  const insight = productivity?.insight || "Performance insights will appear here once enough activity is available.";
  const completionRate = productivity?.taskSummary?.completionRate || "0%";
  const deadlineAdherence = productivity?.components?.deadlineAdherence != null
    ? `${Math.round(productivity.components.deadlineAdherence * 100)}%`
    : "0%";
  const avgQuality = productivity?.rawMetrics?.avgQuality != null
    ? `${Number(productivity.rawMetrics.avgQuality).toFixed(1)}/5`
    : "0.0/5";

  return (
    <EmployeeLayout>
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="flex flex-col justify-between gap-6 border-b border-slate-100 pb-6 md:flex-row md:items-end">
          <div className="space-y-1">
            <h1 className="text-3xl font-black tracking-tight text-slate-900">
              Hello, {employeeName} <span className="animate-pulse">👋</span>
            </h1>
            <p className="font-medium text-slate-500">
              You have <span className="font-bold text-blue-600">{openTasks} pending tasks</span> in your queue.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="mr-2 hidden flex-col items-end sm:flex">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Office Location</span>
              <span className="flex items-center gap-1 text-sm font-bold text-slate-700">
                <MapPin size={14} className="text-blue-500" /> Kathmandu, NP
              </span>
            </div>
            <div className="mx-2 hidden h-10 w-[1px] bg-slate-200 sm:block" />
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-2.5 shadow-sm">
              <div className="h-2.5 w-2.5 animate-ping rounded-full bg-blue-500" />
              <span className="text-sm font-black tracking-tight text-slate-700">
                {liveTime.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 xl:grid-cols-4">
          <div className="relative flex flex-col items-center overflow-hidden rounded-3xl border border-slate-100 bg-white p-8 shadow-sm xl:col-span-1">
            <div className="absolute left-0 top-0 h-24 w-full bg-gradient-to-br from-blue-50 to-indigo-50" />

            <div className="relative z-10 mt-4 group">
              <div className="h-28 w-28 rounded-3xl bg-gradient-to-tr from-blue-600 to-indigo-700 p-1.5 shadow-xl shadow-blue-200 transition-transform duration-500 group-hover:scale-105">
                <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-2xl border-4 border-white bg-white">
                  <span className="text-3xl font-black tracking-tighter text-blue-600">{employeeInitials || "EM"}</span>
                </div>
              </div>
              <div className="absolute bottom-1 right-1 flex h-7 w-7 items-center justify-center rounded-xl border-4 border-white bg-emerald-500 shadow-lg">
                <ShieldCheck size={12} className="text-white" />
              </div>
            </div>

            <div className="z-10 mt-6 text-center">
              <h2 className="text-xl font-black leading-none text-slate-800">{employeeName}</h2>
              <div className="mt-2 flex items-center justify-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Employee</p>
              </div>
            </div>

            <div className="z-10 mt-8 w-full space-y-2">
              <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <span className="text-[10px] font-bold uppercase text-slate-400">Score</span>
                <span className="text-xs font-black text-blue-600">{Math.round(performanceScore * 100)}/100</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <span className="text-[10px] font-bold uppercase text-slate-400">Status</span>
                <span className="text-xs font-black text-slate-700">{anomalyFlag}</span>
              </div>
            </div>

            <button className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 py-4 text-xs font-bold text-white shadow-lg shadow-slate-200 transition-all hover:bg-blue-600">
              <Settings size={14} /> Manage Account
            </button>
          </div>

          <div className="relative flex min-h-[420px] flex-col justify-between overflow-hidden rounded-3xl bg-slate-950 p-10 shadow-2xl xl:col-span-3">
            <div className="pointer-events-none absolute right-[-10%] top-[-10%] h-96 w-96 rounded-full bg-blue-600/20 blur-[100px]" />
            <div className="pointer-events-none absolute bottom-[-10%] left-[-10%] h-80 w-80 rounded-full bg-indigo-500/10 blur-[80px]" />

            <div className="relative z-10 flex flex-col items-start justify-between border-b border-white/10 pb-10 md:flex-row md:items-center">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-blue-400">
                    Shift Control Center
                  </span>
                  {clockedIn ? (
                    <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-emerald-400">
                      <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" /> Live
                    </span>
                  ) : null}
                </div>
                <h3 className="text-6xl font-black tracking-tighter text-white">
                  {formatTime(liveTime).split(" ")[0]}
                  <span className="ml-3 text-2xl font-medium uppercase text-slate-600">{formatTime(liveTime).split(" ")[1]}</span>
                </h3>
              </div>
              <div className="mt-6 text-left md:mt-0 md:text-right">
                <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-slate-500">Productive Hours Today</p>
                <div className="flex items-baseline gap-1 md:justify-end">
                  <p className="text-5xl font-black tracking-tighter text-white">{hoursToday}</p>
                  <p className="text-xl font-bold italic text-blue-500">hrs</p>
                </div>
              </div>
            </div>

            <div className="relative z-10 mt-10 flex flex-col items-center gap-8 lg:flex-row">
              <button
                onClick={clockedIn ? handleClockOut : handleClockIn}
                disabled={loading}
                className={`flex w-full items-center justify-center gap-3 rounded-2xl px-12 py-5 text-xs font-black tracking-widest text-white shadow-xl transition-all active:scale-95 disabled:opacity-50 lg:w-auto ${
                  clockedIn
                    ? "bg-gradient-to-r from-rose-500 to-red-600 shadow-red-900/20"
                    : "bg-gradient-to-r from-blue-500 to-indigo-600 shadow-blue-900/20"
                }`}
              >
                {loading ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : clockedIn ? (
                  <Clock size={18} />
                ) : (
                  <Zap size={18} fill="currentColor" />
                )}
                {clockedIn ? "END CURRENT SHIFT" : "INITIALIZE CLOCK IN"}
              </button>

              <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-slate-400">
                  <Clock size={18} />
                </div>
                <div className="flex flex-col">
                  <span className="mb-1 text-[9px] font-black uppercase tracking-widest leading-none text-slate-500">Entry Log</span>
                  <span className="text-[13px] font-bold text-white">
                    {clockedIn ? `Started at ${formatTime(new Date(clockInTime))}` : "System Ready for Log-in"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Algorithmic Productivity</p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900">
                {analyticsLoading ? "Loading insights..." : `${Math.round(performanceScore * 100)} / 100`}
              </h2>
              <p className="mt-2 max-w-3xl text-sm text-slate-600">{insight}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-blue-50 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-blue-700">
                {anomalyFlag}
              </span>
              <span className="rounded-full bg-slate-100 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-slate-600">
                Last 30 days
              </span>
            </div>
          </div>

          {analyticsError ? (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
              {analyticsError}
            </div>
          ) : null}
        </section>

        <div className="grid grid-cols-1 gap-6 pt-4 md:grid-cols-3">
          <StatCard
            label="Task Completion"
            value={completionRate}
            sub={`${productivity?.taskSummary?.completed ?? 0} completed`}
            icon={CalendarCheck}
            color="bg-emerald-500"
          />
          <StatCard
            label="Quality Score"
            value={avgQuality}
            sub="Average task quality"
            icon={Briefcase}
            color="bg-blue-600"
          />
          <StatCard
            label="Deadline Adherence"
            value={deadlineAdherence}
            sub={`${productivity?.taskSummary?.overdue ?? 0} overdue tasks`}
            icon={CheckCircle2}
            color="bg-violet-600"
          />
        </div>
      </div>
    </EmployeeLayout>
  );
}
