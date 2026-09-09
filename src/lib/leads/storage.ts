import { z } from "zod";

import { generateInsuranceProfile } from "@/lib/assessment/profile";
import { ASSESSMENT_SESSION_VERSION } from "@/lib/assessment/types";
import {
  MAX_POLICY_PDF_SIZE,
  POLICY_PDF_CANONICAL_FILENAME,
} from "@/lib/policy-analysis/file-validation";
import {
  ExistingPolicySnapshotSchema,
  validateExistingPolicySnapshot,
} from "@/lib/policy-analysis/schema";

import {
  LEAD_SUBMISSION_VERSION,
  type AdvisorComparisonPoint,
  type AdvisorStrength,
  type LeadSubmission,
} from "./types";
import { createExistingPolicyHandoffSummary } from "./handoff";
import {
  LEAD_SUBMISSION_SESSION_KEY,
  removeStoredLeadSubmission,
} from "./session";

export {
  clearLeadSubmission,
  LEAD_SUBMISSION_SESSION_KEY,
} from "./session";
export const LEAD_SUBMISSION_LIFETIME_MS = 24 * 60 * 60 * 1_000;

const CLOCK_SKEW_MS = 5 * 60 * 1_000;
const PROGRAM_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/u;
const SUBMISSION_ID_PATTERN = /^lead_[A-Za-z0-9_-]{8,100}$/u;

const boundedText = (maximum = 1_500) =>
  z.string().trim().min(1).max(maximum);
const optionalBoundedText = (maximum = 1_500) =>
  z.string().trim().min(1).max(maximum).nullable();
const isoTimestamp = z
  .string()
  .trim()
  .min(20)
  .max(40)
  .refine((value) => Number.isFinite(Date.parse(value)));
const uniqueStringArray = (maximumItems = 100, maximumLength = 1_500) =>
  z
    .array(boundedText(maximumLength))
    .max(maximumItems)
    .refine((values) => new Set(values).size === values.length);

const consentSchema = z
  .object({
    advisorContact: z.literal(true),
    privacyTerms: z.literal(true),
    marketing: z.boolean().optional(),
  })
  .strict();

const contactSchema = z
  .object({
    fullName: boundedText(100).refine(
      (value) =>
        value === value.replace(/\s+/gu, " ") &&
        value.split(" ").filter(Boolean).length >= 2 &&
        /^[\p{L}\p{M}.'’ -]+$/u.test(value),
    ),
    email: boundedText(254).refine(
      (value) =>
        value === value.toLocaleLowerCase("el-GR") &&
        /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/u.test(value),
    ),
    phone: z.string().regex(/^\+?\d{7,15}$/u),
    preferredContactTime: z.enum([
      "morning",
      "midday",
      "afternoon",
      "anytime",
    ]),
  })
  .strict();

const answerSchema = z
  .object({
    insuredPeople: z.enum(["self", "self-partner", "family", "children"]),
    currentInsurance: z.enum([
      "none",
      "individual",
      "group",
      "individual-group",
    ]),
    evaluationGoal: z.enum([
      "first_time",
      "independent_from_employer",
      "evaluate_existing",
      "improve_value",
    ]),
    priorities: z
      .array(
        z.enum([
          "hospital-network",
          "surgery",
          "low-deductible",
          "outpatient",
          "high-limit",
          "emergency",
          "serious-illness",
          "checkup",
          "abroad",
          "pediatric",
        ]),
      )
      .min(1)
      .max(3)
      .refine((values) => new Set(values).size === values.length),
    deductible: z.enum(["minimum", "small", "large", "up-to-1500", "1500-to-5000", "over-5000"]),
    careAccess: z.enum(["network", "freedom", "unsure"]).nullable().optional(),
    costApproach: z.enum(["complete", "balanced", "basic"]),
    additionalNeeds: z
      .array(
        z.enum([
          "outpatient_visits",
          "frequent_travel",
          "immediate_use",
          "maternity",
          "young_children",
          "physiotherapy",
          "prevention_checkup",
          "provider_freedom",
          "low_bureaucracy",
        ]),
      )
      .max(8)
      .refine((values) => new Set(values).size === values.length),
  })
  .strict();

const birthDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/u)
  .refine((value) => {
    const timestamp = Date.parse(`${value}T00:00:00.000Z`);
    return (
      Number.isFinite(timestamp) &&
      new Date(timestamp).toISOString().slice(0, 10) === value &&
      value >= "1900-01-01" &&
      timestamp <= Date.now()
    );
  });

