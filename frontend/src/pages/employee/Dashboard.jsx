import { useState, useEffect } from "react";
import EmployeeLayout from "../../layouts/EmployeeLayout";
import { analyticsApi, attendanceApi } from "../../services/api";
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
  const [shiftDone, setShiftDone] = useState(false);
  const [clockInTime, setClockInTime] = useState(null);
  const [clockOutTime, setClockOutTime] = useState(null);
  const [hoursToday, setHoursToday] = useState(0);
  const [loading, setLoading] = useState(false);
  const [clockError, setClockError] = useState("");
  const [liveTime, setLiveTime] = useState(new Date());
  const [dashboardStats, setDashboardStats] = useState(null);
  const [productivity, setProductivity] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [analyticsError, setAnalyticsError] = useState("");
  const [attendanceInfo, setAttendanceInfo] = useState(null);

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

  // Restore clock-in state from today's attendance record on mount
  useEffect(() => {
    let active = true;
    async function checkTodayAttendance() {
      try {
        // Fetch all records (sorted desc) and check if the latest is from today
        const records = await attendanceApi.getMyAttendance();
        if (!active) return;
        if (records?.length > 0) {
          const record = records[0];
          const recordDate = new Date(record.date || record.clockIn);
          const isToday = recordDate.toDateString() === new Date().toDateString();
          if (!isToday) return;
          if (record.clockIn && !record.clockOut) {
            setClockedIn(true);
            setClockInTime(new Date(record.clockIn).getTime());
            setAttendanceInfo({ attendance: record, alignment: record.alignment });
          } else if (record.clockIn && record.clockOut) {
            setShiftDone(true);
            setClockInTime(new Date(record.clockIn).getTime());
            setClockOutTime(new Date(record.clockOut).getTime());
            setHoursToday(record.hoursWorked ?? 0);
            setAttendanceInfo({ attendance: record, alignment: record.alignment });
          }
        }
      } catch {
        // no-op — if this fails, state stays at defaults
      }
    }
    checkTodayAttendance();
    return () => { active = false; };
  }, []);

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
    setClockError("");
    try {
      const response = await attendanceApi.clockIn("WEB-DASHBOARD");
      const startedAt = response?.attendance?.clockIn ? new Date(response.attendance.clockIn).getTime() : Date.now();
      setClockedIn(true);
      setClockInTime(startedAt);
      setAttendanceInfo(response);
    } catch (error) {
      if (error.message === "Already clocked in today") {
        // State wasn't restored on mount — fetch the existing record and sync UI
        try {
          const records = await attendanceApi.getMyAttendance();
          if (records?.length > 0) {
            const record = records[0];
            setClockedIn(true);
            setClockInTime(new Date(record.clockIn).getTime());
            setAttendanceInfo({ attendance: record, alignment: record.alignment });
          }
        } catch {
          setClockError("Already clocked in today.");
        }
      } else {
        setClockError(error.message || "Unable to clock in right now.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClockOut = async () => {
    setLoading(true);
    setClockError("");
    try {
      const response = await attendanceApi.clockOut("WEB-DASHBOARD");
      setClockedIn(false);
      setShiftDone(true);
      setClockOutTime(Date.now());
      setHoursToday(response?.hoursWorked ?? hoursToday);
      setAttendanceInfo(response);
    } catch (error) {
      if (error.message === "Already clocked out today") {
        // Sync state from the existing completed record
        try {
          const records = await attendanceApi.getMyAttendance();
          if (records?.length > 0) {
            const record = records[0];
            setClockedIn(false);
            setShiftDone(true);
            setClockOutTime(new Date(record.clockOut).getTime());
            setHoursToday(record.hoursWorked ?? 0);
            setAttendanceInfo({ attendance: record, alignment: record.alignment });
          }
        } catch {
          setClockError("Already clocked out today.");
        }
      } else {
        setClockError(error.message || "Unable to clock out right now.");
      }
    } finally {
      setLoading(false);
    }
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
  const officeStart = attendanceInfo?.alignment?.officeStart || "09:00";
  const officeEnd = attendanceInfo?.alignment?.officeEnd || "17:00";
  const lateMinutes = attendanceInfo?.alignment?.lateMinutes ?? attendanceInfo?.attendance?.lateMinutes ?? 0;
  const earlyExitMinutes = attendanceInfo?.alignment?.earlyExitMinutes ?? 0;
  const overtimeHours = attendanceInfo?.alignment?.overtimeHours ?? attendanceInfo?.attendance?.overtimeHours ?? 0;

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
                  {clockedIn && (
                    <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-emerald-400">
                      <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" /> Live
                    </span>
                  )}
                  {shiftDone && (
                    <span className="flex items-center gap-1.5 rounded-full border border-slate-500/20 bg-slate-500/10 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-slate-400">
                      <CheckCircle2 size={10} className="text-slate-400" /> Shift Complete
                    </span>
                  )}
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
              {shiftDone ? (
                <div className="flex w-full items-center gap-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-8 py-5 lg:w-auto">
                  <CheckCircle2 size={22} className="text-emerald-400 shrink-0" />
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Shift Completed</p>
                    <p className="mt-0.5 text-sm font-bold text-white">
                      {clockInTime ? formatTime(new Date(clockInTime)) : "--"} → {clockOutTime ? formatTime(new Date(clockOutTime)) : "--"}
                      <span className="ml-2 text-emerald-400">· {hoursToday} hrs</span>
                    </p>
                  </div>
                </div>
              ) : (
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
              )}

              <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-slate-400">
                  <Clock size={18} />
                </div>
                <div className="flex flex-col">
                  <span className="mb-1 text-[9px] font-black uppercase tracking-widest leading-none text-slate-500">Entry Log</span>
                  <span className="text-[13px] font-bold text-white">
                    {shiftDone
                      ? `Clocked out at ${clockOutTime ? formatTime(new Date(clockOutTime)) : "--"}`
                      : clockedIn
                      ? `Started at ${formatTime(new Date(clockInTime))}`
                      : "System Ready for Log-in"}
                  </span>
                </div>
              </div>
            </div>

            {clockError && (
              <div className="relative z-10 mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-300">
                {clockError}
              </div>
            )}
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

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <article className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm xl:col-span-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Attendance Alignment</p>
                <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900">Office-hour tracking and terminal alignment</h2>
              </div>
              <span className="rounded-full bg-slate-100 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-slate-700">
                {officeStart} - {officeEnd}
              </span>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Late Arrival</p>
                <p className="mt-2 text-3xl font-black text-slate-900">{lateMinutes} min</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Early Exit</p>
                <p className="mt-2 text-3xl font-black text-slate-900">{earlyExitMinutes} min</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Overtime</p>
                <p className="mt-2 text-3xl font-black text-slate-900">{Number(overtimeHours).toFixed(2)} hrs</p>
              </div>
            </div>

            <p className="mt-4 text-sm text-slate-500">
              Clock-in and clock-out are aligned against your assigned office window. Terminal source is recorded as <span className="font-semibold text-slate-700">{attendanceInfo?.attendance?.terminalId || "WEB-DASHBOARD"}</span>.
            </p>
          </article>

          <article className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Performance Formula</p>
            <h2 className="mt-2 text-xl font-black tracking-tight text-slate-900">Algorithm breakdown</h2>
            <div className="mt-5 space-y-4">
              <div>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-semibold text-slate-700">Task completion</span>
                  <span className="text-slate-500">40%</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-emerald-500" style={{ width: "40%" }} />
                </div>
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-semibold text-slate-700">Quality of work</span>
                  <span className="text-slate-500">35%</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-blue-500" style={{ width: "35%" }} />
                </div>
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-semibold text-slate-700">Deadline adherence</span>
                  <span className="text-slate-500">25%</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-violet-500" style={{ width: "25%" }} />
                </div>
              </div>
            </div>
            <p className="mt-4 text-sm text-slate-500">
              Performance score = 0.40 × task completion + 0.35 × quality + 0.25 × deadline adherence.
            </p>
          </article>
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
