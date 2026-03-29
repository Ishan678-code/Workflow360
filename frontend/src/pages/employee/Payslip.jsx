import { useEffect, useState } from "react";
import EmployeeLayout from "../../layouts/EmployeeLayout";
import { 
  FileText, 
  MinusCircle, 
  PlusCircle, 
  Download,
  TrendingUp 
} from "lucide-react";
import { payrollApi } from "../../services/api";
import { downloadBlob, formatCurrency, formatMonthLabel } from "../../utils/formatters";

// ── Summary Card Component ──────────────────────────────────────────────────
const SummaryCard = ({ label, amount, icon: Icon, color, bg }) => (
  <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex flex-col justify-between h-32">
    <div className="flex justify-between items-start">
      <div className={`p-2.5 rounded-xl ${bg} ${color}`}>
        <Icon size={20} />
      </div>
      <TrendingUp size={16} className="text-slate-300" />
    </div>
    <div>
      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
      <p className="text-2xl font-black text-slate-800 tracking-tight">{amount}</p>
    </div>
  </div>
);

// ── Status Badge Component ──────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const styles = {
    Paid: "bg-emerald-50 text-emerald-600 border-emerald-100",
    Processing: "bg-orange-50 text-orange-600 border-orange-100",
  };
  return (
    <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border Npr.{styles[status]}`}>
      {status}
    </span>
  );
};

export default function ViewPayslip() {
  const [payslips, setPayslips] = useState([
    { period: "March 2026", gross: "NPR 8,500.00", deduct: "NPR 1,850.00", net: "NPR 6,650.00", status: "Processing" },
    { period: "February 2026", gross: "NPR 8,500.00", deduct: "NPR 1,850.00", net: "NPR 6,650.00", status: "Paid" },
  ]);

  useEffect(() => {
    let active = true;

    async function loadPayslips() {
      try {
        const data = await payrollApi.getMine();
        if (!active) return;
        const rows = Array.isArray(data) ? data : data?.data || [];
        if (!rows.length) return;
        setPayslips(rows.map((item) => ({
          id: item._id,
          period: formatMonthLabel(item.month),
          gross: formatCurrency(item.grossSalary || 0),
          deduct: formatCurrency(item.deductions || 0),
          net: formatCurrency(item.netSalary || 0),
          status: item.month === rows[0]?.month ? "Processing" : "Paid",
          departmentName: item.employee?.department?.name || "Unassigned",
          designationTitle: item.employee?.designation?.title || "Role pending",
        })));
      } catch {}
    }

    loadPayslips();
    return () => {
      active = false;
    };
  }, []);

  const latest = payslips[0] || { gross: "NPR 0.00", deduct: "NPR 0.00", net: "NPR 0.00" };

  return (
    <EmployeeLayout>
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">View Payslip</h1>
          <p className="text-slate-500 text-sm font-medium">
            Access and download your <span className="text-blue-600 font-bold">monthly payslips</span>
          </p>
        </div>

        {/* Summary Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <SummaryCard 
            label="Gross Pay" 
            amount={latest.gross} 
            icon={FileText} 
            color="text-blue-600" 
            bg="bg-blue-50" 
          />
          <SummaryCard 
            label="Deductions" 
            amount={latest.deduct} 
            icon={MinusCircle} 
            color="text-rose-600" 
            bg="bg-rose-50" 
          />
          <SummaryCard 
            label="Net Pay" 
            amount={latest.net} 
            icon={PlusCircle} 
            color="text-emerald-600" 
            bg="bg-emerald-50" 
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Department</p>
            <p className="mt-2 text-xl font-black text-slate-800">{latest.departmentName || "Unassigned"}</p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Role</p>
            <p className="mt-2 text-xl font-black text-slate-800">{latest.designationTitle || "Role pending"}</p>
          </div>
        </div>

        {/* Payslip History Table */}
        <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-50 flex justify-between items-center">
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight">Payslip History</h2>
            <span className="px-3 py-1 bg-slate-100 rounded-full text-[10px] font-bold text-slate-500">
              {payslips.length} payslips
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Period</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Department</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Role</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Gross Pay</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Deductions</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Net Pay</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {payslips.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-5">
                      <span className="text-[13px] font-bold text-slate-700">{item.period}</span>
                    </td>
                    <td className="px-6 py-5 text-[13px] font-medium text-slate-600">{item.departmentName || "Unassigned"}</td>
                    <td className="px-6 py-5 text-[13px] font-medium text-slate-600">{item.designationTitle || "Role pending"}</td>
                    <td className="px-6 py-5 text-[13px] font-medium text-slate-600">{item.gross}</td>
                    <td className="px-6 py-5 text-[13px] font-medium text-rose-500">{item.deduct}</td>
                    <td className="px-6 py-5 text-[13px] font-black text-slate-800">{item.net}</td>
                    <td className="px-6 py-5">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="px-6 py-5 text-right">
                      <button
                        onClick={async () => {
                          if (!item.id) return;
                          try {
                            const blob = await payrollApi.downloadPayslip(item.id);
                            downloadBlob(blob, `payslip-Rs.{item.period}.pdf`);
                          } catch {}
                        }}
                        className="inline-flex items-center gap-2 text-slate-400 hover:text-blue-600 transition-colors"
                      >
                        <span className="text-[11px] font-bold">Download</span>
                        <Download size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </EmployeeLayout>
  );
}
