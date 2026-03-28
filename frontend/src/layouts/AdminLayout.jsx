import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  Bell,
  Briefcase,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  Menu,
  Receipt,
  Shield,
  Users,
  X,
} from "lucide-react";
import { authApi } from "../services/api";
import { getInitials } from "../utils/formatters";

const navItems = [
  { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/people", label: "People", icon: Users },
  { to: "/admin/performance", label: "Performance", icon: Shield },
  { to: "/admin/payroll", label: "Payroll", icon: Receipt },
  { to: "/admin/projects", label: "Projects", icon: Briefcase },
];

export default function AdminLayout({ children }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const initials = getInitials(user.name);

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch {}
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans selection:bg-rose-600 selection:text-white">
      <div
        className="fixed inset-0 z-0 pointer-events-none opacity-[0.04]"
        style={{ backgroundImage: "radial-gradient(#be123c 1px, transparent 1px)", backgroundSize: "22px 22px" }}
      />

      <header className="sticky top-0 z-50 border-b border-rose-100 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex flex-1 items-center">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-600 text-white shadow-lg shadow-rose-100">
                <span className="text-sm font-black">W</span>
              </div>
              <div className="hidden xl:flex flex-col">
                <span className="text-[14px] font-black leading-tight tracking-tight text-slate-900">Workforce360</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600">Admin Console</span>
              </div>
            </div>
          </div>

          <nav className="hidden items-center rounded-2xl border border-rose-100 bg-rose-50/80 p-1 lg:flex">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-2 rounded-xl px-4 py-2 text-[13px] font-bold transition-all duration-300 ${
                    isActive ? "bg-white text-rose-700 shadow-sm ring-1 ring-rose-100" : "text-slate-500 hover:text-slate-900"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <item.icon size={16} strokeWidth={isActive ? 2.5 : 2} />
                    <span className="whitespace-nowrap">{item.label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="flex flex-1 items-center justify-end gap-3 sm:gap-4">
            <button className="relative p-2 text-slate-400 transition-colors hover:text-rose-600">
              <Bell size={19} />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full border-2 border-white bg-rose-500" />
            </button>

            <div className="flex items-center gap-3 border-l border-rose-100 pl-4">
              <div className="hidden flex-col items-end md:flex">
                <span className="text-[13px] font-black leading-none text-slate-800">{user.name || "Administrator"}</span>
                <span className="mt-1 text-[10px] font-bold uppercase text-slate-400">Admin</span>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-rose-200 bg-gradient-to-tr from-rose-50 to-orange-100 text-xs font-black text-rose-700 shadow-sm">
                {initials}
              </div>
              <button
                onClick={handleLogout}
                className="hidden p-2 text-slate-400 transition-colors hover:text-rose-500 md:flex"
                title="Logout"
              >
                <LogOut size={18} />
              </button>
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="ml-2 rounded-lg bg-rose-50 p-2 text-slate-600 lg:hidden"
              >
                {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
          <aside className="absolute right-0 top-0 h-full w-72 bg-white p-6 shadow-2xl">
            <div className="mb-10 flex items-center justify-between">
              <span className="font-black text-slate-900">Navigation</span>
              <button onClick={() => setIsMobileMenuOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <nav className="flex flex-col gap-2">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center justify-between rounded-xl px-4 py-3 text-[14px] font-bold transition-all ${
                      isActive ? "bg-rose-600 text-white shadow-lg shadow-rose-200" : "text-slate-500 hover:bg-slate-50"
                    }`
                  }
                >
                  <div className="flex items-center gap-3">
                    <item.icon size={18} />
                    {item.label}
                  </div>
                  <ChevronRight size={14} className="opacity-50" />
                </NavLink>
              ))}
            </nav>
            <button
              onClick={handleLogout}
              className="mt-8 flex w-full items-center gap-3 rounded-xl px-4 py-3 text-[14px] font-bold text-rose-500 transition-all hover:bg-rose-50"
            >
              <LogOut size={18} /> Logout
            </button>
          </aside>
        </div>
      )}

      <main className="relative z-10 mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">
        <div className="mb-8 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
          <span>Admin Console</span>
          <ChevronRight size={10} />
          <span className="text-rose-600">Active Session</span>
        </div>
        {children}
      </main>
    </div>
  );
}
