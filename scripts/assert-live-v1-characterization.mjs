import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { createClient } from "@supabase/supabase-js";

import {
  policyComparisonSubmissionFixture,
  policySnapshotFixture,
} from "../src/lib/policy-analysis/fixtures.ts";
import {
  activeRecommendationBaseline,
  questionnaireV1,
  versionBaseline,
} from "./fixtures/milestone-3b-v1-baseline.mjs";

const parseEnv = (source) =>
  Object.fromEntries(
    source
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const separator = line.indexOf("=");
        const key = line.slice(0, separator).trim();
        const value = line
          .slice(separator + 1)
          .trim()
          .replace(/^['"]|['"]$/gu, "");
        return [key, value];
      }),
  );

const env = parseEnv(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8"),
);
assert.ok(env.NEXT_PUBLIC_SUPABASE_URL);
assert.ok(env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
    db: { schema: "app_api" },
  },
);

const contractResult = await supabase.rpc("assessment_contract");
assert.equal(contractResult.error, null);
const contract = contractResult.data;
assert.equal(contract.schema_version, versionBaseline.questionnaireContractVersion);
assert.equal(contract.questions.length, 9);
assert.deepEqual(
  contract.questions.map((question) => question.question_id),
  questionnaireV1.activeQuestionIds,
);
for (const definition of Object.values(questionnaireV1.frontend)) {
  const question = contract.questions.find(
    (candidate) => candidate.question_id === definition.questionId,
  );
  assert.ok(question, definition.questionId);
  assert.equal(question.required, definition.required);
  if (definition.values) {
    assert.deepEqual(
      question.options.map((option) => option.value),
      Object.values(definition.values),
    );
  }
}
const birthQuestion = contract.questions.find(
  (question) => question.question_id === "Q_BIRTH_DATES",
);
assert.equal(
  birthQuestion.validation_rule.maximum_members,
  questionnaireV1.memberLimits.databaseContract,
);
const uploadQuestion = contract.questions.find(
  (question) => question.question_id === "Q_EXISTING_POLICY_UPLOAD",
);
assert.equal(uploadQuestion.required, false);
assert.deepEqual(uploadQuestion.conditional_visibility, {
  question_id: "Q_EXISTING_INSURANCE",
  operator: "not_equals",
  value: "none",
});

const canonicalAssessment = () => ({
  insured_people: "self",
  birth_dates: [{ birth_date: "1990-01-01" }],
  existing_insurance: "none",
  evaluation_goal: "first_time",
  priorities: ["emergency"],
  deductible_preference: "balanced",
  protection_cost: "balanced",
  additional_needs: [],
  existing_policy_upload: {},
});
const validateCanonicalAssessment = async (answers) => {
  const result = await supabase.rpc("validate_assessment", {
    p_answers: answers,
  });
  assert.equal(result.error, null);
  return result.data;
};
assert.equal((await validateCanonicalAssessment(canonicalAssessment())).valid, true);
for (const priorities of [
  [],
  ["emergency", "international", "pediatric", "private_hospitals"],
]) {
  const answers = canonicalAssessment();
  answers.priorities = priorities;
  const validation = await validateCanonicalAssessment(answers);
  assert.equal(validation.valid, false);
  assert.ok(validation.errors.some((error) => error.code === "selection_count"));
}
const duplicatePriorities = canonicalAssessment();
duplicatePriorities.priorities = ["emergency", "emergency"];
const duplicateValidation = await validateCanonicalAssessment(
  duplicatePriorities,
);
assert.equal(duplicateValidation.valid, false);
assert.ok(
  duplicateValidation.errors.some((error) => error.code === "duplicate_value"),
);
const invalidBirthDate = canonicalAssessment();
invalidBirthDate.birth_dates = [{ birth_date: "2999-01-01" }];
const birthDateValidation = await validateCanonicalAssessment(invalidBirthDate);
assert.equal(birthDateValidation.valid, false);
assert.ok(
  birthDateValidation.errors.some((error) => error.code === "invalid_date"),
);

const baseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";
const getJson = async (path) => {
  const response = await fetch(`${baseUrl}${path}`);
  assert.equal(response.ok, true, `${path}: ${response.status}`);
  return response.json();
};
const postRecommendations = async (submission, policySnapshot) => {
  const response = await fetch(`${baseUrl}/api/recommendations`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(
      policySnapshot === undefined
        ? submission
        : { ...submission, policySnapshot },
    ),
  });
  assert.equal(response.ok, true, `recommendations: ${response.status}`);
  const payload = await response.json();
  assert.equal(payload.ok, true);
  return payload.recommendations;
};

const databaseHealth = await getJson("/api/database-health");
assert.deepEqual(databaseHealth, {
  ok: true,
  contractVersion: versionBaseline.questionnaireContractVersion,
  questionCount: 9,
});
const recommendationHealth = await getJson("/api/recommendation-health");
assert.equal(recommendationHealth.ok, true);
assert.equal(recommendationHealth.source, "supabase");
assert.equal(recommendationHealth.recommendationCount, 3);
assert.deepEqual(recommendationHealth.productIds, ["GEN-MP", "GRO-SPR", "GEN-MF"]);

const createSubmission = ({
  insuredPeople = "self",
  birthDates = ["1990-01-01"],
  currentInsurance = "none",
  evaluationGoal = "first_time",
} = {}) => ({
  version: 4,
  answers: {
    insuredPeople,
    currentInsurance,
    evaluationGoal,
    priorities: ["hospital-network", "high-limit", "emergency"],
    deductible: "small",
    costApproach: "balanced",
    additionalNeeds: ["physiotherapy", "prevention_checkup"],
  },
  people: birthDates.map((birthDate, index) => ({
    id: index === 0 ? "self" : `member-${index}`,
    role: index === 0 ? "self" : "partner",
    label: `Fixture member ${index + 1}`,
    birthDate,
  })),
  policyFile: null,
  uploadDecision: null,
  submittedAt: "2026-07-16T00:00:00.000Z",
});

const summarize = (recommendations) =>
  recommendations.map(({ category, programId, matchScore }) => ({
    category,
    programId,
    matchScore,
  }));
const baseSubmission = createSubmission();
const baseRecommendations = await postRecommendations(baseSubmission);
assert.deepEqual(summarize(baseRecommendations), activeRecommendationBaseline.outcomes);
assert.ok(baseRecommendations.every((item) => item.policyComparison === null));
assert.deepEqual(
  summarize(await postRecommendations(baseSubmission)),
  activeRecommendationBaseline.outcomes,
);

const equivalentCases = [
  createSubmission({
    insuredPeople: "self-partner",
    birthDates: ["1990-01-01", "1988-01-01"],
  }),
  createSubmission({ birthDates: ["1950-01-01"] }),
  createSubmission({ currentInsurance: "individual" }),
];
for (const submission of equivalentCases) {
  assert.deepEqual(
    summarize(await postRecommendations(submission)),
    activeRecommendationBaseline.outcomes,
  );
}

const evaluateExisting = await postRecommendations(
  createSubmission({ evaluationGoal: "evaluate_existing" }),
);
assert.deepEqual(summarize(evaluateExisting), activeRecommendationBaseline.outcomes);
assert.ok(
  evaluateExisting.every((item) =>
    item.warnings.some((warning) => warning.code === "existing_policy_check"),
  ),
);

const shuffled = structuredClone(baseSubmission);
shuffled.answers.priorities.reverse();
shuffled.answers.additionalNeeds.reverse();
assert.deepEqual(
  summarize(await postRecommendations(shuffled)),
  activeRecommendationBaseline.outcomes,
);

const withoutSnapshot = await postRecommendations(
  policyComparisonSubmissionFixture,
);
const withSnapshot = await postRecommendations(
  policyComparisonSubmissionFixture,
  policySnapshotFixture,
);
assert.deepEqual(summarize(withSnapshot), summarize(withoutSnapshot));
assert.ok(withoutSnapshot.every((item) => item.policyComparison === null));
assert.ok(
  withSnapshot.every(
    (item) => item.policyComparison?.programId === item.programId,
  ),
);

console.log(
  "Live v1 read-only characterization assertions passed (no provider call, no database write).",
);