const assessmentSubmissionSchema = z
  .object({
    version: z.literal(ASSESSMENT_SESSION_VERSION),
    answers: answerSchema,
    people: z
      .array(
        z
          .object({
            id: boundedText(80),
            role: z.enum(["self", "partner", "child", "other"]),
            label: boundedText(160),
            birthDate: birthDateSchema,
          })
          .strict(),
      )
      .min(1)
      .max(8)
      .refine(
        (people) => new Set(people.map((person) => person.id)).size === people.length,
      ),
    policyFile: z
      .object({
        name: z.literal(POLICY_PDF_CANONICAL_FILENAME),
        size: z.number().int().positive().max(MAX_POLICY_PDF_SIZE),
        type: z.literal("application/pdf"),
      })
      .strict()
      .nullable(),
    uploadDecision: z.enum(["uploaded", "later", "skipped"]).nullable(),
    submittedAt: isoTimestamp,
  })
  .strict();

const profileSummarySchema = z
  .object({
    title: boundedText(300),
    detail: boundedText(1_000),
  })
  .strict();

const insuranceProfileSchema = z
  .object({
    insuredPeople: profileSummarySchema
      .extend({ count: z.number().int().min(1).max(8) })
      .strict(),
    ageProfile: profileSummarySchema
      .extend({ ages: z.array(z.number().int().min(0).max(130)).min(1).max(8) })
      .strict(),
    currentInsurance: profileSummarySchema,
    mainGoal: profileSummarySchema,
    priorities: uniqueStringArray(3, 300),
    deductiblePreference: boundedText(300),
    costAndProtectionApproach: boundedText(300),
    additionalNeeds: uniqueStringArray(8, 300),
    hasUploadedPolicy: z.boolean(),
    generatedAt: isoTimestamp,
  })
  .strict();

const safePolicyFileMetadataSchema = z
  .object({
    fileName: z.literal(POLICY_PDF_CANONICAL_FILENAME),
    fileSize: z.number().int().positive().max(MAX_POLICY_PDF_SIZE),
    mimeType: z.literal("application/pdf"),
    analyzedAt: isoTimestamp,
    extractionConfidence: z.enum(["high", "medium", "low"]),
  })
  .strict();

const strengthSchema: z.ZodType<AdvisorStrength> = z
  .object({
    topicKey: boundedText(200),
    title: boundedText(500),
    summary: boundedText(1_500),
  })
  .strict();

const comparisonPointSchema: z.ZodType<AdvisorComparisonPoint> = z
  .object({
    topicKey: boundedText(200),
    title: boundedText(1_000),
    status: z.enum([
      "improvement",
      "similar",
      "tradeoff",
      "current_policy_advantage",
      "unknown",
      "needs_confirmation",
    ]),
    existingPolicySummary: boundedText(12_000),
    proposedProgramSummary: boundedText(12_000),
    reasoning: boundedText(5_000),
    requiresAdvisorConfirmation: z.boolean(),
  })
  .strict();

const comparisonSnapshotSchema = z
  .object({
    programId: z.string().regex(PROGRAM_ID_PATTERN),
    overallStatus: z.enum([
      "meaningful_improvement",
      "mixed",
      "broadly_similar",
      "insufficient_evidence",
    ]),
    improvements: z.array(comparisonPointSchema).max(500),
    tradeOffs: z.array(comparisonPointSchema).max(500),
    currentPolicyAdvantages: z.array(comparisonPointSchema).max(500),
    similarItems: z.array(comparisonPointSchema).max(500),
    unknownItems: z.array(comparisonPointSchema).max(500),
    priorityCoverageSummary: z
      .object({
        matchedPriorities: uniqueStringArray(100),
        improvedPriorities: uniqueStringArray(100),
        unresolvedPriorities: uniqueStringArray(100),
      })
      .strict(),
    advisorConfirmationItems: uniqueStringArray(500),
  })
  .strict();

