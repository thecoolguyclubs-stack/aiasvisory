import type { AssessmentSubmission } from "@/lib/assessment/types";
import { deductibleBands, isDeductibleBand } from "@/lib/assessment/preferences";

import { toCustomerGreekText, type AllowedClaim } from "./explanation";
import {
  buildCustomerEvidenceItems,
  type CustomerEvidenceItem,
} from "./customer-evidence";
import type {
  DatabaseProgramDetail,
  LiveRecommendation,
  LiveRecommendationCategory,
} from "./contracts";

export interface RecommendationPresentation {
  categoryLabel: string;
  subtitle: string;
  reason: string;
  strengths: CustomerEvidenceItem[];
  confirmationNote: string;
  customerEvidence: CustomerEvidenceItem[];
  relatedNeeds: string[];
  allowedClaims: AllowedClaim[];
  restrictions: string[];
  tradeOffs: string[];
  confirmations: string[];
}

interface NeedDescriptor {
  label: string;
  tokens?: string[];
  kinds?: CustomerEvidenceItem["kind"][];
  requiresCoverageAndFinancial?: boolean;
}

const categoryLabels: Record<LiveRecommendationCategory, string> = {
  "best-match": "Καλύτερη αντιστοίχιση",
  "premium-choice": "Ενισχυμένη επιλογή",
  "smart-budget-choice": "Ισορροπημένη επιλογή",
};

const prioritySignals: Readonly<Record<string, string>> = {
  "hospital-network": "private_hospitals",
  surgery: "major_hospitalization",
  "low-deductible": "low_deductible",
  outpatient: "outpatient",
  "high-limit": "major_hospitalization",
  "serious-illness": "major_hospitalization",
  emergency: "emergency",
  checkup: "prevention",
  abroad: "international",
  pediatric: "pediatric",
};

const additionalNeedSignals: Readonly<Record<string, string>> = {
  outpatient_visits: "outpatient",
  frequent_travel: "international",
  immediate_use: "waiting_period_sensitivity",
  maternity: "maternity",
  young_children: "pediatric",
  physiotherapy: "physiotherapy",
  prevention_checkup: "prevention",
  provider_freedom: "provider_freedom",
  low_bureaucracy: "low_bureaucracy",
};

const priorityNeeds: Readonly<Record<string, NeedDescriptor>> = {
  "hospital-network": {
    label: "νοσηλεία σε ιδιωτικό νοσοκομείο",
    tokens: ["private hospitals", "συνεργαζομεν νοσοκομ", "δικτυ"],
    kinds: ["network"],
  },
  surgery: {
    label: "κάλυψη χειρουργικών επεμβάσεων",
    tokens: ["surgery", "χειρουργ", "operation", "επεμβασ"],
    kinds: ["coverage"],
  },
  "low-deductible": {
    label: "χαμηλότερη προσωπική συμμετοχή",
    tokens: ["low deductible", "deductible flexibility", "συμμετοχ", "απαλλαγ"],
    kinds: ["deductible"],
  },
  outpatient: {
    label: "ιατρικές επισκέψεις και διαγνωστικές εξετάσεις",
    tokens: ["outpatient", "διαγνωστικ", "ιατρικες επισκεψ", "γιατρο"],
  },
  "high-limit": {
    label: "υψηλό όριο κάλυψης για μακροχρόνια νοσηλεία",
    tokens: ["major hospitalization", "νοσηλει", "μεθ", "μαφ"],
  },
  "serious-illness": {
    label: "κάλυψη σοβαρών ασθενειών",
    tokens: ["major hospitalization", "critical illness", "σοβαρ", "παθησ"],
    kinds: ["coverage", "limit"],
  },
  emergency: {
    label: "αντιμετώπιση επειγόντων περιστατικών",
    tokens: ["emergency", "επειγον", "εκτακτ", "πρωτες βοηθει"],
  },
  checkup: {
    label: "πρόληψη και προληπτικό έλεγχο",
    tokens: ["prevention", "προληπ", "check up"],
  },
  abroad: {
    label: "νοσοκομειακή φροντίδα στο εξωτερικό",
    tokens: ["international", "εξωτερικ"],
  },
  pediatric: {
    label: "παιδιατρική φροντίδα",
    tokens: ["pediatric", "παιδιατρ", "παιδο"],
  },
};

