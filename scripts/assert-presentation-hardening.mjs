import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import "./register-typescript-paths.mjs";

import {
  buildDeterministicExplanation,
  validateRecommendationExplanationOutput,
} from "../src/lib/recommendations/explanation.ts";
import { estimateDemoPrice } from "../src/lib/pricing/demo-pricing.ts";
const {
  buildCustomerEvidenceItems,
  customerEvidenceIdentity,
} = await import("../src/lib/recommendations/customer-evidence.ts");

const recommendationCardSource = await readFile(
  new URL("../src/components/advisory/RecommendationCard.tsx", import.meta.url),
  "utf8",
);
assert.match(
  recommendationCardSource.replace(/\s+/g, " "),
  /Math\.max\(\s*0,\s*Math\.min\(\s*100,\s*recommendation\.matchScore\s*\)\s*,?\s*\)/u,
  "RecommendationCard must clamp progress-bar width to 0..100.",
);

const duplicateIdentityEvidence = buildCustomerEvidenceItems([
  {
    id: "source-first",
    type: "coverage_fact",
    title: "Αρχικό σημείο",
    excerpt: "Πρώτη τεκμηριωμένη διατύπωση.",
    signalCode: "low-deductible",
  },
  {
    id: "source-second",
    type: "coverage_fact",
    title: "Δεύτερο σημείο",
    excerpt: "Δεύτερη τεκμηριωμένη διατύπωση.",
    signalCode: "low-deductible",
  },
  {
    id: "source-third",
    type: "network_fact",
    title: "Δίκτυο παρόχων",
    excerpt: "Ανεξάρτητο τεκμηριωμένο σημείο.",
    signalCode: "private-hospitals",
  },
  {
    id: "source-fourth",
    type: "coverage_fact",
    title: "Αρχικό σημείο",
    excerpt: "Πρώτη τεκμηριωμένη διατύπωση.",
    signalCode: "low-deductible",
  },
]);
const evidenceIdentities = duplicateIdentityEvidence.map(
  customerEvidenceIdentity,
);
assert.equal(
  new Set(evidenceIdentities).size,
  evidenceIdentities.length,
  "Presentation evidence must have unique canonical identities.",
);
const lowDeductibleEvidence = duplicateIdentityEvidence.filter(
  (item) => item.topicKey === "low-deductible",
);
assert.equal(
  lowDeductibleEvidence.length,
  2,
  "Distinct cards sharing one topic must both survive presentation deduplication.",
);
const firstLowDeductibleEvidence = lowDeductibleEvidence.find(
  (item) => item.title === "Αρχικό σημείο",
);
assert.deepEqual(firstLowDeductibleEvidence?.sourceReferences, [
  "source-first",
  "source-fourth",
]);
assert.ok(
  lowDeductibleEvidence.some((item) => item.title === "Δεύτερο σημείο"),
  "A different card with the same topic must not be discarded.",
);

const explanationInput = {
  category: "best-match",
  relatedNeeds: [
    "αντιμετώπιση επειγόντων περιστατικών",
    "στάθμιση προστασίας και οικονομικών όρων",
  ],
  allowedClaims: [
    {
      id: "claim-01",
      topic: "emergency",
      statement:
        "Έκτακτα και επείγοντα: Οι διαθέσιμοι όροι περιγράφουν παροχές για έκτακτα και επείγοντα περιστατικά.",
      evidenceIds: ["FACT-1"],
      sourceType: "coverage",
    },
    {
      id: "claim-02",
      topic: "hospital-care",
      statement:
        "Νοσοκομειακή περίθαλψη: Οι διαθέσιμοι όροι περιγράφουν νοσοκομειακή περίθαλψη και τις προϋποθέσεις χρήσης της.",
      evidenceIds: ["FACT-2"],
      sourceType: "coverage",
    },
    {
      id: "claim-03",
      topic: "waiting-period",
      statement:
        "Περίοδος αναμονής για γενική έναρξη ασθένειας: Οι διαθέσιμοι όροι αναφέρουν περίοδο αναμονής 1 μήνα.",
      evidenceIds: ["FACT-3"],
      sourceType: "waiting_period",
    },
  ],
  restrictions: [
    "Περίοδος αναμονής για γενική έναρξη ασθένειας: Οι διαθέσιμοι όροι αναφέρουν περίοδο αναμονής 1 μήνα.",
  ],
  productName: "Medical Prime",
  insurer: "Generali Hellas",
  strengthTitles: [
    "Έκτακτα και επείγοντα",
    "Νοσοκομειακή περίθαλψη",
  ],
  tradeOffs: [
    "Περίοδος αναμονής για γενική έναρξη ασθένειας: Οι διαθέσιμοι όροι αναφέρουν περίοδο αναμονής 1 μήνα.",
  ],
  missingEvidenceTitles: ["Επιβεβαίωση ειδικών προϋποθέσεων έναρξης"],
};

