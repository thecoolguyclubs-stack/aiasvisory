import type { AssessmentSubmission, InsuranceProfile } from "@/lib/assessment/types";
import type {
  DatabaseProgramDetail,
  LiveRecommendation,
} from "@/lib/recommendations/contracts";
import type { ComparableProductFact } from "../recommendations/product-facts";

import type {
  ExistingPolicySnapshot,
  PolicyEvidenceReference,
} from "./schema";

export type ComparisonStatus =
  | "improvement"
  | "similar"
  | "tradeoff"
  | "current_policy_advantage"
  | "unknown"
  | "needs_confirmation";

export type PolicyComparisonItem = {
  topicKey: string;
  category:
    | "coverage"
    | "limit"
    | "deductible"
    | "waiting_period"
    | "exclusion"
    | "network"
    | "service";
  title: string;
  userPriority: boolean;
  status: ComparisonStatus;
  existingPolicySummary: string;
  proposedProgramSummary: string;
  reasoning: string;
  currentEvidence: PolicyEvidenceReference[];
  proposedEvidenceIds: string[];
  proposedFacts?: ComparableProductFact[];
  requiresAdvisorConfirmation: boolean;
};

export type CompactPolicyComparisonDisplay = {
  existingPolicyText: string;
  proposedProgramText: string;
  conclusionText: string;
  confidence: "high" | "medium" | "low";
  needsAdvisorConfirmation: boolean;
};

export type PolicyComparisonDisplayGroups = {
  directlyComparable: PolicyComparisonItem[];
  proposedAdditionalCoverages: PolicyComparisonItem[];
  currentNeedsConfirmation: PolicyComparisonItem[];
  financialTermsAndDeductibles: PolicyComparisonItem[];
  waitingPeriodsAndRestrictions: PolicyComparisonItem[];
};

export type ProgramPolicyComparison = {
  programId: string;
  overallStatus:
    | "meaningful_improvement"
    | "mixed"
    | "broadly_similar"
    | "insufficient_evidence";
  improvements: PolicyComparisonItem[];
  tradeoffs: PolicyComparisonItem[];
  currentPolicyAdvantages: PolicyComparisonItem[];
  similarItems: PolicyComparisonItem[];
  unknownItems: PolicyComparisonItem[];
  displayGroups?: PolicyComparisonDisplayGroups;
  priorityCoverageSummary: {
    matchedPriorities: string[];
    improvedPriorities: string[];
    unresolvedPriorities: string[];
  };
  advisorConfirmationItems: string[];
};

export interface BuildProgramPolicyComparisonInput {
  snapshot: ExistingPolicySnapshot;
  submission: AssessmentSubmission;
  profile: InsuranceProfile;
  recommendation: LiveRecommendation;
  programDetail: DatabaseProgramDetail;
  proposedFacts: ComparableProductFact[];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string");

function isComparisonItem(value: unknown): value is PolicyComparisonItem {
  if (!isRecord(value)) return false;
  return Boolean(
    typeof value.topicKey === "string" &&
      [
        "coverage",
        "limit",
        "deductible",
        "waiting_period",
        "exclusion",
        "network",
        "service",
      ].includes(String(value.category)) &&
      typeof value.title === "string" &&
      typeof value.userPriority === "boolean" &&
      [
        "improvement",
        "similar",
        "tradeoff",
        "current_policy_advantage",
        "unknown",
        "needs_confirmation",
      ].includes(String(value.status)) &&
      typeof value.existingPolicySummary === "string" &&
      typeof value.proposedProgramSummary === "string" &&
      typeof value.reasoning === "string" &&
      Array.isArray(value.currentEvidence) &&
      value.currentEvidence.every(
        (reference) =>
          isRecord(reference) &&
          (reference.page === null || typeof reference.page === "number") &&
          (reference.section === null || typeof reference.section === "string") &&
          typeof reference.excerpt === "string",
      ) &&
      isStringArray(value.proposedEvidenceIds) &&
      (value.proposedFacts === undefined || Array.isArray(value.proposedFacts)) &&
      typeof value.requiresAdvisorConfirmation === "boolean",
  );
}

function isDisplayGroups(value: unknown): value is PolicyComparisonDisplayGroups {
  if (!isRecord(value)) return false;
  return [
    value.directlyComparable,
    value.proposedAdditionalCoverages,
    value.currentNeedsConfirmation,
    value.financialTermsAndDeductibles,
    value.waitingPeriodsAndRestrictions,
  ].every(
    (collection) =>
      Array.isArray(collection) && collection.every(isComparisonItem),
  );
}

export function isProgramPolicyComparison(
  value: unknown,
): value is ProgramPolicyComparison {
  if (!isRecord(value)) return false;
  const prioritySummary = value.priorityCoverageSummary;
  const itemCollections = [
    value.improvements,
    value.tradeoffs,
    value.currentPolicyAdvantages,
    value.similarItems,
    value.unknownItems,
  ];
  return Boolean(
    typeof value.programId === "string" &&
      [
        "meaningful_improvement",
        "mixed",
        "broadly_similar",
        "insufficient_evidence",
      ].includes(String(value.overallStatus)) &&
      itemCollections.every(
        (collection) =>
          Array.isArray(collection) && collection.every(isComparisonItem),
      ) &&
      (value.displayGroups === undefined || isDisplayGroups(value.displayGroups)) &&
      isRecord(prioritySummary) &&
      isStringArray(prioritySummary.matchedPriorities) &&
      isStringArray(prioritySummary.improvedPriorities) &&
      isStringArray(prioritySummary.unresolvedPriorities) &&
      isStringArray(value.advisorConfirmationItems),
  );
}

const unique = <T>(values: T[]) => [...new Set(values)];

function normalizeTopicText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .toLocaleLowerCase("el-GR");
}

