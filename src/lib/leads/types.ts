import type {
  AssessmentSubmission,
  InsuranceProfile,
} from "@/lib/assessment/types";
import type { ExistingPolicySnapshot } from "@/lib/policy-analysis/schema";
import type { PolicyAnalysisRecord } from "@/lib/policy-analysis/storage";
import type {
  LiveRecommendation,
  LiveRecommendationCategory,
  LiveRecommendationCategoryLabel,
} from "@/lib/recommendations/contracts";

export const LEAD_SUBMISSION_VERSION = 2 as const;

export const LEAD_CONTACT_TIME_OPTIONS = [
  { value: "morning", label: "Πρωί · 09:00–12:00" },
  { value: "midday", label: "Μεσημέρι · 12:00–16:00" },
  { value: "afternoon", label: "Απόγευμα · 16:00–20:00" },
  { value: "anytime", label: "Δεν έχω προτίμηση" },
] as const;

export type LeadPreferredContactTime =
  (typeof LEAD_CONTACT_TIME_OPTIONS)[number]["value"];

export interface LeadConsentData {
  advisorContact: boolean;
  privacyTerms: boolean;
  marketing?: boolean;
}

export interface LeadFormData {
  fullName: string;
  email: string;
  phone: string;
  preferredContactTime: LeadPreferredContactTime;
  consents: LeadConsentData;
}

export interface LeadFormDraftData
  extends Omit<LeadFormData, "preferredContactTime"> {
  preferredContactTime: LeadPreferredContactTime | "";
}

export interface NormalizedLeadFormData {
  fullName: string;
  email: string;
  phone: string;
  preferredContactTime: LeadPreferredContactTime;
  consents: LeadConsentData;
}

export type LeadFormField =
  | "fullName"
  | "email"
  | "phone"
  | "preferredContactTime"
  | "advisorContact"
  | "privacyTerms";

export type LeadFormErrors = Partial<Record<LeadFormField, string>>;

export type LeadFormValidationResult =
  | { ok: true; data: NormalizedLeadFormData }
  | { ok: false; errors: LeadFormErrors };

export interface LeadContactDetails {
  fullName: string;
  email: string;
  phone: string;
  preferredContactTime: LeadPreferredContactTime;
}

export interface SafePolicyFileMetadata {
  fileName: string;
  fileSize: number;
  mimeType: "application/pdf";
  analyzedAt: string;
  extractionConfidence: "high" | "medium" | "low";
}

export interface AdvisorStrength {
  topicKey: string;
  title: string;
  summary: string;
}

export type LeadComparisonStatus =
  | "improvement"
  | "similar"
  | "tradeoff"
  | "current_policy_advantage"
  | "unknown"
  | "needs_confirmation";

export interface AdvisorComparisonPoint {
  topicKey: string;
  title: string;
  status: LeadComparisonStatus;
  existingPolicySummary: string;
  proposedProgramSummary: string;
  reasoning: string;
  requiresAdvisorConfirmation: boolean;
}

export interface LeadComparisonSnapshot {
  programId: string;
  overallStatus:
    | "meaningful_improvement"
    | "mixed"
    | "broadly_similar"
    | "insufficient_evidence";
  improvements: AdvisorComparisonPoint[];
  tradeOffs: AdvisorComparisonPoint[];
  currentPolicyAdvantages: AdvisorComparisonPoint[];
  similarItems: AdvisorComparisonPoint[];
  unknownItems: AdvisorComparisonPoint[];
  priorityCoverageSummary: {
    matchedPriorities: string[];
    improvedPriorities: string[];
    unresolvedPriorities: string[];
  };
  advisorConfirmationItems: string[];
}

export interface LeadRecommendationSnapshot {
  programId: string;
  programName: string;
  insurer: string;
  category: LiveRecommendationCategory;
  categoryLabel: LiveRecommendationCategoryLabel;
  matchScore: number;
  reasoning: string;
  strengths: AdvisorStrength[];
  tradeOffs: string[];
  itemsToConfirm: string[];
}

export interface ExistingPolicyHandoffSummary {
  insurer: string | null;
  productName: string | null;
  policyType: string | null;
  currency: string | null;
  pageCount: number | null;
  insuredScope: string;
  memberCount: number | null;
  coverageHighlights: string[];
  deductibleHighlights: string[];
  waitingPeriodHighlights: string[];
  importantConditions: string[];
  extractionConfidence: "high" | "medium" | "low";
}

export interface AdvisorHandoffSummary {
  insuredPeople: {
    title: string;
    detail: string;
    count: number;
  };
  ageProfile: {
    summary: string;
    categories: string[];
  };
  currentInsurance: {
    title: string;
    detail: string;
  };
  evaluationGoal: {
    title: string;
    detail: string;
  };
  priorities: string[];
  deductiblePreference: string;
  costAndProtectionApproach: string;
  additionalNeeds: string[];
  existingPolicyAnalyzed: boolean;
  existingPolicy: ExistingPolicyHandoffSummary | null;
  selectedProgram: {
    programId: string;
    insurer: string;
    productName: string;
    recommendationCategory: LiveRecommendationCategory;
    recommendationCategoryLabel: LiveRecommendationCategoryLabel;
    matchScore: number;
  };
  recommendationReason: string;
  actualStrengths: AdvisorStrength[];
  tradeOffs: string[];
  comparisonImprovements: AdvisorComparisonPoint[];
  currentPolicyAdvantages: AdvisorComparisonPoint[];
  itemsToConfirm: string[];
}

export interface LeadSubmission {
  version: typeof LEAD_SUBMISSION_VERSION;
  submissionId: string;
  createdAt: string;
  expiresAt: string;
  status: "submitted";
  assessmentSubmittedAt: string;
  contact: LeadContactDetails;
  consents: LeadConsentData;
  programId: string;
  insurer: string;
  productName: string;
  recommendationCategory: LiveRecommendationCategory;
  assessmentSubmission: AssessmentSubmission;
  insuranceProfile: InsuranceProfile;
  policyFileMetadata: SafePolicyFileMetadata | null;
  policySnapshot: ExistingPolicySnapshot | null;
  recommendationSnapshot: LeadRecommendationSnapshot;
  comparisonSnapshot: LeadComparisonSnapshot | null;
  advisorHandoffSummary: AdvisorHandoffSummary;
}

export interface BuildAdvisorHandoffSummaryInput {
  assessmentSubmission: AssessmentSubmission;
  insuranceProfile: InsuranceProfile;
  policyAnalysis?: PolicyAnalysisRecord | null;
  recommendation: LiveRecommendation;
}

export interface CreateLeadSubmissionInput
  extends BuildAdvisorHandoffSummaryInput {
  formData: LeadFormData;
}

export interface CreateLeadSubmissionOptions {
  now?: Date;
  submissionId?: string;
}

export type LeadSubmissionCreationResult =
  | { ok: true; submission: LeadSubmission }
  | { ok: false; code: "invalid_form"; errors: LeadFormErrors }
  | { ok: false; code: "invalid_context"; message: string };
