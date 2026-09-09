import assert from "node:assert/strict";

import { mapAssessmentSubmissionToDatabase } from "../src/lib/recommendations/assessment-mapping.ts";

const canonicalAdditionalNeeds = [
  "outpatient_visits",
  "frequent_travel",
  "immediate_use",
  "maternity",
  "young_children",
  "physiotherapy",
  "prevention_checkup",
  "provider_freedom",
  "low_bureaucracy",
];

const priorityMappings = {
  "hospital-network": "private_hospitals",
  surgery: "major_hospitalization",
  emergency: "emergency",
  "serious-illness": "major_hospitalization",
  "high-limit": "major_hospitalization",
  "low-deductible": "low_or_zero_deductible",
};

const additionalNeedMappings = {
  outpatient_visits: "outpatient_visits",
  frequent_travel: "frequent_travel",
  immediate_use: "immediate_use",
  maternity: "maternity",
  young_children: "young_children",
  physiotherapy: "physiotherapy",
  prevention_checkup: "prevention_checkup",
  provider_freedom: "provider_freedom",
  low_bureaucracy: "low_bureaucracy",
};

const canonicalEvaluationGoals = [
  "first_time",
  "independent_from_employer",
  "evaluate_existing",
  "improve_value",
];

const evaluationGoalLabels = [
  "Αναζητώ ιδιωτική ασφάλιση για πρώτη φορά",
  "Θέλω προσωπική κάλυψη ανεξάρτητη από τον εργοδότη μου",
  "Θέλω να αξιολογήσω ή να συγκρίνω ένα υπάρχον πρόγραμμα ή μία ασφαλιστική προσφορά",
  "Θέλω καλύτερη σχέση καλύψεων και κόστους",
];

const createSubmission = (
  additionalNeeds,
  evaluationGoal = "first_time",
) => ({
  version: 4,
  answers: {
    insuredPeople: "self",
    currentInsurance: "none",
    evaluationGoal,
    priorities: ["emergency"],
    deductible: "small",
    costApproach: "balanced",
    additionalNeeds,
  },
  people: [
    {
      id: "self",
      role: "self",
      label: "fixture",
      birthDate: "1990-01-01",
    },
  ],
  policyFile: null,
  uploadDecision: null,
  submittedAt: "2026-07-14T00:00:00.000Z",
});

const mapAdditionalNeeds = (values) => {
  const result = mapAssessmentSubmissionToDatabase(createSubmission(values));
  assert.equal(result.ok, true, `Expected mapping success for ${values}`);
  return result.data.additional_needs;
};

for (const value of canonicalEvaluationGoals) {
  const result = mapAssessmentSubmissionToDatabase(
    createSubmission([], value),
  );
  assert.equal(result.ok, true, `Expected evaluation goal success for ${value}`);
  assert.equal(result.data.evaluation_goal, value);
  assert.equal(Object.hasOwn(result.data, "evaluation_goal"), true);
  assert.equal(Object.hasOwn(result.data, "evaluationGoal"), false);
}

for (const value of [
  "first-policy",
  "employer-independent",
  "group-gaps",
  "review-existing",
  "compare-existing",
  "serious-hospitalization",
  "future-cover",
  "unknown_evaluation_goal",
  ...evaluationGoalLabels,
]) {
  const result = mapAssessmentSubmissionToDatabase(
    createSubmission([], value),
  );
  assert.equal(result.ok, false, `Expected evaluation goal failure for ${value}`);
  assert.ok(
    result.errors.some(
      (error) =>
        error.field === "evaluationGoal" && error.code === "invalid_value",
    ),
    `Expected typed evaluationGoal invalid_value error for ${value}`,
  );
}

for (const value of canonicalAdditionalNeeds) {
  assert.deepEqual(mapAdditionalNeeds([value]), [additionalNeedMappings[value]]);
}

assert.deepEqual(
  mapAdditionalNeeds([
    "outpatient_visits",
    "prevention_checkup",
    "low_bureaucracy",
    "maternity",
    "frequent_travel",
    "provider_freedom",
  ]),
  [
    "outpatient_visits",
    "frequent_travel",
    "maternity",
    "prevention_checkup",
    "provider_freedom",
    "low_bureaucracy",
  ],
);

assert.deepEqual(
  mapAdditionalNeeds(["outpatient_visits", "prevention_checkup"]),
  ["outpatient_visits", "prevention_checkup"],
);

assert.deepEqual(mapAdditionalNeeds([]), []);

for (const value of [
  "emergency",
  "abroad",
  "waiting-periods",
  "broad-network",
  "direct-cover",
  "unknown_additional_need",
]) {
  const result = mapAssessmentSubmissionToDatabase(createSubmission([value]));
  assert.equal(result.ok, false, `Expected mapping failure for ${value}`);
  assert.ok(
    result.errors.some(
      (error) =>
        error.field === "additionalNeeds" && error.code === "invalid_value",
    ),
    `Expected typed additionalNeeds invalid_value error for ${value}`,
  );
}

const emergencyPriority = mapAssessmentSubmissionToDatabase(
  createSubmission([]),
);
assert.equal(emergencyPriority.ok, true);
assert.deepEqual(emergencyPriority.data.priorities, ["emergency"]);

for (const [frontendValue, canonicalValue] of Object.entries(priorityMappings)) {
  const result = mapAssessmentSubmissionToDatabase({
    ...createSubmission([]),
    answers: {
      ...createSubmission([]).answers,
      priorities: [frontendValue],
    },
  });
  assert.equal(result.ok, true, `Expected priority mapping success for ${frontendValue}`);
  assert.deepEqual(result.data.priorities, [canonicalValue]);
}

const overlappingPriorityMappings = mapAssessmentSubmissionToDatabase({
  ...createSubmission([]),
  answers: {
    ...createSubmission([]).answers,
    priorities: ["surgery", "serious-illness", "high-limit"],
  },
});
assert.equal(overlappingPriorityMappings.ok, true);
assert.deepEqual(overlappingPriorityMappings.data.priorities, [
  "major_hospitalization",
]);

console.log("Assessment mapping assertions passed.");