const recommendationSnapshotSchema = z
  .object({
    programId: z.string().regex(PROGRAM_ID_PATTERN),
    programName: boundedText(300),
    insurer: boundedText(300),
    category: z.enum([
      "best-match",
      "premium-choice",
      "smart-budget-choice",
    ]),
    categoryLabel: z.enum([
      "Best Match",
      "Premium Choice",
      "Smart Budget Choice",
    ]),
    matchScore: z.number().finite().min(0).max(100),
    reasoning: boundedText(3_000),
    strengths: z.array(strengthSchema).max(24),
    tradeOffs: uniqueStringArray(500),
    itemsToConfirm: uniqueStringArray(500),
  })
  .strict();

const existingPolicyHandoffSummarySchema = z
  .object({
    insurer: optionalBoundedText(300),
    productName: optionalBoundedText(300),
    policyType: optionalBoundedText(300),
    currency: optionalBoundedText(10),
    pageCount: z.number().int().positive().nullable(),
    insuredScope: boundedText(100),
    memberCount: z.number().int().positive().nullable(),
    coverageHighlights: uniqueStringArray(8, 3_500),
    deductibleHighlights: uniqueStringArray(6, 3_500),
    waitingPeriodHighlights: uniqueStringArray(6, 3_500),
    importantConditions: uniqueStringArray(8, 3_500),
    extractionConfidence: z.enum(["high", "medium", "low"]),
  })
  .strict();

const handoffSummarySchema = z
  .object({
    insuredPeople: profileSummarySchema
      .extend({ count: z.number().int().min(1).max(8) })
      .strict(),
    ageProfile: z
      .object({
        summary: boundedText(300),
        categories: uniqueStringArray(6, 100),
      })
      .strict(),
    currentInsurance: profileSummarySchema,
    evaluationGoal: profileSummarySchema,
    priorities: uniqueStringArray(3, 300),
    deductiblePreference: boundedText(300),
    costAndProtectionApproach: boundedText(300),
    additionalNeeds: uniqueStringArray(8, 300),
    existingPolicyAnalyzed: z.boolean(),
    existingPolicy: existingPolicyHandoffSummarySchema.nullable(),
    selectedProgram: z
      .object({
        programId: z.string().regex(PROGRAM_ID_PATTERN),
        insurer: boundedText(300),
        productName: boundedText(300),
        recommendationCategory: z.enum([
          "best-match",
          "premium-choice",
          "smart-budget-choice",
        ]),
        recommendationCategoryLabel: z.enum([
          "Best Match",
          "Premium Choice",
          "Smart Budget Choice",
        ]),
        matchScore: z.number().finite().min(0).max(100),
      })
      .strict(),
    recommendationReason: boundedText(3_000),
    actualStrengths: z.array(strengthSchema).max(24),
    tradeOffs: uniqueStringArray(500),
    comparisonImprovements: z.array(comparisonPointSchema).max(500),
    currentPolicyAdvantages: z.array(comparisonPointSchema).max(500),
    itemsToConfirm: uniqueStringArray(600),
  })
  .strict();

const leadSubmissionSchema = z
  .object({
    version: z.literal(LEAD_SUBMISSION_VERSION),
    submissionId: z.string().regex(SUBMISSION_ID_PATTERN),
    createdAt: isoTimestamp,
    expiresAt: isoTimestamp,
    status: z.literal("submitted"),
    assessmentSubmittedAt: isoTimestamp,
    contact: contactSchema,
    consents: consentSchema,
    programId: z.string().regex(PROGRAM_ID_PATTERN),
    insurer: boundedText(300),
    productName: boundedText(300),
    recommendationCategory: z.enum([
      "best-match",
      "premium-choice",
      "smart-budget-choice",
    ]),
    assessmentSubmission: assessmentSubmissionSchema,
    insuranceProfile: insuranceProfileSchema,
    policyFileMetadata: safePolicyFileMetadataSchema.nullable(),
    policySnapshot: ExistingPolicySnapshotSchema.nullable(),
    recommendationSnapshot: recommendationSnapshotSchema,
    comparisonSnapshot: comparisonSnapshotSchema.nullable(),
    advisorHandoffSummary: handoffSummarySchema,
  })
  .strict();

const sameValue = (left: unknown, right: unknown) =>
  JSON.stringify(left) === JSON.stringify(right);

