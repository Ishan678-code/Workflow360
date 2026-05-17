import { useEffect, useMemo, useState } from "react";
import ManagerLayout from "../../layouts/ManagerLayout";
import { payrollApi } from "../../services/api";
import { formatCurrency, formatMonthLabel } from "../../utils/formatters";


function getMonthValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function normalizePayroll(record) {
  const status = String(record.status || record.paymentStatus || "PROCESSED").toUpperCase();

  return {
    ...record,
    employeeName:
      record.employeeName ||
      record.employee?.userId?.name ||
      record.employee?.name ||
      "Team Member",
    departmentName: record.departmentName || record.employee?.department?.name || "Unassigned",
    designationTitle:
      record.designationTitle ||
      record.employee?.designation?.title ||
      record.employee?.designation ||
      "Role pending",
    status,
    payrollNumber: record.payrollNumber || record.payrollNo || record.payrollId,
    month: record.month || record.payPeriod || record.payrollMonth,
    netSalary: record.netSalary ?? record.amount,
  };
}

export default function ManagerPayroll() {
  const [records, setRecords] = useState([]);
  const [month, setMonth] = useState(getMonthValue());
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);



  const currentMonth = useMemo(() => getMonthValue(), []);
  const selectedMonthLabel = formatMonthLabel(month);


  const totals = useMemo(() => {
    const totalNetPay = records.reduce((sum, r) => sum + Number(r.netSalary || 0), 0);
    return {
      count: records.length,
      totalNetPay,
    };
  }, [records]);

  useEffect(() => {
    let active = true;

    async function loadPayroll() {
      setLoading(true);
      setError("");

      try {
        const payrollData = await payrollApi.getAll(month ? { month } : {});
        if (!active) return;

        const payrollRows = Array.isArray(payrollData) ? payrollData : payrollData?.data || [];
        setRecords(payrollRows.map(normalizePayroll));
      } catch (err) {
        if (active) setError(err.message || "Unable to load payroll records.");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadPayroll();

    return () => {
      active = false;
    };
  }, [month]);


  return (
    <ManagerLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Payroll</h1>
          <p className="mt-2 text-sm text-slate-500">Monthly payouts, processing state, and exceptions for your team.</p>
        </div>

        <section className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
          <div className="space-y-3 rounded-3xl border border-slate-100 bg-white shadow-sm p-5">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Selected Month</p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <input
                type="month"
                value={month}
                max={currentMonth}
                onChange={(e) => {
                  setMonth(e.target.value);
                  setError("");
                }}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-violet-300 focus:ring-4 focus:ring-violet-50 sm:max-w-[220px]"
              />
              <p className="text-sm font-black text-slate-900">{selectedMonthLabel}</p>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-100 bg-white shadow-sm p-5">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Snapshot</p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Records</p>
                <p className="mt-1 text-sm font-black text-slate-900">{totals.count}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Net Pay</p>
                <p className="mt-1 text-sm font-black text-slate-900">{formatCurrency(totals.totalNetPay)}</p>
              </div>
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
                {["Employee", "Department", "Role", "Month", "Net Pay", "Status"].map((label) => (
                  <th
                    key={label}
                    className="px-6 py-4 text-left text-[11px] font-black uppercase tracking-[0.2em] text-slate-400"
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-sm text-slate-400">
                    Loading payroll for {selectedMonthLabel}...
                  </td>
                </tr>
              ) : records.length ? (
                records.map((record) => {
                  const recordMonth = record.month || "";
                  const key = record._id || `${record.employeeName}-${recordMonth}`;

                  return (
                    <tr key={key} className="hover:bg-slate-50/70">
                      <td className="px-6 py-4">
                        <div className="text-sm font-semibold text-slate-800">{record.employeeName}</div>
                        <div className="mt-1 text-xs text-slate-400">{record.payrollNumber || "Payroll record"}</div>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-700">{record.departmentName}</td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-700">{record.designationTitle}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{formatMonthLabel(recordMonth || month)}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{formatCurrency(record.netSalary || 0)}</td>
                      <td className="px-6 py-4 text-sm font-semibold text-violet-700">{record.status}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-sm text-slate-400">
                    No payroll records found for {selectedMonthLabel}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </ManagerLayout>
  );
}

