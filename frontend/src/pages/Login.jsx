import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authApi } from "../services/api";

// ── Animated bar chart ────────────────────────────────────────────────────────
const bars = [
  { h: 112, color: "#3b82f6", delay: "0ms" },
  { h: 80,  color: "#1e40af", delay: "100ms" },
  { h: 96,  color: "#2563eb", delay: "200ms" },
  { h: 64,  color: "#1e3a8a", delay: "300ms" },
  { h: 128, color: "#60a5fa", delay: "400ms" },
  { h: 80,  color: "#3b82f6", delay: "500ms" },
  { h: 112, color: "#93c5fd", delay: "600ms" },
];

const BarChart = () => (
  <div className="flex items-end gap-2.5 justify-center px-4">
    {bars.map((b, i) => (
      <div
        key={i}
        style={{
          height: b.h,
          backgroundColor: b.color,
          animationDelay: b.delay,
          boxShadow: `0 0 12px ${b.color}55`,
        }}
        className="w-10 rounded-t-lg animate-[grow_0.6s_ease-out_both]"
      />
    ))}
  </div>
);

// ── Eye icons ────────────────────────────────────────────────────────────────
const EyeIcon = () => (
  <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const EyeOffIcon = () => (
  <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.477 0-8.268-2.943-9.542-7a9.97 9.97 0 012.458-4.066M9.88 9.88A3 3 0 0114.12 14.12M3 3l18 18" />
  </svg>
);

// ── Spinner ───────────────────────────────────────────────────────────────────
const Spinner = () => (
  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
  </svg>
);

// ── Feature list (right panel) ─────────────────────────────────────────────
const features = [
  { icon: "⏱", label: "Real-time attendance tracking" },
  { icon: "📋", label: "Leave & payroll management" },
  { icon: "📊", label: "AI-powered performance insights" },
];

const ROLES = [
  { key: "ADMIN",      label: "Admin",      icon: "🛡️" },
  { key: "MANAGER",    label: "Manager",    icon: "📊" },
  { key: "EMPLOYEE",   label: "Employee",   icon: "👤" },
  { key: "FREELANCER", label: "Freelancer", icon: "💼" },
];

const roleRoutes = {
  ADMIN      : "/admin/dashboard",
  MANAGER    : "/manager/dashboard",
  EMPLOYEE   : "/employee/dashboard",
  FREELANCER : "/freelancer/dashboard",
};

export default function Login() {
  const navigate = useNavigate();
  const existingToken = localStorage.getItem("token");
  const existingUser = (() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  })();

  const [email, setEmail]           = useState("");
  const [password, setPassword]     = useState("");
  const [showPw, setShowPw]         = useState(false);
  const [remember, setRemember]     = useState(false);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");
  const [selectedRole, setSelectedRole] = useState("EMPLOYEE");

  useEffect(() => {
    if (existingToken && existingUser?.role) {
      navigate(roleRoutes[existingUser.role] ?? "/", { replace: true });
    }
  }, [existingToken, existingUser?.role, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await authApi.login(email, password);
      localStorage.setItem("token", data.token);
      localStorage.setItem("user",  JSON.stringify(data.user));
      navigate(roleRoutes[data.user.role] ?? roleRoutes[selectedRole]);
    } catch (error) {
      setError(error.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* keyframe for bar chart grow animation */}
      <style>{`
        @keyframes grow {
          from { transform: scaleY(0); transform-origin: bottom; opacity: 0; }
          to   { transform: scaleY(1); transform-origin: bottom; opacity: 1; }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .fade-up { animation: fadeUp 0.5s ease-out both; }
      `}</style>

      <div className="flex min-h-screen font-sans">

        {/* ── Left panel ─────────────────────────────────────────────────── */}
        <div className="relative w-full md:w-1/2 bg-slate-50 flex flex-col justify-center items-center px-8 py-12 overflow-hidden">

          {/* Subtle background blobs */}
          <div className="absolute top-[-80px] left-[-80px] w-72 h-72 bg-blue-100 rounded-full blur-3xl opacity-50 pointer-events-none" />
          <div className="absolute bottom-[-60px] right-[-60px] w-56 h-56 bg-indigo-100 rounded-full blur-3xl opacity-40 pointer-events-none" />

          {/* Logo */}
          <div className="fade-up flex items-center gap-2.5 mb-10 self-start md:self-center" style={{ animationDelay: "0ms" }}>
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-md shadow-blue-200">
              <span className="text-white font-extrabold text-sm tracking-tight">W</span>
            </div>
            <span className="text-slate-800 font-bold text-[17px] tracking-tight">Workforce360</span>
          </div>

          {/* Card */}
          <div
            className="fade-up relative bg-white rounded-2xl w-full max-w-sm px-8 py-9 shadow-[0_4px_32px_rgba(0,0,0,0.08)] border border-slate-100"
            style={{ animationDelay: "80ms" }}
          >
            {/* Top accent line */}
            <div className="absolute top-0 left-8 right-8 h-0.5 rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-400" />

            <h1 className="text-[22px] font-bold text-slate-800 mb-1 tracking-tight">Welcome back</h1>
            <p className="text-[13px] text-slate-400 mb-5">Sign in to your account to continue</p>

            {/* Role Selector */}
            <div className="grid grid-cols-4 gap-2 mb-6">
              {ROLES.map((r) => {
                const active = selectedRole === r.key;
                return (
                  <button
                    key={r.key}
                    type="button"
                    onClick={() => setSelectedRole(r.key)}
                    className={`flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl border text-center transition-all duration-200
                      ${active
                        ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-200"
                        : "bg-slate-50 border-slate-200 text-slate-500 hover:border-blue-300 hover:bg-blue-50"
                      }`}
                  >
                    <span className="text-base leading-none">{r.icon}</span>
                    <span className="text-[10px] font-bold tracking-wide leading-none">{r.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Error */}
            {error && (
              <div className="mb-5 flex items-start gap-2.5 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-[13px]">
                <svg className="w-4 h-4 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">

              {/* Email */}
              <div className="space-y-1.5">
                <label className="block text-[13px] font-semibold text-slate-600">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-[13.5px] text-slate-800 placeholder-slate-300 outline-none focus:bg-white focus:border-blue-400 focus:ring-3 focus:ring-blue-50 transition-all duration-200"
                />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-[13px] font-semibold text-slate-600">
                    Password
                  </label>
                  <button
                    type="button"
                    className="text-[12px] text-blue-500 hover:text-blue-700 font-medium transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-200 bg-slate-50 text-[13.5px] text-slate-800 placeholder-slate-300 outline-none focus:bg-white focus:border-blue-400 focus:ring-3 focus:ring-blue-50 transition-all duration-200"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPw ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
              </div>

              {/* Remember me */}
              <label className="flex items-center gap-2.5 cursor-pointer group">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="sr-only"
                  />
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all duration-150 ${remember ? "bg-blue-600 border-blue-600" : "border-slate-300 bg-white group-hover:border-blue-400"}`}>
                    {remember && (
                      <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </div>
                <span className="text-[13px] text-slate-500 group-hover:text-slate-700 transition-colors select-none">
                  Keep me signed in
                </span>
              </label>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-1 py-2.5 rounded-xl bg-gradient-to-r from-slate-800 to-slate-700 hover:from-slate-700 hover:to-slate-600 active:from-slate-900 text-white text-[13.5px] font-semibold tracking-wide shadow-md shadow-slate-300 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Spinner />
                    <span>Signing in…</span>
                  </>
                ) : (
                  "Sign In"
                )}
              </button>
            </form>
          </div>

          {/* Footer */}
          <p
            className="fade-up mt-6 text-[12px] text-slate-400"
            style={{ animationDelay: "160ms" }}
          >
            © {new Date().getFullYear()} Workforce360. All rights reserved.
          </p>
        </div>

        {/* ── Right panel ──────────────────────────────────────────────────── */}
        <div
          className="hidden md:flex w-1/2 flex-col items-center justify-center px-14 gap-10 relative overflow-hidden"
          style={{ background: "linear-gradient(145deg, #0f172a 0%, #1e293b 100%)" }}
        >
          {/* Grid pattern overlay */}
          <div
            className="absolute inset-0 opacity-[0.04] pointer-events-none"
            style={{
              backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />

          {/* Glow behind chart */}
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-40 bg-blue-600 rounded-full blur-[80px] opacity-15 pointer-events-none" />

          {/* Chart container */}
          <div className="relative z-10 bg-white/5 border border-white/10 rounded-2xl px-8 pt-8 pb-4 backdrop-blur-sm w-full max-w-sm">
            {/* Chart header */}
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-[11px] text-slate-400 uppercase tracking-widest">This Month</p>
                <p className="text-white font-bold text-lg leading-tight">Productivity</p>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="text-emerald-400 text-[11px] font-semibold">+12.4%</span>
              </div>
            </div>

            <BarChart />

            {/* X-axis labels */}
            <div className="flex justify-between mt-2 px-1">
              {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
                <span key={i} className="text-[10px] text-slate-600 w-10 text-center">{d}</span>
              ))}
            </div>
          </div>

          {/* Text content */}
          <div className="relative z-10 text-center max-w-xs">
            <h2 className="text-white text-2xl font-bold leading-snug mb-3 tracking-tight">
              People. Processes.{" "}
              <span className="text-blue-400">Performance.</span>
            </h2>
            <p className="text-slate-400 text-[13px] leading-relaxed mb-8">
              Manage your hybrid workforce with ease. Track time, approve leaves,
              and boost productivity.
            </p>

            {/* Feature pills */}
            <div className="flex flex-col gap-2.5 items-start text-left">
              {features.map((f, i) => (
                <div key={i} className="flex items-center gap-3 px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 w-full">
                  <span className="text-base">{f.icon}</span>
                  <span className="text-slate-300 text-[12.5px]">{f.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </>
  );
}
