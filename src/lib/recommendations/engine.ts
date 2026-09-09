import { assessmentConfig } from "@/lib/assessment/config";
import type { AssessmentSubmission } from "@/lib/assessment/types";

import {
  mockProgramCatalog,
  type MockInsuranceProgram,
} from "./programs";

export type RecommendationCategory =
  | "best-match"
  | "premium-choice"
  | "smart-budget-choice";

export interface ProgramRecommendation {
  category: RecommendationCategory;
  categoryLabel: "Best Match" | "Premium Choice" | "Smart Budget Choice";
  program: MockInsuranceProgram;
  matchScore: number;
  reason: string;
  matchedNeedIds: string[];
  tradeOffs: string[];
  advisorConfirmations: string[];
}

export interface NeedMatch {
  id: string;
  label: string;
  status: "Ισχυρή αντιστοίχιση" | "Μερική αντιστοίχιση" | "Προς επιβεβαίωση";
  detail: string;
}

interface ScoredProgram {
  program: MockInsuranceProgram;
  rawScore: number;
  matchScore: number;
  matchedNeedIds: string[];
}

const labelsById: ReadonlyMap<string, string> = new Map(
  [
    ...assessmentConfig.priorities.options,
    ...assessmentConfig.additionalNeeds.options,
  ].map((option) => [option.id, option.label]),
);

const intersects = (values: readonly string[], targets: readonly string[]) =>
  values.filter((value) => targets.includes(value));

function scoreProgram(
  submission: AssessmentSubmission,
  program: MockInsuranceProgram,
): ScoredProgram {
  const { answers } = submission;
  const priorityMatches = intersects(answers.priorities, program.priorityFit);
  const additionalMatches = intersects(
    answers.additionalNeeds,
    program.additionalNeedsFit,
  );
  let rawScore = 24;

  rawScore += priorityMatches.length * 11;
  rawScore += additionalMatches.length * 5;
  rawScore += program.approachFit.includes(answers.costApproach ?? "") ? 16 : 0;
  rawScore += program.deductibleFit.includes(answers.deductible ?? "") ? 10 : 0;
  rawScore += program.goalFit.includes(answers.evaluationGoal ?? "") ? 8 : 0;
  rawScore += program.compositionFit.includes(answers.insuredPeople ?? "") ? 6 : 0;

  if (
    answers.currentInsurance &&
    answers.currentInsurance !== "none" &&
    answers.evaluationGoal &&
    ["review-existing", "compare-existing", "group-gaps"].includes(
      answers.evaluationGoal,
    )
  ) {
    rawScore += program.costTier === 2 ? 4 : 2;
  }

  const matchedNeedIds = [...new Set([...priorityMatches, ...additionalMatches])];
  const matchScore = Math.min(96, Math.max(58, 52 + Math.round(rawScore * 0.42)));

  return { program, rawScore, matchScore, matchedNeedIds };
}

const byScoreThenId = (left: ScoredProgram, right: ScoredProgram) =>
  right.rawScore - left.rawScore || left.program.id.localeCompare(right.program.id);

function recommendationReason(scored: ScoredProgram) {
  const matchedLabels = scored.matchedNeedIds
    .slice(0, 2)
    .map((id) => labelsById.get(id))
    .filter((label): label is string => Boolean(label));

  if (matchedLabels.length > 0) {
    return `Ξεχωρίζει στη demo αξιολόγηση επειδή συνδέεται με ${matchedLabels.join(
      " και ",
    ).toLocaleLowerCase("el-GR")}.`;
  }

  return "Ξεχωρίζει στη demo αξιολόγηση για τη σχέση προσέγγισης κόστους, απαλλαγής και επιπέδου προστασίας που δήλωσες.";
}

function toRecommendation(
  scored: ScoredProgram,
  category: RecommendationCategory,
): ProgramRecommendation {
  const labels = {
    "best-match": "Best Match",
    "premium-choice": "Premium Choice",
    "smart-budget-choice": "Smart Budget Choice",
  } as const;

  return {
    category,
    categoryLabel: labels[category],
    program: scored.program,
    matchScore: scored.matchScore,
    reason: recommendationReason(scored),
    matchedNeedIds: [...scored.matchedNeedIds],
    tradeOffs: [...scored.program.tradeOffs],
    advisorConfirmations: [...scored.program.advisorConfirmations],
  };
}

export function recommendPrograms(
  submission: AssessmentSubmission,
): ProgramRecommendation[] {
  const ranked = mockProgramCatalog
    .map((program) => scoreProgram(submission, program))
    .sort(byScoreThenId);
  const bestMatch = ranked[0];
  const premiumChoice = ranked
    .filter(
      (candidate) =>
        candidate.program.costTier === 3 &&
        candidate.program.id !== bestMatch.program.id,
    )
    .sort(byScoreThenId)[0];
  const smartBudgetChoice = ranked
    .filter(
      (candidate) =>
        candidate.program.costTier === 1 &&
        candidate.program.id !== bestMatch.program.id &&
        candidate.program.id !== premiumChoice.program.id,
    )
    .sort(byScoreThenId)[0];

  return [
    toRecommendation(bestMatch, "best-match"),
    toRecommendation(premiumChoice, "premium-choice"),
    toRecommendation(smartBudgetChoice, "smart-budget-choice"),
  ];
}

export function buildNeedMatches(
  submission: AssessmentSubmission,
  recommendation: ProgramRecommendation,
): NeedMatch[] {
  const requestedIds = [
    ...submission.answers.priorities,
    ...submission.answers.additionalNeeds,
  ];

  const uniqueRequestedIds = [...new Set(requestedIds)];
  const rows = uniqueRequestedIds.slice(0, 6).map((id) => {
    const isStrong = recommendation.program.priorityFit.includes(id);
    const isPartial = recommendation.program.additionalNeedsFit.includes(id);

    return {
      id,
      label: labelsById.get(id) ?? id,
      status: isStrong
        ? ("Ισχυρή αντιστοίχιση" as const)
        : isPartial
          ? ("Μερική αντιστοίχιση" as const)
          : ("Προς επιβεβαίωση" as const),
      detail: isStrong
        ? "Αποτελεί βασική κατεύθυνση αυτού του demo προγράμματος."
        : isPartial
          ? "Υπάρχει ενδεικτική πρόβλεψη, με όρους που πρέπει να ελεγχθούν."
          : "Χρειάζεται ειδικός έλεγχος από σύμβουλο πριν θεωρηθεί διαθέσιμη.",
    };
  });

  if (rows.length > 0) return rows;

  return [
    {
      id: "approach",
      label: "Προσέγγιση προστασίας και κόστους",
      status: "Μερική αντιστοίχιση",
      detail: "Η κατάταξη βασίστηκε στην προσέγγιση και την απαλλαγή που επέλεξες.",
    },
  ];
}
