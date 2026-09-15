import assert from "node:assert/strict";

import {
  hasPdfMagicBytesInFile,
  hasPdfMagicBytes,
  MAX_POLICY_PDF_SIZE,
  POLICY_PDF_CANONICAL_FILENAME,
  validatePolicyFileMetadata,
} from "../src/lib/policy-analysis/file-validation.ts";
import {
  createPolicyAnalysisFormData,
  runPolicyAnalysisUpload,
} from "../src/lib/policy-analysis/client-upload.ts";
import {
  POLICY_ANALYSIS_ERROR_MESSAGES,
  isPolicyAnalysisApiError,
  policyAnalysisFailureFromExtraction,
} from "../src/lib/policy-analysis/contracts.ts";
import {
  buildProgramPolicyComparison,
  compactPolicyComparisonDisplay,
} from "../src/lib/policy-analysis/comparison.ts";
import {
  policyComparisonFactsFixture,
  policyComparisonProgramDetailFixture,
  policyComparisonRecommendationFixture,
  policyComparisonSubmissionFixture,
  policySnapshotFixture,
} from "../src/lib/policy-analysis/fixtures.ts";
import { policyProviderFailure } from "../src/lib/policy-analysis/provider-validation.ts";
import {
  PolicyAnalysisRequestManager,
  policyFileFingerprint,
} from "../src/lib/policy-analysis/request-manager.ts";
import { validateExistingPolicySnapshot } from "../src/lib/policy-analysis/schema.ts";
import {
  normalizeExistingPolicySnapshot,
} from "../src/lib/policy-analysis/normalization.ts";
import {
  containsUnsafePolicyStorageMaterial,
} from "../src/lib/policy-analysis/storage-safety.ts";
import {
  validatePolicyAnalysisRecord,
} from "../src/lib/policy-analysis/storage.ts";
import {
  normalizeDatabaseProgramDetail,
} from "../src/lib/recommendations/database-normalization.ts";
import {
  normalizeProductFacts,
} from "../src/lib/recommendations/product-facts.ts";

const clone = (value) => structuredClone(value);
const delay = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));
const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
};

assert.deepEqual(
  validatePolicyFileMetadata({
    name: "anonymous.pdf",
    type: "application/pdf",
    size: 1_024,
  }),
  { ok: true },
);
for (const name of ["policy.pdf ", " policy.pdf"]) {
  assert.equal(
    validatePolicyFileMetadata({
      name,
      type: "application/pdf",
      size: 1_024,
    }).ok,
    false,
  );
}
assert.equal(
  validatePolicyFileMetadata({
    name: "POLICY.PDF",
    type: "application/pdf",
    size: 1_024,
  }).ok,
  true,
);
assert.equal(
  validatePolicyFileMetadata({
    name: "not-a-pdf.txt",
    type: "application/pdf",
    size: 1_024,
  }).ok,
  false,
);
assert.equal(
  validatePolicyFileMetadata({
    name: "spoofed.pdf",
    type: "text/plain",
    size: 1_024,
  }).ok,
  false,
);
assert.equal(
  validatePolicyFileMetadata({
    name: "oversized.pdf",
    type: "application/pdf",
    size: MAX_POLICY_PDF_SIZE + 1,
  }).ok,
  false,
);
assert.equal(hasPdfMagicBytes(new TextEncoder().encode("%PDF-1.7")), true);
assert.equal(hasPdfMagicBytes(new TextEncoder().encode("plain text")), false);
assert.equal(
  await hasPdfMagicBytesInFile(
    new File(["%PDF-1.7\nfixture"], "fixture.pdf", {
      type: "application/pdf",
    }),
  ),
  true,
);
assert.equal(
  await hasPdfMagicBytesInFile(
    new File(["plain text"], "spoofed.pdf", { type: "application/pdf" }),
  ),
  false,
);

