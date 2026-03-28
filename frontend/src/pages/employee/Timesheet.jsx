import { useEffect, useMemo, useState } from "react";
import EmployeeLayout from "../../layouts/EmployeeLayout";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { attendanceApi } from "../../services/api";

// ── Sample attendance data keyed by "YYYY-MM-DD" ──────────────────────────
const attendanceData = {
  "2026-03-02": { in: "9:00 AM", out: "5:30 PM", hours: 8.5 },
  "2026-03-03": { in: "8:45 AM", out: "5:05 PM", hours: 8.5 },
  "2026-03-04": { in: "9:15 AM", out: "5:45 PM", hours: 8.5 },
  "2026-03-05": { in: "9:00 AM", out: "5:00 PM", hours: 8 },
  "2026-03-06": { in: "9:00 AM", out: "5:30 PM", hours: 8.5 },
  "2026-03-09": { in: "9:00 AM", out: "5:00 PM", hours: 8 },
  "2026-03-10": { in: "8:30 AM", out: "5:00 PM", hours: 8.5 },
  "2026-03-11": { in: "9:10 AM", out: "5:40 PM", hours: 8.5 },
  "2026-03-12": { in: "9:00 AM", out: "5:00 PM", hours: 8 },
  "2026-03-13": { in: "9:00 AM", out: "5:30 PM", hours: 8.5 },
  "2026-03-16": { in: "9:00 AM", out: "5:00 PM", hours: 8 },
  "2026-03-17": { in: "9:00 AM", out: "5:30 PM", hours: 8.5 },
  "2026-03-18": { in: "9:05 AM", out: "5:35 PM", hours: 8.5 },
  "2026-03-19": { in: "9:00 AM", out: "5:00 PM", hours: 8 },
  "2026-03-20": { in: "9:00 AM", out: "5:30 PM", hours: 8.5 },
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

function pad(n) { return String(n).padStart(2, "0"); }

function buildCalendar(year, month) {
  // month is 0-indexed
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  return cells;
}

export default function Timesheet() {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth()); // 0-indexed
  const [records, setRecords] = useState(attendanceData);

  useEffect(() => {
    let active = true;

    async function loadAttendance() {
      try {
        const data = await attendanceApi.getMyAttendance();
        if (!active) return;
        const rows = Array.isArray(data) ? data : data?.data || [];
        if (!rows.length) return;

        const mapped = rows.reduce((acc, row) => {
          const key = new Date(row.date).toISOString().slice(0, 10);
          const inTime = row.clockIn ? new Date(row.clockIn).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "-";
          const outTime = row.clockOut ? new Date(row.clockOut).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "-";
          acc[key] = { in: inTime, out: outTime, hours: row.hoursWorked || 0 };
          return acc;
        }, {});

        setRecords(Object.keys(mapped).length ? mapped : attendanceData);
      } catch {}
    }

    loadAttendance();
    return () => {
      active = false;
    };
  }, []);

  const cells = useMemo(() => buildCalendar(viewYear, viewMonth), [viewYear, viewMonth]);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const getKey = (day) =>
    `${viewYear}-${pad(viewMonth + 1)}-${pad(day)}`;

  const isToday = (day) =>
    day === today.getDate() &&
    viewMonth === today.getMonth() &&
    viewYear === today.getFullYear();

  return (
    <EmployeeLayout>
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Timesheet</h1>
          <p className="text-slate-500 text-sm font-medium">
            View your clock in/out records and hours worked
          </p>
        </div>

        {/* Calendar Card */}
        <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">

          {/* Calendar Header */}
          <div className="px-6 py-5 border-b border-slate-50 flex items-center justify-between">
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight">
              Monthly Calendar
            </h2>
            <div className="flex items-center gap-3">
              <button
                onClick={prevMonth}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <ChevronLeft size={16} strokeWidth={2.5} />
              </button>
              <span className="text-sm font-black text-slate-700 w-28 text-center">
                {MONTHS[viewMonth]} {viewYear}
              </span>
              <button
                onClick={nextMonth}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <ChevronRight size={16} strokeWidth={2.5} />
              </button>
            </div>
          </div>

          {/* Day Labels */}
          <div className="grid grid-cols-7 border-b border-slate-50">
            {DAYS.map((d) => (
              <div
                key={d}
                className={`py-3 text-center text-[11px] font-black uppercase tracking-widest
                  ${WEEKDAYS.includes(d) ? "text-blue-500" : "text-slate-300"}`}
              >
                {d}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7">
            {cells.map((day, idx) => {
              const rec = day ? records[getKey(day)] : null;
              const today_ = day && isToday(day);

              return (
                <div
                  key={idx}
                  className={`min-h-[100px] p-2.5 border-b border-r border-slate-50 last:border-r-0
                    ${rec ? "bg-blue-50/40" : "bg-white"}
                    ${!day ? "bg-slate-50/30" : ""}
                  `}
                >
                  {day && (
                    <>
                      {/* Date number */}
                      <span
                        className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[12px] font-black mb-2
                          ${today_
                            ? "bg-blue-600 text-white"
                            : rec
                            ? "text-blue-500"
                            : "text-slate-400"
                          }`}
                      >
                        {day}
                      </span>

                      {/* Clock In / Out */}
                      {rec && (
                        <div className="space-y-0.5">
                          <p className="text-[10px] font-bold text-teal-500 leading-tight">
                            In: {rec.in}
                          </p>
                          <p className="text-[10px] font-bold text-rose-400 leading-tight">
                            Out: {rec.out}
                          </p>
                          <span className="inline-block mt-1 px-2 py-0.5 bg-blue-100 text-blue-600 text-[9px] font-black rounded-full">
                            {rec.hours}h
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </EmployeeLayout>
  );
}