const additionalNeeds: Readonly<Record<string, NeedDescriptor>> = {
  outpatient_visits: {
    label: "εξωνοσοκομειακές επισκέψεις",
    tokens: ["outpatient", "ιατρικες επισκεψ", "γιατρο"],
  },
  frequent_travel: {
    label: "ανάγκες που σχετίζονται με συχνά ταξίδια",
    tokens: ["international", "εξωτερικ", "ταξιδ"],
  },
  immediate_use: {
    label: "ευαισθησία στις περιόδους αναμονής",
    tokens: ["waiting period", "περιοδος αναμονης", "εναρξη"],
    kinds: ["waiting_period"],
  },
  maternity: {
    label: "παροχές μητρότητας",
    tokens: ["maternity", "μητροτ", "τοκετ"],
  },
  young_children: {
    label: "ανάγκες μικρών παιδιών",
    tokens: ["pediatric", "παιδιατρ", "παιδο", "παιδι"],
  },
  physiotherapy: {
    label: "φυσικοθεραπείες",
    tokens: ["physiotherapy", "φυσικοθεραπ"],
  },
  prevention_checkup: {
    label: "πρόληψη και προληπτικό έλεγχο",
    tokens: ["prevention", "προληπ", "check up"],
  },
  provider_freedom: {
    label: "επιλογή γιατρού ή νοσοκομείου",
    tokens: ["provider freedom", "δικτυ", "συνεργαζομεν", "παροχ"],
    kinds: ["network"],
  },
  low_bureaucracy: {
    label: "σαφή διαδικασία χρήσης των παροχών",
    tokens: ["low bureaucracy", "διαδικασ", "αποζημιωσ"],
    kinds: ["service"],
  },
};

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("el-GR")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const unique = (values: Array<string | undefined>) =>
  [...new Set(values.filter((value): value is string => Boolean(value?.trim())))];

function evidenceSearchText(item: CustomerEvidenceItem) {
  return normalize(`${item.topicKey} ${item.title} ${item.summary}`);
}

function needHasEvidence(
  descriptor: NeedDescriptor,
  evidence: CustomerEvidenceItem[],
) {
  const hasCoverage = evidence.some((item) =>
    ["coverage", "network", "service", "limit"].includes(item.kind),
  );
  const hasFinancial = evidence.some((item) =>
    ["deductible", "limit"].includes(item.kind),
  );
  if (descriptor.requiresCoverageAndFinancial && !(hasCoverage && hasFinancial)) {
    return false;
  }

  if (!descriptor.tokens?.length && !descriptor.kinds?.length) return true;

  return evidence.some((item) => {
    const kindMatch = descriptor.kinds?.includes(item.kind) ?? false;
    const text = evidenceSearchText(item);
    const tokenMatch =
      descriptor.tokens?.some((token) => text.includes(normalize(token))) ??
      false;
    return kindMatch || tokenMatch;
  });
}

function selectedSignalCodes(submission: AssessmentSubmission) {
  return unique([
    ...(submission.answers.careAccess === "freedom" ? ["provider_freedom"] : []),
    ...submission.answers.priorities.map((value) => prioritySignals[value]),
    ...submission.answers.additionalNeeds.map(
      (value) => additionalNeedSignals[value],
    ),
    ["minimum", "up-to-1500"].includes(submission.answers.deductible ?? "") ? "low_deductible" : undefined,
    ["large", "over-5000"].includes(submission.answers.deductible ?? "")
      ? "deductible_flexibility"
      : undefined,
  ]);
}

