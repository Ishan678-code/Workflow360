import { useEffect, useState } from "react";
import AdminLayout from "../../layouts/AdminLayout";
import { payrollApi } from "../../services/api";
import { formatCurrency, formatMonthLabel } from "../../utils/formatters";

function normalizePayroll(record) {
  return {
    ...record,
    employeeName: record.employeeName || record.employee?.userId?.name || record.employee?.name || "Team Member",
    status: record.status || "PROCESSED",
  };
}

export default function AdminPayroll() {
  const [records, setRecords] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadPayroll() {
      try {
        const data = await payrollApi.getAll();
        if (!active) return;
        const rows = Array.isArray(data) ? data : data?.data || [];
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
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Payroll</h1>
          <p className="mt-2 text-sm text-slate-500">Admin view of monthly payroll across the workforce.</p>
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
                {["Employee", "Month", "Net Pay", "Status"].map((label) => (
                  <th key={label} className="px-6 py-4 text-left text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {records.length ? (
                records.map((record) => (
                  <tr key={record._id || `Rs.{record.employeeName}-Rs.{record.month}`} className="hover:bg-slate-50/70">
                    <td className="px-6 py-4 text-sm font-semibold text-slate-800">{record.employeeName}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{formatMonthLabel(record.month || record.payPeriod || "2026-03")}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{formatCurrency(record.netSalary || record.amount || 0)}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-rose-700">{record.status}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center text-sm text-slate-400">
                    No payroll records available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
