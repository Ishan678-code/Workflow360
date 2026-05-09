

const STOP_WORDS = new Set([
  "a","an","the","and","or","but","in","on","at","to","for","of","with",
  "by","from","is","was","are","were","be","been","has","have","had",
  "do","does","did","will","would","could","should","may","might","can",
  "i","we","you","he","she","they","it","this","that","these","those",
  "looking","need","needs","needed","developer","engineer","expert",
  "experience","experienced","knowledge","strong","plus"
]);

const TERM_ALIASES = new Map([
  ["reactjs", "react"],
  ["react js", "react"],
  ["react.js", "react"],
  ["nodejs", "nodejs"],
  ["node js", "nodejs"],
  ["node.js", "nodejs"],
  ["express js", "express"],
  ["express.js", "express"],
  ["next js", "nextjs"],
  ["next.js", "nextjs"],
  ["vue js", "vue"],
  ["vue.js", "vue"],
  ["nuxt js", "nuxt"],
  ["nuxt.js", "nuxt"],
  ["mongo db", "mongodb"],
  ["mongo-db", "mongodb"],
  ["postgre sql", "postgresql"],
  ["postgre-sql", "postgresql"],
  ["postgressql", "postgresql"],
  ["type script", "typescript"],
  ["java script", "javascript"],
  ["tail wind", "tailwind"],
  ["machine learning", "ml"],
  ["artificial intelligence", "ai"],
  ["ui ux", "uiux"],
  ["ui/ux", "uiux"],
  ["c sharp", "csharp"],
  ["c#", "csharp"],
  ["dot net", "dotnet"],
  [".net", "dotnet"]
]);

function normaliseWhitespace(text) {
  return text.replace(/\s+/g, " ").trim();
}

function applyAliases(text) {
  let normalized = text;
  for (const [source, target] of TERM_ALIASES.entries()) {
    const escaped = source.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    normalized = normalized.replace(new RegExp(`\\b${escaped}\\b`, "g"), target);
  }
  return normalized;
}

function stemToken(token) {
  if (token.length <= 4) return token;
  if (token.endsWith("ies")) return `${token.slice(0, -3)}y`;
  if (token.endsWith("ing") && token.length > 5) return token.slice(0, -3);
  if (token.endsWith("ed") && token.length > 4) return token.slice(0, -2);
  if (token.endsWith("s") && !token.endsWith("ss")) return token.slice(0, -1);
  return token;
}