export type LeadSubmissionValidationFailureCode =
  | "schema_submission"
  | "schema_assessment_submission"
  | "schema_insurance_profile"
  | "schema_policy_file_metadata"
  | "schema_policy_snapshot"
  | "schema_recommendation_snapshot"
  | "schema_comparison_snapshot"
  | "schema_comparison_improvements"
  | "schema_comparison_trade_offs"
  | "schema_comparison_current_policy_advantages"
  | "schema_comparison_similar_items"
  | "schema_comparison_unknown_items"
  | "schema_comparison_unknown_item_topic"
  | "schema_comparison_unknown_item_title"
  | "schema_comparison_unknown_item_status"
  | "schema_comparison_unknown_item_existing_summary"
  | "schema_comparison_unknown_item_proposed_summary"
  | "schema_comparison_unknown_item_proposed_summary_too_long"
  | "schema_comparison_unknown_item_reasoning"
  | "schema_comparison_unknown_item_confirmation"
  | "schema_comparison_priority_summary"
  | "schema_comparison_confirmation_items"
  | "schema_advisor_handoff_summary"
  | "policy_snapshot_invalid"
  | "lifetime_invalid"
  | "binding_core_invalid"
  | "binding_comparison_invalid"
  | "binding_policy_pair_invalid"
  | "binding_policy_invalid";

export type LeadSubmissionValidationResult =
  | { ok: true; submission: LeadSubmission }
  | { ok: false; code: LeadSubmissionValidationFailureCode };

const schemaFailureCodes = {
  assessmentSubmission: "schema_assessment_submission",
  insuranceProfile: "schema_insurance_profile",
  policyFileMetadata: "schema_policy_file_metadata",
  policySnapshot: "schema_policy_snapshot",
  recommendationSnapshot: "schema_recommendation_snapshot",
  comparisonSnapshot: "schema_comparison_snapshot",
  advisorHandoffSummary: "schema_advisor_handoff_summary",
} as const;

const comparisonSchemaFailureCodes = {
  improvements: "schema_comparison_improvements",
  tradeOffs: "schema_comparison_trade_offs",
  currentPolicyAdvantages: "schema_comparison_current_policy_advantages",
  similarItems: "schema_comparison_similar_items",
  unknownItems: "schema_comparison_unknown_items",
  priorityCoverageSummary: "schema_comparison_priority_summary",
  advisorConfirmationItems: "schema_comparison_confirmation_items",
} as const;

const unknownComparisonItemFailureCodes = {
  topicKey: "schema_comparison_unknown_item_topic",
  title: "schema_comparison_unknown_item_title",
  status: "schema_comparison_unknown_item_status",
  existingPolicySummary: "schema_comparison_unknown_item_existing_summary",
  proposedProgramSummary: "schema_comparison_unknown_item_proposed_summary",
  reasoning: "schema_comparison_unknown_item_reasoning",
  requiresAdvisorConfirmation: "schema_comparison_unknown_item_confirmation",
} as const;

const ageCategory = (age: number) => {
  if (age <= 17) return "Παιδί (0–17)";
  if (age <= 29) return "18–29 ετών";
  if (age <= 44) return "30–44 ετών";
  if (age <= 59) return "45–59 ετών";
  if (age <= 69) return "60–69 ετών";
  return "70+ ετών";
};

const unique = <T>(values: T[]) => [...new Set(values)];

