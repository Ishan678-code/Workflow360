import { useEffect, useState } from "react";
import AdminLayout from "../../layouts/AdminLayout";
import { analyticsApi, performanceApi } from "../../services/api";

export default function AdminPerformance() {
  const [report, setReport] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadPerformance() {
      const [reportRes, reviewsRes] = await Promise.allSettled([
        analyticsApi.getPerformance(),
        performanceApi.getAll(),
      ]);

      if (!active) return;

      if (reportRes.status === "fulfilled") {
        setReport(reportRes.value || null);
      }

      if (reviewsRes.status === "fulfilled") {
        const data = Array.isArray(reviewsRes.value) ? reviewsRes.value : reviewsRes.value?.data || [];
        setReviews(data);
      }

      if (reportRes.status === "rejected" && reviewsRes.status === "rejected") {
        setError("Unable to load performance data right now.");
      }
    }

    loadPerformance().catch(() => {
      if (active) setError("Unable to load performance data right now.");
    });

    return () => {
      active = false;
    };
  }, []);

  const topEmployees = report?.topEmployeesByCompletedTasks || [];
  const topFreelancers = report?.topFreelancersByHoursLogged || [];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Performance</h1>
          <p className="mt-2 text-sm text-slate-500">Cross-team delivery signal for employees and freelancers.</p>
        </div>

        {error ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
            {error}
          </div>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-2">
          <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-black text-slate-900">Top Employees by Completed Tasks</h2>
            <div className="mt-5 space-y-3">
              {topEmployees.length ? (
                topEmployees.map((entry, index) => (
                  <div key={`${entry._id}-${index}`} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-4">
                    <span className="font-semibold text-slate-700">{entry.name || entry.user?.name || "Unknown User"}</span>
                    <span className="font-black text-rose-700">{entry.completedTasks}</span>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl bg-slate-50 px-4 py-10 text-center text-sm text-slate-400">
                  No employee performance aggregates yet.
                </div>
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-black text-slate-900">Top Freelancers by Hours Logged</h2>
            <div className="mt-5 space-y-3">
              {topFreelancers.length ? (
                topFreelancers.map((entry, index) => (
                  <div key={`${entry._id}-${index}`} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-4">
                    <span className="font-semibold text-slate-700">{entry.name || entry.user?.name || "Unknown Freelancer"}</span>
                    <span className="font-black text-rose-700">{entry.totalHours}</span>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl bg-slate-50 px-4 py-10 text-center text-sm text-slate-400">
                  No freelancer hour aggregates yet.
                </div>
              )}
            </div>
          </section>
        </div>

        <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-black text-slate-900">Recent Reviews</h2>
          <div className="mt-5 space-y-4">
            {reviews.length ? (
              reviews.map((review) => (
                <article key={review._id || review.user?._id} className="rounded-2xl bg-slate-50 p-4">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h3 className="text-base font-black text-slate-900">
                        {review.employeeName || review.user?.name || "Team Member"}
                      </h3>
                      <p className="text-sm text-slate-500">{review.period || review.reviewPeriod || "Current cycle"}</p>
                    </div>
                    <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-rose-700">
                      {Number(review.score ?? review.rating ?? 0).toFixed(1)}
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-slate-600">{review.summary || review.feedback || "No feedback summary."}</p>
                </article>
              ))
            ) : (
              <div className="rounded-2xl bg-slate-50 px-4 py-10 text-center text-sm text-slate-400">
                No reviews available.
              </div>
            )}
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}
