export const EVALUATION_V2_RULE_SET_STATUSES = [
  "draft",
  "approved",
  "retired",
] as const;

export type EvaluationV2RuleSetStatus =
  (typeof EVALUATION_V2_RULE_SET_STATUSES)[number];

export type EvaluationV2RuntimeActive = false;

export interface EvaluationV2RuleSetMetadata {
  ruleSetId: string;
  semanticVersion: string;
  status: EvaluationV2RuleSetStatus;
  runtimeActive: EvaluationV2RuntimeActive;
  sourceDecisionMatrix: string;
  sourceRulesSpec: string;
  approvedBusinessGroups: readonly string[];
  approvedWeightingDirection: EvaluationV2ApprovedWeightingDirection;
}

export interface EvaluationV2ActivationBoundary {
  v1RemainsDefault: true;
  runtimeActive: false;
  requiresExplicitActivationApproval: true;
  allowsProductionImport: false;
  allowsRuntimeRouting: false;
}

export const EVALUATION_V2_QUESTIONNAIRE_STEP_IDS = [
  "insuredPeople",
  "birthDates",
  "currentInsurance",
  "evaluationGoal",
  "priorities",
  "deductible",
  "costApproach",
  "additionalNeeds",
] as const;

export type EvaluationV2QuestionnaireStepId =
  (typeof EVALUATION_V2_QUESTIONNAIRE_STEP_IDS)[number];

export const EVALUATION_V2_INPUT_ROLES = [
  "eligibility",
  "scoring",
  "explanation",
  "advisor_confirmation",
  "context",
  "category assignment",
] as const;

export type EvaluationV2InputRole = (typeof EVALUATION_V2_INPUT_ROLES)[number];

export interface EvaluationV2ApprovedWeightingDirection {
  allInputsConsidered: boolean;
  strongerInitialEmphasisSteps: readonly EvaluationV2QuestionnaireStepId[];
  consideredButNotMainEmphasisSteps: readonly EvaluationV2QuestionnaireStepId[];
  note: string;
}

export interface EvaluationV2QuestionnaireInputPolicy {
  stepId: EvaluationV2QuestionnaireStepId;
  role: readonly EvaluationV2InputRole[];
  considered: boolean;
  mainWeightEmphasis: boolean;
  signalsEmitted: readonly EvaluationV2QuestionnaireEmittedSignalId[];
  mustNotAffect: readonly string[];
}

export interface EvaluationV2NormalizedAnswer {
  stepId: EvaluationV2QuestionnaireStepId;
  valueId: string;
  label?: string;
  detail?: string;
  selected: boolean;
}

export interface EvaluationV2EvidenceWorkflowInput {
  hasPolicyPdf: boolean;
  policyComparisonAvailable: boolean;
  source: "none" | "upload" | "manual";
  notes?: string;
}

export interface EvaluationV2NormalizedInput {
  questionnaireVersion: string;
  answers: readonly EvaluationV2NormalizedAnswer[];
  requestedSignals: readonly EvaluationV2SignalId[];
  evidenceWorkflow: EvaluationV2EvidenceWorkflowInput;
  existingPolicyContextPresent: boolean;
}

export const EVALUATION_V2_CORE_SIGNAL_IDS = [
  "private_hospitalization",
  "surgery",
  "emergency",
  "serious_illness",
  "high_long_term_hospitalization_limit",
  "low_deductible_or_copayment",
  "outpatient_visits",
  "diagnostics_checkup",
  "international_coverage",
  "maternity",
  "physiotherapy_rehabilitation",
  "pediatric_coverage",
  "waiting_period_immediate_use",
  "provider_network_freedom",
  "existing_policy_context",
  "evaluation_goal",
] as const;

export type EvaluationV2CoreSignalId =
  (typeof EVALUATION_V2_CORE_SIGNAL_IDS)[number];

export type EvaluationV2SignalId = EvaluationV2CoreSignalId;

export const EVALUATION_V2_QUESTIONNAIRE_EMITTED_SIGNAL_IDS = [
  "insured_composition",
  "pediatric_context",
  "age_band",
  "age_limit_confirmation_required",
  "existing_policy_context",
  "evaluation_goal",
  "private_hospitalization",
  "surgery",
  "emergency",
  "serious_illness",
  "high_long_term_hospitalization_limit",
  "low_deductible_or_copayment",
  "cost_protection_approach",
  "outpatient_visits",
  "diagnostics_checkup",
  "international_coverage",
  "maternity",
  "physiotherapy_rehabilitation",
  "pediatric_coverage",
  "waiting_period_immediate_use",
  "provider_network_freedom",
] as const;

export type EvaluationV2QuestionnaireEmittedSignalId =
  (typeof EVALUATION_V2_QUESTIONNAIRE_EMITTED_SIGNAL_IDS)[number];

export const EVALUATION_V2_MISSING_EVIDENCE_BEHAVIORS = [
  "penalty_and_advisor_confirmation",
  "zero_or_penalty_and_advisor_confirmation",
  "zero_or_near_zero_and_advisor_confirmation",
  "degrade_and_advisor_confirmation",
  "degrade_or_advisor_confirmation",
  "advisor_confirmation_only_for_strong_claims",
] as const;

export type EvaluationV2MissingEvidenceBehavior =
  (typeof EVALUATION_V2_MISSING_EVIDENCE_BEHAVIORS)[number];

export type EvaluationV2OverclaimingGuardrail = string;

export const EVALUATION_V2_WEIGHT_BANDS = [
  "hard_priority",
  "hard_priority_overlap_capped",
  "deductible_preference",
  "additional_need_distinct",
  "additional_need",
  "additional_need_or_advisor_confirmation",
  "eligibility_context_and_additional_need",
  "advisor_confirmation_sensitive",
  "additional_need_overlap_capped",
  "main_emphasis_context",
] as const;

