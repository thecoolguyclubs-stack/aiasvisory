import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { generateInsuranceProfile } from "../src/lib/assessment/profile.ts";
import { buildProgramPolicyComparison } from "../src/lib/policy-analysis/comparison.ts";
import {
  policyComparisonFactsFixture,
  policyComparisonProgramDetailFixture,
  policyComparisonRecommendationFixture,
  policyComparisonSubmissionFixture,
  policySnapshotFixture,
} from "../src/lib/policy-analysis/fixtures.ts";
import { mapAssessmentSubmissionToDatabase } from "../src/lib/recommendations/assessment-mapping.ts";
import {
  documentedLegacyFindings,
  optionSignalBaseline,
  versionBaseline,
  warningOnlySignals,
} from "./fixtures/milestone-3b-v1-baseline.mjs";

const migrationSql = readFileSync(
  new URL("../supabase/migrations/202607140001_insurance_ai_database_supabase_aligned.sql", import.meta.url),
  "utf8",
);

const optionSignalStart = migrationSql.indexOf(
  "INSERT INTO recommendation.option_signal",
);
const optionSignalEnd = migrationSql.indexOf(
  "ON CONFLICT (question_id, option_value, signal_code)",
  optionSignalStart,
);
assert.ok(optionSignalStart >= 0 && optionSignalEnd > optionSignalStart);
const optionSignalSql = migrationSql.slice(optionSignalStart, optionSignalEnd);
const sqlOptionSignals = [...optionSignalSql.matchAll(
  /\('([^']+)', '([^']+)', '([^']+)', ([0-9.]+),/gu,
)].map((match) => ({
  questionId: match[1],
  optionValue: match[2],
  signal: match[3],
  weight: Number(match[4]),
}));

const fixtureOptionSignals = Object.entries(optionSignalBaseline).flatMap(
  ([questionId, options]) =>
    Object.entries(options).flatMap(([optionValue, signals]) =>
      signals.map(({ signal, weight }) => ({
        questionId,
        optionValue,
        signal,
        weight,
      })),
    ),
);
const tupleKey = (entry) =>
  `${entry.questionId}|${entry.optionValue}|${entry.signal}|${entry.weight}`;
assert.deepEqual(
  sqlOptionSignals.map(tupleKey).sort(),
  fixtureOptionSignals.map(tupleKey).sort(),
);

for (const signal of warningOnlySignals) {
  const definitionLine = migrationSql
    .split(/\r?\n/u)
    .find((line) => line.trimStart().startsWith(`('${signal}'`));
  assert.ok(definitionLine?.includes("'warning_only'"), signal);
}

assert.equal(versionBaseline.legacyEvaluation.rulesetVersion, "2026-07-v1-draft");
assert.match(migrationSql, /'2026-07-v1-draft'/u);
assert.match(migrationSql, new RegExp(versionBaseline.legacyEvaluation.rulesetId, "u"));
assert.equal(versionBaseline.productDatasetSnapshotId, null);

assert.match(
  migrationSql,
  /100 \* sum\(m\.user_weight \* coalesce\(m\.product_signal_score, 0\)\) \/ nullif\(sum\(m\.user_weight \* 100\), 0\)/u,
);
assert.match(migrationSql, /0\.70 \* b\.base_score \+ 0\.30/u);
assert.match(migrationSql, /0\.65 \* b\.base_score \+ 0\.35/u);
assert.match(migrationSql, /ORDER BY s\.best_match_score DESC NULLS LAST, s\.product_id/u);
assert.match(migrationSql, /ORDER BY s\.premium_choice_score DESC NULLS LAST, s\.product_id/u);
assert.match(migrationSql, /ORDER BY s\.smart_budget_score DESC NULLS LAST, s\.product_id/u);
assert.match(migrationSql, /ORDER BY c\.category_order/u);
assert.match(migrationSql, /current_date - interval '18 years'/u);

