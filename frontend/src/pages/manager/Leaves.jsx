import { useEffect, useState } from "react";
import ManagerLayout from "../../layouts/ManagerLayout";
import { leaveApi } from "../../services/api";
import { formatDate } from "../../utils/formatters";

const fallbackLeaves = [
  { _id: "lv-1", employeeName: "Ava Wilson", type: "Annual", startDate: "2026-03-28", endDate: "2026-03-30", status: "PENDING" },
  { _id: "lv-2", employeeName: "Noah Carter", type: "Sick", startDate: "2026-03-26", endDate: "2026-03-26", status: "APPROVED" },
  { _id: "lv-3", employeeName: "Emma Brooks", type: "Casual", startDate: "2026-04-02", endDate: "2026-04-03", status: "PENDING" },
];

const statusTone = {
  APPROVED: "bg-emerald-50 text-emerald-700 border-emerald-100",
  REJECTED: "bg-rose-50 text-rose-700 border-rose-100",
  PENDING: "bg-amber-50 text-amber-700 border-amber-100",
};

function normalizeLeave(leave) {
  return {
    ...leave,
    employeeName: leave.employeeName || leave.employee?.userId?.name || leave.employee?.name || "Team Member",
    startDate: leave.startDate || leave.from,
    endDate: leave.endDate || leave.to,
    type: leave.type || "Leave",
  };
}

export default function ManagerLeaves() {
  const [leaves, setLeaves] = useState(fallbackLeaves);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadLeaves() {
      try {
        const data = await leaveApi.getAll();
        if (!active) return;
        const rows = Array.isArray(data) ? data : data?.data || fallbackLeaves;
        setLeaves(rows.map(normalizeLeave));
      } catch (err) {
        if (active) setError(err.message || "Unable to load leave requests.");
      }
    }

    loadLeaves();
    return () => {
      active = false;
    };
  }, []);

  return (
    <ManagerLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Leave Approvals</h1>
          <p className="mt-2 text-sm text-slate-500">Review upcoming absences and unblock the team quickly.</p>
        </div>

        {error ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
            {error} Showing sample requests for now.
          </div>
        ) : null}

        <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
          <table className="min-w-full">
            <thead className="bg-slate-50">
              <tr>
                {["Employee", "Type", "Dates", "Status"].map((label) => (
                  <th key={label} className="px-6 py-4 text-left text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {leaves.map((leave) => {
                const name = leave.employeeName || leave.employee?.name || "Team Member";
                const status = String(leave.status || "PENDING").toUpperCase();
                return (
                  <tr key={leave._id || `${name}-${leave.startDate}`} className="hover:bg-slate-50/70">
                    <td className="px-6 py-4 text-sm font-semibold text-slate-800">{name}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{leave.type || "Leave"}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {formatDate(leave.startDate)} to {formatDate(leave.endDate)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] ${statusTone[status] || statusTone.PENDING}`}>
                        {status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </ManagerLayout>
  );
}
