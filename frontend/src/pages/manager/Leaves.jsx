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
    totalDays: leave.totalDays || leave.days || 1,
  };
}

export default function ManagerLeaves() {
  const [leaves, setLeaves] = useState(fallbackLeaves);
  const [error, setError] = useState("");
  const [actionId, setActionId] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadLeaves({ silent = false } = {}) {
      if (!silent && active) setRefreshing(true);
      try {
        const data = await leaveApi.getAll();
        if (!active) return;
        const rows = Array.isArray(data) ? data : data?.data || fallbackLeaves;
        setLeaves(rows.map(normalizeLeave));
        setError("");
      } catch (err) {
        if (active) setError(err.message || "Unable to load leave requests.");
      } finally {
        if (active && !silent) setRefreshing(false);
      }
    }

    loadLeaves();
    const intervalId = setInterval(() => {
      loadLeaves({ silent: true });
    }, 15000);

    return () => {
      active = false;
      clearInterval(intervalId);
    };
  }, []);

  async function handleDecision(id, action) {
    setActionId(id);
    try {
      if (action === "approve") {
        await leaveApi.approve(id, "Approved by reporting manager");
      } else {
        await leaveApi.reject(id, "Rejected after policy review");
      }

      setLeaves((current) =>
        current.map((leave) =>
          leave._id === id
            ? { ...leave, status: action === "approve" ? "APPROVED" : "REJECTED" }
            : leave
        )
      );
    } catch (err) {
      setError(err.message || "Unable to update leave request.");
    } finally {
      setActionId("");
    }
  }

  return (
    <ManagerLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Leave Approvals</h1>
          <p className="mt-2 text-sm text-slate-500">Review upcoming absences and unblock the team quickly.</p>
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
          <p className="text-sm text-slate-500">New leave applications refresh automatically every 15 seconds.</p>
          <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
            {refreshing ? "Refreshing" : "Live Sync"}
          </span>
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
                {["Employee", "Type", "Dates", "Balance Impact", "Status", "Action"].map((label) => (
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
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {leave.totalDays || leave.days || 1} day(s)
                    </td>
                    <td className="px-6 py-4">
                      <span className={`rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] ${statusTone[status] || statusTone.PENDING}`}>
                        {status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {status === "PENDING" ? (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            disabled={actionId === leave._id}
                            onClick={() => handleDecision(leave._id, "approve")}
                            className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-700 disabled:opacity-60"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            disabled={actionId === leave._id}
                            onClick={() => handleDecision(leave._id, "reject")}
                            className="rounded-full bg-rose-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-rose-700 disabled:opacity-60"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs font-semibold text-slate-400">Processed</span>
                      )}
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