const asOfDate = "2026-07-16";
const baseCanonicalAnswers = () => ({
  insured_people: "self",
  birth_dates: [{ birth_date: "1990-01-01" }],
  existing_insurance: "none",
  evaluation_goal: "first_time",
  priorities: ["private_hospitals", "major_hospitalization", "emergency"],
  deductible_preference: "balanced",
  protection_cost: "balanced",
  additional_needs: ["physiotherapy", "prevention_checkup"],
  existing_policy_upload: {},
});

const selectedOptions = (answers) => [
  ["Q_INSURED_PEOPLE", answers.insured_people],
  ["Q_EXISTING_INSURANCE", answers.existing_insurance],
  ["Q_EVALUATION_GOAL", answers.evaluation_goal],
  ["Q_DEDUCTIBLE_PREFERENCE", answers.deductible_preference],
  ["Q_PROTECTION_COST", answers.protection_cost],
  ...answers.priorities.map((value) => ["Q_PRIORITIES", value]),
  ...answers.additional_needs.map((value) => ["Q_ADDITIONAL_NEEDS", value]),
];

const minorCutoff = (date) => {
  const cutoff = new Date(`${date}T00:00:00.000Z`);
  cutoff.setUTCFullYear(cutoff.getUTCFullYear() - 18);
  return cutoff.toISOString().slice(0, 10);
};

function extractSignals(answers, controlledAsOfDate) {
  const contributions = [];
  for (const [questionId, optionValue] of selectedOptions(answers)) {
    for (const entry of optionSignalBaseline[questionId]?.[optionValue] ?? []) {
      contributions.push({
        ...entry,
        source: `${questionId}:${optionValue}`,
      });
    }
  }

  const cutoff = minorCutoff(controlledAsOfDate);
  if (answers.birth_dates.some(({ birth_date: date }) => date > cutoff)) {
    contributions.push({
      signal: "pediatric",
      weight: 0.8,
      source: "Q_BIRTH_DATES:at_least_one_minor",
    });
  }

  const aggregated = new Map();
  for (const contribution of contributions) {
    const current = aggregated.get(contribution.signal) ?? {
      signal: contribution.signal,
      weight: 0,
      sources: [],
    };
    current.weight += contribution.weight;
    current.sources.push(contribution.source);
    aggregated.set(contribution.signal, current);
  }
  return [...aggregated.values()].sort((left, right) =>
    left.signal.localeCompare(right.signal),
  );
}

const scoringSignals = (signals) =>
  signals.filter((entry) => !warningOnlySignals.includes(entry.signal));
const warningSignals = (signals) =>
  signals.filter((entry) => warningOnlySignals.includes(entry.signal));
const round2 = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

function scoreProducts(signals, products) {
  const scoreInputs = scoringSignals(signals);
  const denominator = scoreInputs.reduce((sum, signal) => sum + signal.weight, 0);
  return products.map((product) => {
    const numerator = scoreInputs.reduce(
      (sum, signal) =>
        sum + signal.weight * (product.signals[signal.signal] ?? 0),
      0,
    );
    const base = round2(numerator / denominator);
    const maximumProtection = product.signals.maximum_protection ?? base;
    const essentialBudget = product.signals.essential_budget ?? base;
    return {
      productId: product.productId,
      best: base,
      premium: round2(0.7 * base + 0.3 * maximumProtection),
      budget: round2(0.65 * base + 0.35 * essentialBudget),
      missing: scoreInputs
        .filter((signal) => product.signals[signal.signal] === undefined)
        .map((signal) => signal.signal)
        .sort(),
    };
  });
}

const byScoreThenId = (scoreKey) => (left, right) => {
  if (right[scoreKey] !== left[scoreKey]) return right[scoreKey] - left[scoreKey];
  return left.productId < right.productId ? -1 : left.productId > right.productId ? 1 : 0;
};

