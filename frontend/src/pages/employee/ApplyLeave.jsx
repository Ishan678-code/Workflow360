import { useEffect, useMemo, useState } from "react";
import EmployeeLayout from "../../layouts/EmployeeLayout";
import { leaveApi } from "../../services/api";
import { formatDate } from "../../utils/formatters";

// ── Leave type badge ──────────────────────────────────────────────────────────
const typeMeta = {
  Annual       : "bg-blue-50 text-blue-600 border-blue-100",
  Sick         : "bg-orange-50 text-orange-600 border-orange-100",
  Casual       : "bg-purple-50 text-purple-600 border-purple-100",
  Compassionate: "bg-rose-50 text-rose-600 border-rose-100",
};

const TypeBadge = ({ type }) => (
  <span className={`inline-block px-2.5 py-1 rounded-md text-[11px] font-semibold border ${typeMeta[type] || "bg-slate-50 text-slate-600 border-slate-100"}`}>
    {type}
  </span>
);

// ── Calendar icon ─────────────────────────────────────────────────────────────
const CalIcon = () => (
  <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path strokeLinecap="round" d="M16 2v4M8 2v4M3 10h18" />
  </svg>
);

// ── Send icon ─────────────────────────────────────────────────────────────────
const SendIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" />
  </svg>
);

// ── Sample history data ───────────────────────────────────────────────────────
const sampleHistory = [
  { type: "Annual",        period: "Mar 15, 2026 – Mar 18, 2026", reason: "Family vacation",     link: false },
  { type: "Sick",          period: "Mar 5, 2026",                  reason: "Medical appointment", link: true  },
  { type: "Annual",        period: "Feb 14, 2026",                 reason: "Personal day",        link: false },
  { type: "Compassionate", period: "Jan 20, 2026 – Jan 22, 2026",  reason: "Family emergency",    link: true  },
];

const statusMeta = {
  APPROVED : "bg-green-50 text-green-600 border-green-100",
  REJECTED : "bg-red-50 text-red-600 border-red-100",
  PENDING  : "bg-amber-50 text-amber-600 border-amber-100",
};

const StatusBadge = ({ status = "PENDING" }) => (
  <span className={`inline-block px-2.5 py-1 rounded-md text-[11px] font-semibold border ${statusMeta[status] || statusMeta.PENDING}`}>
    {status.charAt(0) + status.slice(1).toLowerCase()}
  </span>
);

const LeaveSummaryCard = ({ label, value, tone = "slate" }) => (
  <div className={`rounded-3xl border border-slate-100 bg-white p-5 shadow-sm`}> 
    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">{label}</p>
    <p className={`mt-3 text-3xl font-black ${tone === "blue" ? "text-blue-600" : tone === "green" ? "text-emerald-600" : tone === "amber" ? "text-amber-600" : "text-slate-800"}`}>
      {value}
    </p>
  </div>
);

const leaveTypes = ["Annual", "Sick", "Casual", "Compassionate"];