function topicForCurrent(value: string) {
  const text = normalizeTopicText(value);
  if (/μητροτ|τοκετ|εγκυμοσ|matern|pregnan/u.test(text)) return "maternity";
  if (/παιδιατρ|παιδ|τεκν|pediatr|child/u.test(text)) return "pediatric";
  if (/φυσικοθεραπ|physiotherap/u.test(text)) return "physiotherapy";
  if (/προληψ|check ?up|prevent/u.test(text)) return "prevention";
  if (/εξωτερικ|διεθν|ταξιδ|abroad|international|travel/u.test(text)) return "international";
  if (/επειγον|εκτακτ|emergenc|urgent/u.test(text)) return "emergency";
  if (/διαγνωσ|diagnostic|εξετασ/u.test(text)) return "diagnostics";
  if (/εξωνοσοκομ|outpatient|επισκεψ.*ιατρ/u.test(text)) return "outpatient";
  if (/χειρουργ|επεμβ|surg/u.test(text)) return "surgery";
  if (/ογκο|καρκ|χημειο|ακτινο|σοβαρ.*ασθεν|critical illness/u.test(text)) return "serious_illness";
  if (/ατυχημ|accident/u.test(text) && /νοσηλει|hospital/u.test(text)) return "accident_hospitalization";
  if (/νοσηλει|νοσοκομ|hospital|inpatient|μεθ|μαφ/u.test(text)) return "hospitalization";
  if (/βοηθεια|assistance|μεταφορ|διακομιδ/u.test(text)) return "assistance";
  if (/δικτυ|network|παροχ|provider/u.test(text)) return "network";
  return "other";
}

function factKey(fact: ComparableProductFact) {
  return [
    fact.sourceRecordType,
    fact.factId,
    fact.topicKey,
    fact.scope,
    fact.measureType,
    fact.valueNumber ?? "",
    fact.currency ?? "",
    fact.durationValue ?? "",
    fact.durationUnit ?? "",
    fact.exactText,
    fact.conditions.join("|"),
  ].join("::");
}

function proposedSummary(facts: ComparableProductFact[], fallback: string) {
  return unique(facts.map((fact) => fact.exactText).filter(Boolean)).join(" · ") || fallback;
}

const noCleanStructuredFact =
  "Δεν βρέθηκε καθαρό δομημένο στοιχείο — χρειάζεται επιβεβαίωση από σύμβουλο.";

const scopeLabels: Record<ComparableProductFact["scope"], string | null> = {
  annual: "ανά έτος",
  per_incident: "ανά περιστατικό",
  per_person: "ανά ασφαλισμένο",
  family: "οικογενειακά",
  individual: "ατομικά",
  unknown: null,
};

const durationUnitLabels: Record<"days" | "months" | "years", string> = {
  days: "ημέρες",
  months: "μήνες",
  years: "έτη",
};

const measureDisplayLabels: Record<ComparableProductFact["measureType"], string> = {
  annual_limit: "Όριο κάλυψης",
  per_incident_limit: "Όριο κάλυψης",
  coverage_percentage: "Ποσοστό κάλυψης",
  deductible_amount: "Απαλλαγή",
  deductible_percentage: "Απαλλαγή",
  copayment_amount: "Συμμετοχή",
  copayment_percentage: "Συμμετοχή",
  waiting_period: "Περίοδος αναμονής",
  confirmed_coverage: "Κάλυψη",
  exclusion: "Περιορισμός",
  network: "Δίκτυο",
  service: "Παροχή",
  procedure_fee: "Ιατρική αμοιβή",
  raw_monetary_term: "Οικονομικός όρος",
  unknown: "Όρος",
};

function compactText(value: string) {
  return value
    .replace(/\s+/gu, " ")
    .replace(/\s+([.,;:])/gu, "$1")
    .trim();
}

function formatMoney(value: number, currency: string | null) {
  const amount = value.toLocaleString("el-GR");
  return currency === "EUR" ? `${amount}€` : `${amount} ${currency ?? ""}`.trim();
}

function compactExistingSummary(
  item: Omit<PolicyComparisonItem, "requiresAdvisorConfirmation" | "proposedEvidenceIds" | "display">,
) {
  const summary = compactText(item.existingPolicySummary);
  if (
    summary &&
    summary.length <= 180 &&
    !/(άρθρο|σελ\.?|pdf|κεφάλαιο|παράγραφος|σύμφωνα με|αναφέρεται ότι)/iu.test(summary)
  ) {
    return summary;
  }
  return noCleanStructuredFact;
}