function rankCategories(scoredProducts) {
  const remaining = [...scoredProducts];
  const choose = (scoreKey) => {
    const selected = [...remaining].sort(byScoreThenId(scoreKey))[0];
    remaining.splice(
      remaining.findIndex((candidate) => candidate.productId === selected.productId),
      1,
    );
    return selected;
  };
  return [
    { category: "best_match", productId: choose("best").productId },
    { category: "premium_choice", productId: choose("premium").productId },
    { category: "smart_budget_choice", productId: choose("budget").productId },
  ];
}

const products = [
  {
    productId: "PRODUCT-C",
    signals: {
      private_hospitals: 70,
      major_hospitalization: 74,
      emergency: 72,
      deductible_flexibility: 65,
      balanced_value: 70,
      physiotherapy: 75,
      prevention: 76,
      maximum_protection: 72,
      essential_budget: 90,
    },
  },
  {
    productId: "PRODUCT-A",
    signals: {
      private_hospitals: 95,
      major_hospitalization: 92,
      emergency: 88,
      deductible_flexibility: 78,
      balanced_value: 86,
      physiotherapy: 82,
      prevention: 84,
      maximum_protection: 96,
      essential_budget: 68,
    },
  },
  {
    productId: "PRODUCT-B",
    signals: {
      private_hospitals: 82,
      major_hospitalization: 84,
      emergency: 90,
      deductible_flexibility: 88,
      balanced_value: 89,
      physiotherapy: 85,
      prevention: 80,
      maximum_protection: 83,
      essential_budget: 86,
    },
  },
  {
    productId: "PRODUCT-D",
    signals: { maximum_protection: 100, essential_budget: 100 },
  },
];

const baseSignals = extractSignals(baseCanonicalAnswers(), asOfDate);
assert.deepEqual(
  baseSignals.map(({ signal, weight }) => ({ signal, weight })),
  [
    { signal: "balanced_value", weight: 2.2 },
    { signal: "deductible_flexibility", weight: 0.8 },
    { signal: "emergency", weight: 1.2 },
    { signal: "first_time_guidance", weight: 1 },
    { signal: "major_hospitalization", weight: 1.4 },
    { signal: "physiotherapy", weight: 1.1 },
    { signal: "prevention", weight: 1.1 },
    { signal: "private_hospitals", weight: 1.4 },
  ],
);
assert.deepEqual(warningSignals(baseSignals).map((entry) => entry.signal), [
  "first_time_guidance",
]);

const firstRun = rankCategories(scoreProducts(baseSignals, products));
const repeatedRun = rankCategories(scoreProducts(baseSignals, products));
assert.deepEqual(repeatedRun, firstRun);
assert.deepEqual(firstRun.map((item) => item.category), [
  "best_match",
  "premium_choice",
  "smart_budget_choice",
]);

const shuffledAnswers = baseCanonicalAnswers();
shuffledAnswers.priorities.reverse();
shuffledAnswers.additional_needs.reverse();
const shuffledSignals = extractSignals(shuffledAnswers, asOfDate);
const shuffledProducts = [products[2], products[0], products[3], products[1]];
assert.deepEqual(
  shuffledSignals.map(({ signal, weight }) => ({ signal, weight })),
  baseSignals.map(({ signal, weight }) => ({ signal, weight })),
);
assert.deepEqual(
  rankCategories(scoreProducts(shuffledSignals, shuffledProducts)),
  firstRun,
);

const tiedProducts = ["PRODUCT-C", "PRODUCT-A", "PRODUCT-D", "PRODUCT-B"].map(
  (productId) => ({ productId, signals: { only_signal: 50 } }),
);
const tiedScores = scoreProducts(
  [{ signal: "only_signal", weight: 1, sources: [] }],
  tiedProducts,
);
assert.deepEqual(rankCategories(tiedScores), [
  { category: "best_match", productId: "PRODUCT-A" },
  { category: "premium_choice", productId: "PRODUCT-B" },
  { category: "smart_budget_choice", productId: "PRODUCT-C" },
]);

