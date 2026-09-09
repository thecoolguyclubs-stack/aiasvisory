import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  assessmentConfig,
  goalRequiresUpload,
  insuranceRequiresUpload,
} from "../src/lib/assessment/config.ts";
import {
  assessmentReducer,
  initialAssessmentState,
} from "../src/lib/assessment/state.ts";
import {
  ASSESSMENT_SESSION_KEY,
  createAssessmentSessionSnapshot,
  isCompleteAssessmentSubmission,
  readAssessmentSession,
} from "../src/lib/assessment/storage.ts";
import { ASSESSMENT_SESSION_VERSION } from "../src/lib/assessment/types.ts";
import { mapAssessmentSubmissionToDatabase } from "../src/lib/recommendations/assessment-mapping.ts";
import { validateAssessmentSubmission } from "../src/lib/recommendations/request-validation.ts";
import {
  documentedLegacyFindings,
  questionnaireV1,
  versionBaseline,
} from "./fixtures/milestone-3b-v1-baseline.mjs";

const migrationSql = readFileSync(
  new URL("../supabase/migrations/202607140001_insurance_ai_database_supabase_aligned.sql", import.meta.url),
  "utf8",
);

const clone = (value) => structuredClone(value);
const createSubmission = () => ({
  version: 4,
  answers: {
    insuredPeople: "self",
    currentInsurance: "none",
    evaluationGoal: "first_time",
    priorities: ["emergency"],
    deductible: "small",
    costApproach: "balanced",
    additionalNeeds: [],
  },
  people: [
    { id: "self", role: "self", label: "Fixture member", birthDate: "1990-01-01" },
  ],
  policyFile: null,
  uploadDecision: null,
  submittedAt: "2026-07-16T00:00:00.000Z",
});

const map = (submission) => mapAssessmentSubmissionToDatabase(submission);
const expectMappingError = (submission, field) => {
  const result = map(submission);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.field === field));
};

assert.equal(
  versionBaseline.questionnaireContractVersion,
  "im-health-assessment-2026-07-v1",
);
assert.equal(ASSESSMENT_SESSION_VERSION, versionBaseline.assessmentSubmissionVersion);
assert.match(
  migrationSql,
  /'schema_version', 'im-health-assessment-2026-07-v1'/u,
);

assert.equal(questionnaireV1.activeQuestionIds.length, 9);
for (const questionId of questionnaireV1.activeQuestionIds) {
  assert.match(migrationSql, new RegExp(`'${questionId}'`, "u"));
}

const frontendSteps = Object.keys(assessmentConfig);
assert.deepEqual(frontendSteps, [
  "insuredPeople",
  "birthDates",
  "currentInsurance",
  "evaluationGoal",
  "priorities",
  "deductible",
  "costApproach",
  "additionalNeeds",
]);
assert.equal(frontendSteps.length + 1, questionnaireV1.activeQuestionIds.length);

for (const [frontendKey, contract] of Object.entries(questionnaireV1.frontend)) {
  if (!contract.values) continue;
  const config = assessmentConfig[frontendKey];
  assert.ok(config && "options" in config, `${frontendKey} must expose options`);
  assert.deepEqual(
    config.options.map((option) => option.id),
    Object.keys(contract.values),
  );
}

const singleFieldTargets = {
  insuredPeople: "insured_people",
  currentInsurance: "existing_insurance",
  evaluationGoal: "evaluation_goal",
  deductible: "deductible_preference",
  costApproach: "protection_cost",
};
for (const [field, target] of Object.entries(singleFieldTargets)) {
  for (const [frontendValue, canonicalValue] of Object.entries(
    questionnaireV1.frontend[field].values,
  )) {
    const submission = createSubmission();
    submission.answers[field] = frontendValue;
    const result = map(submission);
    assert.equal(result.ok, true, `${field}:${frontendValue}`);
    assert.equal(result.data[target], canonicalValue);
  }
}

for (const [frontendValue, canonicalValue] of Object.entries(
  questionnaireV1.frontend.priorities.values,
)) {
  const submission = createSubmission();
  submission.answers.priorities = [frontendValue];
  const result = map(submission);
  assert.equal(result.ok, true, `priorities:${frontendValue}`);
  assert.deepEqual(result.data.priorities, [canonicalValue]);
}

for (const [frontendValue, canonicalValue] of Object.entries(
  questionnaireV1.frontend.additionalNeeds.values,
)) {
  const submission = createSubmission();
  submission.answers.additionalNeeds = [frontendValue];
  const result = map(submission);
  assert.equal(result.ok, true, `additionalNeeds:${frontendValue}`);
  assert.deepEqual(result.data.additional_needs, [canonicalValue]);
}

for (const requiredField of [
  "insuredPeople",
  "currentInsurance",
  "evaluationGoal",
  "deductible",
  "costApproach",
]) {
  const submission = createSubmission();
  submission.answers[requiredField] = null;
  expectMappingError(submission, requiredField);
}
const noPriorities = createSubmission();
noPriorities.answers.priorities = [];
expectMappingError(noPriorities, "priorities");
const noMembers = createSubmission();
noMembers.people = [];
expectMappingError(noMembers, "birthDates");