const requestManager = new PolicyAnalysisRequestManager();
const cancellableStart = requestManager.start("cancel-me", 1_000);
assert.equal(cancellableStart.kind, "started");
requestManager.cancel("removed");
assert.equal(cancellableStart.request.controller.signal.aborted, true);
assert.equal(cancellableStart.request.abortReason, "removed");

const staleStart = requestManager.start("first-file", 1_000);
assert.equal(staleStart.kind, "started");
const replacementStart = requestManager.start("new-file", 1_000);
assert.equal(replacementStart.kind, "started");
assert.equal(staleStart.request.controller.signal.aborted, true);
assert.equal(staleStart.request.abortReason, "replaced");
assert.equal(requestManager.isCurrent(staleStart.request), false);
assert.equal(requestManager.isCurrent(replacementStart.request), true);

const duplicateStart = requestManager.start("new-file", 1_000);
assert.equal(duplicateStart.kind, "duplicate");
assert.equal(duplicateStart.request.id, replacementStart.request.id);
assert.equal(replacementStart.request.controller.signal.aborted, false);
requestManager.finish(replacementStart.request);

const timeoutManager = new PolicyAnalysisRequestManager();
const timeoutStart = timeoutManager.start("timeout-file", 5);
assert.equal(timeoutStart.kind, "started");
await new Promise((resolve) => setTimeout(resolve, 20));
assert.equal(timeoutStart.request.controller.signal.aborted, true);
assert.equal(timeoutStart.request.abortReason, "timeout");
assert.equal(timeoutManager.isLatest(timeoutStart.request), true);
timeoutManager.finish(timeoutStart.request);

const runLifecycle = ({
  manager,
  fingerprint: lifecycleFingerprint,
  readSignature = async () => true,
  analyze = async () => ({ ok: true }),
  timeoutMs = 1_000,
  retrying = false,
  beforeAnalyze = () => {},
  commit = () => true,
  analysisDelayMs = 0,
}) => {
  const statuses = [];
  const errors = [];
  const promise = runPolicyAnalysisUpload({
    manager,
    fingerprint: lifecycleFingerprint,
    retrying,
    timeoutMs,
    analysisDelayMs,
    validateMetadata: () => ({ ok: true }),
    readSignature,
    beforeAnalyze,
    analyze,
    commit,
    onStatus: (status) => statuses.push(status),
    onError: (message) => errors.push(message),
  });
  return { promise, statuses, errors };
};

const signatureTimeoutManager = new PolicyAnalysisRequestManager();
const pendingSignature = deferred();
const signatureTimeout = runLifecycle({
  manager: signatureTimeoutManager,
  fingerprint: "signature-timeout",
  readSignature: () => pendingSignature.promise,
  timeoutMs: 5,
});
assert.equal(await signatureTimeout.promise, "timeout");
assert.equal(signatureTimeout.statuses.at(-1), "error");
assert.equal(
  signatureTimeout.errors.at(-1),
  POLICY_ANALYSIS_ERROR_MESSAGES.analysis_timeout,
);
assert.equal(signatureTimeoutManager.hasActiveRequest(), false);
pendingSignature.resolve(true);

const responseTimeoutManager = new PolicyAnalysisRequestManager();
const pendingResponseJson = deferred();
const responseTimeout = runLifecycle({
  manager: responseTimeoutManager,
  fingerprint: "response-json-timeout",
  analyze: () => pendingResponseJson.promise,
  timeoutMs: 5,
});
assert.equal(await responseTimeout.promise, "timeout");
assert.equal(responseTimeout.statuses.at(-1), "error");
assert.equal(
  responseTimeout.errors.at(-1),
  POLICY_ANALYSIS_ERROR_MESSAGES.analysis_timeout,
);
assert.equal(responseTimeoutManager.hasActiveRequest(), false);
pendingResponseJson.resolve({ ok: true });

