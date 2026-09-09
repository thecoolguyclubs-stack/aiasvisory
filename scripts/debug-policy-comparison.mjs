import {
  buildProgramPolicyComparison,
  compactPolicyComparisonDisplay,
} from "../src/lib/policy-analysis/comparison.ts";
import {
  policyComparisonRecommendationFixture,
  policyComparisonSubmissionFixture,
  policySnapshotFixture,
} from "../src/lib/policy-analysis/fixtures.ts";
import { normalizeDatabaseProgramDetail } from "../src/lib/recommendations/database-normalization.ts";
import { normalizeProductFacts } from "../src/lib/recommendations/product-facts.ts";

const fallbackText =
  "Δεν βρέθηκε καθαρό δομημένο στοιχείο — χρειάζεται επιβεβαίωση από σύμβουλο.";

const medicalFamilyRawDetail = {
  contract_version: "product-detail-2026-07-v2",
  product_id: "GEN-MF",
  name: "Medical Family",
  company: "Generali",
  signals: [],
  coverage_facts: [
    {
      fact_id: "FACT-MF-WAIT",
      category: "Waiting",
      topic: "Γενική έναρξη ασθένειας",
      coverage_status: "Υπό αναμονή",
      term_analysis:
        "Η κάλυψη ασθένειας αρχίζει 30 ημέρες για Ελλάδα και 180 ημέρες για εξωτερικό.",
      waiting_period_text: "30 / 180 ημέρες",
      source_filename: "medical-family.pdf",
      article_section: "Έναρξη",
      human_validated: true,
    },
    {
      fact_id: "FACT-MF-HOSP",
      category: "Hospitalization",
      topic: "Ιδιωτικό νοσοκομείο",
      coverage_status: "Καλύπτεται",
      term_analysis:
        "100% των αναγνωρισμένων εξόδων μετά την αφαίρεση του επιλεγμένου ποσού συμμετοχής και μέχρι το ανώτατο όριο.",
      limit_frequency: "Πίνακας Παροχών",
      deductible_participation: "Επιλεγμένο ποσό συμμετοχής",
      geography: "Ελλάδα",
      network: "Συνεργαζόμενο ή μη",
      source_filename: "medical-family.pdf",
      article_section: "Νοσοκομειακή περίθαλψη",
      human_validated: true,
    },
    {
      fact_id: "FACT-MF-ABROAD",
      category: "Abroad",
      topic: "Νοσηλεία στο εξωτερικό",
      coverage_status: "Καλύπτεται",
      term_analysis:
        "100% εκτός ΗΠΑ/Καναδά και 95% σε ΗΠΑ/Καναδά, μετά την αφαίρεση συμμετοχής.",
      limit_frequency: "Πίνακας Παροχών",
      deductible_participation: "Επιλεγμένο ποσό συμμετοχής",
      geography: "Εξωτερικό",
      source_filename: "medical-family.pdf",
      article_section: "Εξωτερικό",
      human_validated: true,
    },
  ],
  deductible_rules: [],
  monetary_facts: [],
  waiting_periods: [],
  exclusions: [],
  provider_networks: [
    {
      network_id: "NET-MF",
      provider_type: "Hospital",
      provider_name: "Dynamic network",
      region: "Ελλάδα",
      network_status: "Needs current verification",
      human_validated: false,
    },
  ],
  procedure_fees: [],
  supplementary_benefits: [],
  claim_rules: [],
};

const programDetail = normalizeDatabaseProgramDetail(medicalFamilyRawDetail);
if (!programDetail) throw new Error("Medical Family debug fixture did not normalize.");

const proposedFacts = normalizeProductFacts(programDetail);
const snapshot = structuredClone(policySnapshotFixture);
snapshot.coverages.push({
  id: "debug-current-abroad",
  category: "international",
  title: "Νοσηλεία στο εξωτερικό",
  description: "Κάλυψη νοσηλείας στο εξωτερικό.",
  status: "confirmed",
  annualLimit: null,
  perIncidentLimit: null,
  currency: null,
  coveragePercentage: null,
  conditions: [],
  evidence: [{ page: 1, section: "Abroad", excerpt: "Covered abroad." }],
});
snapshot.coverages.push({
  id: "debug-current-geography",
  category: "other",
  title: "Γεωγραφική ισχύς",
  description: "Η κάλυψη ισχύει σε Ελλάδα και εξωτερικό.",
  status: "confirmed",
  annualLimit: null,
  perIncidentLimit: null,
  currency: null,
  coveragePercentage: null,
  conditions: [],
  evidence: [{ page: 1, section: "Scope", excerpt: "Greece and abroad." }],
});

const comparison = buildProgramPolicyComparison({
  snapshot,
  submission: policyComparisonSubmissionFixture,
  profile: {
    insuredPeople: { title: "Μόνο εμένα", detail: "1 ασφαλισμένος", count: 1 },
    ageProfile: { title: "36 ετών", detail: "1 ασφαλισμένος", ages: [36] },
    currentInsurance: { title: "Ατομικό", detail: "Υπάρχουσα κάλυψη" },
    mainGoal: { title: "Αξιολόγηση", detail: "Σύγκριση" },
    priorities: ["Νοσοκομειακό δίκτυο"],
    deductiblePreference: "Μικρή συμμετοχή",
    costAndProtectionApproach: "Ισορροπία",
    additionalNeeds: ["Ταξίδια"],
    hasUploadedPolicy: true,
    generatedAt: "2026-07-15T00:00:00.000Z",
  },
  recommendation: {
    ...policyComparisonRecommendationFixture,
    programId: "GEN-MF",
    programName: "Medical Family",
  },
  programDetail,
  proposedFacts,
});

const rows = Object.values(comparison.displayGroups ?? {})
  .flat()
  .map((item) => {
    const display = compactPolicyComparisonDisplay(item);
    return {
      rowTitle: item.title,
      existingPolicyText: display.existingPolicyText,
      proposedProgramText: display.proposedProgramText,
      conclusionText: display.conclusionText,
      containsFallback: display.proposedProgramText.includes(fallbackText),
      availableProposedFacts: (item.proposedFacts ?? []).map((fact) => ({
        factId: fact.factId,
        topicKey: fact.topicKey,
        measureType: fact.measureType,
        title: fact.title,
        exactText: fact.exactText,
        conditions: fact.conditions,
      })),
    };
  });

console.log(
  JSON.stringify(
    {
      programId: programDetail.programId,
      programName: programDetail.name,
      policyComparisonPayloadHasDisplayField: rows.some((row) =>
        Object.hasOwn(row, "display"),
      ),
      note:
        "PolicyComparison UI computes compact display text at render time from policyComparison items and proposedFacts.",
      rows,
    },
    null,
    2,
  ),
);
