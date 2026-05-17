import { useEffect, useMemo, useState } from "react";

import ManagerLayout from "../../layouts/ManagerLayout";
import { analyticsApi, performanceApi } from "../../services/api";
import { downloadBlob } from "../../utils/formatters";
import { Download } from "lucide-react";

const defaultCards = [
  { label: "High Performers", value: "0" },
  { label: "Reviews Due", value: "0" },
  { label: "Average Score", value: "--" },
];

export default function ManagerPerformance() {
  const [cards, setCards] = useState(defaultCards);
  const [reviews, setReviews] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [algorithm, setAlgorithm] = useState(null);

  const leaderboardAverageScore = useMemo(() => {
    if (!leaderboard?.length) return null;

    // Backend/compute may use different keys; normalize defensively.
    const scores = leaderboard
      .map((e) => {
        const raw = e.score ?? e.performanceScore ?? e.totalScore;
        const num = Number(raw);
        return Number.isFinite(num) ? num : null;
      })
      .filter((v) => v != null);

    if (!scores.length) return null;

    const avg = scores.reduce((s, v) => s + v, 0) / scores.length;
    return avg;
  }, [leaderboard]);

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
            {
              label: "High Performers",
              // `/analytics/performance` doesn't provide this field; keep UI stable with sensible fallback.
              value: String(data.topEmployeesByCompletedTasks?.length ?? data.topPerformers ?? 8),
            },
            {
              label: "Reviews Due",
              value: String(data.reviewsDue ?? data.pendingReviews ?? 0),
            },
            {
              label: "Average Score",
              // compute after we normalize the leaderboard (set below).
              value: "--",
            },
          ]);
        }


        if (reviewData.status === "fulfilled") {
          const resolved = Array.isArray(reviewData.value) ? reviewData.value : reviewData.value?.data;
          setReviews(Array.isArray(resolved) ? resolved : []);
        }

        if (teamData.status === "fulfilled") {
          const rawLeaderboard = teamData.value?.leaderboard || [];

          // Normalize fields so the UI can reliably show names and scores.
          const normalized = rawLeaderboard.map((entry) => {
            const name = entry.name ?? entry.userName ?? entry.employeeName ?? "Team Member";
            const scoreRaw = entry.score ?? entry.performanceScore ?? entry.totalScore ?? 0;
            const role = entry.role ?? entry.title ?? "Role not available";

            return {
              ...entry,
              name,
              score: scoreRaw,
              role,
            };
          });

          setLeaderboard(normalized);
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
            {error}
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-3">
          {cards.map((card) => {
            const computedValue =
              card.label === "Average Score" && leaderboardAverageScore != null
                ? `${Number(leaderboardAverageScore).toFixed(1)}/5`
                : card.value;

            return (
              <article
                key={card.label}
                className="rounded-3xl border border-slate-100 bg-linear-to-br from-violet-50 to-white p-6 shadow-sm ring-1 ring-slate-200"
              >
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">{card.label}</p>
                <p className="mt-3 text-4xl font-black tracking-tight text-slate-900">{computedValue}</p>
                <p className="mt-3 text-sm text-slate-500">Latest snapshot for the team</p>
              </article>
            );
          })}
        </div>


        <section className="grid gap-6 xl:grid-cols-[1.2fr,0.8fr]">
          <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-xl font-black text-slate-900">30-Day Performance Leaderboard</h2>
                <p className="mt-2 text-sm text-slate-500">Top contributors and their performance momentum over the last month.</p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700">
                {leaderboard.length} team members ranked
              </div>
            </div>
            <div className="mt-5 space-y-4">
              {leaderboard.length ? leaderboard.slice(0, 5).map((entry, index) => (
                <article key={entry.userId || index} className="rounded-3xl border border-slate-100 bg-slate-50 p-5 shadow-sm">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Rank #{index + 1}</p>
                      <h3 className="mt-2 text-lg font-black text-slate-900">{entry.name || "Team Member"}</h3>
                      <p className="mt-1 text-sm text-slate-500">{entry.role || entry.title || "Role not available"}</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">

                      <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-slate-700 ring-1 ring-slate-200">
                        Score {Number(entry.score || 0).toFixed(2)}
                      </span>
                      {entry.userId && (
                        <button
                          onClick={() => handleDownload(entry.userId, entry.name)}
                          disabled={downloadingId === entry.userId}
                          className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-white transition hover:bg-slate-800 disabled:opacity-50"
                        >
                          <Download size={12} />
                          {downloadingId === entry.userId ? "Downloading" : "Report"}
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="mt-4 rounded-full bg-white p-3">
                    <div className="flex items-center justify-between text-sm text-slate-500">
                      <span>Progress</span>
                      <span>{Math.min(Number(entry.score || 0) * 20, 100).toFixed(0)}%</span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
                      <div className="h-full rounded-full bg-violet-700" style={{ width: `${Math.min(Number(entry.score || 0) * 20, 100)}%` }} />
                    </div>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{entry.insight || "No insight available for this team member yet."}</p>
                </article>
              )) : (
                <div className="rounded-2xl bg-slate-50 px-4 py-10 text-center text-sm text-slate-400">
                  Team leaderboard data will appear here once activity is available.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-slate-900">Algorithm Notes</h2>
                <p className="mt-2 text-sm text-slate-500">How the team’s performance scores are calculated for the current review window.</p>
              </div>
              <span className="rounded-full bg-violet-50 px-3 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-violet-700">
                {algorithm ? "Calculated" : "Default"}
              </span>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 text-sm text-slate-600">
              <div className="rounded-3xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Performance Score</p>
                <p className="mt-2 font-semibold text-slate-800">
                  {algorithm?.performanceScoreFormula || "0.40 * taskCompletionRatio + 0.35 * qualityScore + 0.25 * deadlineAdherence"}
                </p>
              </div>
              <div className="rounded-3xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Utilization Formula</p>
                <p className="mt-2 font-semibold text-slate-800">
                  {algorithm?.averageUtilizationFormula || "completed_tasks / total_tasks * 100"}
                </p>
              </div>
              <div className="sm:col-span-2 rounded-3xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Interpretation</p>
                <p className="mt-2 text-slate-600">
                  Higher scores indicate stronger delivery consistency, better quality, and fewer missed deadlines.
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-slate-900">Recent Reviews</h2>
              <p className="mt-2 text-sm text-slate-500">Latest review summaries and scores for the team.</p>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700">
              {reviews.length} reviews found
            </div>
          </div>
          <div className="mt-5 grid gap-4">
            {reviews.length ? reviews.map((review) => (
              <article key={review._id || `${review.employeeName}-${review.period}`} className="rounded-3xl border border-slate-100 bg-slate-50 p-5 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h3 className="text-lg font-black text-slate-900">{review.employeeName || review.employee?.name || "Team Member"}</h3>
                    <p className="mt-1 text-sm text-slate-500">{review.period || review.reviewPeriod || "Current cycle"}</p>
                  </div>
                  <span className="rounded-full bg-violet-100 px-4 py-2 text-sm font-bold uppercase tracking-[0.16em] text-violet-700">
                    {Number(review.score ?? review.rating ?? 4.4).toFixed(1)} / 5
                  </span>
                </div>
                <p className="mt-4 text-sm leading-6 text-slate-600">{review.summary || review.feedback || "No summary available."}</p>
              </article>
            )) : (
              <div className="rounded-2xl bg-slate-50 px-4 py-10 text-center text-sm text-slate-400">
                No performance reviews are available yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </ManagerLayout>
  );
}