const analyzingManager = new PolicyAnalysisRequestManager();
const pendingAnalysis = deferred();
const analyzingLifecycle = runLifecycle({
  manager: analyzingManager,
  fingerprint: "visible-analyzing-transition",
  analyze: () => pendingAnalysis.promise,
  analysisDelayMs: 20,
});
await delay(35);
assert.equal(analyzingLifecycle.statuses.includes("uploading"), true);
assert.equal(analyzingLifecycle.statuses.includes("analyzing"), true);
analyzingManager.cancel("unmount");
assert.equal(await analyzingLifecycle.promise, "stale");
pendingAnalysis.resolve({ ok: true });

const retryAfterTimeout = runLifecycle({
  manager: responseTimeoutManager,
  fingerprint: "response-json-timeout",
  timeoutMs: 1_000,
  retrying: true,
});
assert.equal(await retryAfterTimeout.promise, "success");
assert.equal(retryAfterTimeout.statuses[0], "retry");
assert.equal(retryAfterTimeout.statuses.at(-1), "success");
assert.equal(responseTimeoutManager.hasActiveRequest(), false);

const replacementManager = new PolicyAnalysisRequestManager();
const pendingReplacedSignature = deferred();
const replacedLifecycle = runLifecycle({
  manager: replacementManager,
  fingerprint: "replaced-during-timeout-window",
  readSignature: () => pendingReplacedSignature.promise,
  timeoutMs: 20,
});
await delay(5);
const replacementLifecycle = runLifecycle({
  manager: replacementManager,
  fingerprint: "replacement-success",
  timeoutMs: 1_000,
});
assert.equal(await replacedLifecycle.promise, "stale");
assert.equal(await replacementLifecycle.promise, "success");
assert.equal(replacedLifecycle.statuses.includes("error"), false);
assert.equal(replacementLifecycle.statuses.at(-1), "success");
assert.equal(replacementManager.hasActiveRequest(), false);
pendingReplacedSignature.resolve(true);

for (const cancelReason of ["unmount", "navigation"]) {
  const cleanupManager = new PolicyAnalysisRequestManager();
  const pendingCleanupSignature = deferred();
  const cleanupLifecycle = runLifecycle({
    manager: cleanupManager,
    fingerprint: `cleanup-${cancelReason}`,
    readSignature: () => pendingCleanupSignature.promise,
  });
  await Promise.resolve();
  cleanupManager.cancel(cancelReason);
  assert.equal(await cleanupLifecycle.promise, "stale");
  assert.equal(cleanupManager.hasActiveRequest(), false);
  assert.equal(cleanupLifecycle.statuses.includes("error"), false);
  pendingCleanupSignature.resolve(true);
}

const fingerprint = policyFileFingerprint({
  name: "fixture.pdf",
  size: 1_024,
  type: "application/pdf",
  lastModified: 123,
});
assert.equal(
  fingerprint,
  policyFileFingerprint({
    name: "fixture.pdf",
    size: 1_024,
    type: "application/pdf",
    lastModified: 123,
  }),
);

assert.equal(
  policyProviderFailure({
    responseStatus: "completed",
    incompleteReason: null,
    refusalDetected: false,
    hasOutputParsed: true,
  }),
  null,
);
assert.equal(
  policyProviderFailure({
    responseStatus: "completed",
    incompleteReason: null,
    refusalDetected: true,
    hasOutputParsed: false,
  }),
  "provider_refusal",
);
assert.equal(
  policyProviderFailure({
    responseStatus: "incomplete",
    incompleteReason: "max_output_tokens",
    refusalDetected: false,
    hasOutputParsed: false,
  }),
  "incomplete_response",
);
assert.equal(
  policyProviderFailure({
    responseStatus: "completed",
    incompleteReason: null,
    refusalDetected: false,
    hasOutputParsed: false,
  }),
  "invalid_output",
);

const validSnapshot = validateExistingPolicySnapshot(policySnapshotFixture);
assert.equal(validSnapshot.ok, true);

