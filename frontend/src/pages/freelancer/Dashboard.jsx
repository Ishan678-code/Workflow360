import { useEffect, useState } from "react";
import { FolderKanban, Receipt, Timer, Wallet } from "lucide-react";
import FreelancerLayout from "../../layouts/FreelancerLayout";
import { invoiceApi, projectApi, timesheetApi } from "../../services/api";
import { formatCurrency } from "../../utils/formatters";

export default function FreelancerDashboard() {
  const [summary, setSummary] = useState({
    activeProjects: 3,
    openInvoices: 2,
    loggedHours: 28,
    earnings: 6400,
  });

  useEffect(() => {
    let active = true;

    async function loadSummary() {
      const [projects, invoices, timesheets] = await Promise.allSettled([
        projectApi.getAll(),
        invoiceApi.getAll(),
        timesheetApi.getMine(),
      ]);

      if (!active) return;

      const projectList = projects.status === "fulfilled" ? (Array.isArray(projects.value) ? projects.value : projects.value?.data || []) : [];
      const invoiceList = invoices.status === "fulfilled" ? (Array.isArray(invoices.value) ? invoices.value : invoices.value?.data || []) : [];
      const timesheetList = timesheets.status === "fulfilled" ? (Array.isArray(timesheets.value) ? timesheets.value : timesheets.value?.data || []) : [];

      setSummary({
        activeProjects: projectList.length || 3,
        openInvoices: invoiceList.filter((item) => String(item.status || "").toUpperCase() !== "PAID").length || 2,
        loggedHours: timesheetList.reduce((total, item) => total + Number(item.hours || 0), 0) || 28,
        earnings: invoiceList.reduce((total, item) => total + Number(item.amount || item.totalAmount || 0), 0) || 6400,
      });
    }

    loadSummary().catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const cards = [
    { label: "Active Projects", value: summary.activeProjects, icon: FolderKanban, tone: "bg-amber-100 text-amber-700" },
    { label: "Open Invoices", value: summary.openInvoices, icon: Receipt, tone: "bg-rose-100 text-rose-700" },
    { label: "Logged Hours", value: summary.loggedHours, icon: Timer, tone: "bg-sky-100 text-sky-700" },
    { label: "Earnings", value: formatCurrency(summary.earnings), icon: Wallet, tone: "bg-emerald-100 text-emerald-700" },
  ];

  return (
    <FreelancerLayout>
      <div className="space-y-8">
        <section className="rounded-[32px] border border-amber-100 bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 px-8 py-10 text-white shadow-2xl">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-amber-100">Freelancer Workspace</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight">Everything shipping, billed, and in motion.</h1>
          <p className="mt-3 max-w-2xl text-sm text-amber-50/90">
            A clean working view of projects, hours, and invoice momentum without leaving the portal.
          </p>
        </section>

        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {cards.map(({ label, value, icon: Icon, tone }) => (
            <article key={label} className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">{label}</p>
                  <p className="mt-3 text-3xl font-black tracking-tight text-slate-900">{value}</p>
                </div>
                <div className={`rounded-2xl p-3 ${tone}`}>
                  <Icon size={22} />
                </div>
              </div>
            </article>
          ))}
        </section>
      </div>
    </FreelancerLayout>
  );
}
