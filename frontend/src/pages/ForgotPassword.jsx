import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "react-toastify";
import { authApi } from "../services/api";

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

const Spinner = () => (
  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
  </svg>
);

const STEPS = { EMAIL: "email", RESET: "reset", DONE: "done" };

export default function ForgotPassword() {
  const navigate = useNavigate();

  const [step, setStep]           = useState(STEPS.EMAIL);
  const [email, setEmail]         = useState("");
  const [newPw, setNewPw]         = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showNew, setShowNew]     = useState(false);
  const [showConf, setShowConf]   = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");

  // ── Step 1: verify email ───────────────────────────────────────────────────
  const handleCheckEmail = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await authApi.checkEmail(email.trim());
      setStep(STEPS.RESET);
    } catch (err) {
      setError(err.message || "Could not verify email.");
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: reset password ─────────────────────────────────────────────────
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError("");
    if (newPw.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (newPw !== confirmPw) { setError("Passwords do not match."); return; }
    setLoading(true);
    try {
      await authApi.resetPassword(email.trim(), newPw);
      setStep(STEPS.DONE);
      setTimeout(() => navigate("/"), 2000);
    } catch (err) {
      const msg = err.message || "Failed to reset password.";
      if (msg.toLowerCase().includes("same")) {
        toast.error(msg, { icon: "🔒" });
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .fade-up { animation: fadeUp 0.5s ease-out both; }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        .fade-in { animation: fadeIn 0.35s ease-out both; }
      `}</style>

      <div className="flex min-h-screen font-sans">

        {/* ── Left panel ─────────────────────────────────────────────────── */}
        <div className="relative w-full md:w-1/2 bg-slate-50 flex flex-col justify-center items-center px-8 py-12 overflow-hidden">

          {/* Background blobs */}
          <div className="absolute top-[-80px] left-[-80px] w-72 h-72 bg-blue-100 rounded-full blur-3xl opacity-50 pointer-events-none" />
          <div className="absolute bottom-[-60px] right-[-60px] w-56 h-56 bg-indigo-100 rounded-full blur-3xl opacity-40 pointer-events-none" />

          {/* Logo */}
          <div className="fade-up flex items-center gap-2.5 mb-8 self-start md:self-center" style={{ animationDelay: "0ms" }}>
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

            {/* ── Step indicator ── */}
            <div className="flex items-center gap-2 mb-6">
              {[STEPS.EMAIL, STEPS.RESET].map((s, i) => {
                const stepIndex = [STEPS.EMAIL, STEPS.RESET].indexOf(step);
                const isDone = i < stepIndex || step === STEPS.DONE;
                const isActive = s === step;
                return (
                  <div key={s} className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-300
                      ${isDone ? "bg-emerald-500 text-white" : isActive ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-400"}`}>
                      {isDone ? (
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : i + 1}
                    </div>
                    {i < 1 && <div className={`flex-1 h-0.5 w-8 rounded transition-all duration-300 ${isDone ? "bg-emerald-400" : "bg-slate-100"}`} />}
                  </div>
                );
              })}
              <span className="ml-1 text-[11px] text-slate-400">
                {step === STEPS.EMAIL ? "Verify email" : step === STEPS.RESET ? "Set new password" : "Done"}
              </span>
            </div>

            {/* ── STEP 1: Email ── */}
            {step === STEPS.EMAIL && (
              <div className="fade-in">
                <h1 className="text-[22px] font-bold text-slate-800 mb-1 tracking-tight">Forgot password?</h1>
                <p className="text-[13px] text-slate-400 mb-6">Enter your account email to continue</p>

                {error && <ErrorAlert message={error} />}

                <form onSubmit={handleCheckEmail} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-[13px] font-semibold text-slate-600">Email Address</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@company.com"
                      required
                      autoFocus
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-[13.5px] text-slate-800 placeholder-slate-300 outline-none focus:bg-white focus:border-blue-400 focus:ring-3 focus:ring-blue-50 transition-all duration-200"
                    />
                  </div>

                  <SubmitButton loading={loading} label="Continue" loadingLabel="Verifying…" />
                </form>
              </div>
            )}

            {/* ── STEP 2: New password ── */}
            {step === STEPS.RESET && (
              <div className="fade-in">
                <h1 className="text-[22px] font-bold text-slate-800 mb-1 tracking-tight">Set new password</h1>
                <p className="text-[13px] text-slate-400 mb-6">
                  Resetting password for <span className="text-slate-600 font-medium">{email}</span>
                </p>

                {error && <ErrorAlert message={error} />}

                <form onSubmit={handleResetPassword} className="space-y-4">
                  {/* New password */}
                  <div className="space-y-1.5">
                    <label className="block text-[13px] font-semibold text-slate-600">New Password</label>
                    <div className="relative">
                      <input
                        type={showNew ? "text" : "password"}
                        value={newPw}
                        onChange={(e) => setNewPw(e.target.value)}
                        placeholder="Min. 6 characters"
                        required
                        autoFocus
                        className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-200 bg-slate-50 text-[13.5px] text-slate-800 placeholder-slate-300 outline-none focus:bg-white focus:border-blue-400 focus:ring-3 focus:ring-blue-50 transition-all duration-200"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNew(!showNew)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        {showNew ? <EyeOffIcon /> : <EyeIcon />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm password */}
                  <div className="space-y-1.5">
                    <label className="block text-[13px] font-semibold text-slate-600">Confirm Password</label>
                    <div className="relative">
                      <input
                        type={showConf ? "text" : "password"}
                        value={confirmPw}
                        onChange={(e) => setConfirmPw(e.target.value)}
                        placeholder="Re-enter your password"
                        required
                        className={`w-full px-3.5 py-2.5 pr-10 rounded-xl border bg-slate-50 text-[13.5px] text-slate-800 placeholder-slate-300 outline-none focus:bg-white focus:ring-3 transition-all duration-200
                          ${confirmPw && newPw !== confirmPw
                            ? "border-red-300 focus:border-red-400 focus:ring-red-50"
                            : "border-slate-200 focus:border-blue-400 focus:ring-blue-50"
                          }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConf(!showConf)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        {showConf ? <EyeOffIcon /> : <EyeIcon />}
                      </button>
                    </div>
                    {confirmPw && newPw !== confirmPw && (
                      <p className="text-[11.5px] text-red-500">Passwords do not match</p>
                    )}
                  </div>

                  <SubmitButton loading={loading} label="Save Changes" loadingLabel="Saving…" />
                </form>

                <button
                  type="button"
                  onClick={() => { setStep(STEPS.EMAIL); setError(""); setNewPw(""); setConfirmPw(""); }}
                  className="mt-4 w-full text-center text-[13px] text-slate-400 hover:text-slate-600 transition-colors"
                >
                  ← Use a different email
                </button>
              </div>
            )}

            {/* ── STEP 3: Done ── */}
            {step === STEPS.DONE && (
              <div className="fade-in flex flex-col items-center text-center py-4 gap-4">
                <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                  <svg className="w-7 h-7 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-[20px] font-bold text-slate-800 mb-1 tracking-tight">Password updated!</h1>
                  <p className="text-[13px] text-slate-400">Redirecting you to sign in…</p>
                </div>
              </div>
            )}

            {/* Back to login link (steps 1 & 2) */}
            {step !== STEPS.DONE && (
              <p className="mt-5 text-center text-[13px] text-slate-400">
                Remembered it?{" "}
                <Link to="/" className="text-blue-500 hover:text-blue-700 font-semibold transition-colors">
                  Back to sign in
                </Link>
              </p>
            )}
          </div>

          {/* Footer */}
          <p className="fade-up mt-6 text-[12px] text-slate-400" style={{ animationDelay: "160ms" }}>
            © {new Date().getFullYear()} Workforce360. All rights reserved.
          </p>
        </div>

        {/* ── Right panel ──────────────────────────────────────────────────── */}
        <div
          className="hidden md:flex w-1/2 flex-col items-center justify-center px-14 gap-10 relative overflow-hidden"
          style={{ background: "linear-gradient(145deg, #0f172a 0%, #1e293b 100%)" }}
        >
          <div
            className="absolute inset-0 opacity-[0.04] pointer-events-none"
            style={{
              backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-40 bg-blue-600 rounded-full blur-[80px] opacity-15 pointer-events-none" />

          {/* Icon card */}
          <div className="relative z-10 bg-white/5 border border-white/10 rounded-2xl px-8 py-10 backdrop-blur-sm w-full max-w-sm flex flex-col items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
              <svg className="w-8 h-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-[11px] text-slate-400 uppercase tracking-widest mb-1">Account Recovery</p>
              <p className="text-white font-bold text-lg leading-tight">Secure password reset</p>
            </div>
          </div>

          <div className="relative z-10 text-center max-w-xs">
            <h2 className="text-white text-2xl font-bold leading-snug mb-3 tracking-tight">
              Don't worry,{" "}
              <span className="text-blue-400">we've got you.</span>
            </h2>
            <p className="text-slate-400 text-[13px] leading-relaxed mb-8">
              Verify your email and set a new password to regain access to your Workforce360 account.
            </p>
            <div className="flex flex-col gap-2.5 items-start text-left">
              {[
                { icon: "✅", label: "Verify your account email" },
                { icon: "🔑", label: "Choose a strong new password" },
                { icon: "🚀", label: "Sign in and get back to work" },
              ].map((f, i) => (
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

// ── Small shared sub-components ───────────────────────────────────────────────
function ErrorAlert({ message }) {
  return (
    <div className="mb-5 flex items-start gap-2.5 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-[13px]">
      <svg className="w-4 h-4 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
      {message}
    </div>
  );
}

function SubmitButton({ loading, label, loadingLabel }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="w-full mt-1 py-2.5 rounded-xl bg-gradient-to-r from-slate-800 to-slate-700 hover:from-slate-700 hover:to-slate-600 active:from-slate-900 text-white text-[13.5px] font-semibold tracking-wide shadow-md shadow-slate-300 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {loading ? (
        <>
          <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          <span>{loadingLabel}</span>
        </>
      ) : label}
    </button>
  );
}
