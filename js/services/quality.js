/* Smart waste quality score (0–100) and the guided check used when no AI is available.
   The score is an estimate from material and contamination; the recycler's outcome later gives the measured value. */

// How readily each material is recycled or composted when it arrives clean (a planning assumption, editable here).
const BASE_RECYCLABILITY = { metal: 95, pet: 90, glass: 85, organic: 85, paper: 80, other_plastic: 60 };
const CONTAMINATION_PENALTY = { low: 0, medium: 20, high: 45 };

function qualityScore(material, contamination) {
  const base = BASE_RECYCLABILITY[material] ?? 60;
  const score = Math.max(0, Math.min(100, base - (CONTAMINATION_PENALTY[contamination] ?? 20)));
  const grade = score >= 85 ? "A" : score >= 70 ? "B" : score >= 50 ? "C" : "D";
  return { score, grade };
}

// Measured quality once a recycler has processed the bag (or its bundle).
function measuredQuality(b) {
  const share = bagShare(b);
  return share ? { score: Math.round(share.rate * 100), estimate: share.estimate } : null;
}

const GUIDED_QUESTIONS = ["empty", "clean", "single", "labels"];

function guidedCheck(material, answers) {
  const no = GUIDED_QUESTIONS.filter((q) => answers[q] === "no");
  const contamination = no.length === 0 ? "low" : no.length === 1 ? "medium" : "high";
  return {
    material,
    confidence: null,
    contamination,
    issues: no.map((q) => t(`gq.issue.${q}`)),
    instructions: no.length ? no.map((q) => t(`gq.fix.${q}`)) : [t("gq.fix.ok")],
    source: "guided",
    ...qualityScore(material, contamination),
  };
}
