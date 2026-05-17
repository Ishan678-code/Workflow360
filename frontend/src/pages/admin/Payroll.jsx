import { useEffect, useState } from "react";
import AdminLayout from "../../layouts/AdminLayout";
import { payrollApi } from "../../services/api";
import { downloadBlob, formatCurrency, formatMonthLabel } from "../../utils/formatters";

function getMonthValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

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
  const [notice, setNotice] = useState("");
  const [month, setMonth] = useState(getMonthValue());
  const [loading, setLoading] = useState(false);
  const currentMonth = getMonthValue();
  const isFutureMonth = month && month > currentMonth;
  const selectedMonthLabel = formatMonthLabel(month);
  const currentMonthLabel = formatMonthLabel(currentMonth);
  const totalNetPay = records.reduce((total, record) => total + Number(record.netSalary || record.amount || 0), 0);
  const totalDeductions = records.reduce((total, record) => total + Number(record.deductions || 0), 0);

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
    if (isFutureMonth) {
      setError("Bulk payroll can only be generated for the current month or completed past months.");
      return;
    }

    setError("");
    setNotice("");
    setLoading(true);
    try {
      await payrollApi.generateBulk(month);
      const data = await payrollApi.getAll(month ? { month } : {});
      const rows = Array.isArray(data) ? data : data?.data || [];
      setRecords(rows.map(normalizePayroll));
      setNotice(`Bulk payroll generated for ${formatMonthLabel(month)}.`);
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

        <section className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
          <div className="grid gap-0 lg:grid-cols-[1fr_360px]">
            <div className="p-6 sm:p-7">
              <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Payroll Control</p>
                  <h2 className="mt-2 text-xl font-black text-slate-900">Generate payroll for current or past periods</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                    Select any month up to {currentMonthLabel}, review the records, then generate payslips for every eligible employee.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[420px]">
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Selected</p>
                    <p className="mt-1 text-sm font-black text-slate-900">{selectedMonthLabel}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Records</p>
                    <p className="mt-1 text-sm font-black text-slate-900">{records.length}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Net Pay</p>
                    <p className="mt-1 text-sm font-black text-slate-900">{formatCurrency(totalNetPay)}</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 grid gap-4 rounded-3xl border border-slate-100 bg-slate-50 p-4 md:grid-cols-[1fr_auto] md:items-end">
                <label className="block">
                  <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Payroll Month</span>
                  <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                    <input
                      type="month"
                      value={month}
                      max={currentMonth}
                      onChange={(event) => {
                        setMonth(event.target.value);
                        setError("");
                        setNotice("");
                      }}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-rose-300 focus:ring-4 focus:ring-rose-50 sm:max-w-[220px]"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setMonth(currentMonth);
                        setError("");
                        setNotice("");
                      }}
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-100"
                    >
                      Use Current Month
                    </button>
                  </div>
                  {isFutureMonth ? (
                    <p className="mt-3 text-sm font-medium text-amber-700">
                      Future payroll is not available yet. Select {currentMonthLabel} or an earlier completed month.
                    </p>
                  ) : (
                    <p className="mt-3 text-sm text-slate-500">
                      Past years are supported for corrections, missed runs, and audit reprocessing.
                    </p>
                  )}
                </label>

                <button
                  type="button"
                  onClick={handleGenerateBulk}
                  disabled={loading || isFutureMonth || !month}
                  className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Generating Payroll..." : `Generate ${selectedMonthLabel}`}
                </button>
              </div>
            </div>

            <aside className="border-t border-slate-100 bg-slate-900 p-6 text-white lg:border-l lg:border-t-0 sm:p-7">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Selected Cycle</p>
              <h3 className="mt-3 text-2xl font-black">{selectedMonthLabel}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Future months are blocked because attendance, leave, deductions, and employee status can still change.
              </p>
              <div className="mt-6 space-y-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Employees in run</p>
                  <p className="mt-1 text-3xl font-black">{records.length}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-white/10 px-4 py-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Net</p>
                    <p className="mt-1 text-sm font-black">{formatCurrency(totalNetPay)}</p>
                  </div>
                  <div className="rounded-2xl bg-white/10 px-4 py-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Deductions</p>
                    <p className="mt-1 text-sm font-black">{formatCurrency(totalDeductions)}</p>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </section>

        {notice ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
            {notice}
          </div>
        ) : null}

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
                  <tr key={record._id || `Rs.${record.employeeName}-Rs.${record.month}`} className="hover:bg-slate-50/70">
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