const storageRecord = {
  version: 1,
  snapshot: policySnapshotFixture,
  filename: POLICY_PDF_CANONICAL_FILENAME,
  fileSize: 1_454,
  analyzedAt: "2026-07-15T00:00:00.000Z",
  extractionConfidence: policySnapshotFixture.extractionConfidence,
};
const canonicalStorageRecord = validatePolicyAnalysisRecord(storageRecord);
assert.ok(canonicalStorageRecord);
assert.equal(
  canonicalStorageRecord.filename,
  POLICY_PDF_CANONICAL_FILENAME,
);

const sensitiveFilenames = [
  "Maria-Papadopoulou.pdf",
  "demo.customer@example.com.pdf",
  "policy-123456789.pdf",
  "Συμβόλαιο-Μαρία-Παπαδοπούλου.pdf",
];
for (const sensitiveFilename of sensitiveFilenames) {
  assert.equal(
    validatePolicyFileMetadata({
      name: sensitiveFilename,
      type: "application/pdf",
      size: 1_024,
    }).ok,
    true,
  );
  const transport = createPolicyAnalysisFormData(
    new File(["%PDF-1.7"], sensitiveFilename, { type: "application/pdf" }),
  );
  const transportedFile = transport.get("policyFile");
  assert.ok(transportedFile instanceof File);
  assert.equal(transportedFile.name, POLICY_PDF_CANONICAL_FILENAME);
  assert.equal(transportedFile.name.includes(sensitiveFilename), false);
  assert.equal(
    validatePolicyAnalysisRecord({
      ...storageRecord,
      filename: sensitiveFilename,
    }),
    null,
  );
}

assert.equal(
  validatePolicyAnalysisRecord({ ...storageRecord, extraRoot: true }),
  null,
);
const extraNestedRecord = clone(storageRecord);
extraNestedRecord.snapshot.documentMetadata.extraNested = true;
assert.equal(validatePolicyAnalysisRecord(extraNestedRecord), null);

const invalidEnumRecord = clone(storageRecord);
invalidEnumRecord.snapshot.coverages[0].status = "invented";
assert.equal(validatePolicyAnalysisRecord(invalidEnumRecord), null);

const invalidCurrencyRecord = clone(storageRecord);
invalidCurrencyRecord.snapshot.coverages[0].currency = "NOT_A_CURRENCY";
assert.equal(validatePolicyAnalysisRecord(invalidCurrencyRecord), null);

const invalidNumberRecord = clone(storageRecord);
invalidNumberRecord.snapshot.deductibles[0].amount = -1;
assert.equal(validatePolicyAnalysisRecord(invalidNumberRecord), null);

const invalidEvidenceRecord = clone(storageRecord);
invalidEvidenceRecord.snapshot.coverages[0].evidence[0].page = 0;
assert.equal(validatePolicyAnalysisRecord(invalidEvidenceRecord), null);

const duplicateStorageRecord = clone(storageRecord);
duplicateStorageRecord.snapshot.coverages.push(
  clone(duplicateStorageRecord.snapshot.coverages[0]),
);
duplicateStorageRecord.snapshot.coverages[0].evidence.push(
  clone(duplicateStorageRecord.snapshot.coverages[0].evidence[0]),
);
duplicateStorageRecord.snapshot.extractionWarnings.push(
  "Επιβεβαίωσε έναν όρο.",
  "Επιβεβαίωσε έναν όρο.",
);
duplicateStorageRecord.snapshot.unverifiedItems.push(
  "Όριο προς επιβεβαίωση.",
  "Όριο προς επιβεβαίωση.",
);
const normalizedStorageRecord = validatePolicyAnalysisRecord(
  duplicateStorageRecord,
);
assert.ok(normalizedStorageRecord);
assert.equal(normalizedStorageRecord.snapshot.coverages.length, 1);
assert.equal(
  normalizedStorageRecord.snapshot.coverages[0].evidence.length,
  new Set(
    storageRecord.snapshot.coverages[0].evidence.map((item) =>
      JSON.stringify(item),
    ),
  ).size,
);
assert.equal(
  new Set(normalizedStorageRecord.snapshot.extractionWarnings).size,
  normalizedStorageRecord.snapshot.extractionWarnings.length,
);
assert.equal(
  new Set(normalizedStorageRecord.snapshot.unverifiedItems).size,
  normalizedStorageRecord.snapshot.unverifiedItems.length,
);