const deterministicOutput = buildDeterministicExplanation(explanationInput);
assert.ok(
  validateRecommendationExplanationOutput(
    deterministicOutput,
    explanationInput,
  ),
  "The deterministic explanation must pass the same strict output validator as OpenAI.",
);
assert.ok(
  deterministicOutput.paragraph.split(/\s+/).filter(Boolean).length >= 80 &&
    deterministicOutput.paragraph.split(/\s+/).filter(Boolean).length <= 120,
);

const differentProductOutput = buildDeterministicExplanation({
  ...explanationInput,
  category: "premium-choice",
  productName: "MEDISYSTEM Benefit",
  insurer: "INTERAMERICAN Ελληνική Ασφαλιστική",
  relatedNeeds: [
    "πρόσβαση σε συνεργαζόμενους νοσοκομειακούς παρόχους",
    "έμφαση στην έκταση της προστασίας",
  ],
  strengthTitles: [
    "Συνεργαζόμενοι νοσοκομειακοί πάροχοι",
    "Όριο νοσοκομειακής περίθαλψης",
  ],
  tradeOffs: [
    "Χρειάζεται επιβεβαίωση για τους ακριβείς οικονομικούς όρους συμμετοχής.",
  ],
  missingEvidenceTitles: ["Επιβεβαίωση οικονομικών όρων συμμετοχής"],
});
assert.notEqual(
  deterministicOutput.paragraph,
  differentProductOutput.paragraph,
  "Different products and needs must not receive the same explanation.",
);

assert.equal(
  validateRecommendationExplanationOutput(
    { ...deterministicOutput, usedClaimIds: ["claim-01", "invented-claim"] },
    explanationInput,
  ),
  null,
  "Unknown claim IDs must be rejected.",
);
assert.equal(
  validateRecommendationExplanationOutput(
    {
      ...deterministicOutput,
      paragraph: deterministicOutput.paragraph.replace(
        "Η αξιολόγηση βασίζεται",
        "Με όριο 9999 ευρώ, η αξιολόγηση βασίζεται",
      ),
    },
    explanationInput,
  ),
  null,
  "Numbers absent from the evidence input must be rejected.",
);
for (const invalidPhrase of [
  "πλήρης κάλυψη",
  "μεγάλο δίκτυο νοσοκομείων",
  "μηδενική απαλλαγή",
  "waiting periods",
  "...",
]) {
  assert.equal(
    validateRecommendationExplanationOutput(
      {
        ...deterministicOutput,
        paragraph: deterministicOutput.paragraph.replace(
          "Η αξιολόγηση βασίζεται",
          `${invalidPhrase}. Η αξιολόγηση βασίζεται`,
        ),
      },
      explanationInput,
    ),
    null,
    `Unsafe output must be rejected: ${invalidPhrase}`,
  );
}

