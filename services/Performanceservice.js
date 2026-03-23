
const WEIGHTS = {
  w1: 0.40,   // task completion relative to team
  w2: 0.35,   // quality of work
  w3: 0.25    // deadline adherence
};

const QMAX = 5;   // max quality rating in your system


function computeZScore(value, allValues) {
  if (allValues.length < 2) return 0;

  const mean  = allValues.reduce((s, x) => s + x, 0) / allValues.length;
  const variance = allValues.reduce((s, x) => s + Math.pow(x - mean, 2), 0) / allValues.length;
  const sigma = Math.sqrt(variance);

  if (sigma === 0) return 0;
  return (value - mean) / sigma;
}

// ── Performance Score ─────────────────────────────────────────────────────────
/**
 * Compute PS for a single user given their activity data + team context
 *
 * @param {Object} userMetrics   - { completedTasks, totalTasks, qualityRatings[], missedDeadlines, totalDeadlines }
 * @param {Object} teamContext   - { avgTasksCompleted, allUserScores[] }  (for relative scoring)
 * @returns {Object} full score breakdown + anomaly detection
 */
export function computePerformanceScore(userMetrics, teamContext) {
  const {
    completedTasks,
    totalTasks,
    qualityRatings   = [],
    missedDeadlines  = 0,
    totalDeadlines   = 1
  } = userMetrics;

  const {
    avgTasksCompleted = 1,      // Tavg — team average
    allUserScores     = []       // for Z-score baseline
  } = teamContext;

  // ── Component 1: Task Completion Ratio (Tu / Tavg) ────────────────────────
  const Tu    = completedTasks;
  const Tavg  = avgTasksCompleted > 0 ? avgTasksCompleted : 1;
  const c1    = Math.min(Tu / Tavg, 2);   // cap at 2× to prevent outlier skew

  // ── Component 2: Quality Score (Qu / Qmax) ────────────────────────────────
  const Qu = qualityRatings.length > 0
    ? qualityRatings.reduce((s, r) => s + r, 0) / qualityRatings.length
    : 0;
  const c2 = Qu / QMAX;

  // ── Component 3: Deadline Adherence (1 - Du/Dtotal) ──────────────────────
  const Du      = missedDeadlines;
  const Dtotal  = totalDeadlines > 0 ? totalDeadlines : 1;
  const c3      = 1 - (Du / Dtotal);

  // ── Final PS ──────────────────────────────────────────────────────────────
  const PS = WEIGHTS.w1 * c1 + WEIGHTS.w2 * c2 + WEIGHTS.w3 * c3;

  // ── Z-Score Anomaly Detection ─────────────────────────────────────────────
  const zScore    = computeZScore(PS, allUserScores);
  const isAnomaly = Math.abs(zScore) > 2;
  const anomalyFlag =
    !isAnomaly         ? "NORMAL"         :
    zScore > 2         ? "EXCEPTIONAL"    : "UNDERPERFORMING";

  // ── Insight text ──────────────────────────────────────────────────────────
  let insight = "";
  if (PS >= 0.8)        insight = "Excellent performance. Consistently delivering high-quality work on time.";
  else if (PS >= 0.6)   insight = "Good performance. Minor areas to improve in deadlines or quality.";
  else if (PS >= 0.4)   insight = "Moderate performance. Focus on task completion and meeting deadlines.";
  else                  insight = "Low performance. Immediate review of workload and priorities recommended.";

  if (Du > 0) insight += ` ${Du} deadline(s) missed this period.`;

  return {
    score: +PS.toFixed(4),
    components: {
      taskCompletionRatio : +c1.toFixed(4),
      qualityScore        : +c2.toFixed(4),
      deadlineAdherence   : +c3.toFixed(4)
    },
    rawMetrics: {
      completedTasks,
      totalTasks,
      avgQuality    : +Qu.toFixed(2),
      missedDeadlines,
      totalDeadlines,
      teamAvgTasks  : Tavg
    },
    anomaly: {
      zScore    : +zScore.toFixed(3),
      isAnomaly,
      flag      : anomalyFlag
    },
    insight
  };
}

// ── Batch: Compute for all users, inject team context ────────────────────────
/**
 * Compute performance scores for a list of users
 * Automatically builds team context (Tavg, allUserScores baseline)
 *
 * @param {Array} usersMetrics  - array of { userId, ...userMetrics }
 * @returns {Array} sorted results (highest score first)
 */
export function computeTeamPerformance(usersMetrics) {
  if (!usersMetrics.length) return [];

  // First pass: compute raw task averages for Tavg
  const avgTasksCompleted =
    usersMetrics.reduce((s, u) => s + (u.completedTasks || 0), 0) / usersMetrics.length;

  // First pass scores (without Z-score baseline yet)
  const rawScores = usersMetrics.map(u =>
    computePerformanceScore(u, { avgTasksCompleted, allUserScores: [] }).score
  );

  // Second pass: inject allUserScores for proper Z-score
  const results = usersMetrics.map((u, i) => ({
    userId : u.userId,
    ...computePerformanceScore(u, { avgTasksCompleted, allUserScores: rawScores })
  }));

  return results.sort((a, b) => b.score - a.score);
}