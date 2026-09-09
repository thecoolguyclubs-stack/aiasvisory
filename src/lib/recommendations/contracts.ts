import {
  isProgramPolicyComparison,
  type ProgramPolicyComparison,
} from "@/lib/policy-analysis/comparison";

export type LiveRecommendationCategory =
  | "best-match"
  | "premium-choice"
  | "smart-budget-choice";

export type LiveRecommendationCategoryLabel =
  | "Best Match"
  | "Premium Choice"
  | "Smart Budget Choice";

export interface RecommendationStrength {
  id: string;
  title: string;
  description?: string;
  score?: number;
  confidence?: string;
}

export interface MissingEvidenceItem {
  signalCode: string;
  title: string;
  weight?: number;
}

export interface EvidenceReference {
  id: string;
  type: string;
  title?: string;
  excerpt?: string;
  sourceFilename?: string;
  articleSection?: string;
  pdfPage?: number;
  signalCode?: string;
}

export interface RecommendationWarning {
  code: string;
  message: string;
}

export interface LiveRecommendation {
  programId: string;
  programName: string;
  insurer: string;
  category: LiveRecommendationCategory;
  categoryLabel: LiveRecommendationCategoryLabel;
  matchScore: number;
  reason?: string;
  strengths: RecommendationStrength[];
  tradeOffs: string[];
  itemsToConfirm: string[];
  warnings: RecommendationWarning[];
  missingEvidence: MissingEvidenceItem[];
  evidenceReferences: EvidenceReference[];
  policyComparison: ProgramPolicyComparison | null;
}

export interface LiveRecommendationsResponse {
  ok: true;
  source: "supabase";
  generatedAt: string;
  recommendations: LiveRecommendation[];
}

export interface RecommendationMappingErrorPayload {
  field: string;
  code: "missing_value" | "unsupported_value" | "invalid_value";
  message: string;
}

export interface RecommendationApiError {
  ok: false;
  code:
    | "invalid_request"
    | "invalid_policy_snapshot"
    | "assessment_mapping_error"
    | "database_unavailable"
    | "invalid_database_response"
    | "program_not_found";
  message: string;
  mappingErrors?: RecommendationMappingErrorPayload[];
}

export type RecommendationApiResponse =
  | LiveRecommendationsResponse
  | RecommendationApiError;

export interface DatabaseCoverageFact {
  factId: string;
  category?: string;
  topic: string;
  coverageStatus?: string;
  termAnalysis: string;
  limitFrequency?: string;
  deductibleParticipation?: string;
  waitingPeriodText?: string;
  geography?: string;
  network?: string;
  sourceFilename?: string;
  articleSection?: string;
  confidence?: string;
  evidenceLevel?: string;
  humanValidated: boolean;
}

export interface DatabaseDeductibleRule {
  deductibleId: string;
  coverageCase: string;
  exactRule: string;
  practicalMeaning?: string;
  periodFrequency?: string;
  sourceFilename?: string;
  articleSection?: string;
  confidence?: string;
  humanValidated: boolean;
}

export interface DatabaseMonetaryFact {
  monetaryId: string;
  exactExcerpt: string;
  sourceFilename?: string;
  pdfPage?: number;
  humanValidated: boolean;
}

export interface DatabaseWaitingPeriod {
  waitingId: string;
  coverageCase: string;
  durationText: string;
  applicationText?: string;
  sourceFilename?: string;
  articleSection?: string;
  confidence?: string;
  humanValidated: boolean;
}

export interface DatabaseExclusion {
  exclusionId: string;
  recordType?: string;
  exclusionText: string;
  sourceFilename?: string;
  pdfPage?: number;
  validationNote?: string;
  humanValidated: boolean;
}

export interface DatabaseProviderNetwork {
  networkId: string;
  providerType?: string;
  providerName: string;
  region?: string;
  networkStatus?: string;
  versionNote?: string;
  validFrom?: string;
  validTo?: string;
  lastVerifiedAt?: string;
  humanValidated: boolean;
}

export interface DatabaseProcedureFee {
  feeId: string;
  feeType?: string;
  medicalSpecialty?: string;
  severityCategory?: string;
  amount?: number;
  currency?: string;
  sourceFilename?: string;
  humanValidated: boolean;
}

export interface DatabaseSupplementaryBenefit {
  benefitId: string;
  benefitName: string;
  exactOperationConditions?: string;
  waitingText?: string;
  durationExpiry?: string;
  sourceFilename?: string;
  humanValidated: boolean;
}

export interface DatabaseClaimRule {
  claimRuleId: string;
  claimCase: string;
  exactProcess?: string;
  deadlineLimit?: string;
  humanValidated: boolean;
}

export interface DatabaseProgramDetail {
  contractVersion: "product-detail-2026-07-v2";
  programId: string;
  name: string;
  insurer: string;
  productType?: string;
  category?: string;
  scopeText?: string;
  criticalNote?: string;
  versionLabel?: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  dataQualityWarning?: string;
  signals: RecommendationStrength[];
  evidenceReferences: EvidenceReference[];
  coverageFacts: DatabaseCoverageFact[];
  deductibleRules: DatabaseDeductibleRule[];
  monetaryFacts: DatabaseMonetaryFact[];
  waitingPeriods: DatabaseWaitingPeriod[];
  exclusions: DatabaseExclusion[];
  providerNetworks: DatabaseProviderNetwork[];
  procedureFees: DatabaseProcedureFee[];
  supplementaryBenefits: DatabaseSupplementaryBenefit[];
  claimRules: DatabaseClaimRule[];
}