const lightweightNormalized = normalizeExistingPolicySnapshot(
  duplicateStorageRecord.snapshot,
);
assert.deepEqual(lightweightNormalized, normalizedStorageRecord.snapshot);
assert.equal(containsUnsafePolicyStorageMaterial(storageRecord), false);
assert.equal(
  containsUnsafePolicyStorageMaterial({
    ...storageRecord,
    pdfBytes: "%PDF-1.7 raw bytes",
  }),
  true,
);
assert.equal(
  containsUnsafePolicyStorageMaterial({
    ...storageRecord,
    fileData: "data:application/pdf;base64,JVBERi0xLjQ=",
  }),
  true,
);
assert.equal(
  /data:application\/pdf;base64|%PDF-|base64/iu.test(
    JSON.stringify(storageRecord),
  ),
  false,
);

for (const [code, message] of Object.entries(
  POLICY_ANALYSIS_ERROR_MESSAGES,
)) {
  assert.equal(
    isPolicyAnalysisApiError({ ok: false, code, message }),
    true,
  );
}
assert.equal(
  isPolicyAnalysisApiError({
    ok: false,
    code: "provider_unavailable",
    message: "raw provider stack or API-key detail",
  }),
  false,
);
assert.deepEqual(policyAnalysisFailureFromExtraction("request_aborted"), {
  code: "analysis_aborted",
  status: 408,
});
assert.deepEqual(policyAnalysisFailureFromExtraction("provider_timeout"), {
  code: "analysis_timeout",
  status: 504,
});
assert.deepEqual(policyAnalysisFailureFromExtraction("provider_unavailable"), {
  code: "provider_unavailable",
  status: 502,
});
assert.deepEqual(policyAnalysisFailureFromExtraction("provider_refusal"), {
  code: "invalid_provider_output",
  status: 502,
});

const negativeAmount = clone(policySnapshotFixture);
negativeAmount.deductibles[0].amount = -1;
assert.equal(validateExistingPolicySnapshot(negativeAmount).ok, false);

const invalidPercentage = clone(policySnapshotFixture);
invalidPercentage.coverages[0].coveragePercentage = 101;
assert.equal(validateExistingPolicySnapshot(invalidPercentage).ok, false);

const invalidPage = clone(policySnapshotFixture);
invalidPage.coverages[0].evidence[0].page = 0;
assert.equal(validateExistingPolicySnapshot(invalidPage).ok, false);

const inventedCurrency = clone(policySnapshotFixture);
inventedCurrency.coverages[0].currency = "NOT_A_CURRENCY";
assert.equal(validateExistingPolicySnapshot(inventedCurrency).ok, false);

const personalData = clone(policySnapshotFixture);
personalData.coverages[0].description = "Όνομα ασφαλισμένου: Demo Person";
const personalResult = validateExistingPolicySnapshot(personalData);
assert.equal(personalResult.ok, false);
assert.equal(personalResult.code, "unsafe_personal_data");

const extraPersonalField = {
  ...clone(policySnapshotFixture),
  insuredName: "Demo Person",
};
assert.equal(validateExistingPolicySnapshot(extraPersonalField).ok, false);

const duplicateFacts = clone(policySnapshotFixture);
duplicateFacts.coverages.push(clone(duplicateFacts.coverages[0]));
const deduplicated = validateExistingPolicySnapshot(duplicateFacts);
assert.equal(deduplicated.ok, true);
assert.equal(deduplicated.snapshot.coverages.length, 1);

