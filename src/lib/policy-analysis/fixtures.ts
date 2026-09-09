import type { AssessmentSubmission } from "@/lib/assessment/types";
import type {
  DatabaseProgramDetail,
  LiveRecommendation,
} from "@/lib/recommendations/contracts";
import type { ComparableProductFact } from "@/lib/recommendations/product-facts";

import type { ExistingPolicySnapshot } from "./schema";

export const policySnapshotFixture: ExistingPolicySnapshot = {
  schemaVersion: "existing-policy-v1",
  documentMetadata: {
    insurer: "DemoCare Insurance",
    productName: "Anonymous Health Plan",
    policyType: "Individual health insurance",
    currency: "EUR",
    pageCount: 1,
  },
  insuredScope: { type: "individual", memberCount: 1 },
  coverages: [
    {
      id: "hospitalization-main",
      category: "hospitalization",
      title: "Νοσοκομειακή κάλυψη",
      description: "Επιβεβαιωμένη κάλυψη νοσηλείας.",
      status: "confirmed",
      annualLimit: 50_000,
      perIncidentLimit: null,
      currency: "EUR",
      coveragePercentage: 80,
      conditions: [],
      evidence: [
        {
          page: 1,
          section: "Hospitalization",
          excerpt: "Annual hospitalization limit: EUR 50000.",
        },
      ],
    },
  ],
  deductibles: [
    {
      title: "Απαλλαγή νοσηλείας",
      amount: 1_500,
      percentage: null,
      currency: "EUR",
      appliesTo: "Νοσοκομειακή κάλυψη",
      conditions: [],
      status: "confirmed",
      evidence: [
        {
          page: 1,
          section: "Deductible",
          excerpt: "Deductible: EUR 1500 per hospitalization incident.",
        },
      ],
    },
  ],
  waitingPeriods: [
    {
      appliesTo: "Νοσοκομειακή κάλυψη",
      durationValue: 3,
      durationUnit: "months",
      conditions: [],
      status: "confirmed",
      evidence: [
        {
          page: 1,
          section: "Waiting period",
          excerpt: "Waiting period: 3 months for hospitalization.",
        },
      ],
    },
  ],
  exclusions: [
    {
      title: "Αισθητικές επεμβάσεις",
      description: "Οι προαιρετικές αισθητικές επεμβάσεις εξαιρούνται.",
      conditions: [],
      status: "confirmed",
      evidence: [
        {
          page: 1,
          section: "Exclusions",
          excerpt: "Elective cosmetic treatment is not covered.",
        },
      ],
    },
  ],
  networks: [
    {
      title: "Συμβεβλημένα νοσοκομεία",
      description: "Χρήση συμβεβλημένου δικτύου με προηγούμενη ενημέρωση.",
      conditions: ["Απαιτείται προηγούμενη ενημέρωση."],
      status: "conditional",
      evidence: [
        {
          page: 1,
          section: "Network",
          excerpt: "Contracted hospitals are subject to prior notification.",
        },
      ],
    },
  ],
  importantConditions: [],
  extractionWarnings: [],
  unverifiedItems: [],
  extractionConfidence: "high",
};

export const policyComparisonSubmissionFixture: AssessmentSubmission = {
  version: 4,
  answers: {
    insuredPeople: "self",
    currentInsurance: "individual",
    evaluationGoal: "evaluate_existing",
    priorities: ["low-deductible", "high-limit", "hospital-network"],
    deductible: "small",
    costApproach: "balanced",
    additionalNeeds: ["immediate_use"],
  },
  people: [
    {
      id: "self",
      role: "self",
      label: "Ασφαλιζόμενο άτομο",
      birthDate: "1990-01-01",
    },
  ],
  policyFile: {
    name: "uploaded-policy.pdf",
    size: 2_048,
    type: "application/pdf",
  },
  uploadDecision: "uploaded",
  submittedAt: "2026-07-15T00:00:00.000Z",
};

export const policyComparisonRecommendationFixture: LiveRecommendation = {
  programId: "fixture-program",
  programName: "Fixture Program",
  insurer: "Fixture Insurer",
  category: "best-match",
  categoryLabel: "Best Match",
  matchScore: 88,
  strengths: [],
  tradeOffs: [],
  itemsToConfirm: [],
  warnings: [],
  missingEvidence: [],
  evidenceReferences: [],
  policyComparison: null,
};

export const policyComparisonProgramDetailFixture: DatabaseProgramDetail = {
  contractVersion: "product-detail-2026-07-v2",
  programId: "fixture-program",
  name: "Fixture Program",
  insurer: "Fixture Insurer",
  signals: [],
  evidenceReferences: [],
  coverageFacts: [],
  deductibleRules: [],
  monetaryFacts: [],
  waitingPeriods: [],
  exclusions: [],
  providerNetworks: [],
  procedureFees: [],
  supplementaryBenefits: [],
  claimRules: [],
};

const baseComparableFact = {
  sourceRecordType: "coverage_fact" as const,
  category: "Hospitalization",
  valueNumber: null,
  currency: null,
  durationValue: null,
  durationUnit: null,
  scope: "unknown" as const,
  conditions: [],
  sourceFilename: "fixture-terms.pdf",
  articleSection: "Benefits",
  pdfPage: null,
  humanValidated: true,
};

export const policyComparisonFactsFixture: ComparableProductFact[] = [
  {
    ...baseComparableFact,
    factId: "evidence-limit",
    topicKey: "hospitalization",
    measureType: "annual_limit",
    title: "Ετήσιο όριο νοσοκομειακής κάλυψης",
    exactText: "Ετήσιο όριο νοσηλείας 100.000 EUR.",
    valueNumber: 100_000,
    currency: "EUR",
    scope: "annual",
  },
  {
    ...baseComparableFact,
    factId: "evidence-deductible",
    sourceRecordType: "deductible_rule",
    topicKey: "hospitalization",
    measureType: "deductible_amount",
    title: "Απαλλαγή νοσοκομειακής κάλυψης",
    exactText: "Απαλλαγή 500 EUR για νοσηλεία.",
    valueNumber: 500,
    currency: "EUR",
  },
  {
    ...baseComparableFact,
    factId: "evidence-waiting",
    sourceRecordType: "waiting_period",
    topicKey: "hospitalization",
    measureType: "waiting_period",
    title: "Περίοδος αναμονής νοσοκομειακής κάλυψης",
    exactText: "Περίοδος αναμονής 6 μήνες για νοσηλεία.",
    durationValue: 6,
    durationUnit: "months",
  },
];