function relatedUserNeeds(
  submission: AssessmentSubmission,
  evidence: CustomerEvidenceItem[],
) {
  const descriptors: NeedDescriptor[] = [
    ...(submission.answers.careAccess === "freedom" ? [additionalNeeds.provider_freedom] : []),
    ...submission.answers.priorities
      .map((value) => priorityNeeds[value])
      .filter((value): value is NeedDescriptor => Boolean(value)),
    ...submission.answers.additionalNeeds
      .map((value) => additionalNeeds[value])
      .filter((value): value is NeedDescriptor => Boolean(value)),
  ];

  if (submission.answers.deductible) {
    descriptors.push({
      label: isDeductibleBand(submission.answers.deductible)
        ? `προτίμηση συμμετοχής ${deductibleBands[submission.answers.deductible].label}`
        : ["minimum", "up-to-1500"].includes(submission.answers.deductible ?? "")
          ? "προτίμηση για ελάχιστη δυνατή συμμετοχή"
          : ["large", "over-5000"].includes(submission.answers.deductible ?? "")
            ? "αποδοχή μεγαλύτερης απαλλαγής"
            : "αποδοχή μικρής συμμετοχής",
      kinds: ["deductible"],
    });
  }

  if (submission.answers.costApproach) {
    descriptors.push(
      submission.answers.costApproach === "balanced"
        ? {
            label: "στάθμιση προστασίας και οικονομικών όρων",
            requiresCoverageAndFinancial: true,
          }
        : {
            label:
              submission.answers.costApproach === "complete"
                ? "έμφαση στην έκταση της προστασίας"
                : "έμφαση σε βασικές τεκμηριωμένες καλύψεις",
            kinds: ["coverage", "network", "service", "limit"],
          },
    );
  }

  if (
    ["family", "children"].includes(
      submission.answers.insuredPeople ?? "",
    )
  ) {
    descriptors.push({
      label:
        submission.answers.insuredPeople === "children"
          ? "ανάγκες παιδιών"
          : "ανάγκες οικογενειακού προφίλ",
      tokens: ["pediatric", "παιδιατρ", "παιδο", "παιδι", "μητροτ"],
    });
  }

  const matched = unique(
    descriptors
      .filter((descriptor) => needHasEvidence(descriptor, evidence))
      .map((descriptor) => descriptor.label),
  );

  return matched.length > 0
    ? matched
    : ["τις δηλωμένες προτεραιότητες που έχουν τεκμηριωμένο αντίστοιχο"];
}

function joinGreek(values: string[]) {
  if (values.length <= 1) return values[0] ?? "τεκμηριωμένα στοιχεία";
  if (values.length === 2) return `${values[0]} και ${values[1]}`;
  return `${values.slice(0, -1).join(", ")} και ${values.at(-1)}`;
}

function allowedClaims(evidence: CustomerEvidenceItem[]): AllowedClaim[] {
  return evidence.slice(0, 12).map((item, index) => ({
    id: `claim-${String(index + 1).padStart(2, "0")}`,
    topic: item.topicKey,
    statement: `${item.title}: ${item.summary}`,
    evidenceIds: item.sourceReferences,
    sourceType: item.kind,
  }));
}

function buildRestrictions(
  recommendation: LiveRecommendation,
  evidence: CustomerEvidenceItem[],
  detail?: DatabaseProgramDetail | null,
) {
  const evidenceRestrictions = evidence
    .filter((item) =>
      ["deductible", "waiting_period", "exclusion"].includes(item.kind),
    )
    .map((item) => `${item.title}: ${item.summary}`);
  return unique([
    ...evidenceRestrictions,
    ...recommendation.missingEvidence.map(
      (item) => `Χρειάζεται επιβεβαίωση για ${item.title}.`,
    ),
    detail?.criticalNote ? toCustomerGreekText(detail.criticalNote) : undefined,
    detail?.dataQualityWarning
      ? toCustomerGreekText(detail.dataQualityWarning)
      : undefined,
  ]).slice(0, 8);
}

function selectStrengths(evidence: CustomerEvidenceItem[]) {
  const positiveKinds: CustomerEvidenceItem["kind"][] = [
    "coverage",
    "network",
    "service",
    "limit",
  ];
  // A restriction is not a strength, even when fewer than three benefits are known.
  const ordered = evidence.filter((item) => positiveKinds.includes(item.kind));
  const selected: CustomerEvidenceItem[] = [];
  const seenTopics = new Set<string>();
  const seenKinds = new Set<CustomerEvidenceItem["kind"]>();

  for (const item of ordered) {
    if (selected.length === 3) break;
    if (seenTopics.has(item.topicKey)) continue;
    if (seenKinds.has(item.kind) && selected.length < 2) continue;
    selected.push(item);
    seenTopics.add(item.topicKey);
    seenKinds.add(item.kind);
  }

  for (const item of ordered) {
    if (selected.length === 3) break;
    if (seenTopics.has(item.topicKey)) continue;
    selected.push(item);
    seenTopics.add(item.topicKey);
  }

  for (const item of ordered) {
    if (selected.length === 3) break;
    if (selected.includes(item)) continue;
    selected.push(item);
  }

  return selected;
}