const profileFixture = {
  insuredPeople: { title: "Μόνο εμένα", detail: "1 ασφαλισμένος", count: 1 },
  ageProfile: { title: "36 ετών", detail: "1 ασφαλισμένος", ages: [36] },
  currentInsurance: { title: "Ατομικό", detail: "Υπάρχουσα κάλυψη" },
  mainGoal: { title: "Αξιολόγηση", detail: "Σύγκριση" },
  priorities: ["Χαμηλή απαλλαγή", "Υψηλό όριο", "Νοσοκομειακό δίκτυο"],
  deductiblePreference: "Μικρή συμμετοχή",
  costAndProtectionApproach: "Ισορροπία",
  additionalNeeds: ["Άμεση χρήση"],
  hasUploadedPolicy: true,
  generatedAt: "2026-07-15T00:00:00.000Z",
};

const comparison = buildProgramPolicyComparison({
  snapshot: policySnapshotFixture,
  submission: policyComparisonSubmissionFixture,
  profile: profileFixture,
  recommendation: policyComparisonRecommendationFixture,
  programDetail: policyComparisonProgramDetailFixture,
  proposedFacts: policyComparisonFactsFixture,
});
assert.equal(
  comparison.improvements.some((item) => item.category === "deductible"),
  true,
);
assert.equal(
  comparison.improvements.some((item) => item.category === "limit"),
  true,
);
assert.equal(
  comparison.tradeoffs.some((item) => item.category === "waiting_period"),
  true,
);
assert.equal(comparison.overallStatus, "mixed");
assert.ok(comparison.displayGroups);
assert.equal(
  comparison.displayGroups.directlyComparable.some(
    (item) =>
      item.category === "limit" &&
      item.status === "improvement" &&
      item.proposedProgramSummary.includes("100.000 EUR"),
  ),
  true,
);
const visibleComparisonText = JSON.stringify(
  Object.values(comparison.displayGroups)
    .flat()
    .map((item) => ({
      ...compactPolicyComparisonDisplay(item),
      title: item.title,
    })),
);
assert.equal(
  /Υπάρχει σχετική πρόβλεψη|υπάρχει σχετική πρόβλεψη/u.test(visibleComparisonText),
  false,
);
assert.equal(/Πηγή:/u.test(visibleComparisonText), false);
assert.equal(/\.pdf\b|σελ\.|page\s*\d+/iu.test(visibleComparisonText), false);
assert.equal(
  visibleComparisonText.includes(policyComparisonFactsFixture[0].exactText),
  false,
  "Visible comparison text must not expose raw proposed exactText.",
);
assert.equal(
  comparison.displayGroups.directlyComparable.some(
    (item) =>
      item.category === "limit" &&
      compactPolicyComparisonDisplay(item).proposedProgramText.includes("100.000€") &&
      compactPolicyComparisonDisplay(item).conclusionText.includes("υψηλότερο συγκρίσιμο όριο"),
  ),
  true,
);
assert.equal(
  comparison.displayGroups.financialTermsAndDeductibles.some(
    (item) => item.category === "deductible" && item.status === "improvement",
  ),
  true,
);
assert.equal(
  comparison.displayGroups.financialTermsAndDeductibles.some(
    (item) =>
      item.category === "deductible" &&
      compactPolicyComparisonDisplay(item).existingPolicyText.includes("1.500") &&
      compactPolicyComparisonDisplay(item).proposedProgramText.includes("500€") &&
      compactPolicyComparisonDisplay(item).conclusionText.includes("μειώνει την προσωπική συμμετοχή"),
  ),
  true,
);
assert.equal(
  comparison.displayGroups.waitingPeriodsAndRestrictions.some(
    (item) => item.category === "waiting_period" && item.status === "tradeoff",
  ),
  true,
);
assert.equal(
  comparison.displayGroups.waitingPeriodsAndRestrictions.some(
    (item) =>
      item.category === "waiting_period" &&
      compactPolicyComparisonDisplay(item).proposedProgramText.includes("6 μήνες") &&
      compactPolicyComparisonDisplay(item).conclusionText.includes("λιγότερο ευνοϊκό"),
  ),
  true,
);

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
const medicalFamilyDetail = normalizeDatabaseProgramDetail(medicalFamilyRawDetail);
assert.ok(medicalFamilyDetail);
const medicalFamilyFacts = normalizeProductFacts(medicalFamilyDetail);
assert.equal(
  medicalFamilyFacts.some(
    (fact) =>
      fact.factId === "FACT-MF-HOSP::geography" &&
      fact.exactText === "Γεωγραφική ισχύς: Ελλάδα",
  ),
  true,
);
assert.equal(
  medicalFamilyFacts.some(
    (fact) =>
      fact.factId === "FACT-MF-ABROAD::geography" &&
      fact.exactText === "Γεωγραφική ισχύς: Εξωτερικό",
  ),
  true,
);
assert.equal(
  medicalFamilyFacts.some(
    (fact) =>
      fact.factId === "FACT-MF-HOSP::network" &&
      fact.topicKey === "network" &&
      fact.exactText === "Δίκτυο: Συνεργαζόμενο ή μη νοσοκομείο",
  ),
  true,
);
assert.equal(
  medicalFamilyFacts.some(
    (fact) =>
      fact.factId === "FACT-MF-ABROAD::territory-percentage" &&
      fact.exactText ===
        "Κάλυψη εξωτερικού: 100% εκτός ΗΠΑ/Καναδά, 95% σε ΗΠΑ/Καναδά",
  ),
  true,
);
assert.equal(
  medicalFamilyFacts.some(
    (fact) =>
      fact.factId === "FACT-MF-WAIT::duration-split" &&
      fact.exactText ===
        "Χρονικό όριο: 30 ημέρες Ελλάδα, 180 ημέρες εξωτερικό",
  ),
  true,
);
const enrichedSnapshot = clone(policySnapshotFixture);
enrichedSnapshot.coverages.push({
  id: "current-abroad",
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
enrichedSnapshot.coverages.push({
  id: "current-geography",
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
const enrichedComparison = buildProgramPolicyComparison({
  snapshot: enrichedSnapshot,
  submission: policyComparisonSubmissionFixture,
  profile: profileFixture,
  recommendation: {
    ...policyComparisonRecommendationFixture,
    programId: "GEN-MF",
    programName: "Medical Family",
  },
  programDetail: medicalFamilyDetail,
  proposedFacts: medicalFamilyFacts,
});
const enrichedVisibleText = JSON.stringify(
  Object.values(enrichedComparison.displayGroups)
    .flat()
    .map((item) => ({
      title: item.title,
      ...compactPolicyComparisonDisplay(item),
    })),
);
for (const expected of [
  "Δίκτυο: Συνεργαζόμενο ή μη νοσοκομείο",
  "Κάλυψη εξωτερικού: 100% εκτός ΗΠΑ/Καναδά, 95% σε ΗΠΑ/Καναδά",
  "Χρονικό όριο: 30 ημέρες Ελλάδα, 180 ημέρες εξωτερικό",
  "Όριο σύμφωνα με τον Πίνακα Παροχών — χρειάζεται επιβεβαίωση ποσού.",
]) {
  assert.equal(enrichedVisibleText.includes(expected), true, expected);
}
for (const forbidden of [
  "Υπάρχει σχετική πρόβλεψη",
  "υπάρχει σχετική πρόβλεψη",
  "Πηγή:",
  "medical-family.pdf",
  "page 1",
]) {
  assert.equal(enrichedVisibleText.includes(forbidden), false, forbidden);
}
for (const expected of [
  "Δίκτυο: Συνεργαζόμενο ή μη νοσοκομείο",
  "Κάλυψη εξωτερικού: 100% εκτός ΗΠΑ/Καναδά, 95% σε ΗΠΑ/Καναδά",
  "Χρονικό όριο: 30 ημέρες Ελλάδα, 180 ημέρες εξωτερικό",
  "Όριο σύμφωνα με τον Πίνακα Παροχών — χρειάζεται επιβεβαίωση ποσού.",
]) {
  const index = enrichedVisibleText.indexOf(expected);
  assert.notEqual(index, -1);
  const surroundingText = enrichedVisibleText.slice(Math.max(0, index - 240), index + 240);
  assert.equal(
    surroundingText.includes("Δεν βρέθηκε καθαρό δομημένο στοιχείο"),
    false,
    expected,
  );
}
assert.equal(
  enrichedVisibleText.includes(
    medicalFamilyRawDetail.coverage_facts[2].term_analysis,
  ),
  false,
  "Visible enriched text must not expose raw international term_analysis.",
);

const scopeMismatchFact = {
  ...clone(policyComparisonFactsFixture[0]),
  factId: "scope-mismatch",
  exactText: "Όριο νοσηλείας 100.000 EUR ανά περιστατικό.",
  scope: "per_incident",
};
const scopeMismatchComparison = buildProgramPolicyComparison({
  snapshot: policySnapshotFixture,
  submission: policyComparisonSubmissionFixture,
  profile: profileFixture,
  recommendation: policyComparisonRecommendationFixture,
  programDetail: policyComparisonProgramDetailFixture,
  proposedFacts: [scopeMismatchFact],
});
const mismatchedAnnualLimit =
  scopeMismatchComparison.displayGroups.currentNeedsConfirmation.find(
    (item) => item.topicKey === "hospitalization-annual_limit",
  );
assert.ok(mismatchedAnnualLimit);
assert.equal(mismatchedAnnualLimit.status, "needs_confirmation");
assert.equal(
  compactPolicyComparisonDisplay(mismatchedAnnualLimit).conclusionText,
  "Υπάρχει σχετική τεκμηρίωση στο προτεινόμενο πρόγραμμα, με τελικό έλεγχο όρων από σύμβουλο.",
);
assert.equal(
  mismatchedAnnualLimit.proposedProgramSummary,
  scopeMismatchFact.exactText,
  "Related exact text must replace the generic missing message on scope mismatch.",
);

const displayedItems = Object.values(comparison.displayGroups).flat();
const displayedKeys = displayedItems.map(
  (item) => `${item.topicKey}|${item.category}|${item.title}|${item.existingPolicySummary}`,
);
assert.equal(
  new Set(displayedKeys).size,
  displayedKeys.length,
  "The customer comparison groups must not contain exact duplicate rows.",
);

const unknownComparison = buildProgramPolicyComparison({
  snapshot: policySnapshotFixture,
  submission: policyComparisonSubmissionFixture,
  profile: profileFixture,
  recommendation: policyComparisonRecommendationFixture,
  programDetail: policyComparisonProgramDetailFixture,
  proposedFacts: [],
});
assert.equal(unknownComparison.improvements.length, 0);
assert.equal(unknownComparison.unknownItems.length > 0, true);
assert.equal(unknownComparison.overallStatus, "insufficient_evidence");
assert.equal(
  unknownComparison.unknownItems.some(
    (item) =>
      compactPolicyComparisonDisplay(item).proposedProgramText ===
        "Δεν υπάρχει ακόμη αριθμητικά επιβεβαιωμένο στοιχείο για ασφαλή σύγκριση. Χρειάζεται έλεγχος από σύμβουλο." &&
      compactPolicyComparisonDisplay(item).conclusionText ===
        "Η σύγκριση χρειάζεται επιβεβαίωση από σύμβουλο.",
  ),
  true,
);

console.log("Policy analysis deterministic assertions passed.");
