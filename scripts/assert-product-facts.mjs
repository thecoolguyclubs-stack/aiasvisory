import assert from "node:assert/strict";

import { normalizeDatabaseProgramDetail } from "../src/lib/recommendations/database-normalization.ts";
import { normalizeProductFacts } from "../src/lib/recommendations/product-facts.ts";

const rawDetail = {
  contract_version: "product-detail-2026-07-v2",
  product_id: "TEST-PRODUCT",
  name: "Test Product",
  company: "Test Company",
  signals: [],
  coverage_facts: [
    {
      fact_id: "FACT-HOSPITAL",
      category: "Hospitalization",
      topic: "Νοσηλεία στην Ελλάδα",
      coverage_status: "Καλύπτεται",
      term_analysis: "Κάλυψη 100% των αναγνωρισμένων εξόδων νοσηλείας.",
      limit_frequency: "Ετήσιο όριο 100.000 EUR.",
      source_filename: "terms.pdf",
      article_section: "Νοσηλεία",
      human_validated: true,
    },
  ],
  deductible_rules: [
    {
      deductible_id: "DED-HOSPITAL",
      coverage_case: "Νοσηλεία",
      exact_rule: "Απαλλαγή 500 EUR ανά περιστατικό.",
      practical_meaning: "Αφαιρείται από κάθε περιστατικό.",
      source_filename: "terms.pdf",
      article_section: "Απαλλαγές",
      human_validated: true,
    },
  ],
  monetary_facts: [
    {
      monetary_id: "MON-ANNUAL",
      exact_excerpt: "Ετήσιο όριο νοσηλείας 100.000 EUR.",
      source_filename: "terms.pdf",
      pdf_page: 4,
      human_validated: true,
    },
    {
      monetary_id: "MON-INCIDENT",
      exact_excerpt: "Όριο νοσηλείας 2.000 EUR ανά περιστατικό.",
      source_filename: "terms.pdf",
      pdf_page: 5,
      human_validated: true,
    },
    {
      monetary_id: "MON-AMBIGUOUS",
      exact_excerpt: "Αποζημίωση 100 EUR ή 200 EUR ανάλογα με την περίπτωση.",
      source_filename: "terms.pdf",
      pdf_page: 6,
      human_validated: true,
    },
    {
      monetary_id: "MON-MIXED-NUMBERS",
      exact_excerpt: "Κάλυψη 80% με συμμετοχή 500 EUR.",
      source_filename: "terms.pdf",
      pdf_page: 6,
      human_validated: true,
    },
    {
      monetary_id: "MON-DUPLICATE",
      exact_excerpt: "Ετήσιο όριο νοσηλείας 50.000 EUR.",
      source_filename: "terms.pdf",
      pdf_page: 7,
      human_validated: true,
    },
    {
      monetary_id: "MON-DUPLICATE",
      exact_excerpt: "Ετήσιο όριο νοσηλείας 50.000 EUR.",
      source_filename: "terms.pdf",
      pdf_page: 7,
      human_validated: true,
    },
  ],
  waiting_periods: [
    {
      waiting_id: "WAIT-HOSPITAL",
      coverage_case: "Νοσηλεία",
      duration_text: "6 μήνες",
      application_text: "Ισχύει για ασθένεια.",
      source_filename: "terms.pdf",
      article_section: "Αναμονές",
      human_validated: true,
    },
  ],
  exclusions: [
    {
      exclusion_id: "EXC-HOSPITAL",
      record_type: "Hospitalization",
      exclusion_text: "Δεν καλύπτονται προαιρετικές αισθητικές επεμβάσεις.",
      source_filename: "terms.pdf",
      pdf_page: 8,
      human_validated: true,
    },
  ],
  provider_networks: [
    {
      network_id: "NET-ONE",
      provider_type: "Hospital",
      provider_name: "Demo Hospital Network",
      region: "Ελλάδα",
      network_status: "Active",
      human_validated: true,
    },
  ],
  procedure_fees: [
    {
      fee_id: "FEE-ONE",
      fee_type: "Surgeon",
      medical_specialty: "Γενική χειρουργική",
      severity_category: "Βαρεία",
      amount: 4550,
      currency: "EUR",
      source_filename: "fees.pdf",
      human_validated: true,
    },
  ],
  supplementary_benefits: [],
  claim_rules: [],
  data_quality_warning: "Demo only.",
};

