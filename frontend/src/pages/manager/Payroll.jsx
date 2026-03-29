import { useEffect, useState } from "react";
import ManagerLayout from "../../layouts/ManagerLayout";
import { payrollApi } from "../../services/api";
import { formatCurrency, formatMonthLabel } from "../../utils/formatters";

const fallbackPayroll = [
  { _id: "pay-1", employeeName: "Ava Wilson", month: "2026-03", netSalary: 4200, status: "PROCESSED" },
  { _id: "pay-2", employeeName: "Noah Carter", month: "2026-03", netSalary: 3900, status: "PENDING" },
  { _id: "pay-3", employeeName: "Emma Brooks", month: "2026-03", netSalary: 3600, status: "PROCESSED" },
];

function normalizePayroll(record) {
  return {
    ...record,
    employeeName: record.employeeName || record.employee?.userId?.name || record.employee?.name || "Team Member",
    departmentName: record.departmentName || record.employee?.department?.name || "Unassigned",
    designationTitle: record.designationTitle || record.employee?.designation?.title || "Role pending",
    status: record.status || "PROCESSED",
  };
}

export default function ManagerPayroll() {
  const [records, setRecords] = useState(fallbackPayroll);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadPayroll() {
      try {
        const data = await payrollApi.getAll();
        if (!active) return;
        const rows = Array.isArray(data) ? data : data?.data || fallbackPayroll;
        setRecords(rows.map(normalizePayroll));
      } catch (err) {
        if (active) setError(err.message || "Unable to load payroll records.");
      }
    }

    loadPayroll();
    return () => {
      active = false;
    };
  }, []);

  return (
    <ManagerLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Payroll</h1>
          <p className="mt-2 text-sm text-slate-500">Keep an eye on monthly payouts, processing state, and exceptions.</p>
        </div>

        {error ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
            {error} Showing sample payroll records for now.
          </div>
        ) : null}

        <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
          <table className="min-w-full">
            <thead className="bg-slate-50">
              <tr>
                {["Employee", "Department", "Role", "Month", "Net Pay", "Status"].map((label) => (
                  <th key={label} className="px-6 py-4 text-left text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {records.map((record) => (
                <tr key={record._id || `${record.employeeName}-${record.month}`} className="hover:bg-slate-50/70">
                  <td className="px-6 py-4">
                    <div className="text-sm font-semibold text-slate-800">{record.employeeName || record.employee?.name || "Team Member"}</div>
                    <div className="mt-1 text-xs text-slate-400">{record.payrollNumber || "Payroll record"}</div>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-slate-700">{record.departmentName || "Unassigned"}</td>
                  <td className="px-6 py-4 text-sm font-medium text-slate-700">{record.designationTitle || "Role pending"}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{formatMonthLabel(record.month || record.payPeriod || "2026-03")}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{formatCurrency(record.netSalary || record.amount || 0)}</td>
                  <td className="px-6 py-4 text-sm font-semibold text-violet-700">{record.status || "PENDING"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </ManagerLayout>
  );
}
