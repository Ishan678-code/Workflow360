/**
 * TF-IDF + Cosine Similarity Service
 * Based on notebook formula:
 *   TF-IDF(t,d) = tf(t,d) × log( N / df(t) + 1 )
 *   Cosine Similarity S(J,P) = (J⃗ · P⃗) / (||J⃗|| × ||P⃗||)
 */

// ── Tokenizer (no external deps needed) ──────────────────────────────────────
const STOP_WORDS = new Set([
  "a","an","the","and","or","but","in","on","at","to","for","of","with",
  "by","from","is","was","are","were","be","been","has","have","had",
  "do","does","did","will","would","could","should","may","might","can",
  "i","we","you","he","she","they","it","this","that","these","those"
]);

/**
 * Tokenize a string: lowercase, strip punctuation, remove stop words
 */
export function tokenize(text) {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(t => t.length > 1 && !STOP_WORDS.has(t));
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
    idf[t] = Math.log(N / (df[t] + 1));   // your notebook formula
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

// ── Main Matching Function ────────────────────────────────────────────────────
/**
 * Score all freelancers against a job description using TF-IDF + Cosine Similarity
 *
 * @param {Object}   job         - { description, requiredSkills[] }
 * @param {Object[]} freelancers - [{ _id, skills[], portfolioUrl, hourlyRate, userId }]
 * @param {Number}   topN        - return top N results (default: all)
 * @returns {Array} ranked results with score breakdown
 */
export function rankFreelancers(job, freelancers, topN = null) {
  // Build job text corpus
  const jobText     = [job.description || "", ...(job.requiredSkills || [])].join(" ");
  const jobTokens   = tokenize(jobText);

  // Build freelancer corpus texts
  const freelancerCorpus = freelancers.map(f => tokenize((f.skills || []).join(" ")));

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

    // Skill overlap bonus (exact keyword match from requiredSkills)
    const requiredSkills   = (job.requiredSkills || []).map(s => s.toLowerCase());
    const freelancerSkills = (freelancer.skills  || []).map(s => s.toLowerCase());
    const matchedSkills    = requiredSkills.filter(s => freelancerSkills.includes(s));
    const overlapBonus     = requiredSkills.length > 0
      ? matchedSkills.length / requiredSkills.length
      : 0;

    // Final weighted score:  70% semantic TF-IDF + 30% exact skill overlap
    const finalScore = tfidfScore * 0.7 + overlapBonus * 0.3;

    return {
      freelancerId  : freelancer._id,
      userId        : freelancer.userId,
      skills        : freelancer.skills,
      hourlyRate    : freelancer.hourlyRate,
      matchedSkills,
      scores: {
        tfidf        : +tfidfScore.toFixed(4),
        skillOverlap : +overlapBonus.toFixed(4),
        final        : +finalScore.toFixed(4)
      }
    };
  });

  // Rank descending by final score
  results.sort((a, b) => b.scores.final - a.scores.final);
  return topN ? results.slice(0, topN) : results;
}