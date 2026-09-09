import type { ProgramPolicyComparison } from "@/lib/policy-analysis/comparison";
import type { ExistingPolicySnapshot } from "@/lib/policy-analysis/schema";
import type { PolicyAnalysisRecord } from "@/lib/policy-analysis/storage";
import { POLICY_PDF_CANONICAL_FILENAME } from "@/lib/policy-analysis/file-validation";
import type { LiveRecommendation } from "@/lib/recommendations/contracts";
import { buildRecommendationPresentation } from "@/lib/recommendations/presentation";

import type {
  AdvisorComparisonPoint,
  AdvisorHandoffSummary,
  AdvisorStrength,
  BuildAdvisorHandoffSummaryInput,
  ExistingPolicyHandoffSummary,
  LeadComparisonSnapshot,
  LeadRecommendationSnapshot,
  SafePolicyFileMetadata,
} from "./types";

const uniqueStrings = (values: Array<string | null | undefined>) => {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const normalized = value?.trim();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(normalized);
  }

  return result;
};

const ageCategory = (age: number) => {
  if (age <= 17) return "Παιδί (0–17)";
  if (age <= 29) return "18–29 ετών";
  if (age <= 44) return "30–44 ετών";
  if (age <= 59) return "45–59 ετών";
  if (age <= 69) return "60–69 ετών";
  return "70+ ετών";
};

const insuredScopeLabels: Record<
  ExistingPolicySnapshot["insuredScope"]["type"],
  string
> = {
  individual: "Ατομικό",
  couple: "Ζευγάρι",
  family: "Οικογενειακό",
  child: "Παιδί",
  unknown: "Δεν επιβεβαιώθηκε",
};

const MAX_COMPARISON_SNAPSHOT_SUMMARY_LENGTH = 12_000;
const ABBREVIATED_COMPARISON_SUMMARY_SUFFIX =
  "… [Το πλήρες τεκμηριωμένο κείμενο παραμένει στην πηγή της σύγκρισης.]";

function comparisonSnapshotSummary(value: string, fallback: string) {
  const normalized = value.trim();
  if (!normalized) return fallback;
  if (normalized.length <= MAX_COMPARISON_SNAPSHOT_SUMMARY_LENGTH) {
    return normalized;
  }

  return `${normalized
    .slice(
      0,
      MAX_COMPARISON_SNAPSHOT_SUMMARY_LENGTH -
        ABBREVIATED_COMPARISON_SUMMARY_SUFFIX.length,
    )
    .trimEnd()}${ABBREVIATED_COMPARISON_SUMMARY_SUFFIX}`;
}

const comparisonPoint = (
  item: ProgramPolicyComparison["improvements"][number],
): AdvisorComparisonPoint => ({
  topicKey: item.topicKey,
  title: item.title,
  status: item.status,
  existingPolicySummary: comparisonSnapshotSummary(
    item.existingPolicySummary,
    "Δεν τεκμηριώθηκε σχετικό στοιχείο στο υπάρχον συμβόλαιο.",
  ),
  proposedProgramSummary: comparisonSnapshotSummary(
    item.proposedProgramSummary,
    "Δεν τεκμηριώθηκε σχετικό στοιχείο στο προτεινόμενο πρόγραμμα.",
  ),
  reasoning: item.reasoning,
  requiresAdvisorConfirmation: item.requiresAdvisorConfirmation,
});

export function createLeadComparisonSnapshot(
  comparison: ProgramPolicyComparison | null,
): LeadComparisonSnapshot | null {
  if (!comparison) return null;

  return {
    programId: comparison.programId,
    overallStatus: comparison.overallStatus,
    improvements: comparison.improvements.map(comparisonPoint),
    tradeOffs: comparison.tradeoffs.map(comparisonPoint),
    currentPolicyAdvantages:
      comparison.currentPolicyAdvantages.map(comparisonPoint),
    similarItems: comparison.similarItems.map(comparisonPoint),
    unknownItems: comparison.unknownItems.map(comparisonPoint),
    priorityCoverageSummary: {
      matchedPriorities: [
        ...comparison.priorityCoverageSummary.matchedPriorities,
      ],
      improvedPriorities: [
        ...comparison.priorityCoverageSummary.improvedPriorities,
      ],
      unresolvedPriorities: [
        ...comparison.priorityCoverageSummary.unresolvedPriorities,
      ],
    },
    advisorConfirmationItems: [...comparison.advisorConfirmationItems],
  };
}

export function createLeadRecommendationSnapshot(
  assessmentSubmission: BuildAdvisorHandoffSummaryInput["assessmentSubmission"],
  recommendation: LiveRecommendation,
): LeadRecommendationSnapshot {
  const presentation = buildRecommendationPresentation(
    assessmentSubmission,
    recommendation,
  );
  const comparison = createLeadComparisonSnapshot(
    recommendation.policyComparison,
  );
  const strengths: AdvisorStrength[] = presentation.strengths.map((item) => ({
    topicKey: item.topicKey,
    title: item.title,
    summary: item.summary,
  }));

  return {
    programId: recommendation.programId,
    programName: recommendation.programName,
    insurer: recommendation.insurer,
    category: recommendation.category,
    categoryLabel: recommendation.categoryLabel,
    matchScore: recommendation.matchScore,
    reasoning: presentation.reason,
    strengths,
    tradeOffs: uniqueStrings([
      ...recommendation.tradeOffs,
      ...presentation.tradeOffs,
      ...(comparison?.tradeOffs.map(
        (item) => `${item.title}: ${item.reasoning}`,
      ) ?? []),
    ]),
    itemsToConfirm: uniqueStrings([
      ...recommendation.itemsToConfirm,
      ...recommendation.missingEvidence.map(
        (item) => `Χρειάζεται επιβεβαίωση για ${item.title}.`,
      ),
      ...presentation.confirmations,
      ...(comparison?.advisorConfirmationItems ?? []),
    ]),
  };
}