const optionalAnswers = createSubmission();
optionalAnswers.answers.additionalNeeds = [];
optionalAnswers.policyFile = null;
optionalAnswers.uploadDecision = "skipped";
const optionalResult = map(optionalAnswers);
assert.equal(optionalResult.ok, true);
assert.deepEqual(optionalResult.data.additional_needs, []);
assert.deepEqual(optionalResult.data.existing_policy_upload, {});
assert.equal(isCompleteAssessmentSubmission(optionalAnswers), true);

assert.equal(assessmentConfig.priorities.maxSelections, 3);
const tooManyPriorities = createSubmission();
tooManyPriorities.answers.priorities = [
  "hospital-network",
  "low-deductible",
  "outpatient",
  "emergency",
];
expectMappingError(tooManyPriorities, "priorities");

const validDates = ["1900-01-01", "2000-02-29"];
for (const birthDate of validDates) {
  const submission = createSubmission();
  submission.people[0].birthDate = birthDate;
  assert.equal(map(submission).ok, true, birthDate);
}
for (const birthDate of ["1899-12-31", "2001-02-29", "01-01-2000", "2999-01-01", ""] ) {
  const submission = createSubmission();
  submission.people[0].birthDate = birthDate;
  expectMappingError(submission, "birthDates");
}

let state = assessmentReducer(initialAssessmentState, {
  type: "set-composition",
  value: "self",
});
for (let index = 0; index < 10; index += 1) {
  state = assessmentReducer(state, { type: "add-person" });
}
assert.equal(state.people.length, questionnaireV1.memberLimits.uiAndSession);
assert.match(
  migrationSql,
  new RegExp(`"maximum_members":${questionnaireV1.memberLimits.databaseContract}`, "u"),
);

const baseSnapshot = createAssessmentSessionSnapshot(
  {
    ...state,
    answers: createSubmission().answers,
    people: createSubmission().people,
    view: "additionalNeeds",
    history: [],
    policyFile: null,
    uploadDecision: null,
    uploadNext: null,
    nextPersonId: 2,
    uploadPromptHandled: false,
  },
  "2026-07-16T00:00:00.000Z",
);

const sessionStorage = new Map();
globalThis.window = {
  sessionStorage: {
    getItem: (key) => sessionStorage.get(key) ?? null,
    removeItem: (key) => sessionStorage.delete(key),
    setItem: (key, value) => sessionStorage.set(key, value),
  },
};
const readSnapshot = (snapshot) => {
  sessionStorage.set(ASSESSMENT_SESSION_KEY, JSON.stringify(snapshot));
  return readAssessmentSession();
};

assert.ok(readSnapshot(baseSnapshot));
const duplicateSession = clone(baseSnapshot);
duplicateSession.submission.answers.priorities = ["emergency", "emergency"];
assert.equal(readSnapshot(duplicateSession), null);
const nineMemberSession = clone(baseSnapshot);
nineMemberSession.submission.people = Array.from({ length: 9 }, (_, index) => ({
  id: `member-${index}`,
  role: "other",
  label: `Member ${index}`,
  birthDate: "1990-01-01",
}));
assert.equal(readSnapshot(nineMemberSession), null);
const wrongVersionSession = clone(baseSnapshot);
wrongVersionSession.version = 3;
assert.equal(readSnapshot(wrongVersionSession), null);
delete globalThis.window;

const duplicateRouteSubmission = createSubmission();
duplicateRouteSubmission.answers.priorities = ["emergency", "emergency"];
assert.equal(validateAssessmentSubmission(duplicateRouteSubmission).ok, true);
const duplicateMapping = map(duplicateRouteSubmission);
assert.equal(duplicateMapping.ok, true);
assert.deepEqual(duplicateMapping.data.priorities, ["emergency"]);

assert.equal(insuranceRequiresUpload("none"), false);
assert.equal(insuranceRequiresUpload("individual"), true);
assert.equal(goalRequiresUpload("first_time"), false);
assert.equal(goalRequiresUpload("evaluate_existing"), true);
const uploaded = createSubmission();
uploaded.policyFile = {
  name: "uploaded-policy.pdf",
  type: "application/pdf",
  size: 2048,
};
uploaded.uploadDecision = "uploaded";
const uploadedResult = map(uploaded);
assert.equal(uploadedResult.ok, true);
assert.deepEqual(uploadedResult.data.existing_policy_upload, {
  filename: "uploaded-policy.pdf",
  mime_type: "application/pdf",
  size_bytes: 2048,
});

for (const [field, legacyValues] of Object.entries({
  insuredPeople: ["self_spouse", "couple", "unknown"],
  currentInsurance: ["employer_group", "group-gaps", "unknown"],
  evaluationGoal: ["first-policy", "review-existing", "unknown"],
  deductible: ["balanced_deductible", "unknown"],
  costApproach: ["maximum_protection", "unknown"],
})) {
  for (const value of legacyValues) {
    const submission = createSubmission();
    submission.answers[field] = value;
    expectMappingError(submission, field);
  }
}
for (const field of ["priorities", "additionalNeeds"]) {
  const submission = createSubmission();
  submission.answers[field] = ["unknown_legacy_value"];
  expectMappingError(submission, field);
}

assert.ok(documentedLegacyFindings.length >= 10);
console.log("Questionnaire v1 characterization assertions passed.");