function categoryReasonLead(
  category: LiveRecommendationCategory,
  programName: string,
  needPhrase: string,
) {
  switch (category) {
    case "premium-choice":
      return `Το ${programName} λειτουργεί ως πιο ενισχυμένη κατεύθυνση για ${needPhrase}.`;
    case "smart-budget-choice":
      return `Το ${programName} κρατά ισορροπία ανάμεσα σε ${needPhrase} και στο επίπεδο συμμετοχής.`;
    case "best-match":
    default:
      return `Το ${programName} έρχεται πιο κοντά σε ${needPhrase}.`;
  }
}

function cardReason(
  recommendation: LiveRecommendation,
  relatedNeeds: string[],
  strengths: CustomerEvidenceItem[],
  restrictionItem?: CustomerEvidenceItem,
) {
  const needPhrase = joinGreek(relatedNeeds.slice(0, 2));
  const strengthPhrase =
    strengths.length > 0
      ? joinGreek(strengths.slice(0, 2).map((item) => `«${item.title}»`))
      : "τα διαθέσιμα τεκμηριωμένα σημεία του προϊόντος";
  const missingEvidenceTitle = recommendation.missingEvidence[0]?.title;
  const ending = missingEvidenceTitle
    ? `Παραμένει όμως προς επιβεβαίωση το σημείο «${missingEvidenceTitle}», οπότε η αξιολόγηση δεν προεξοφλεί κάλυψη χωρίς πρόσθετο έλεγχο από σύμβουλο.`
    : restrictionItem
      ? `Χρειάζεται παράλληλα έλεγχος στο σημείο «${restrictionItem.title}», πριν θεωρηθεί δεδομένη η εφαρμογή του στην πράξη.`
      : "Οι ακριβείς προϋποθέσεις εφαρμογής των παραπάνω παροχών χρειάζονται επιβεβαίωση από ασφαλιστικό σύμβουλο.";

  return `${categoryReasonLead(recommendation.category, recommendation.programName, needPhrase)} Η αξιολόγηση στηρίζεται κυρίως σε ${strengthPhrase}, ώστε η πρόταση να πατά σε συγκεκριμένα διαθέσιμα στοιχεία και όχι σε γενικές υποθέσεις. ${ending}`;
}

export function buildRecommendationPresentation(
  submission: AssessmentSubmission,
  recommendation: LiveRecommendation,
  detail?: DatabaseProgramDetail | null,
): RecommendationPresentation {
  const customerEvidence = buildCustomerEvidenceItems(
    [
      ...recommendation.evidenceReferences,
      ...(detail?.evidenceReferences ?? []),
    ],
    selectedSignalCodes(submission),
  );
  const relatedNeeds = relatedUserNeeds(submission, customerEvidence);
  const strengths = selectStrengths(customerEvidence);
  const restrictions = buildRestrictions(
    recommendation,
    customerEvidence,
    detail,
  );
  const restrictionItem = customerEvidence.find((item) =>
    ["waiting_period", "deductible", "exclusion"].includes(item.kind),
  );
  const confirmationNote = recommendation.missingEvidence[0]
    ? `Ο σύμβουλος θα επιβεβαιώσει το σημείο «${recommendation.missingEvidence[0].title}».`
    : restrictionItem
      ? `Επιβεβαίωσε το σημείο «${restrictionItem.title}» και τις προϋποθέσεις εφαρμογής του.`
      : "Οι ακριβείς προϋποθέσεις εφαρμογής θα επιβεβαιωθούν από ασφαλιστικό σύμβουλο.";

  return {
    categoryLabel: categoryLabels[recommendation.category],
    subtitle:
      strengths.length > 0
        ? `Κύρια τεκμηρίωση: ${joinGreek(
            strengths.slice(0, 2).map((item) => item.title),
          )}`
        : "Η πρόταση χρειάζεται πρόσθετη επιβεβαίωση τεκμηρίωσης.",
    reason: cardReason(
      recommendation,
      relatedNeeds,
      strengths,
      restrictionItem,
    ),
    strengths,
    confirmationNote,
    customerEvidence,
    relatedNeeds,
    allowedClaims: allowedClaims(customerEvidence),
    restrictions,
    tradeOffs: restrictions.slice(0, 3),
    confirmations: [confirmationNote],
  };
}