export function createSafePolicyFileMetadata(
  policyAnalysis?: PolicyAnalysisRecord | null,
): SafePolicyFileMetadata | null {
  if (!policyAnalysis) return null;

  return {
    fileName: POLICY_PDF_CANONICAL_FILENAME,
    fileSize: policyAnalysis.fileSize,
    mimeType: "application/pdf",
    analyzedAt: policyAnalysis.analyzedAt,
    extractionConfidence: policyAnalysis.extractionConfidence,
  };
}

export function createExistingPolicyHandoffSummary(
  policyAnalysis?: PolicyAnalysisRecord | null,
): ExistingPolicyHandoffSummary | null {
  if (!policyAnalysis) return null;
  const snapshot = policyAnalysis.snapshot;

  const coverageHighlights = uniqueStrings(
    snapshot.coverages
      .slice(0, 8)
      .map((coverage) => `${coverage.title}: ${coverage.description}`),
  );
  const deductibleHighlights = uniqueStrings(
    snapshot.deductibles.slice(0, 6).map((deductible) => {
      const financialTerms = uniqueStrings([
        deductible.amount !== null
          ? `${deductible.amount} ${deductible.currency ?? ""}`.trim()
          : null,
        deductible.percentage !== null
          ? `${deductible.percentage}%`
          : null,
        deductible.appliesTo,
      ]);
      return `${deductible.title}: ${financialTerms.join(" · ")}`;
    }),
  );
  const waitingPeriodHighlights = uniqueStrings(
    snapshot.waitingPeriods.slice(0, 6).map((period) => {
      const duration =
        period.durationValue !== null && period.durationUnit
          ? `${period.durationValue} ${period.durationUnit}`
          : "διάρκεια προς επιβεβαίωση";
      return `${period.appliesTo}: ${duration}`;
    }),
  );
  const importantConditions = uniqueStrings(
    snapshot.importantConditions
      .slice(0, 8)
      .map((condition) => `${condition.title}: ${condition.description}`),
  );

  return {
    insurer: snapshot.documentMetadata.insurer,
    productName: snapshot.documentMetadata.productName,
    policyType: snapshot.documentMetadata.policyType,
    currency: snapshot.documentMetadata.currency,
    pageCount: snapshot.documentMetadata.pageCount,
    insuredScope: insuredScopeLabels[snapshot.insuredScope.type],
    memberCount: snapshot.insuredScope.memberCount,
    coverageHighlights,
    deductibleHighlights,
    waitingPeriodHighlights,
    importantConditions,
    extractionConfidence: snapshot.extractionConfidence,
  };
}

export function buildAdvisorHandoffSummary({
  assessmentSubmission,
  insuranceProfile,
  policyAnalysis = null,
  recommendation,
}: BuildAdvisorHandoffSummaryInput): AdvisorHandoffSummary {
  const recommendationSnapshot = createLeadRecommendationSnapshot(
    assessmentSubmission,
    recommendation,
  );
  const comparison = createLeadComparisonSnapshot(
    recommendation.policyComparison,
  );
  const policySummary = createExistingPolicyHandoffSummary(policyAnalysis);

  return {
    insuredPeople: {
      title: insuranceProfile.insuredPeople.title,
      detail: insuranceProfile.insuredPeople.detail,
      count: insuranceProfile.insuredPeople.count,
    },
    ageProfile: {
      summary: insuranceProfile.ageProfile.title,
      categories: uniqueStrings(
        insuranceProfile.ageProfile.ages.map(ageCategory),
      ),
    },
    currentInsurance: { ...insuranceProfile.currentInsurance },
    evaluationGoal: { ...insuranceProfile.mainGoal },
    priorities: [...insuranceProfile.priorities],
    deductiblePreference: insuranceProfile.deductiblePreference,
    costAndProtectionApproach:
      insuranceProfile.costAndProtectionApproach,
    additionalNeeds: [...insuranceProfile.additionalNeeds],
    existingPolicyAnalyzed: Boolean(policyAnalysis),
    existingPolicy: policySummary,
    selectedProgram: {
      programId: recommendationSnapshot.programId,
      insurer: recommendationSnapshot.insurer,
      productName: recommendationSnapshot.programName,
      recommendationCategory: recommendationSnapshot.category,
      recommendationCategoryLabel: recommendationSnapshot.categoryLabel,
      matchScore: recommendationSnapshot.matchScore,
    },
    recommendationReason: recommendationSnapshot.reasoning,
    actualStrengths: recommendationSnapshot.strengths.map((item) => ({
      ...item,
    })),
    tradeOffs: [...recommendationSnapshot.tradeOffs],
    comparisonImprovements:
      comparison?.improvements.map((item) => ({ ...item })) ?? [],
    currentPolicyAdvantages:
      comparison?.currentPolicyAdvantages.map((item) => ({ ...item })) ?? [],
    itemsToConfirm: uniqueStrings([
      ...recommendationSnapshot.itemsToConfirm,
      ...(policyAnalysis?.snapshot.unverifiedItems ?? []),
      ...(policyAnalysis?.snapshot.extractionWarnings ?? []),
    ]),
  };
}