export interface ProgramDetailResponse {
  ok: true;
  source: "supabase";
  program: DatabaseProgramDetail;
}

export type ProgramDetailApiResponse = ProgramDetailResponse | RecommendationApiError;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string");

const isOptionalString = (value: unknown) =>
  value === undefined || typeof value === "string";

const isRecommendationStrength = (value: unknown) =>
  isRecord(value) &&
  typeof value.id === "string" &&
  typeof value.title === "string" &&
  isOptionalString(value.description) &&
  (value.score === undefined ||
    (typeof value.score === "number" && Number.isFinite(value.score))) &&
  isOptionalString(value.confidence);

const isMissingEvidenceItem = (value: unknown) =>
  isRecord(value) &&
  typeof value.signalCode === "string" &&
  typeof value.title === "string" &&
  (value.weight === undefined ||
    (typeof value.weight === "number" && Number.isFinite(value.weight)));

const isEvidenceReference = (value: unknown) =>
  isRecord(value) &&
  typeof value.id === "string" &&
  typeof value.type === "string" &&
  isOptionalString(value.title) &&
  isOptionalString(value.excerpt) &&
  isOptionalString(value.sourceFilename) &&
  isOptionalString(value.articleSection) &&
  (value.pdfPage === undefined ||
    (Number.isSafeInteger(value.pdfPage) && Number(value.pdfPage) > 0)) &&
  isOptionalString(value.signalCode);

const isRecommendationWarning = (value: unknown) =>
  isRecord(value) &&
  typeof value.code === "string" &&
  typeof value.message === "string";

export function isLiveRecommendation(
  value: unknown,
): value is LiveRecommendation {
  if (!isRecord(value)) return false;

  return Boolean(
    typeof value.programId === "string" &&
      typeof value.programName === "string" &&
      typeof value.insurer === "string" &&
      ["best-match", "premium-choice", "smart-budget-choice"].includes(
        String(value.category),
      ) &&
      ["Best Match", "Premium Choice", "Smart Budget Choice"].includes(
        String(value.categoryLabel),
      ) &&
      typeof value.matchScore === "number" &&
      Number.isFinite(value.matchScore) &&
      value.matchScore >= 0 &&
      value.matchScore <= 100 &&
      (value.reason === undefined || typeof value.reason === "string") &&
      Array.isArray(value.strengths) &&
      value.strengths.every(isRecommendationStrength) &&
      isStringArray(value.tradeOffs) &&
      isStringArray(value.itemsToConfirm) &&
      Array.isArray(value.warnings) &&
      value.warnings.every(isRecommendationWarning) &&
      Array.isArray(value.missingEvidence) &&
      value.missingEvidence.every(isMissingEvidenceItem) &&
      Array.isArray(value.evidenceReferences) &&
      value.evidenceReferences.every(isEvidenceReference) &&
      (value.policyComparison === null ||
        (isProgramPolicyComparison(value.policyComparison) &&
          value.policyComparison.programId === value.programId)),
  );
}

export function isLiveRecommendationsResponse(
  value: unknown,
): value is LiveRecommendationsResponse {
  if (!isRecord(value)) return false;

  return Boolean(
    value.ok === true &&
      value.source === "supabase" &&
      typeof value.generatedAt === "string" &&
      Number.isFinite(Date.parse(value.generatedAt)) &&
      Array.isArray(value.recommendations) &&
      value.recommendations.length === 3 &&
      value.recommendations.every(isLiveRecommendation) &&
      new Set(
        value.recommendations.map((recommendation) => recommendation.programId),
      ).size === 3,
  );
}

export function isRecommendationApiError(
  value: unknown,
): value is RecommendationApiError {
  return Boolean(
    isRecord(value) &&
      value.ok === false &&
      typeof value.code === "string" &&
      typeof value.message === "string",
  );
}

export function isProgramDetailResponse(
  value: unknown,
): value is ProgramDetailResponse {
  if (!isRecord(value) || value.ok !== true || value.source !== "supabase") {
    return false;
  }

  const program = value.program;

  return Boolean(
    isRecord(program) &&
      program.contractVersion === "product-detail-2026-07-v2" &&
      typeof program.programId === "string" &&
      typeof program.name === "string" &&
      typeof program.insurer === "string" &&
      Array.isArray(program.signals) &&
      Array.isArray(program.evidenceReferences) &&
      Array.isArray(program.coverageFacts) &&
      Array.isArray(program.deductibleRules) &&
      Array.isArray(program.monetaryFacts) &&
      Array.isArray(program.waitingPeriods) &&
      Array.isArray(program.exclusions) &&
      Array.isArray(program.providerNetworks) &&
      Array.isArray(program.procedureFees) &&
      Array.isArray(program.supplementaryBenefits) &&
      Array.isArray(program.claimRules),
  );
}
