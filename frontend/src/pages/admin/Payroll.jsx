import { useEffect, useState } from "react";
import AdminLayout from "../../layouts/AdminLayout";
import { payrollApi } from "../../services/api";
import { downloadBlob, formatCurrency, formatMonthLabel } from "../../utils/formatters";

function normalizePayroll(record) {
  return {
    ...record,
    employeeName: record.employeeName || record.employee?.userId?.name || record.employee?.name || "Team Member",
    departmentName: record.departmentName || record.employee?.department?.name || "Unassigned",
    designationTitle: record.designationTitle || record.employee?.designation?.title || "Role pending",
    status: record.status || "PROCESSED",
  };
}

export default function AdminPayroll() {
  const [records, setRecords] = useState([]);
  const [error, setError] = useState("");
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadPayroll() {
      try {
        const data = await payrollApi.getAll(month ? { month } : {});
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
  }, [month]);

  async function handleGenerateBulk() {
    setLoading(true);
    try {
      await payrollApi.generateBulk(month);
      const data = await payrollApi.getAll(month ? { month } : {});
      const rows = Array.isArray(data) ? data : data?.data || [];
      setRecords(rows.map(normalizePayroll));
    } catch (err) {
      setError(err.message || "Unable to generate payroll.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDownload(id, payrollMonth) {
    try {
      const blob = await payrollApi.downloadPayslip(id);
      downloadBlob(blob, `payslip-${payrollMonth || "record"}.pdf`);
    } catch (err) {
      setError(err.message || "Unable to download payslip.");
    }
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Payroll</h1>
          <p className="mt-2 text-sm text-slate-500">Admin view of monthly payroll across the workforce.</p>
        </div>

        <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Payroll Control</p>
              <h2 className="mt-2 text-xl font-black text-slate-900">Generate payroll and payslips by month</h2>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <input
                type="month"
                value={month}
                onChange={(event) => setMonth(event.target.value)}
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 outline-none"
              />
              <button
                type="button"
                onClick={handleGenerateBulk}
                disabled={loading}
                className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white disabled:opacity-60"
              >
                {loading ? "Generating..." : "Generate Bulk Payroll"}
              </button>
            </div>
          </div>
        </section>

        {error ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
            {error}
          </div>
        ) : null}

        <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
          <table className="min-w-full">
            <thead className="bg-slate-50">
              <tr>
                {["Employee", "Department", "Role", "Month", "Net Pay", "Deductions", "Attendance", "Status", "Payslip"].map((label) => (
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
                    <td className="px-6 py-4">
                      <div className="text-sm font-semibold text-slate-800">{record.employeeName}</div>
                      <div className="mt-1 text-xs text-slate-400">{record.payrollNumber || "Payroll record"}</div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-700">{record.departmentName || "Unassigned"}</td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-700">{record.designationTitle || "Role pending"}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{formatMonthLabel(record.month || record.payPeriod || "2026-03")}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{formatCurrency(record.netSalary || record.amount || 0)}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{formatCurrency(record.deductions || 0)}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {record.breakdown?.daysAttended ?? 0} present / {record.breakdown?.leaveDays ?? 0} leave
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-rose-700">{record.status}</td>
                    <td className="px-6 py-4">
                      <button
                        type="button"
                        onClick={() => handleDownload(record._id, record.month)}
                        className="rounded-full bg-blue-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-blue-700"
                      >
                        Download
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="9" className="px-6 py-12 text-center text-sm text-slate-400">
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
