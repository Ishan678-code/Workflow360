import { useEffect, useMemo, useState } from "react";
import FreelancerLayout from "../../layouts/FreelancerLayout";
import { freelancerPayrollApi } from "../../services/api";
import { formatCurrency, formatMonthLabel } from "../../utils/formatters";

function getMonthValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function normalizeRow(row) {
  return {
    ...row,
    freelancerName: row.freelancerName || row.freelancer?.userId?.name || "Freelancer",
    month: row.month,
    netPay: row.netPay ?? row.netSalary ?? row.amount ?? 0,
    grossPay: row.grossPay ?? 0,
    deductions: row.deductions ?? 0,
    status: row.status || "GENERATED",
  };
}

export default function FreelancerPayroll() {
  const [month, setMonth] = useState(getMonthValue());
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const label = useMemo(() => formatMonthLabel(month), [month]);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const data = await freelancerPayrollApi.getMine();
        if (!active) return;
        const rows = Array.isArray(data) ? data : data?.data || [];
        const normalized = rows.map(normalizeRow);
        // If backend returns all months, filter by selected month
        setRecords(normalized.filter((r) => String(r.month) === String(month)));
      } catch (e) {
        if (active) setError(e?.message || "Unable to load freelancer payroll.");
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [month]);

  return (
    <FreelancerLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Payroll</h1>
          <p className="mt-2 text-sm text-slate-500">Monthly earnings computed from approved timesheets.</p>
        </div>

        {error ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
            {error}
          </div>
        ) : null}

        <section className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
          <div className="p-6 md:flex md:items-end md:justify-between md:gap-4">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Selected Month</p>
              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
                <input
                  type="month"
                  value={month}
                  onChange={(e) => {
                    setMonth(e.target.value);
                    setError("");
                  }}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition"
                />
                <p className="text-sm font-black text-slate-900">{label}</p>
              </div>
            </div>
            <div className="mt-4 md:mt-0">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Net Pay</p>
              <p className="mt-1 text-2xl font-black text-slate-900">
                {formatCurrency(records.reduce((sum, r) => sum + Number(r.netPay || 0), 0))}
              </p>
            </div>
          </div>

          <table className="min-w-full">
            <thead className="bg-slate-50">
              <tr>
                {["Month", "Gross", "Deductions", "Net Pay", "Status"].map((h) => (
                  <th
                    key={h}
                    className="px-6 py-4 text-left text-[11px] font-black uppercase tracking-[0.2em] text-slate-400"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-sm text-slate-400">
                    Loading payroll...
                  </td>
                </tr>
              ) : records.length ? (
                records.map((r) => (
                  <tr key={r._id || `${r.month}-${r.payrollNumber}`} className="hover:bg-slate-50/70">
                    <td className="px-6 py-4 text-sm text-slate-600">{formatMonthLabel(r.month)}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{formatCurrency(r.grossPay || 0)}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{formatCurrency(r.deductions || 0)}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-slate-900">{formatCurrency(r.netPay || 0)}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-rose-700">{r.status}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-sm text-slate-400">
                    No payroll records found for {label}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      </div>
    </FreelancerLayout>
  );
}