function compactProposedFact(fact: ComparableProductFact) {
  const scope = scopeLabels[fact.scope];
  const exactText = compactText(fact.exactText);
  if (
    /^(Γεωγραφική ισχύς|Κάλυψη εξωτερικού|Χρονικό όριο|Δίκτυο):/u.test(exactText) &&
    exactText.length <= 180
  ) {
    return exactText.endsWith(".") ? exactText : `${exactText}.`;
  }
  if (/Πίνακας Παροχών/iu.test(exactText) && exactText.length <= 80) {
    return "Όριο σύμφωνα με τον Πίνακα Παροχών — χρειάζεται επιβεβαίωση ποσού.";
  }
  if (fact.valueNumber !== null) {
    const value = fact.measureType.includes("percentage")
      ? `${fact.valueNumber.toLocaleString("el-GR")}%`
      : formatMoney(fact.valueNumber, fact.currency);
    return compactText(
      `${measureDisplayLabels[fact.measureType]} ${value}${scope ? ` ${scope}` : ""}.`,
    );
  }
  if (fact.durationValue !== null && fact.durationUnit) {
    return compactText(
      `${measureDisplayLabels[fact.measureType]} ${fact.durationValue} ${durationUnitLabels[fact.durationUnit]}.`,
    );
  }
  if (fact.scope !== "unknown") {
    return compactText(`${measureDisplayLabels[fact.measureType]} ${scope}.`);
  }
  const conditions = fact.conditions
    .map(compactText)
    .filter((condition) => condition.length > 0 && condition.length <= 80)
    .slice(0, 2);
  if (conditions.length > 0) {
    return compactText(
      `${measureDisplayLabels[fact.measureType]}: ${conditions.join(" · ")}.`,
    );
  }
  if (fact.measureType === "confirmed_coverage" || fact.measureType === "service") {
    return `${measureDisplayLabels[fact.measureType]} ${fact.title}.`;
  }
  if (fact.measureType === "network") return `Δίκτυο: ${fact.title}.`;
  if (fact.measureType === "exclusion") return "Περιορισμός που χρειάζεται επιβεβαίωση όρων.";
  return null;
}

function compactProposedSummary(
  facts: ComparableProductFact[],
  item?: Pick<PolicyComparisonItem, "title" | "category">,
) {
  const priority = (value: string) => {
    if (/Γεωγραφική ισχύς/iu.test(item?.title ?? "") && value.startsWith("Γεωγραφική ισχύς:")) {
      return 0;
    }
    if (item?.category === "network" && value.startsWith("Δίκτυο:")) return 0;
    if (value.startsWith("Κάλυψη εξωτερικού:")) return 0;
    if (value.startsWith("Χρονικό όριο:")) return 1;
    if (value.startsWith("Γεωγραφική ισχύς:")) return 2;
    if (value.startsWith("Δίκτυο:")) return 3;
    if (value.startsWith("Όριο σύμφωνα με τον Πίνακα Παροχών")) return 4;
    return 5;
  };
  const values = unique(
    facts
      .map(compactProposedFact)
      .filter((value): value is string => Boolean(value))
      .filter((value) => value.length <= 180),
  ).sort((left, right) => priority(left) - priority(right));
  const primaryValues =
    values[0]?.startsWith("Κάλυψη εξωτερικού:") &&
    values[1]?.startsWith("Χρονικό όριο:")
      ? values.slice(0, 2)
      : values.slice(0, 1);
  return primaryValues.join(" ") || noCleanStructuredFact;
}

function hasComparableCleanFact(
  item: Omit<PolicyComparisonItem, "requiresAdvisorConfirmation" | "proposedEvidenceIds" | "display">,
) {
  const proposedFacts = item.proposedFacts ?? [];
  if (proposedFacts.length === 0) return false;
  if (
    ["unknown", "needs_confirmation"].includes(item.status) ||
    ["network", "service", "coverage"].includes(item.category)
  ) {
    return false;
  }
  return proposedFacts.some((fact) =>
    fact.valueNumber !== null ||
    (fact.durationValue !== null && fact.durationUnit !== null) ||
    ["confirmed_coverage", "service", "network"].includes(fact.measureType),
  );
}

function compactConclusion(
  item: Omit<PolicyComparisonItem, "requiresAdvisorConfirmation" | "proposedEvidenceIds" | "display">,
) {
  if (!hasComparableCleanFact(item)) {
    if ((item.proposedFacts ?? []).some((fact) => compactProposedFact(fact))) {
      return "Το προτεινόμενο πρόγραμμα εμφανίζει σχετική τεκμηριωμένη παροχή, με επιβεβαίωση όρων από σύμβουλο.";
    }
    return "Η σύγκριση χρειάζεται επιβεβαίωση από σύμβουλο.";
  }
  if (item.status === "improvement") {
    if (item.category === "deductible") {
      return "Το προτεινόμενο πρόγραμμα μειώνει την προσωπική συμμετοχή.";
    }
    if (item.category === "limit") {
      return "Το προτεινόμενο πρόγραμμα εμφανίζει υψηλότερο συγκρίσιμο όριο κάλυψης.";
    }
    if (item.category === "waiting_period") {
      return "Το προτεινόμενο πρόγραμμα εμφανίζει συντομότερη συγκρίσιμη περίοδο αναμονής.";
    }
    return "Το προτεινόμενο πρόγραμμα εμφανίζει τεκμηριωμένη βελτίωση σε αυτό το σημείο.";
  }
  if (item.status === "current_policy_advantage") {
    return "Το υπάρχον συμβόλαιο φαίνεται ισχυρότερο σε αυτό το συγκρίσιμο σημείο.";
  }
  if (item.status === "tradeoff") {
    return "Το προτεινόμενο πρόγραμμα έχει λιγότερο ευνοϊκό συγκρίσιμο όρο.";
  }
  if (item.status === "similar") {
    return "Τα διαθέσιμα structured στοιχεία δείχνουν παρόμοια εικόνα.";
  }
  return "Η σύγκριση χρειάζεται επιβεβαίωση από σύμβουλο.";
}

export function compactPolicyComparisonDisplay(
  item: Omit<PolicyComparisonItem, "requiresAdvisorConfirmation" | "proposedEvidenceIds"> | PolicyComparisonItem,
): CompactPolicyComparisonDisplay {
  const needsAdvisorConfirmation = ["unknown", "needs_confirmation"].includes(item.status);
  const proposedFacts = item.proposedFacts ?? [];
  const hasCleanProposed = proposedFacts.some((fact) => compactProposedFact(fact));
  return {
    existingPolicyText: compactExistingSummary(item),
    proposedProgramText: compactProposedSummary(proposedFacts, item),
    conclusionText: compactConclusion(item),
    confidence:
      item.status === "unknown" || !hasCleanProposed
        ? "low"
        : needsAdvisorConfirmation
          ? "medium"
          : "high",
    needsAdvisorConfirmation,
  };
}

