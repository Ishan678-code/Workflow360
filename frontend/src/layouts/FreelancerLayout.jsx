import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  Timer,
  Receipt,
  Menu,
  X,
  Bell,
  ChevronRight,
  LogOut,
} from "lucide-react";
import { authApi } from "../services/api";
import { getInitials } from "../utils/formatters";

const navItems = [
  { to: "/freelancer/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/freelancer/projects", label: "Projects", icon: FolderKanban },
  { to: "/freelancer/tasks", label: "Tasks", icon: CheckSquare },
  { to: "/freelancer/timesheets", label: "Timesheets", icon: Timer },
  { to: "/freelancer/invoices", label: "Invoices", icon: Receipt },
];

export default function FreelancerLayout({ children }) {
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
    <div className="min-h-screen bg-[#FFFCF7] flex flex-col font-sans selection:bg-amber-600 selection:text-white">
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.035] z-0"
        style={{ backgroundImage: "radial-gradient(#d97706 1px, transparent 1px)", backgroundSize: "24px 24px" }}
      />

      <header className="bg-white/70 backdrop-blur-xl border-b border-amber-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex-1 flex items-center">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-amber-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-100">
                <span className="text-white font-black text-sm">W</span>
              </div>
              <div className="hidden xl:flex flex-col">
                <span className="text-slate-900 font-black text-[14px] leading-tight tracking-tight">Workforce360</span>
                <span className="text-[10px] text-amber-600 font-bold uppercase tracking-wider">Freelancer Portal</span>
              </div>
            </div>
          </div>

          <nav className="hidden lg:flex items-center bg-amber-50/80 p-1 rounded-2xl border border-amber-100">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold transition-all duration-300 ${
                    isActive ? "bg-white text-amber-700 shadow-sm ring-1 ring-amber-100" : "text-slate-500 hover:text-slate-900"
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

          <div className="flex-1 flex items-center justify-end gap-3 sm:gap-4">
            <button className="p-2 text-slate-400 hover:text-amber-600 transition-colors relative">
              <Bell size={19} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white" />
            </button>

            <div className="flex items-center gap-3 pl-4 border-l border-amber-100">
              <div className="flex-col items-end hidden md:flex">
                <span className="text-[13px] font-black text-slate-800 leading-none">{user.name || "Freelancer"}</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase mt-1">Freelancer</span>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-50 to-orange-100 border border-amber-200 flex items-center justify-center font-black text-amber-700 text-xs shadow-sm">
                {initials}
              </div>
              <button
                onClick={handleLogout}
                className="hidden md:flex p-2 text-slate-400 hover:text-rose-500 transition-colors"
                title="Logout"
              >
                <LogOut size={18} />
              </button>
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden p-2 text-slate-600 bg-amber-50 rounded-lg ml-2"
              >
                {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-[60]">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
          <aside className="absolute top-0 right-0 h-full w-72 bg-white shadow-2xl p-6">
            <div className="flex justify-between items-center mb-10">
              <span className="font-black text-slate-900">Navigation</span>
              <button onClick={() => setIsMobileMenuOpen(false)}><X size={20} /></button>
            </div>
            <nav className="flex flex-col gap-2">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-4 py-3 rounded-xl text-[14px] font-bold transition-all ${
                      isActive ? "bg-amber-600 text-white shadow-lg shadow-amber-200" : "text-slate-500 hover:bg-slate-50"
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
              className="mt-8 w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[14px] font-bold text-rose-500 hover:bg-rose-50 transition-all"
            >
              <LogOut size={18} /> Logout
            </button>
          </aside>
        </div>
      )}

      <main className="flex-1 relative z-10 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8">
        <div className="mb-8 flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
          <span>Freelancer Portal</span>
          <ChevronRight size={10} />
          <span className="text-amber-600">Active Session</span>
        </div>
        <div>{children}</div>
      </main>
    </div>
  );
}
