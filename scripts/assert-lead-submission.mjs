import assert from "node:assert/strict";

import "./register-typescript-paths.mjs";

const {
  policyComparisonFactsFixture,
  policyComparisonProgramDetailFixture,
  policyComparisonRecommendationFixture,
  policyComparisonSubmissionFixture,
  policySnapshotFixture,
} = await import("../src/lib/policy-analysis/fixtures.ts");
const { buildProgramPolicyComparison } = await import(
  "../src/lib/policy-analysis/comparison.ts"
);
const { generateInsuranceProfile } = await import(
  "../src/lib/assessment/profile.ts"
);
const { createLeadSubmission } = await import(
  "../src/lib/leads/submission.ts"
);
const { validateLeadSubmission } = await import(
  "../src/lib/leads/storage.ts"
);
const { validateLeadSubmissionWithCode } = await import(
  "../src/lib/leads/storage.ts"
);

const now = new Date("2026-07-15T12:00:00.000Z");
const assessmentSubmission = structuredClone(
  policyComparisonSubmissionFixture,
);
const insuranceProfile = generateInsuranceProfile(assessmentSubmission);
const policyAnalysis = {
  version: 1,
  snapshot: structuredClone(policySnapshotFixture),
  filename: "uploaded-policy.pdf",
  fileSize: assessmentSubmission.policyFile.size,
  analyzedAt: "2026-07-15T11:55:00.000Z",
  extractionConfidence: policySnapshotFixture.extractionConfidence,
};
const validFormData = {
  fullName: "Μαρία Δοκιμής",
  email: "policy.lead@example.com",
  phone: "+306900000001",
  preferredContactTime: "morning",
  consents: { advisorContact: true, privacyTerms: true },
};

function recommendationWithComparison(recommendation) {
  return {
    ...recommendation,
    policyComparison: buildProgramPolicyComparison({
      snapshot: policySnapshotFixture,
      submission: assessmentSubmission,
      profile: insuranceProfile,
      recommendation,
      programDetail: {
        ...policyComparisonProgramDetailFixture,
        programId: recommendation.programId,
        name: recommendation.programName,
        insurer: recommendation.insurer,
      },
      proposedFacts: policyComparisonFactsFixture,
    }),
  };
}

function assertPolicyAwareLead(recommendation, submissionId) {
  const result = createLeadSubmission(
    {
      formData: {
        ...validFormData,
        consents: { ...validFormData.consents },
      },
      assessmentSubmission,
      insuranceProfile,
      policyAnalysis,
      recommendation,
    },
    { now, submissionId },
  );

  assert.equal(result.ok, true, "Policy-aware LeadSubmission creation failed.");
  assert.ok(result.ok);
  assert.ok(
    validateLeadSubmission(result.submission, now.getTime()),
    "Policy-aware LeadSubmission validation failed.",
  );
  assert.equal(result.submission.policyFileMetadata?.fileName, "uploaded-policy.pdf");
  assert.equal(result.submission.assessmentSubmission.policyFile?.name, "uploaded-policy.pdf");
  assert.equal(result.submission.comparisonSnapshot?.programId, recommendation.programId);
  assert.equal(result.submission.advisorHandoffSummary.existingPolicyAnalyzed, true);
  assert.ok(result.submission.policySnapshot);
  assert.equal(result.submission.consents.advisorContact, true);
  assert.equal(result.submission.consents.privacyTerms, true);
  assert.equal(
    Date.parse(result.submission.expiresAt) -
      Date.parse(result.submission.createdAt),
    24 * 60 * 60 * 1_000,
  );
  assert.doesNotMatch(
    JSON.stringify(result.submission),
    /data:application\/pdf;base64|%PDF-|base64|anonymized-health-policy\.pdf/iu,
  );
}

const noPdfAssessmentSubmission = structuredClone(assessmentSubmission);
noPdfAssessmentSubmission.policyFile = null;
noPdfAssessmentSubmission.uploadDecision = "skipped";
const noPdfProfile = generateInsuranceProfile(noPdfAssessmentSubmission);
const noPdfRecommendation = {
  ...policyComparisonRecommendationFixture,
  policyComparison: null,
};
const noPdfResult = createLeadSubmission(
  {
    formData: structuredClone(validFormData),
    assessmentSubmission: noPdfAssessmentSubmission,
    insuranceProfile: noPdfProfile,
    recommendation: noPdfRecommendation,
  },
  { now, submissionId: "lead_no_pdf_regression_0000001" },
);
assert.equal(noPdfResult.ok, true, "No-PDF LeadSubmission creation failed.");
assert.ok(noPdfResult.ok);
assert.equal(noPdfResult.submission.policyFileMetadata, null);
assert.equal(noPdfResult.submission.policySnapshot, null);
assert.equal(noPdfResult.submission.comparisonSnapshot, null);
assert.equal(
  validateLeadSubmission(
    JSON.parse(JSON.stringify(noPdfResult.submission)),
    now.getTime(),
  )?.submissionId,
  noPdfResult.submission.submissionId,
  "A serialized confirmation refresh did not preserve the submission.",
);

for (const missingConsent of ["advisorContact", "privacyTerms"]) {
  const rejectedForm = structuredClone(validFormData);
  rejectedForm.consents[missingConsent] = false;
  const rejected = createLeadSubmission(
    {
      formData: rejectedForm,
      assessmentSubmission: noPdfAssessmentSubmission,
      insuranceProfile: noPdfProfile,
      recommendation: noPdfRecommendation,
    },
    { now, submissionId: `lead_rejected_${missingConsent}_0001` },
  );
  assert.equal(rejected.ok, false);
  assert.equal(rejected.code, "invalid_form");
  assert.ok(rejected.errors[missingConsent]);
}

const unknownContactField = structuredClone(noPdfResult.submission);
unknownContactField.contact.contactTime = "morning";
assert.deepEqual(
  validateLeadSubmissionWithCode(unknownContactField, now.getTime()),
  { ok: false, code: "schema_submission" },
  "An unknown contact binding must be rejected by the strict contract.",
);
const tamperedExpiry = structuredClone(noPdfResult.submission);
tamperedExpiry.expiresAt = new Date(
  now.getTime() + 24 * 60 * 60 * 1_000 + 1,
).toISOString();
assert.deepEqual(
  validateLeadSubmissionWithCode(tamperedExpiry, now.getTime()),
  { ok: false, code: "lifetime_invalid" },
  "A tampered 24-hour lifetime must be rejected.",
);

assertPolicyAwareLead(
  recommendationWithComparison(policyComparisonRecommendationFixture),
  "lead_policy_aware_regression_0001",
);

const liveOrigin = process.env.APP_ORIGIN?.trim().replace(/\/$/u, "");
if (liveOrigin) {
  const response = await fetch(liveOrigin + "/api/recommendations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...assessmentSubmission, policySnapshot: policySnapshotFixture }),
  });
  const payload = await response.json();
  assert.equal(response.status, 200, "Live policy-aware recommendations failed.");
  assert.equal(payload.ok, true, "Live recommendation payload is invalid.");
  const recommendation = payload.recommendations.find(
    (candidate) => candidate.programId === "GEN-MP",
  );
  assert.ok(recommendation, "GEN-MP is missing from live recommendations.");
  assertPolicyAwareLead(recommendation, "lead_gen_mp_regression_00000001");
}

console.log(
  "LeadSubmission no-PDF, PDF, consent, refresh and tamper assertions passed.",
);