function createItem(
  base: Omit<PolicyComparisonItem, "requiresAdvisorConfirmation" | "proposedEvidenceIds"> & {
    proposedEvidenceIds?: string[];
  },
): PolicyComparisonItem {
  const proposedFacts = base.proposedFacts ?? [];
  const requiresAdvisorConfirmation = ["unknown", "needs_confirmation"].includes(
    base.status,
  );
  return {
    ...base,
    proposedEvidenceIds:
      base.proposedEvidenceIds ?? unique(proposedFacts.map((fact) => fact.factId)),
    requiresAdvisorConfirmation,
  };
}

function priorityFor(
  submission: AssessmentSubmission,
  topic: string,
  category: PolicyComparisonItem["category"],
) {
  const priorities = new Set(submission.answers.priorities);
  const needs = new Set(submission.answers.additionalNeeds);
  return Boolean(
    (category === "network" &&
      (priorities.has("hospital-network") || needs.has("provider_freedom"))) ||
      (category === "deductible" && priorities.has("low-deductible")) ||
      (category === "limit" && priorities.has("high-limit")) ||
      (topic === "outpatient" && priorities.has("outpatient")) ||
      (topic === "emergency" && priorities.has("emergency")) ||
      (topic === "prevention" &&
        (priorities.has("checkup") || needs.has("prevention_checkup"))) ||
      (topic === "international" &&
        (priorities.has("abroad") || needs.has("frequent_travel"))) ||
      (topic === "pediatric" &&
        (priorities.has("pediatric") || needs.has("young_children"))) ||
      (topic === "maternity" && needs.has("maternity")) ||
      (topic === "physiotherapy" && needs.has("physiotherapy")) ||
      (category === "waiting_period" && needs.has("immediate_use")) ||
      (category === "service" && needs.has("low_bureaucracy"))
  );
}

function durationInDays(
  value: number,
  unit: "days" | "months" | "years",
) {
  if (unit === "years") return value * 365;
  if (unit === "months") return value * 30;
  return value;
}

function hasConditions(fact: ComparableProductFact) {
  return fact.conditions.length > 0;
}

function statusForHigherIsBetter(existing: number, proposed: number): ComparisonStatus {
  if (proposed > existing) return "improvement";
  if (proposed < existing) return "current_policy_advantage";
  return "similar";
}

function statusForLowerIsBetter(existing: number, proposed: number): ComparisonStatus {
  if (proposed < existing) return "improvement";
  if (proposed > existing) return "tradeoff";
  return "similar";
}

function reasoningForStatus(status: ComparisonStatus, subject: string) {
  if (status === "improvement") return `Το προτεινόμενο πρόγραμμα έχει ευνοϊκότερο ${subject} με τα ίδια συγκρίσιμα χαρακτηριστικά.`;
  if (status === "current_policy_advantage") return `Το υπάρχον συμβόλαιο έχει ευνοϊκότερο ${subject} με τα ίδια συγκρίσιμα χαρακτηριστικά.`;
  if (status === "tradeoff") return `Το προτεινόμενο πρόγραμμα έχει λιγότερο ευνοϊκό ${subject} με τα ίδια συγκρίσιμα χαρακτηριστικά.`;
  if (status === "similar") return `Τα διαθέσιμα στοιχεία δείχνουν ίδιο ${subject}.`;
  return `Το ακριβές κείμενο είναι διαθέσιμο, αλλά δεν επιτρέπει ασφαλή ισοδυναμία για το ${subject}.`;
}

function existingMoney(value: number, currency: string | null) {
  return `${value.toLocaleString("el-GR")} ${currency ?? "(νόμισμα προς επιβεβαίωση)"}`;
}

