/**
 * AI Smart Task Prioritizing Service  (F4.4)
 *
 * Algorithm: Eisenhower Matrix + weighted scoring
 *
 * Score = w_urgency * urgencyScore
 *       + w_importance * importanceScore
 *       + w_effort * effortScore
 *       + w_status * statusScore
 *
 * Scores are normalised to [0, 100].
 * Each task is also classified into an Eisenhower quadrant:
 *   Q1 — Do First    (urgent + important)
 *   Q2 — Schedule    (not urgent + important)
 *   Q3 — Delegate    (urgent + not important)
 *   Q4 — Eliminate   (not urgent + not important)
 */

// ── Weights ──────────────────────────────────────────────────────────────────
const W = {
  urgency    : 0.40,
  importance : 0.35,
  effort     : 0.15,
  status     : 0.10
};

// ── Urgency score based on deadline proximity ─────────────────────────────────
function urgencyScore(task) {
  if (!task.deadline) return 10;   // no deadline → low urgency

  const daysLeft = (new Date(task.deadline) - new Date()) / (1000 * 60 * 60 * 24);

  if (daysLeft < 0)   return 100;  
  if (daysLeft <= 1)  return 95;
  if (daysLeft <= 3)  return 80;
  if (daysLeft <= 7)  return 60;
  if (daysLeft <= 14) return 35;
  if (daysLeft <= 30) return 20;
  return 10;
}

// ── Importance score from the task's priority label ───────────────────────────
const PRIORITY_SCORE = { URGENT: 100, HIGH: 75, MEDIUM: 45, LOW: 20 };

function importanceScore(task) {
  return PRIORITY_SCORE[task.priority] ?? 45;
}

// ── Effort score: higher effort → higher score (needs attention sooner) ───────
// Uses estimated effort if present; falls back to tag count as proxy.
function effortScore(task) {
  if (task.estimatedHours) {
    if (task.estimatedHours >= 16) return 90;
    if (task.estimatedHours >= 8)  return 65;
    if (task.estimatedHours >= 4)  return 40;
    return 20;
  }
  // proxy: more tags → more complex
  const tags = (task.tags || []).length;
  return Math.min(tags * 15, 60) + 20;
}

// ── Status score: incomplete work closer to start gets a nudge ────────────────
function statusScore(task) {
  if (task.status === "TODO")        return 80;
  if (task.status === "IN_PROGRESS") return 50;
  return 0;   // COMPLETED
}

// ── Eisenhower quadrant ───────────────────────────────────────────────────────
function classifyQuadrant(uScore, iScore) {
  const urgent    = uScore >= 60;
  const important = iScore >= 60;

  if (urgent && important)  return { quadrant: "Q1", label: "Do First",  description: "Urgent and important — handle immediately" };
  if (!urgent && important) return { quadrant: "Q2", label: "Schedule",  description: "Important but not urgent — plan and schedule" };
  if (urgent && !important) return { quadrant: "Q3", label: "Delegate",  description: "Urgent but not important — delegate if possible" };
  return                           { quadrant: "Q4", label: "Eliminate", description: "Not urgent and not important — consider dropping" };
}


export function scoreTask(task) {
  const uScore = urgencyScore(task);
  const iScore = importanceScore(task);
  const eScore = effortScore(task);
  const sScore = statusScore(task);

  const aiPriorityScore = +(
    W.urgency    * uScore +
    W.importance * iScore +
    W.effort     * eScore +
    W.status     * sScore
  ).toFixed(2);

  return {
    aiPriorityScore,
    scoreBreakdown: {
      urgency    : +uScore.toFixed(2),
      importance : +iScore.toFixed(2),
      effort     : +eScore.toFixed(2),
      status     : +sScore.toFixed(2)
    },
    eisenhower: classifyQuadrant(uScore, iScore)
  };
}


export function prioritizeTasks(tasks, { includeCompleted = false } = {}) {
  const filtered = includeCompleted
    ? tasks
    : tasks.filter(t => t.status !== "COMPLETED");

  return filtered
    .map(task => {
      const plain = task.toObject ? task.toObject() : task;
      return { ...plain, ...scoreTask(plain) };
    })
    .sort((a, b) => b.aiPriorityScore - a.aiPriorityScore);
}


export function quadrantSummary(scoredTasks) {
  const counts = { Q1: 0, Q2: 0, Q3: 0, Q4: 0 };
  scoredTasks.forEach(t => {
    if (t.eisenhower?.quadrant) counts[t.eisenhower.quadrant]++;
  });
  return counts;
}