export type EvaluationV2WeightBand = (typeof EVALUATION_V2_WEIGHT_BANDS)[number];

export interface EvaluationV2SignalEvidenceRequirement {
  signalId: EvaluationV2SignalId;
  label: string;
}

export interface EvaluationV2SignalDefinition {
  signalId: EvaluationV2SignalId;
  sourceSteps: readonly EvaluationV2QuestionnaireStepId[];
  evidenceRequirements: readonly EvaluationV2SignalEvidenceRequirement[];
  scoringBand: EvaluationV2WeightBand;
  missingEvidenceBehavior: EvaluationV2MissingEvidenceBehavior;
  overclaimingGuardrail: EvaluationV2OverclaimingGuardrail;
  explanationBoundary: string;
}

export const EVALUATION_V2_ELIGIBILITY_OUTCOMES = [
  "pass",
  "degrade",
  "advisor_confirmation",
  "exclude",
] as const;

export type EvaluationV2EligibilityOutcome =
  (typeof EVALUATION_V2_ELIGIBILITY_OUTCOMES)[number];

export interface EvaluationV2EligibilityReason {
  code: string;
  signalId?: EvaluationV2SignalId;
  message: string;
}

export interface EvaluationV2EligibilityResult {
  outcome: EvaluationV2EligibilityOutcome;
  reasons: readonly EvaluationV2EligibilityReason[];
  unresolvedSignals: readonly EvaluationV2SignalId[];
}

export interface EvaluationV2SignalScore {
  signalId: EvaluationV2SignalId;
  weightBand: EvaluationV2WeightBand;
  score: number;
  maxScore: number;
  capped: boolean;
  rationale: string;
}

export interface EvaluationV2OverlapCap {
  capId: string;
  signalIds: readonly EvaluationV2SignalId[];
  capRule: string;
}

export interface EvaluationV2ScoringResult {
  totalScore: number;
  signalScores: readonly EvaluationV2SignalScore[];
  overlapCapsApplied: readonly EvaluationV2OverlapCap[];
  unresolvedSignals: readonly EvaluationV2SignalId[];
}

export const EVALUATION_V2_RECOMMENDATION_CATEGORIES = [
  "best_match",
  "premium_choice",
  "smart_budget_choice",
  "no_category",
] as const;

export type EvaluationV2RecommendationCategory =
  (typeof EVALUATION_V2_RECOMMENDATION_CATEGORIES)[number];

export interface EvaluationV2CategoryAssignment {
  category: EvaluationV2RecommendationCategory;
  rationale: string;
  evidenceRequired: boolean;
}

export interface EvaluationV2CategoryPolicy {
  categories: readonly EvaluationV2RecommendationCategory[];
  requiresEvidence: boolean;
  requiresEligibilityCertainty: boolean;
}

export type EvaluationV2ExistingPolicyInfluence =
  | "context_only"
  | "comparison_only"
  | "must_not_improve_proposed_evidence";

export interface EvaluationV2CurrentPolicyAdvantage {
  code: string;
  label: string;
  advisorConfirmationRequired: boolean;
}

export interface EvaluationV2ComparisonBoundary {
  existingPolicyInfluence: EvaluationV2ExistingPolicyInfluence;
  currentPolicyAdvantages: readonly EvaluationV2CurrentPolicyAdvantage[];
  mustNotAffectRanking: boolean;
}

export interface EvaluationV2Strength {
  signalId: EvaluationV2SignalId;
  title: string;
  detail: string;
}

export interface EvaluationV2TradeOff {
  signalId?: EvaluationV2SignalId;
  title: string;
  detail: string;
}

export interface EvaluationV2MissingEvidenceItem {
  signalId: EvaluationV2SignalId;
  detail: string;
  behavior: EvaluationV2MissingEvidenceBehavior;
}

export interface EvaluationV2AdvisorConfirmationItem {
  signalId?: EvaluationV2SignalId;
  detail: string;
  area: "eligibility" | "scoring" | "comparison" | "explanation";
}

export interface EvaluationV2ExplanationResult {
  strengths: readonly EvaluationV2Strength[];
  tradeOffs: readonly EvaluationV2TradeOff[];
  missingEvidence: readonly EvaluationV2MissingEvidenceItem[];
  advisorConfirmations: readonly EvaluationV2AdvisorConfirmationItem[];
  customerWordingBoundary: string;
  advisorWordingBoundary: string;
}

export interface EvaluationV2CandidateEvaluation {
  productId: string;
  eligibility: EvaluationV2EligibilityResult;
  scoring: EvaluationV2ScoringResult;
  category: EvaluationV2CategoryAssignment;
  explanation: EvaluationV2ExplanationResult;
  comparisonBoundary: EvaluationV2ComparisonBoundary;
}

export interface EvaluationV2AdvisorHandoffBoundary {
  requiresAdvisorReview: boolean;
  mustNotReplaceActiveLeadFlow: true;
  unresolvedItems: readonly EvaluationV2AdvisorConfirmationItem[];
}

export interface EvaluationV2EvaluationResult {
  metadata: EvaluationV2RuleSetMetadata;
  activationBoundary: EvaluationV2ActivationBoundary;
  input: EvaluationV2NormalizedInput;
  candidates: readonly EvaluationV2CandidateEvaluation[];
  advisorHandoff: EvaluationV2AdvisorHandoffBoundary;
}

export interface EvaluationV2ExpectedInvariant {
  code: string;
  description: string;
}

export interface EvaluationV2FixtureCase {
  id: string;
  title: string;
  input: EvaluationV2NormalizedInput;
  expectedInvariants: readonly EvaluationV2ExpectedInvariant[];
}