const submission = {
  version: 4,
  answers: {
    insuredPeople: "self",
    currentInsurance: "none",
    evaluationGoal: "first_time",
    priorities: ["emergency"],
    deductible: "small",
    costApproach: "balanced",
    additionalNeeds: [],
  },
  people: [
    {
      id: "self",
      role: "self",
      label: "fixture",
      birthDate: "1990-01-01",
    },
  ],
  policyFile: null,
  uploadDecision: null,
  submittedAt: "2026-07-15T00:00:00.000Z",
};
const generaliEstimate = estimateDemoPrice(submission, "GEN-MP");
assert.deepEqual(
  generaliEstimate,
  estimateDemoPrice(submission, "GEN-MP"),
  "Demo pricing must be deterministic.",
);
assert.notDeepEqual(
  generaliEstimate,
  estimateDemoPrice(submission, "GEN-MF"),
  "The deterministic program scenario may vary by program.",
);
assert.deepEqual(Object.keys(generaliEstimate).sort(), [
  "basis",
  "isIllustrative",
  "monthlyFrom",
  "monthlyTo",
  "yearlyFrom",
  "yearlyTo",
]);
assert.equal(generaliEstimate.isIllustrative, true);
assert.equal(
  generaliEstimate.basis.some((item) => item.includes("1990-01-01")),
  false,
  "The pricing basis must never expose a birth date.",
);

const liveOrigin = process.env.APP_ORIGIN?.trim().replace(/\/$/u, "");
const livePresentationPrograms = [];
if (liveOrigin) {
  const { buildRecommendationPresentation } = await import(
    "../src/lib/recommendations/presentation.ts"
  );
  const recommendationResponse = await fetch(
    liveOrigin + "/api/recommendations",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(submission),
    },
  );
  const recommendationPayload = await recommendationResponse.json();
  assert.equal(recommendationResponse.status, 200);
  assert.equal(recommendationPayload.ok, true);
  assert.equal(recommendationPayload.recommendations.length, 3);

  for (const recommendation of recommendationPayload.recommendations) {
    const detailResponse = await fetch(
      liveOrigin + "/api/programs/" + encodeURIComponent(recommendation.programId),
    );
    const detailPayload = await detailResponse.json();
    assert.equal(detailResponse.status, 200);
    assert.equal(detailPayload.ok, true);
    const presentation = buildRecommendationPresentation(
      submission,
      recommendation,
      detailPayload.program,
    );
    const identities = presentation.customerEvidence.map(
      customerEvidenceIdentity,
    );
    const exactCards = presentation.customerEvidence.map((item) =>
      `${item.title.trim()}::${item.summary.trim()}`,
    );
    assert.equal(
      new Set(identities).size,
      identities.length,
      `Duplicate canonical evidence identity for ${recommendation.programId}.`,
    );
    assert.equal(
      new Set(exactCards).size,
      exactCards.length,
      `Duplicate exact evidence card for ${recommendation.programId}.`,
    );
    livePresentationPrograms.push(recommendation.programId);
  }
}

console.log(
  JSON.stringify({
    ok: true,
    deterministicExplanationWordCount:
      deterministicOutput.paragraph.split(/\s+/).filter(Boolean).length,
    rejectedUnsafeOutputs: 5,
    demoPriceDeterministic: true,
    canonicalEvidenceIdentitiesUnique: true,
    distinctSameTopicEvidencePreserved: true,
    exactEvidenceCardsDeduplicated: true,
    livePresentationPrograms,
  }),
);

const { buildRecommendationPresentation } = await import("../src/lib/recommendations/presentation.ts");
const cautiousPresentation = buildRecommendationPresentation({ version:4, answers:{insuredPeople:"self",currentInsurance:"none",evaluationGoal:"first_time",priorities:["surgery"],additionalNeeds:[],deductible:"1500-to-5000",costApproach:"balanced",careAccess:"network"}, people:[{id:"self",role:"self",label:"Εμένα",birthDate:"1990-01-01"}],policyFile:null,uploadDecision:"skipped",submittedAt:"2026-09-10T00:00:00Z" }, {programId:"test",programName:"UI test",insurer:"Test",category:"best-match",categoryLabel:"Best Match",matchScore:70,strengths:[],tradeOffs:[],itemsToConfirm:[],warnings:[],missingEvidence:[],policyComparison:null,evidenceReferences:[{id:"wait",type:"waiting_period",title:"Περίοδος αναμονής",excerpt:"Απαιτείται επιβεβαίωση αναμονής.",signalCode:"waiting-period"}]});
assert.equal(cautiousPresentation.strengths.length,0,"Waiting periods must never be promoted to strengths to fill a card.");