function validateBindings(
  submission: LeadSubmission,
): LeadSubmissionValidationFailureCode | null {
  const assessmentSubmittedAt = submission.assessmentSubmission.submittedAt;
  const recommendation = submission.recommendationSnapshot;
  const handoff = submission.advisorHandoffSummary;
  const selectedProgram = handoff.selectedProgram;
  const comparison = submission.comparisonSnapshot;
  const policyMetadata = submission.policyFileMetadata;
  const policySnapshot = submission.policySnapshot;
  const policyFile = submission.assessmentSubmission.policyFile;
  const expectedProfile = generateInsuranceProfile(
    submission.assessmentSubmission,
  );

  if (
    !assessmentSubmittedAt ||
    submission.assessmentSubmittedAt !== assessmentSubmittedAt ||
    !sameValue(submission.insuranceProfile, expectedProfile) ||
    submission.insuranceProfile.generatedAt !== assessmentSubmittedAt ||
    submission.programId !== recommendation.programId ||
    submission.insurer !== recommendation.insurer ||
    submission.productName !== recommendation.programName ||
    submission.recommendationCategory !== recommendation.category ||
    selectedProgram.programId !== submission.programId ||
    selectedProgram.insurer !== submission.insurer ||
    selectedProgram.productName !== submission.productName ||
    selectedProgram.recommendationCategory !==
      submission.recommendationCategory ||
    selectedProgram.recommendationCategoryLabel !==
      recommendation.categoryLabel ||
    selectedProgram.matchScore !== recommendation.matchScore ||
    handoff.recommendationReason !== recommendation.reasoning ||
    !sameValue(handoff.actualStrengths, recommendation.strengths) ||
    !sameValue(handoff.tradeOffs, recommendation.tradeOffs) ||
    !sameValue(handoff.insuredPeople, submission.insuranceProfile.insuredPeople) ||
    !sameValue(
      handoff.currentInsurance,
      submission.insuranceProfile.currentInsurance,
    ) ||
    !sameValue(handoff.evaluationGoal, submission.insuranceProfile.mainGoal) ||
    !sameValue(handoff.priorities, submission.insuranceProfile.priorities) ||
    handoff.deductiblePreference !==
      submission.insuranceProfile.deductiblePreference ||
    handoff.costAndProtectionApproach !==
      submission.insuranceProfile.costAndProtectionApproach ||
    !sameValue(
      handoff.additionalNeeds,
      submission.insuranceProfile.additionalNeeds,
    ) ||
    handoff.ageProfile.summary !== submission.insuranceProfile.ageProfile.title ||
    !sameValue(
      handoff.ageProfile.categories,
      unique(submission.insuranceProfile.ageProfile.ages.map(ageCategory)),
    )
  ) {
    return "binding_core_invalid";
  }

  if (
    (comparison && comparison.programId !== submission.programId) ||
    !sameValue(
      handoff.comparisonImprovements,
      comparison?.improvements ?? [],
    ) ||
    !sameValue(
      handoff.currentPolicyAdvantages,
      comparison?.currentPolicyAdvantages ?? [],
    )
  ) {
    return "binding_comparison_invalid";
  }

  if ((policyMetadata === null) !== (policySnapshot === null)) {
    return "binding_policy_pair_invalid";
  }

  if (!policyMetadata || !policySnapshot) {
    return !(
      !handoff.existingPolicyAnalyzed &&
        handoff.existingPolicy === null &&
        sameValue(handoff.itemsToConfirm, recommendation.itemsToConfirm)
    )
      ? "binding_policy_invalid"
      : null;
  }

  const expectedPolicySummary = createExistingPolicyHandoffSummary({
    version: 1,
    snapshot: policySnapshot,
    filename: policyMetadata.fileName,
    fileSize: policyMetadata.fileSize,
    analyzedAt: policyMetadata.analyzedAt,
    extractionConfidence: policyMetadata.extractionConfidence,
  });
  const expectedConfirmationItems = unique([
    ...recommendation.itemsToConfirm,
    ...policySnapshot.unverifiedItems,
    ...policySnapshot.extractionWarnings,
  ]);

  return !(
    policyFile &&
      policyFile.name === policyMetadata.fileName &&
      policyFile.size === policyMetadata.fileSize &&
      policyFile.type === policyMetadata.mimeType &&
      policyMetadata.extractionConfidence ===
        policySnapshot.extractionConfidence &&
      handoff.existingPolicyAnalyzed &&
      handoff.existingPolicy &&
      sameValue(handoff.existingPolicy, expectedPolicySummary) &&
      sameValue(handoff.itemsToConfirm, expectedConfirmationItems)
  )
    ? "binding_policy_invalid"
    : null;
}

function hasValidLifetime(submission: LeadSubmission, now: number) {
  const createdAt = Date.parse(submission.createdAt);
  const expiresAt = Date.parse(submission.expiresAt);
  const assessmentSubmittedAt = Date.parse(submission.assessmentSubmittedAt);

  return Boolean(
    Number.isFinite(createdAt) &&
      Number.isFinite(expiresAt) &&
      Number.isFinite(assessmentSubmittedAt) &&
      createdAt <= now + CLOCK_SKEW_MS &&
      assessmentSubmittedAt <= createdAt + CLOCK_SKEW_MS &&
      expiresAt > createdAt &&
      expiresAt - createdAt <= LEAD_SUBMISSION_LIFETIME_MS &&
      now < expiresAt,
  );
}