// today in YYYY-MM-DD, local time
function todayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function ApplyLeave() {
  const today = todayStr();
  const [form, setForm]       = useState({ type: "", from: "", to: "", reason: "" });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [error, setError]     = useState("");

  const historySummary = useMemo(() => {
    const stats = { total: history.length, approved: 0, pending: 0, rejected: 0 };
    history.forEach((item) => {
      const status = String(item.status || "PENDING").toUpperCase();
      if (status === "APPROVED") stats.approved += 1;
      else if (status === "REJECTED") stats.rejected += 1;
      else stats.pending += 1;
    });
    return stats;
  }, [history]);

  useEffect(() => {
    let active = true;

    async function loadHistory() {
      try {
        const data = await leaveApi.getMyLeaves();
        if (!active) return;
        const rows = Array.isArray(data) ? data : data?.data || [];
        setHistory(rows.map((item) => ({
          type: item.type || "Leave",
          period: item.to ? `${formatDate(item.from)} – ${formatDate(item.to)}` : formatDate(item.from),
          reason: item.reason || "No reason provided",
          status: item.status || "PENDING",
          link: false,
        })));
      } catch {
        // API unreachable — fall back to sample so page isn't empty
        if (active) setHistory(sampleHistory);
      } finally {
        if (active) setHistoryLoaded(true);
      }
    }

    loadHistory();
    return () => {
      active = false;
    };
  }, []);

  const handleFromChange = (e) => {
    const newFrom = e.target.value;
    // If end date is now before the new start date, clear it
    setForm((prev) => ({
      ...prev,
      from: newFrom,
      to: prev.to && prev.to < newFrom ? "" : prev.to,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (form.from < today) {
      setError("Start date cannot be in the past.");
      return;
    }
    if (form.to && form.to < form.from) {
      setError("End date cannot be before start date.");
      return;
    }

    setLoading(true);
    try {
      await leaveApi.apply({
        ...form,
        type: form.type.toUpperCase() === "ANNUAL" ? "VACATION" : form.type.toUpperCase(),
      });
      setSuccess(true);
      setHistory((prev) => [
        {
          type: form.type,
          period: form.from === form.to
            ? formatDate(form.from)
            : `${formatDate(form.from)} – ${formatDate(form.to)}`,
          reason: form.reason || "No reason provided",
          status: "PENDING",
          link: false,
        },
        ...prev,
      ]);
      setForm({ type: "", from: "", to: "", reason: "" });
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.message || "Unable to submit leave request.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <EmployeeLayout>
      {/* Page header */}
      <div className="mb-6 text-center">
        <h1 className="text-xl font-bold text-slate-800">Apply for Leave</h1>
        <p className="text-[13px] text-slate-400 mt-1">Submit a new leave request and review your leave history.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 max-w-5xl mx-auto mb-6">
        <LeaveSummaryCard label="Total requests" value={historySummary.total} tone="slate" />
        <LeaveSummaryCard label="Pending approvals" value={historySummary.pending} tone="amber" />
        <LeaveSummaryCard label="Approved leaves" value={historySummary.approved} tone="green" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-6 max-w-5xl mx-auto">

        {/* ── Left: Form ───────────────────────────────────────────────── */}
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm px-6 py-6">
          <h2 className="text-[13.5px] font-bold text-slate-700 mb-5 flex items-center gap-2">
            <span className="text-base">📋</span> New Leave Request
          </h2>

          {success && (
            <div className="mb-4 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-green-50 border border-green-100 text-green-700 text-[12.5px] font-medium">
              <span>✓</span> Leave request submitted successfully!
            </div>
          )}

          {error && (
            <div className="mb-4 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-50 border border-red-100 text-red-700 text-[12.5px] font-medium">
              <span>!</span> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Leave Type */}
            <div>
              <label className="block text-[12.5px] font-semibold text-slate-600 mb-1.5">Leave Type</label>
              <div className="relative">
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  required
                  className="w-full appearance-none px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-[13px] text-slate-700 outline-none focus:bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all cursor-pointer"
                >
                  <option value="" disabled>Select leave type</option>
                  {leaveTypes.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Start Date */}
            <div>
              <label className="block text-[12.5px] font-semibold text-slate-600 mb-1.5">
                Start Date
                <span className="ml-1.5 text-[11px] font-normal text-slate-400">(today or later)</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={form.from}
                  onChange={handleFromChange}
                  required
                  min={today}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-[13px] text-slate-700 outline-none focus:bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <CalIcon />
                </div>
              </div>
            </div>

            {/* End Date */}
            <div>
              <label className="block text-[12.5px] font-semibold text-slate-600 mb-1.5">
                End Date
                <span className="ml-1.5 text-[11px] font-normal text-slate-400">(same day or later)</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={form.to}
                  onChange={(e) => setForm({ ...form, to: e.target.value })}
                  required
                  min={form.from || today}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-[13px] text-slate-700 outline-none focus:bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <CalIcon />
                </div>
              </div>
            </div>

            {/* Reason */}
            <div>
              <label className="block text-[12.5px] font-semibold text-slate-600 mb-1.5">Reason</label>
              <textarea
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                rows={4}
                placeholder="Enter reason for leave..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-[13px] text-slate-700 placeholder-slate-300 outline-none focus:bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all resize-none"
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-[13px] font-semibold flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-60"
            >
              {loading ? (
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
              ) : (
                <SendIcon />
              )}
              {loading ? "Submitting…" : "Submit Request"}
            </button>
          </form>
        </div>

        {/* ── Right: Leave History ──────────────────────────────────────── */}
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm px-6 py-6">
          <h2 className="text-[13.5px] font-bold text-slate-700 mb-5 flex items-center gap-2">
            <span className="text-base">📂</span> Leave History
          </h2>

          {/* Table */}
          <div className="overflow-x-auto">
            {!historyLoaded ? (
              <div className="py-12 text-center text-slate-400 text-[13px]">Loading history…</div>
            ) : (
              <>
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="text-left text-[11px] uppercase tracking-widest text-slate-400 font-semibold pb-3 pr-4">Type</th>
                      <th className="text-left text-[11px] uppercase tracking-widest text-slate-400 font-semibold pb-3 pr-4">Period</th>
                      <th className="text-left text-[11px] uppercase tracking-widest text-slate-400 font-semibold pb-3 pr-4">Status</th>
                      <th className="text-left text-[11px] uppercase tracking-widest text-slate-400 font-semibold pb-3">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {history.map((row, i) => (
                      <tr key={i} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 pr-4">
                          <TypeBadge type={row.type} />
                        </td>
                        <td className="py-3.5 pr-4">
                          <span className="text-[12.5px] text-slate-600 leading-snug">{row.period}</span>
                        </td>
                        <td className="py-3.5 pr-4">
                          <StatusBadge status={row.status} />
                        </td>
                        <td className="py-3.5">
                          <span className="text-[12.5px] text-slate-600">{row.reason}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {history.length === 0 && (
                  <div className="py-12 text-center text-slate-400 text-[13px]">
                    No leave history yet. Submit your first request!
                  </div>
                )}
              </>
            )}
          </div>
        </div>

      </div>
    </EmployeeLayout>
  );
}