const detail = normalizeDatabaseProgramDetail(rawDetail);
assert.ok(detail, "The real v2 shape must normalize.");
assert.equal(detail.contractVersion, "product-detail-2026-07-v2");
assert.equal(detail.coverageFacts[0].termAnalysis, rawDetail.coverage_facts[0].term_analysis);
assert.equal(detail.deductibleRules[0].exactRule, rawDetail.deductible_rules[0].exact_rule);
assert.equal(detail.waitingPeriods[0].durationText, "6 μήνες");
assert.equal(detail.exclusions[0].exclusionText, rawDetail.exclusions[0].exclusion_text);
assert.equal(detail.providerNetworks[0].providerName, "Demo Hospital Network");
assert.equal(detail.procedureFees[0].amount, 4550);
assert.equal(detail.procedureFees[0].currency, "EUR");

const facts = normalizeProductFacts(detail);
assert.ok(
  facts.some(
    (fact) =>
      fact.sourceRecordType === "coverage_fact" &&
      fact.exactText === rawDetail.coverage_facts[0].term_analysis,
  ),
  "Coverage text must not be lost.",
);
assert.ok(
  facts.some(
    (fact) =>
      fact.sourceRecordType === "deductible_rule" &&
      fact.exactText === rawDetail.deductible_rules[0].exact_rule,
  ),
  "Deductible exact_rule must not be lost.",
);
assert.ok(
  facts.some(
    (fact) =>
      fact.sourceRecordType === "waiting_period" &&
      fact.exactText === "6 μήνες" &&
      fact.durationValue === 6 &&
      fact.durationUnit === "months",
  ),
  "Waiting-period text and safe duration must be preserved.",
);
assert.ok(
  facts.some(
    (fact) =>
      fact.sourceRecordType === "exclusion" &&
      fact.exactText === rawDetail.exclusions[0].exclusion_text,
  ),
);
assert.ok(
  facts.some(
    (fact) =>
      fact.sourceRecordType === "provider_network" &&
      fact.measureType === "network",
  ),
);
assert.ok(
  facts.some(
    (fact) =>
      fact.sourceRecordType === "procedure_fee" &&
      fact.valueNumber === 4550 &&
      fact.currency === "EUR",
  ),
  "Procedure fee must use the direct numeric fields.",
);

const annual = facts.find((fact) => fact.factId === "MON-ANNUAL");
const perIncident = facts.find((fact) => fact.factId === "MON-INCIDENT");
assert.equal(annual?.topicKey, "hospitalization");
assert.equal(annual?.scope, "annual");
assert.equal(annual?.valueNumber, 100000);
assert.equal(perIncident?.topicKey, "hospitalization");
assert.equal(perIncident?.scope, "per_incident");
assert.equal(perIncident?.valueNumber, 2000);
assert.notEqual(annual?.scope, perIncident?.scope);

const ambiguous = facts.find((fact) => fact.factId === "MON-AMBIGUOUS");
assert.equal(ambiguous?.valueNumber, null);
assert.equal(ambiguous?.exactText, rawDetail.monetary_facts[2].exact_excerpt);
assert.equal(
  facts.find((fact) => fact.factId === "MON-MIXED-NUMBERS")?.valueNumber,
  null,
  "A percentage plus an amount in one excerpt must remain text-only.",
);
assert.equal(
  facts.filter((fact) => fact.factId === "MON-DUPLICATE").length,
  1,
  "Exact duplicate source records must collapse once.",
);

assert.equal(
  normalizeDatabaseProgramDetail({ ...rawDetail, coverage_facts: undefined }),
  null,
  "Missing v2 arrays must be rejected.",
);

console.log("Product detail v2 and canonical product fact assertions passed.");
