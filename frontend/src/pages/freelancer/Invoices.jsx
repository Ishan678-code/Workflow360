import { useEffect, useState } from "react";
import FreelancerLayout from "../../layouts/FreelancerLayout";
import { invoiceApi } from "../../services/api";
import { formatCurrency, formatDate } from "../../utils/formatters";

const fallbackInvoices = [
  { _id: "inv-1", invoiceNumber: "INV-3021", issuedAt: "2026-03-10", amount: 3200, status: "SENT" },
  { _id: "inv-2", invoiceNumber: "INV-3022", issuedAt: "2026-03-18", amount: 1800, status: "PAID" },
];

export default function FreelancerInvoices() {
  const [invoices, setInvoices] = useState(fallbackInvoices);

  useEffect(() => {
    let active = true;

    async function loadInvoices() {
      try {
        const data = await invoiceApi.getAll();
        if (!active) return;
        setInvoices(Array.isArray(data) ? data : data?.data || fallbackInvoices);
      } catch {}
    }

    loadInvoices();
    return () => {
      active = false;
    };
  }, []);

  return (
    <FreelancerLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Invoices</h1>
          <p className="mt-2 text-sm text-slate-500">Billing history, payment state, and issued totals.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {invoices.map((invoice) => (
            <article key={invoice._id || invoice.invoiceNumber} className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Invoice</p>
                  <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900">
                    {invoice.invoiceNumber || invoice.number || invoice._id?.slice(-6)?.toUpperCase() || "Draft"}
                  </h2>
                </div>
                <span className="rounded-full bg-amber-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-amber-700">
                  {invoice.status || "SENT"}
                </span>
              </div>
              <div className="mt-5 space-y-3 rounded-2xl bg-slate-50 p-4 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Issued</span>
                  <span className="font-semibold text-slate-800">{formatDate(invoice.issuedAt || invoice.issueDate || invoice.createdAt)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Amount</span>
                  <span className="font-semibold text-slate-800">{formatCurrency(invoice.amount || invoice.totalAmount || 0)}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </FreelancerLayout>
  );
}