export function normalizeText(text) {
  if (!text) return "";

  const normalized = text
    .toLowerCase()
    .replace(/[_/]/g, " ")
    .replace(/[^a-z0-9.+#\s-]/g, " ")
    .replace(/[.+-]/g, " ");

  return normaliseWhitespace(applyAliases(normalized));
}

/**
 * Tokenize a string: lowercase, strip punctuation, remove stop words
 */
export function tokenize(text) {
  if (!text) return [];
  return normalizeText(text)
    .split(/\s+/)
    .map(stemToken)
    .filter(t => t.length > 1 && !STOP_WORDS.has(t));
}

export function normalizeSkill(skill) {
  return normalizeText(skill).replace(/\s+/g, "");
}

function dedupe(values) {
  return [...new Set(values.filter(Boolean))];
}

function buildFreelancerText(freelancer) {
  return [
    ...(freelancer.skills || []),
    freelancer.portfolioUrl || "",
    freelancer.timezone || ""
  ].join(" ");
}

// ── TF (Term Frequency) ───────────────────────────────────────────────────────
/**
 * tf(t,d) = count of term t in document d / total terms in d
 */
function computeTF(tokens) {
  const tf = {};
  tokens.forEach(t => { tf[t] = (tf[t] || 0) + 1; });
  const total = tokens.length || 1;
  Object.keys(tf).forEach(t => { tf[t] /= total; });
  return tf;
}

// ── IDF (Inverse Document Frequency) ─────────────────────────────────────────
/**
 * idf(t) = log( N / df(t) + 1 )
 * N = total documents, df(t) = docs containing term t
 */
export function computeIDF(allDocTokens) {
  const N = allDocTokens.length;
  const df = {};

  allDocTokens.forEach(tokens => {
    new Set(tokens).forEach(t => {
      df[t] = (df[t] || 0) + 1;
    });
  });

  const idf = {};
  Object.keys(df).forEach(t => {
    idf[t] = Math.log((N + 1) / (df[t] + 1)) + 1;
  });
  return idf;
}

// ── TF-IDF Vector ─────────────────────────────────────────────────────────────
/**
 * Build a TF-IDF vector aligned to a shared vocabulary
 */
export function buildTFIDFVector(tokens, idf, vocabulary) {
  const tf = computeTF(tokens);
  return vocabulary.map(term => (tf[term] || 0) * (idf[term] || 0));
}

// ── Cosine Similarity ─────────────────────────────────────────────────────────
/**
 * S(J,P) = (J⃗ · P⃗) / (||J⃗|| × ||P⃗||)
 * Returns value between 0 (no match) and 1 (perfect match)
 */
export function cosineSimilarity(vecA, vecB) {
  const dot    = vecA.reduce((sum, a, i) => sum + a * (vecB[i] || 0), 0);
  const magA   = Math.sqrt(vecA.reduce((s, a) => s + a * a, 0));
  const magB   = Math.sqrt(vecB.reduce((s, b) => s + b * b, 0));
  if (magA === 0 || magB === 0) return 0;
  return dot / (magA * magB);
}


export function rankFreelancers(job, freelancers, topN = null) {
  const requestedTopN = Number.isFinite(Number(topN)) && Number(topN) > 0
    ? Math.floor(Number(topN))
    : null;

  // Build job text corpus
  const jobText     = [job.description || "", ...(job.requiredSkills || [])].join(" ");
  const jobTokens   = tokenize(jobText);
  const requiredSkills = dedupe((job.requiredSkills || []).map(normalizeSkill));

  // Build freelancer corpus texts
  const freelancerCorpus = freelancers.map(f => tokenize(buildFreelancerText(f)));

  // Combined corpus for IDF computation (job + all freelancers)
  const allDocs  = [jobTokens, ...freelancerCorpus];
  const vocabulary = [...new Set(allDocs.flat())];
  const idf      = computeIDF(allDocs);

  // Build job vector
  const jobVec = buildTFIDFVector(jobTokens, idf, vocabulary);

  // Score each freelancer
  const results = freelancers.map((freelancer, i) => {
    const fVec        = buildTFIDFVector(freelancerCorpus[i], idf, vocabulary);
    const tfidfScore  = cosineSimilarity(jobVec, fVec);

    const freelancerSkills = dedupe((freelancer.skills || []).map(normalizeSkill));
    const matchedSkills = requiredSkills.filter(skill => freelancerSkills.includes(skill));
    const overlapBonus     = requiredSkills.length > 0
      ? matchedSkills.length / requiredSkills.length
      : 0;

    const jobTokenSet = new Set(jobTokens);
    const freelancerTokenSet = new Set(freelancerCorpus[i]);
    const sharedTokens = [...jobTokenSet].filter(token => freelancerTokenSet.has(token)).length;
    const tokenCoverage = jobTokenSet.size > 0 ? sharedTokens / jobTokenSet.size : 0;

    const finalScore = tfidfScore * 0.55 + overlapBonus * 0.35 + tokenCoverage * 0.10;

    return {
      freelancerId  : freelancer._id,
      userId        : freelancer.userId,
      skills        : freelancer.skills,
      hourlyRate    : freelancer.hourlyRate,
      matchedSkills,
      scores: {
        tfidf        : +tfidfScore.toFixed(4),
        skillOverlap : +overlapBonus.toFixed(4),
        tokenCoverage: +tokenCoverage.toFixed(4),
        final        : +finalScore.toFixed(4)
      }
    };
  });

  // Rank descending by final score
  results.sort((a, b) => b.scores.final - a.scores.final);
  const minScore = Number.isFinite(Number(job.minScore))
    ? Math.max(0, Math.min(1, Number(job.minScore)))
    : 0.15;

  const filtered = results.filter(result => result.scores.final >= minScore);
  return requestedTopN ? filtered.slice(0, requestedTopN) : filtered;
}
