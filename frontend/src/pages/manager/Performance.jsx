import { useEffect, useState } from "react";
import ManagerLayout from "../../layouts/ManagerLayout";
import { analyticsApi, performanceApi } from "../../services/api";

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
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadPerformance() {
      try {
        const [analytics, reviewData] = await Promise.allSettled([
          analyticsApi.getPerformance(),
          performanceApi.getAll(),
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

        if (analytics.status === "rejected" && reviewData.status === "rejected") {
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
