import { useEffect, useState } from "react";
import FreelancerLayout from "../../layouts/FreelancerLayout";
import { timesheetApi } from "../../services/api";
import { formatDate } from "../../utils/formatters";

export default function FreelancerTimesheets() {
  const [entries, setEntries] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadEntries() {
      try {
        const data = await timesheetApi.getMine();
        if (!active) return;
        setEntries(Array.isArray(data) ? data : data?.data || []);
      } catch (err) {
        if (active) setError(err.message || "Unable to load timesheets.");
      }
    }

    loadEntries();
    return () => {
      active = false;
    };
  }, []);

  return (
    <FreelancerLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Timesheets</h1>
          <p className="mt-2 text-sm text-slate-500">Logged hours, approval state, and project allocation in one place.</p>
        </div>
        {error ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
            {error}
          </div>
        ) : null}
        <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
          <table className="min-w-full">
            <thead className="bg-slate-50">
              <tr>
                {["Date", "Project", "Hours", "Status"].map((label) => (
                  <th key={label} className="px-6 py-4 text-left text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {entries.length ? entries.map((entry) => (
                <tr key={entry._id || `${entry.date}-${entry.projectName}`} className="hover:bg-slate-50/70">
                  <td className="px-6 py-4 text-sm text-slate-700">{formatDate(entry.date)}</td>
                  <td className="px-6 py-4 text-sm font-semibold text-slate-800">{entry.projectName || entry.project?.name || "General Project"}</td>
                  <td className="px-6 py-4 text-sm text-slate-700">{Number(entry.hours || 0).toFixed(1)}</td>
                  <td className="px-6 py-4 text-sm font-semibold text-amber-700">{entry.status || "PENDING"}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center text-sm text-slate-400">
                    No timesheet entries have been submitted yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </FreelancerLayout>
  );
}
