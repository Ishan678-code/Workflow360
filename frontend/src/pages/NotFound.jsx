import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .fade-up { animation: fadeUp 0.5s ease-out both; }
      `}</style>

      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-6 font-sans relative overflow-hidden">
        {/* Background blobs */}
        <div className="absolute top-[-80px] left-[-80px] w-72 h-72 bg-blue-100 rounded-full blur-3xl opacity-40 pointer-events-none" />
        <div className="absolute bottom-[-60px] right-[-60px] w-56 h-56 bg-indigo-100 rounded-full blur-3xl opacity-30 pointer-events-none" />

        <div className="fade-up relative z-10 text-center max-w-sm">
          {/* Logo */}
          <div className="flex items-center gap-2.5 mb-10 justify-center">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-md shadow-blue-200">
              <span className="text-white font-extrabold text-sm tracking-tight">W</span>
            </div>
            <span className="text-slate-800 font-bold text-[17px] tracking-tight">Workforce360</span>
          </div>

          {/* 404 card */}
          <div className="relative bg-white rounded-2xl px-8 py-10 shadow-[0_4px_32px_rgba(0,0,0,0.08)] border border-slate-100">
            <div className="absolute top-0 left-8 right-8 h-0.5 rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-400" />

            <p className="text-[72px] font-black text-slate-100 leading-none select-none">404</p>
            <h1 className="text-[20px] font-bold text-slate-800 mt-2 tracking-tight">Page not found</h1>
            <p className="text-[13px] text-slate-400 mt-2 mb-7 leading-relaxed">
              The page you're looking for doesn't exist or has been moved.
            </p>

            <Link
              to="/"
              className="inline-flex items-center gap-2 py-2.5 px-6 rounded-xl bg-gradient-to-r from-slate-800 to-slate-700 hover:from-slate-700 hover:to-slate-600 text-white text-[13.5px] font-semibold tracking-wide shadow-md shadow-slate-300 transition-all duration-200"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Sign In
            </Link>
          </div>

          <p className="mt-6 text-[12px] text-slate-400">
            © {new Date().getFullYear()} Workforce360. All rights reserved.
          </p>
        </div>
      </div>
    </>
  );
}