function dedupeItems(items: PolicyComparisonItem[]) {
  const seen = new Set<string>();
  return items.filter((comparisonItem) => {
    const factsSignature = (comparisonItem.proposedFacts ?? [])
      .map(factKey)
      .sort()
      .join("|");
    const key = [
      comparisonItem.topicKey,
      comparisonItem.category,
      comparisonItem.title,
      comparisonItem.existingPolicySummary,
      factsSignature,
    ].join("::");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function groupUnusedFacts(
  facts: ComparableProductFact[],
  usedFacts: Set<string>,
  predicate: (fact: ComparableProductFact) => boolean,
) {
  const grouped = new Map<string, ComparableProductFact[]>();
  for (const fact of facts) {
    if (usedFacts.has(factKey(fact)) || !predicate(fact)) continue;
    const key = `${fact.topicKey}|${fact.category}`;
    grouped.set(key, [...(grouped.get(key) ?? []), fact]);
  }
  return grouped;
}

export function buildProgramPolicyComparison({
  snapshot,
  submission,
  profile,
  recommendation,
  programDetail,
  proposedFacts,
}: BuildProgramPolicyComparisonInput): ProgramPolicyComparison {
  const facts =
    recommendation.programId === programDetail.programId
      ? proposedFacts
      : [];
  const directlyComparable: PolicyComparisonItem[] = [];
  const proposedAdditionalCoverages: PolicyComparisonItem[] = [];
  const currentNeedsConfirmation: PolicyComparisonItem[] = [];
  const financialTermsAndDeductibles: PolicyComparisonItem[] = [];
  const waitingPeriodsAndRestrictions: PolicyComparisonItem[] = [];
  const usedFacts = new Set<string>();
  const currentTopics = new Set<string>();

  const markFactsUsed = (selected: ComparableProductFact[]) => {
    selected.forEach((fact) => usedFacts.add(factKey(fact)));
  };

  for (const coverage of snapshot.coverages) {
    const topic = coverage.category === "other"
      ? topicForCurrent(`${coverage.title} ${coverage.description}`)
      : coverage.category;
    currentTopics.add(topic);
    const isGeographyRow = /γεωγραφ|ισχυ|scope|territor/u.test(
      normalizeTopicText(`${coverage.title} ${coverage.description}`),
    );
    const related = facts.filter(
      (fact) =>
        fact.topicKey === topic ||
        (isGeographyRow &&
          fact.measureType === "service" &&
          /^Γεωγραφική ισχύς:/u.test(fact.exactText)) ||
        (topic === "international" &&
          fact.measureType === "service" &&
          /Γεωγραφική ισχύς|Κάλυψη εξωτερικού|Χρονικό όριο/u.test(fact.exactText)) ||
        (topic === "network" && fact.measureType === "network"),
    );
    const directCoverage = related.filter((fact) =>
      ["confirmed_coverage", "service"].includes(fact.measureType),
    );
    let producedNumeric = false;

    for (const [measureType, existingValue, scope, label] of [
      ["annual_limit", coverage.annualLimit, "annual", "ετήσιο όριο"],
      ["per_incident_limit", coverage.perIncidentLimit, "per_incident", "όριο ανά περιστατικό"],
      ["coverage_percentage", coverage.coveragePercentage, "unknown", "ποσοστό κάλυψης"],
    ] as const) {
      if (existingValue === null) continue;
      producedNumeric = true;
      const candidates = related.filter(
        (fact) => fact.measureType === measureType,
      );
      const comparable = candidates.find(
        (fact) =>
          fact.valueNumber !== null &&
          fact.scope === scope &&
          (measureType === "coverage_percentage" ||
            (coverage.currency !== null && fact.currency === coverage.currency)),
      );
      const displayFacts = comparable ? [comparable] : candidates;
      markFactsUsed(displayFacts);
      const canCompare =
        comparable !== undefined &&
        coverage.status === "confirmed" &&
        coverage.conditions.length === 0 &&
        !hasConditions(comparable);
      const status = canCompare
        ? statusForHigherIsBetter(existingValue, comparable.valueNumber as number)
        : candidates.length > 0 || related.length > 0
          ? "needs_confirmation"
          : "unknown";
      const comparisonItem = createItem({
        topicKey: `${topic}-${measureType}`,
        category: "limit",
        title: `${coverage.title} · ${label}`,
        userPriority: priorityFor(submission, topic, "limit"),
        status,
        existingPolicySummary:
          measureType === "coverage_percentage"
            ? `${existingValue}%`
            : existingMoney(existingValue, coverage.currency),
        proposedProgramSummary: proposedSummary(
          displayFacts,
          "Δεν υπάρχει σχετικό structured record για το προτεινόμενο πρόγραμμα.",
        ),
        reasoning: canCompare
          ? reasoningForStatus(status, label)
          : displayFacts.length > 0
            ? reasoningForStatus("needs_confirmation", label)
            : `Δεν υπάρχει σχετικό structured record για το ${label}.`,
        currentEvidence: coverage.evidence,
        proposedFacts: displayFacts,
      });
      (canCompare ? directlyComparable : currentNeedsConfirmation).push(comparisonItem);
    }

    if (!producedNumeric) {
      const displayFacts = directCoverage.length > 0 ? directCoverage : related;
      markFactsUsed(displayFacts);
      const canCompare =
        directCoverage.length > 0 &&
        coverage.status === "confirmed" &&
        coverage.conditions.length === 0 &&
        directCoverage.every((fact) => !hasConditions(fact));
      const comparisonItem = createItem({
        topicKey: `${topic}-coverage`,
        category: "coverage",
        title: coverage.title,
        userPriority: priorityFor(submission, topic, "coverage"),
        status: canCompare
          ? "similar"
          : displayFacts.length > 0
            ? "needs_confirmation"
            : "unknown",
        existingPolicySummary: coverage.description,
        proposedProgramSummary: proposedSummary(
          displayFacts,
          "Δεν υπάρχει σχετικό structured record για το προτεινόμενο πρόγραμμα.",
        ),
        reasoning: canCompare
          ? "Και οι δύο πλευρές τεκμηριώνουν σχετική κάλυψη, χωρίς αριθμητική σύγκριση όρων."
          : displayFacts.length > 0
            ? "Υπάρχει ακριβές κείμενο σχετικού όρου, αλλά οι προϋποθέσεις χρειάζονται έλεγχο."
            : "Δεν υπάρχει σχετικό structured record για τη συγκεκριμένη κάλυψη.",
        currentEvidence: coverage.evidence,
        proposedFacts: displayFacts,
      });
      (canCompare ? directlyComparable : currentNeedsConfirmation).push(comparisonItem);
    }
  }

  snapshot.deductibles.forEach((deductible, index) => {
    const topic = topicForCurrent(`${deductible.appliesTo} ${deductible.title}`);
    currentTopics.add(topic);
    const measureType = deductible.percentage !== null
      ? "deductible_percentage"
      : "deductible_amount";
    const existingValue = deductible.percentage ?? deductible.amount;
    const candidates = facts.filter(
      (fact) =>
        fact.topicKey === topic &&
        [measureType, measureType.replace("deductible", "copayment")].includes(
          fact.measureType,
        ),
    );
    const comparable = existingValue === null
      ? undefined
      : candidates.find(
          (fact) =>
            fact.valueNumber !== null &&
            (measureType === "deductible_percentage" ||
              (deductible.currency !== null && fact.currency === deductible.currency)),
        );
    const displayFacts = comparable ? [comparable] : candidates;
    markFactsUsed(displayFacts);
    const canCompare =
      existingValue !== null &&
      comparable !== undefined &&
      deductible.status === "confirmed" &&
      deductible.conditions.length === 0 &&
      !hasConditions(comparable);
    const status = canCompare
      ? statusForLowerIsBetter(existingValue, comparable.valueNumber as number)
      : displayFacts.length > 0
        ? "needs_confirmation"
        : "unknown";
    financialTermsAndDeductibles.push(
      createItem({
        topicKey: `${topic}-deductible-${index}`,
        category: "deductible",
        title: deductible.title,
        userPriority: priorityFor(submission, topic, "deductible"),
        status,
        existingPolicySummary:
          deductible.percentage !== null
            ? `${deductible.percentage}%`
            : deductible.amount !== null
              ? existingMoney(deductible.amount, deductible.currency)
              : "Δεν προκύπτει σαφές ποσό ή ποσοστό.",
        proposedProgramSummary: proposedSummary(
          displayFacts,
          "Δεν υπάρχει σχετικό structured record απαλλαγής ή συμμετοχής.",
        ),
        reasoning: canCompare
          ? reasoningForStatus(status, "όρο απαλλαγής ή συμμετοχής")
          : displayFacts.length > 0
            ? "Ο ακριβής οικονομικός όρος διατηρείται, αλλά δεν είναι ασφαλής η αριθμητική σύγκριση."
            : "Δεν υπάρχει σχετικό structured record απαλλαγής ή συμμετοχής.",
        currentEvidence: deductible.evidence,
        proposedFacts: displayFacts,
      }),
    );
  });

  snapshot.waitingPeriods.forEach((waitingPeriod, index) => {
    const topic = topicForCurrent(waitingPeriod.appliesTo);
    currentTopics.add(topic);
    const candidates = facts.filter(
      (fact) => fact.topicKey === topic && fact.measureType === "waiting_period",
    );
    const comparable = candidates.find(
      (fact) => fact.durationValue !== null && fact.durationUnit !== null,
    );
    const existingDays =
      waitingPeriod.durationValue !== null && waitingPeriod.durationUnit
        ? durationInDays(waitingPeriod.durationValue, waitingPeriod.durationUnit)
        : null;
    const proposedDays =
      comparable?.durationValue !== null && comparable?.durationValue !== undefined && comparable.durationUnit
        ? durationInDays(comparable.durationValue, comparable.durationUnit)
        : null;
    const displayFacts = comparable ? [comparable] : candidates;
    markFactsUsed(displayFacts);
    const canCompare =
      existingDays !== null &&
      proposedDays !== null &&
      waitingPeriod.status === "confirmed" &&
      waitingPeriod.conditions.length === 0 &&
      comparable !== undefined &&
      !hasConditions(comparable);
    const status = canCompare
      ? statusForLowerIsBetter(existingDays, proposedDays)
      : displayFacts.length > 0
        ? "needs_confirmation"
        : "unknown";
    waitingPeriodsAndRestrictions.push(
      createItem({
        topicKey: `${topic}-waiting-${index}`,
        category: "waiting_period",
        title: `Περίοδος αναμονής · ${waitingPeriod.appliesTo}`,
        userPriority: priorityFor(submission, topic, "waiting_period"),
        status,
        existingPolicySummary:
          waitingPeriod.durationValue !== null && waitingPeriod.durationUnit
            ? `${waitingPeriod.durationValue} ${waitingPeriod.durationUnit}`
            : "Η διάρκεια δεν προκύπτει με σαφήνεια.",
        proposedProgramSummary: proposedSummary(
          displayFacts,
          "Δεν υπάρχει σχετικό structured record περιόδου αναμονής.",
        ),
        reasoning: canCompare
          ? reasoningForStatus(status, "χρόνο αναμονής")
          : displayFacts.length > 0
            ? "Το ακριβές κείμενο αναμονής διατηρείται, αλλά δεν δίνει μία ασφαλή συγκρίσιμη διάρκεια."
            : "Δεν υπάρχει σχετικό structured record περιόδου αναμονής.",
        currentEvidence: waitingPeriod.evidence,
        proposedFacts: displayFacts,
      }),
    );
  });

  snapshot.exclusions.forEach((exclusion, index) => {
    const topic = topicForCurrent(`${exclusion.title} ${exclusion.description}`);
    currentTopics.add(topic);
    const candidates = facts.filter(
      (fact) => fact.topicKey === topic && fact.measureType === "exclusion",
    );
    markFactsUsed(candidates);
    waitingPeriodsAndRestrictions.push(
      createItem({
        topicKey: `${topic}-exclusion-${index}`,
        category: "exclusion",
        title: exclusion.title,
        userPriority: priorityFor(submission, topic, "exclusion"),
        status: candidates.length > 0 ? "needs_confirmation" : "unknown",
        existingPolicySummary: exclusion.description,
        proposedProgramSummary: proposedSummary(
          candidates,
          "Δεν υπάρχει σχετικό structured record εξαίρεσης.",
        ),
        reasoning:
          candidates.length > 0
            ? "Οι περιορισμοί είναι σχετικοί, αλλά χρειάζεται έλεγχος του ακριβούς εύρους τους."
            : "Η απουσία σχετικού record δεν αποδεικνύει ότι η εξαίρεση δεν ισχύει.",
        currentEvidence: exclusion.evidence,
        proposedFacts: candidates,
      }),
    );
  });

  snapshot.networks.forEach((network, index) => {
    currentTopics.add("network");
    const candidates = facts.filter(
      (fact) =>
        fact.measureType === "network" ||
        (fact.measureType === "service" &&
          /Γεωγραφική ισχύς|Δίκτυο/u.test(fact.exactText)),
    );
    markFactsUsed(candidates);
    const canCompare =
      candidates.length > 0 &&
      network.status === "confirmed" &&
      network.conditions.length === 0;
    const comparisonItem = createItem({
      topicKey: `network-${index}`,
      category: "network",
      title: network.title,
      userPriority: priorityFor(submission, "network", "network"),
      status: canCompare ? "similar" : candidates.length > 0 ? "needs_confirmation" : "unknown",
      existingPolicySummary: network.description,
      proposedProgramSummary: proposedSummary(
        candidates,
        "Δεν υπάρχει σχετικό structured record δικτύου.",
      ),
      reasoning: canCompare
        ? "Και οι δύο πλευρές διαθέτουν στοιχείο δικτύου· το εύρος του χρειάζεται τελικό έλεγχο."
        : candidates.length > 0
          ? "Υπάρχουν πραγματικά στοιχεία παρόχων, αλλά όχι ασφαλής πλήρης ισοδυναμία δικτύου."
          : "Δεν υπάρχει σχετικό structured record δικτύου.",
      currentEvidence: network.evidence,
      proposedFacts: candidates,
    });
    (canCompare ? directlyComparable : currentNeedsConfirmation).push(comparisonItem);
  });

  snapshot.importantConditions.forEach((condition, index) => {
    const topic = topicForCurrent(`${condition.title} ${condition.description}`);
    const related = facts.filter((fact) => fact.topicKey === topic);
    markFactsUsed(related);
    currentNeedsConfirmation.push(
      createItem({
        topicKey: `${topic}-condition-${index}`,
        category: "service",
        title: condition.title,
        userPriority: priorityFor(submission, topic, "service"),
        status: related.length > 0 ? "needs_confirmation" : "unknown",
        existingPolicySummary: condition.description,
        proposedProgramSummary: proposedSummary(
          related,
          "Δεν υπάρχει σχετικό structured record για τον συγκεκριμένο όρο.",
        ),
        reasoning: "Ο σημαντικός όρος του υπάρχοντος συμβολαίου χρειάζεται ειδική επιβεβαίωση στο προτεινόμενο πρόγραμμα.",
        currentEvidence: condition.evidence,
        proposedFacts: related,
      }),
    );
  });

  const additionalCoverageGroups = groupUnusedFacts(
    facts,
    usedFacts,
    (fact) =>
      ["confirmed_coverage", "service"].includes(fact.measureType) &&
      !currentTopics.has(fact.topicKey),
  );
  for (const groupedFacts of additionalCoverageGroups.values()) {
    markFactsUsed(groupedFacts);
    const representative = groupedFacts[0];
    proposedAdditionalCoverages.push(
      createItem({
        topicKey: `${representative.topicKey}-additional`,
        category: representative.measureType === "service" ? "service" : "coverage",
        title: representative.title,
        userPriority: priorityFor(
          submission,
          representative.topicKey,
          representative.measureType === "service" ? "service" : "coverage",
        ),
        status: "needs_confirmation",
        existingPolicySummary: "Δεν προκύπτει αντίστοιχη δομημένη κάλυψη από το υπάρχον συμβόλαιο.",
        proposedProgramSummary: proposedSummary(groupedFacts, representative.exactText),
        reasoning: "Πρόκειται για πρόσθετη τεκμηριωμένη παροχή του προτεινόμενου προγράμματος, με όρους που χρειάζονται επιβεβαίωση.",
        currentEvidence: [],
        proposedFacts: groupedFacts,
      }),
    );
  }

  const financialGroups = groupUnusedFacts(
    facts,
    usedFacts,
    (fact) =>
      [
        "annual_limit",
        "per_incident_limit",
        "coverage_percentage",
        "deductible_amount",
        "deductible_percentage",
        "copayment_amount",
        "copayment_percentage",
        "procedure_fee",
        "raw_monetary_term",
      ].includes(fact.measureType) ||
      ["deductible_rule", "monetary_fact", "procedure_fee"].includes(
        fact.sourceRecordType,
      ),
  );
  for (const groupedFacts of financialGroups.values()) {
    markFactsUsed(groupedFacts);
    const representative = groupedFacts[0];
    financialTermsAndDeductibles.push(
      createItem({
        topicKey: `${representative.topicKey}-financial-${representative.category}`,
        category:
          representative.measureType.includes("deductible") ||
          representative.measureType.includes("copayment")
            ? "deductible"
            : "limit",
        title: representative.title,
        userPriority: priorityFor(submission, representative.topicKey, "deductible"),
        status: "needs_confirmation",
        existingPolicySummary: "Δεν υπάρχει ίδιο structured μέτρο στο υπάρχον συμβόλαιο για ασφαλή αριθμητική σύγκριση.",
        proposedProgramSummary: proposedSummary(groupedFacts, representative.exactText),
        reasoning: "Παρατίθενται οι ακριβείς οικονομικοί όροι· αριθμητικό συμπέρασμα δίνεται μόνο για ίδιο topic, measure, scope και currency.",
        currentEvidence: [],
        proposedFacts: groupedFacts,
      }),
    );
  }

  const restrictionGroups = groupUnusedFacts(
    facts,
    usedFacts,
    (fact) => ["waiting_period", "exclusion"].includes(fact.measureType),
  );
  for (const groupedFacts of restrictionGroups.values()) {
    markFactsUsed(groupedFacts);
    const representative = groupedFacts[0];
    waitingPeriodsAndRestrictions.push(
      createItem({
        topicKey: `${representative.topicKey}-restriction-${representative.category}`,
        category:
          representative.measureType === "waiting_period"
            ? "waiting_period"
            : "exclusion",
        title: representative.title,
        userPriority: priorityFor(
          submission,
          representative.topicKey,
          representative.measureType === "waiting_period"
            ? "waiting_period"
            : "exclusion",
        ),
        status: "needs_confirmation",
        existingPolicySummary: "Δεν υπάρχει ίδιο structured μέτρο στο υπάρχον συμβόλαιο.",
        proposedProgramSummary: proposedSummary(groupedFacts, representative.exactText),
        reasoning: "Ο ακριβής περιορισμός διατηρείται και χρειάζεται επιβεβαίωση στο πλήρες συμβόλαιο.",
        currentEvidence: [],
        proposedFacts: groupedFacts,
      }),
    );
  }

  const displayGroups: PolicyComparisonDisplayGroups = {
    directlyComparable: dedupeItems(directlyComparable),
    proposedAdditionalCoverages: dedupeItems(proposedAdditionalCoverages),
    currentNeedsConfirmation: dedupeItems(currentNeedsConfirmation),
    financialTermsAndDeductibles: dedupeItems(financialTermsAndDeductibles),
    waitingPeriodsAndRestrictions: dedupeItems(waitingPeriodsAndRestrictions),
  };
  const displayedFactKeys = new Set<string>();
  for (const group of Object.values(displayGroups)) {
    for (const comparisonItem of group) {
      const originalFacts = comparisonItem.proposedFacts ?? [];
      const uniqueFacts = originalFacts.filter((fact) => {
        if (/^Γεωγραφική ισχύς:/u.test(fact.exactText)) return true;
        const key = factKey(fact);
        if (displayedFactKeys.has(key)) return false;
        displayedFactKeys.add(key);
        return true;
      });
      if (uniqueFacts.length !== originalFacts.length) {
        comparisonItem.proposedFacts = uniqueFacts;
        comparisonItem.proposedEvidenceIds = unique(
          uniqueFacts.map((fact) => fact.factId),
        );
        comparisonItem.proposedProgramSummary = uniqueFacts.length > 0
          ? proposedSummary(uniqueFacts, comparisonItem.proposedProgramSummary)
          : "Η ίδια σχετική τεκμηρίωση έχει ήδη ομαδοποιηθεί σε προηγούμενο σημείο της σύγκρισης.";
      }
    }
  }
  const allItems = dedupeItems([
    ...displayGroups.directlyComparable,
    ...displayGroups.proposedAdditionalCoverages,
    ...displayGroups.currentNeedsConfirmation,
    ...displayGroups.financialTermsAndDeductibles,
    ...displayGroups.waitingPeriodsAndRestrictions,
  ]);

  if (allItems.length === 0) {
    const emptyItem = createItem({
      topicKey: "insufficient-policy-evidence",
      category: "coverage",
      title: "Διαθέσιμα στοιχεία σύγκρισης",
      userPriority: false,
      status: "unknown",
      existingPolicySummary: "Το PDF δεν περιέχει επαρκή δομημένα facts για ασφαλή σύγκριση.",
      proposedProgramSummary: "Δεν υπάρχουν σχετικά structured product records.",
      reasoning: "Η απουσία στοιχείου δεν θεωρείται βελτίωση.",
      currentEvidence: [],
      proposedFacts: [],
    });
    displayGroups.currentNeedsConfirmation.push(emptyItem);
    allItems.push(emptyItem);
  }

  const improvements = allItems.filter((candidate) => candidate.status === "improvement");
  const tradeoffs = allItems.filter((candidate) => candidate.status === "tradeoff");
  const currentPolicyAdvantages = allItems.filter(
    (candidate) => candidate.status === "current_policy_advantage",
  );
  const similarItems = allItems.filter((candidate) => candidate.status === "similar");
  const unknownItems = allItems.filter((candidate) =>
    ["unknown", "needs_confirmation"].includes(candidate.status),
  );
  const priorityItems = allItems.filter((candidate) => candidate.userPriority);
  const improvedPriorities = unique(
    improvements
      .filter((candidate) => candidate.userPriority)
      .map((candidate) => candidate.title),
  );
  const unresolvedPriorities = unique(
    unknownItems
      .filter((candidate) => candidate.userPriority)
      .map((candidate) => candidate.title),
  );
  const overallStatus: ProgramPolicyComparison["overallStatus"] =
    improvements.length > 0 &&
    (tradeoffs.length > 0 || currentPolicyAdvantages.length > 0)
      ? "mixed"
      : improvements.length > 0
        ? "meaningful_improvement"
        : tradeoffs.length > 0 || currentPolicyAdvantages.length > 0
          ? "mixed"
          : similarItems.length > 0 && unknownItems.length === 0
            ? "broadly_similar"
            : "insufficient_evidence";

  return {
    programId: recommendation.programId,
    overallStatus,
    improvements,
    tradeoffs,
    currentPolicyAdvantages,
    similarItems,
    unknownItems,
    displayGroups,
    priorityCoverageSummary: {
      matchedPriorities: unique([
        ...profile.priorities,
        ...priorityItems.map((candidate) => candidate.title),
      ]),
      improvedPriorities,
      unresolvedPriorities,
    },
    advisorConfirmationItems: unique(
      unknownItems.map((candidate) => candidate.title),
    ),
  };
}
