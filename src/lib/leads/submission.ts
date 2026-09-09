import { generateInsuranceProfile } from "@/lib/assessment/profile";
import { validatePolicyAnalysisRecord } from "@/lib/policy-analysis/storage";
import { isLiveRecommendation } from "@/lib/recommendations/contracts";

import {
  buildAdvisorHandoffSummary,
  createLeadComparisonSnapshot,
  createLeadRecommendationSnapshot,
  createSafePolicyFileMetadata,
} from "./handoff";
import {
  LEAD_SUBMISSION_LIFETIME_MS,
  type LeadSubmissionValidationFailureCode,
  validateLeadSubmissionWithCode,
} from "./storage";
import {
  LEAD_SUBMISSION_VERSION,
  type CreateLeadSubmissionInput,
  type CreateLeadSubmissionOptions,
  type LeadSubmission,
  type LeadSubmissionCreationResult,
} from "./types";
import { validateLeadFormData } from "./validation";

const sameValue = (left: unknown, right: unknown) =>
  JSON.stringify(left) === JSON.stringify(right);

const createSubmissionId = () => {
  const randomId =
    typeof globalThis.crypto?.randomUUID === "function"
      ? globalThis.crypto.randomUUID()
      : `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 14)}`;

  return `lead_${randomId}`;
};

const invalidContext = (message: string): LeadSubmissionCreationResult => ({
  ok: false,
  code: "invalid_context",
  message,
});

type LeadSubmissionCreationFailureCode =
  | "form_invalid"
  | "timestamp_invalid"
  | "assessment_incomplete"
  | "insurance_profile_mismatch"
  | "recommendation_invalid"
  | "comparison_program_mismatch"
  | "policy_analysis_invalid"
  | "policy_metadata_mismatch"
  | "candidate_exception"
  | LeadSubmissionValidationFailureCode;

function developmentFailureLog(code: LeadSubmissionCreationFailureCode) {
  if (process.env.NODE_ENV === "development") {
    console.info("[lead-submission]", JSON.stringify({ ok: false, code }));
  }
}

const invalidContextAt = (
  code: LeadSubmissionCreationFailureCode,
  message: string,
) => {
  developmentFailureLog(code);
  return invalidContext(message);
};

export function createLeadSubmission(
  input: CreateLeadSubmissionInput,
  options: CreateLeadSubmissionOptions = {},
): LeadSubmissionCreationResult {
  const formValidation = validateLeadFormData(input.formData);
  if (!formValidation.ok) {
    developmentFailureLog("form_invalid");
    return {
      ok: false,
      code: "invalid_form",
      errors: formValidation.errors,
    };
  }

  const now = options.now ?? new Date();
  if (!Number.isFinite(now.getTime())) {
    return invalidContextAt(
      "timestamp_invalid",
      "Δεν ήταν δυνατή η δημιουργία της υποβολής.",
    );
  }

  if (!input.assessmentSubmission.submittedAt) {
    return invalidContextAt(
      "assessment_incomplete",
      "Η αξιολόγηση δεν έχει ολοκληρωθεί.",
    );
  }

  const expectedProfile = generateInsuranceProfile(input.assessmentSubmission);
  if (!sameValue(input.insuranceProfile, expectedProfile)) {
    return invalidContextAt(
      "insurance_profile_mismatch",
      "Το ασφαλιστικό προφίλ δεν αντιστοιχεί στην αξιολόγηση.",
    );
  }

  if (!isLiveRecommendation(input.recommendation)) {
    return invalidContextAt(
      "recommendation_invalid",
      "Η επιλεγμένη πρόταση δεν είναι έγκυρη.",
    );
  }

  if (
    input.recommendation.policyComparison &&
    input.recommendation.policyComparison.programId !==
      input.recommendation.programId
  ) {
    return invalidContextAt(
      "comparison_program_mismatch",
      "Η σύγκριση δεν αντιστοιχεί στο επιλεγμένο πρόγραμμα.",
    );
  }

  const policyAnalysis = input.policyAnalysis
    ? validatePolicyAnalysisRecord(input.policyAnalysis)
    : null;
  if (input.policyAnalysis && !policyAnalysis) {
    return invalidContextAt(
      "policy_analysis_invalid",
      "Η ανάλυση του υπάρχοντος συμβολαίου δεν είναι έγκυρη.",
    );
  }

  const assessmentPolicyFile = input.assessmentSubmission.policyFile;
  if (
    policyAnalysis &&
    (!assessmentPolicyFile ||
      assessmentPolicyFile.name !== policyAnalysis.filename ||
      assessmentPolicyFile.size !== policyAnalysis.fileSize ||
      assessmentPolicyFile.type !== "application/pdf")
  ) {
    return invalidContextAt(
      "policy_metadata_mismatch",
      "Η ανάλυση συμβολαίου δεν αντιστοιχεί στην τρέχουσα αξιολόγηση.",
    );
  }

  try {
    const createdAt = now.toISOString();
    const recommendationSnapshot = createLeadRecommendationSnapshot(
      input.assessmentSubmission,
      input.recommendation,
    );
    const comparisonSnapshot = createLeadComparisonSnapshot(
      input.recommendation.policyComparison,
    );
    const advisorHandoffSummary = buildAdvisorHandoffSummary({
      assessmentSubmission: input.assessmentSubmission,
      insuranceProfile: input.insuranceProfile,
      policyAnalysis,
      recommendation: input.recommendation,
    });
    const candidate: LeadSubmission = {
      version: LEAD_SUBMISSION_VERSION,
      submissionId: options.submissionId?.trim() ?? createSubmissionId(),
      createdAt,
      expiresAt: new Date(
        now.getTime() + LEAD_SUBMISSION_LIFETIME_MS,
      ).toISOString(),
      status: "submitted",
      assessmentSubmittedAt: input.assessmentSubmission.submittedAt,
      contact: {
        fullName: formValidation.data.fullName,
        email: formValidation.data.email,
        phone: formValidation.data.phone,
        preferredContactTime: formValidation.data.preferredContactTime,
      },
      consents: { ...formValidation.data.consents },
      programId: recommendationSnapshot.programId,
      insurer: recommendationSnapshot.insurer,
      productName: recommendationSnapshot.programName,
      recommendationCategory: recommendationSnapshot.category,
      assessmentSubmission: input.assessmentSubmission,
      insuranceProfile: input.insuranceProfile,
      policyFileMetadata: createSafePolicyFileMetadata(policyAnalysis),
      policySnapshot: policyAnalysis?.snapshot ?? null,
      recommendationSnapshot,
      comparisonSnapshot,
      advisorHandoffSummary,
    };
    const validation = validateLeadSubmissionWithCode(candidate, now.getTime());

    if (!validation.ok) {
      return invalidContextAt(
        validation.code,
        "Δεν ήταν δυνατή η ασφαλής δημιουργία της υποβολής.",
      );
    }

    return { ok: true, submission: validation.submission };
  } catch {
    return invalidContextAt(
      "candidate_exception",
      "Δεν ήταν δυνατή η ασφαλής δημιουργία της υποβολής.",
    );
  }
}