const missingScore = scoreProducts(
  [
    { signal: "present", weight: 1, sources: [] },
    { signal: "missing", weight: 1, sources: [] },
  ],
  [{ productId: "MISSING", signals: { present: 100 } }],
)[0];
assert.equal(missingScore.best, 50);
assert.deepEqual(missingScore.missing, ["missing"]);

const overlaps = baseCanonicalAnswers();
overlaps.insured_people = "family";
overlaps.birth_dates = [{ birth_date: "2015-01-01" }];
overlaps.priorities = ["pediatric", "prevention_checkup", "international"];
overlaps.additional_needs = [
  "young_children",
  "prevention_checkup",
  "frequent_travel",
];
const overlapSignals = extractSignals(overlaps, asOfDate);
const overlapWeights = Object.fromEntries(
  overlapSignals.map(({ signal, weight }) => [signal, weight]),
);
assert.equal(overlapWeights.pediatric, 4);
assert.equal(overlapWeights.prevention, 2.1);
assert.equal(overlapWeights.international, 2.4);

const sameScoring = (left, right) =>
  assert.deepEqual(
    scoringSignals(extractSignals(left, asOfDate)).map(({ signal, weight }) => ({ signal, weight })),
    scoringSignals(extractSignals(right, asOfDate)).map(({ signal, weight }) => ({ signal, weight })),
  );
const self = baseCanonicalAnswers();
const selfSpouse = baseCanonicalAnswers();
selfSpouse.insured_people = "self_spouse";
selfSpouse.birth_dates.push({ birth_date: "1988-01-01" });
sameScoring(self, selfSpouse);
const olderAdult = baseCanonicalAnswers();
olderAdult.birth_dates = [{ birth_date: "1950-01-01" }];
sameScoring(self, olderAdult);
const individual = baseCanonicalAnswers();
individual.existing_insurance = "individual";
sameScoring(self, individual);
const evaluateExisting = baseCanonicalAnswers();
evaluateExisting.evaluation_goal = "evaluate_existing";
sameScoring(self, evaluateExisting);
assert.deepEqual(
  warningSignals(extractSignals(evaluateExisting, asOfDate)).map((entry) => entry.signal),
  ["existing_policy_comparison"],
);

const mappedWithoutPolicy = mapAssessmentSubmissionToDatabase(
  policyComparisonSubmissionFixture,
);
assert.equal(mappedWithoutPolicy.ok, true);
const withMetadata = structuredClone(policyComparisonSubmissionFixture);
withMetadata.policyFile = {
  name: "uploaded-policy.pdf",
  type: "application/pdf",
  size: 4096,
};
const mappedWithMetadata = mapAssessmentSubmissionToDatabase(withMetadata);
assert.equal(mappedWithMetadata.ok, true);
assert.deepEqual(
  extractSignals(mappedWithoutPolicy.data, asOfDate),
  extractSignals(mappedWithMetadata.data, asOfDate),
);

const profile = generateInsuranceProfile(policyComparisonSubmissionFixture);
const comparison = buildProgramPolicyComparison({
  snapshot: policySnapshotFixture,
  submission: policyComparisonSubmissionFixture,
  profile,
  recommendation: policyComparisonRecommendationFixture,
  programDetail: policyComparisonProgramDetailFixture,
  proposedFacts: policyComparisonFactsFixture,
});
const recommendationWithComparison = {
  ...policyComparisonRecommendationFixture,
  policyComparison: comparison,
};
for (const field of ["programId", "category", "matchScore"]) {
  assert.equal(
    recommendationWithComparison[field],
    policyComparisonRecommendationFixture[field],
  );
}
assert.equal(policyComparisonRecommendationFixture.policyComparison, null);
assert.equal(recommendationWithComparison.policyComparison.programId, "fixture-program");

assert.ok(documentedLegacyFindings.includes("Overlapping signals are summed without a cap."));
assert.ok(
  documentedLegacyFindings.includes(
    "Missing product signals contribute zero while their user weights remain in the denominator.",
  ),
);
console.log("Evaluation v1 characterization assertions passed.");