export function validateLeadSubmission(
  value: unknown,
  now = Date.now(),
): LeadSubmission | null {
  const result = validateLeadSubmissionWithCode(value, now);
  return result.ok ? result.submission : null;
}

export function validateLeadSubmissionWithCode(
  value: unknown,
  now = Date.now(),
): LeadSubmissionValidationResult {
  const parsed = leadSubmissionSchema.safeParse(value);
  if (!parsed.success) {
    const topLevelField = parsed.error.issues[0]?.path[0];
    const comparisonField = parsed.error.issues[0]?.path[1];
    const comparisonItemField = parsed.error.issues[0]?.path[3];
    const firstIssueCode = parsed.error.issues[0]?.code;
    const code =
      topLevelField === "comparisonSnapshot" &&
      comparisonField === "unknownItems" &&
      comparisonItemField === "proposedProgramSummary" &&
      firstIssueCode === "too_big"
        ? "schema_comparison_unknown_item_proposed_summary_too_long"
        : topLevelField === "comparisonSnapshot" &&
      comparisonField === "unknownItems" &&
      typeof comparisonItemField === "string" &&
      comparisonItemField in unknownComparisonItemFailureCodes
        ? unknownComparisonItemFailureCodes[
            comparisonItemField as keyof typeof unknownComparisonItemFailureCodes
          ]
        : topLevelField === "comparisonSnapshot" &&
      typeof comparisonField === "string" &&
      comparisonField in comparisonSchemaFailureCodes
        ? comparisonSchemaFailureCodes[
            comparisonField as keyof typeof comparisonSchemaFailureCodes
          ]
        : typeof topLevelField === "string" && topLevelField in schemaFailureCodes
        ? schemaFailureCodes[
            topLevelField as keyof typeof schemaFailureCodes
          ]
        : "schema_submission";
    return { ok: false, code };
  }

  const policyValidation = parsed.data.policySnapshot
    ? validateExistingPolicySnapshot(parsed.data.policySnapshot)
    : null;
  if (policyValidation && !policyValidation.ok) {
    return { ok: false, code: "policy_snapshot_invalid" };
  }

  const submission = {
    ...parsed.data,
    policySnapshot: policyValidation?.ok
      ? policyValidation.snapshot
      : null,
  } as LeadSubmission;

  if (!hasValidLifetime(submission, now)) {
    return { ok: false, code: "lifetime_invalid" };
  }

  const bindingFailure = validateBindings(submission);
  return bindingFailure
    ? { ok: false, code: bindingFailure }
    : { ok: true, submission };
}

export function isLeadSubmission(
  value: unknown,
  now = Date.now(),
): value is LeadSubmission {
  return validateLeadSubmission(value, now) !== null;
}

export function writeLeadSubmission(value: LeadSubmission) {
  if (typeof window === "undefined") return false;
  const submission = validateLeadSubmission(value);
  if (!submission) {
    removeStoredLeadSubmission();
    return false;
  }

  try {
    window.sessionStorage.setItem(
      LEAD_SUBMISSION_SESSION_KEY,
      JSON.stringify(submission),
    );
    return true;
  } catch {
    return false;
  }
}

export interface LeadSubmissionReadBinding {
  submissionId?: string;
  assessmentSubmittedAt?: string;
  programId?: string;
}

export function readLeadSubmission(
  binding: LeadSubmissionReadBinding = {},
): LeadSubmission | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.sessionStorage.getItem(LEAD_SUBMISSION_SESSION_KEY);
    if (!raw) return null;
    const submission = validateLeadSubmission(JSON.parse(raw));

    if (
      !submission ||
      (binding.submissionId !== undefined &&
        binding.submissionId !== submission.submissionId) ||
      (binding.assessmentSubmittedAt !== undefined &&
        binding.assessmentSubmittedAt !== submission.assessmentSubmittedAt) ||
      (binding.programId !== undefined &&
        binding.programId !== submission.programId)
    ) {
      removeStoredLeadSubmission();
      return null;
    }

    return submission;
  } catch {
    removeStoredLeadSubmission();
    return null;
  }
}
