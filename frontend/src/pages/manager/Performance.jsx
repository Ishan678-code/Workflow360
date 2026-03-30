import { useEffect, useState } from "react";
import ManagerLayout from "../../layouts/ManagerLayout";
import { analyticsApi, performanceApi } from "../../services/api";
import { downloadBlob } from "../../utils/formatters";
import { Download } from "lucide-react";

const fallbackCards = [
  { label: "High Performers", value: "8" },
  { label: "Reviews Due", value: "3" },
  { label: "Average Score", value: "4.4/5" },
];

const fallbackReviews = [
  { _id: "pr-1", employeeName: "Ava Wilson", period: "Q1 2026", score: 4.8, summary: "Excellent delivery consistency." },
  { _id: "pr-2", employeeName: "Noah Carter", period: "Q1 2026", score: 4.2, summary: "Strong collaboration across design and product." },
];

export default function ManagerPerformance() {
  const [cards, setCards] = useState(fallbackCards);
  const [reviews, setReviews] = useState(fallbackReviews);
  const [leaderboard, setLeaderboard] = useState([]);
  const [algorithm, setAlgorithm] = useState(null);
  const [error, setError] = useState("");
  const [downloadingId, setDownloadingId] = useState(null);

  useEffect(() => {
    let active = true;

    async function loadPerformance() {
      try {
        const [analytics, reviewData, teamData] = await Promise.allSettled([
          analyticsApi.getPerformance(),
          performanceApi.getAll(),
          analyticsApi.getTeamPerformance(30),
        ]);

        if (!active) return;

        if (analytics.status === "fulfilled" && analytics.value) {
          const data = analytics.value;
          setCards([
            { label: "High Performers", value: String(data.highPerformers ?? data.topPerformers ?? 8) },
            { label: "Reviews Due", value: String(data.reviewsDue ?? 3) },
            { label: "Average Score", value: `${Number(data.averageScore ?? 4.4).toFixed(1)}/5` },
          ]);
        }

        if (reviewData.status === "fulfilled") {
          const resolved = Array.isArray(reviewData.value) ? reviewData.value : reviewData.value?.data;
          if (Array.isArray(resolved) && resolved.length) setReviews(resolved);
        }

        if (teamData.status === "fulfilled") {
          setLeaderboard(teamData.value?.leaderboard || []);
        }

        if (analytics.status === "fulfilled" && analytics.value?.algorithm) {
          setAlgorithm(analytics.value.algorithm);
        }

        if (analytics.status === "rejected" && reviewData.status === "rejected" && teamData.status === "rejected") {
          setError("Live performance data is unavailable.");
        }
      } catch (err) {
        if (active) setError(err.message || "Live performance data is unavailable.");
      }
    }

    loadPerformance();
    return () => {
      active = false;
    };
  }, []);

  async function handleDownload(userId, name) {
    setDownloadingId(userId);
    try {
      const blob = await analyticsApi.downloadPerformanceReport(userId, 30);
      downloadBlob(blob, `performance-${name || userId}.pdf`);
    } catch {} finally {
      setDownloadingId(null);
    }
  }

  return (
    <ManagerLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Performance</h1>
          <p className="mt-2 text-sm text-slate-500">Track review health, highlight strong outcomes, and spot coaching needs.</p>
        </div>

        {error ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
            {error} Showing sample review data for now.
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-3">
          {cards.map((card) => (
            <article key={card.label} className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">{card.label}</p>
              <p className="mt-3 text-4xl font-black tracking-tight text-slate-900">{card.value}</p>
            </article>
          ))}
        </div>

        <section className="grid gap-6 xl:grid-cols-[1.2fr,0.8fr]">
          <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-black text-slate-900">30-Day Performance Leaderboard</h2>
            <div className="mt-5 space-y-4">
              {leaderboard.length ? leaderboard.slice(0, 5).map((entry, index) => (
                <article key={entry.userId || index} className="rounded-2xl bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Rank #{index + 1}</p>
                      <h3 className="mt-1 text-base font-black text-slate-900">{entry.name || "Team Member"}</h3>
                    </div>
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-blue-700">
                      Score {Number(entry.score || 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="mt-4 h-2 rounded-full bg-white">
                    <div className="h-full rounded-full bg-slate-900" style={{ width: `${Math.min((entry.score || 0) * 100, 100)}%` }} />
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <p className="text-sm text-slate-500">{entry.insight || "Performance insight unavailable."}</p>
                    {entry.userId && (
                      <button
                        onClick={() => handleDownload(entry.userId, entry.name)}
                        disabled={downloadingId === entry.userId}
                        className="flex shrink-0 items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-slate-500 shadow-sm ring-1 ring-slate-100 transition hover:bg-slate-50 disabled:opacity-50"
                      >
                        <Download size={11} />
                        {downloadingId === entry.userId ? "..." : "PDF"}
                      </button>
                    )}
                  </div>
                </article>
              )) : (
                <div className="rounded-2xl bg-slate-50 px-4 py-10 text-center text-sm text-slate-400">
                  Team leaderboard data will appear here once activity is available.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-black text-slate-900">Algorithm Notes</h2>
            <div className="mt-5 space-y-4 text-sm text-slate-600">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Performance Score</p>
                <p className="mt-2 font-semibold text-slate-800">
                  {algorithm?.performanceScoreFormula || "0.40 * taskCompletionRatio + 0.35 * qualityScore + 0.25 * deadlineAdherence"}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Utilization Formula</p>
                <p className="mt-2 font-semibold text-slate-800">
                  {algorithm?.averageUtilizationFormula || "completed_tasks / total_tasks * 100"}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Interpretation</p>
                <p className="mt-2 text-slate-600">
                  Higher scores indicate stronger delivery consistency, better quality, and fewer missed deadlines.
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-black text-slate-900">Recent Reviews</h2>
          <div className="mt-5 space-y-4">
            {reviews.map((review) => (
              <article key={review._id || `${review.employeeName}-${review.period}`} className="rounded-2xl bg-slate-50 p-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="text-base font-black text-slate-900">{review.employeeName || review.employee?.name || "Team Member"}</h3>
                    <p className="text-sm text-slate-500">{review.period || review.reviewPeriod || "Current cycle"}</p>
                  </div>
                  <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-violet-700">
                    Score {Number(review.score ?? review.rating ?? 4.4).toFixed(1)}
                  </span>
                </div>
                <p className="mt-3 text-sm text-slate-600">{review.summary || review.feedback || "No summary available."}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </ManagerLayout>
  );
}
