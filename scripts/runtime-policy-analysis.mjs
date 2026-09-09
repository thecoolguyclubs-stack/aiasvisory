import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const APP_ORIGIN =
  process.env.APP_ORIGIN?.trim().replace(/\/$/u, "") ||
  "http://localhost:3000";
const fixturePath = join(
  process.cwd(),
  "scripts",
  "fixtures",
  "anonymized-health-policy.pdf",
);

const pdf = await readFile(fixturePath);

function parseServerTiming(value) {
  return Object.fromEntries(
    (value ?? "")
      .split(",")
      .map((entry) => entry.trim().split(";dur="))
      .filter(
        ([name, duration]) =>
          name && duration !== undefined && Number.isFinite(Number(duration)),
      )
      .map(([name, duration]) => [name, Number(duration)]),
  );
}

async function postPolicyFile(file) {
  const body = new FormData();
  body.append("policyFile", file);
  const response = await fetch(`${APP_ORIGIN}/api/policy-analysis`, {
    method: "POST",
    body,
  });
  return { response, payload: await response.json() };
}

const invalidSignature = await postPolicyFile(
  new File(["plain text"], "invalid.pdf", { type: "application/pdf" }),
);
assert.equal(invalidSignature.response.status, 415);
assert.equal(invalidSignature.payload.ok, false);
assert.equal(invalidSignature.payload.code, "invalid_pdf_signature");
assert.equal(invalidSignature.response.headers.get("cache-control"), "no-store");

const invalidMime = await postPolicyFile(
  new File(["%PDF-1.4"], "invalid.pdf", { type: "text/plain" }),
);
assert.equal(invalidMime.response.status, 415);
assert.equal(invalidMime.payload.ok, false);
assert.equal(invalidMime.payload.code, "invalid_mime_type");

const oversized = await postPolicyFile(
  new File([new Uint8Array(15 * 1024 * 1024 + 1)], "oversized.pdf", {
    type: "application/pdf",
  }),
);
assert.equal(oversized.response.status, 413);
assert.equal(oversized.payload.ok, false);
assert.equal(oversized.payload.code, "file_too_large");

const multipleBody = new FormData();
multipleBody.append(
  "policyFile",
  new File(["%PDF-1.4"], "first.pdf", { type: "application/pdf" }),
);
multipleBody.append(
  "policyFile",
  new File(["%PDF-1.4"], "second.pdf", { type: "application/pdf" }),
);
const multipleResponse = await fetch(`${APP_ORIGIN}/api/policy-analysis`, {
  method: "POST",
  body: multipleBody,
});
assert.equal(multipleResponse.status, 400);
assert.equal((await multipleResponse.json()).code, "invalid_request");

const formData = new FormData();
formData.append(
  "policyFile",
  new File([pdf], "uploaded-policy.pdf", {
    type: "application/pdf",
  }),
);

const policyResponse = await fetch(`${APP_ORIGIN}/api/policy-analysis`, {
  method: "POST",
  body: formData,
});
const policyPayload = await policyResponse.json();
const phaseTimings = parseServerTiming(
  policyResponse.headers.get("server-timing"),
);

assert.equal(policyResponse.status, 200, "Live policy analysis did not return HTTP 200.");
assert.equal(policyResponse.headers.get("cache-control"), "no-store");
assert.equal(policyPayload.ok, true);
assert.equal(policyPayload.source, "openai");
assert.equal(policyPayload.outputParsed, true);
assert.equal(policyPayload.analysis?.filename, "uploaded-policy.pdf");
assert.equal(policyPayload.analysis?.snapshot?.schemaVersion, "existing-policy-v1");
assert.deepEqual(Object.keys(phaseTimings).sort(), [
  "file-read",
  "local-validation",
  "multipart",
  "provider",
  "request-preparation",
  "response-validation",
  "total",
]);
assert.equal(phaseTimings.provider > 0, true);
assert.equal(phaseTimings.total >= phaseTimings.provider, true);
assert.equal(
  policyPayload.analysis.extractionConfidence,
  policyPayload.analysis.snapshot.extractionConfidence,
);

const serializedSnapshot = JSON.stringify(policyPayload.analysis.snapshot);
assert.equal(serializedSnapshot.includes("data:application/pdf;base64"), false);
assert.equal(serializedSnapshot.includes("%PDF-"), false);
assert.equal(
  /(?:insuredName|policyholderName|taxId|amka|address|paymentDetails)/iu.test(
    serializedSnapshot,
  ),
  false,
);

const submission = {
  version: 4,
  answers: {
    insuredPeople: "self",
    currentInsurance: "individual",
    evaluationGoal: "evaluate_existing",
    priorities: ["low-deductible", "high-limit", "hospital-network"],
    deductible: "small",
    costApproach: "balanced",
    additionalNeeds: ["immediate_use", "provider_freedom"],
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
    size: pdf.byteLength,
    type: "application/pdf",
  },
  uploadDecision: "uploaded",
  submittedAt: "2026-07-15T00:00:00.000Z",
};

const malformedRecommendationResponse = await fetch(
  `${APP_ORIGIN}/api/recommendations`,
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ invalid: true }),
  },
);
assert.equal(malformedRecommendationResponse.status, 400);

const invalidSnapshotResponse = await fetch(
  `${APP_ORIGIN}/api/recommendations`,
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...submission, policySnapshot: {} }),
  },
);
assert.equal(invalidSnapshotResponse.status, 422);
const invalidSnapshotPayload = await invalidSnapshotResponse.json();
assert.equal(invalidSnapshotPayload.code, "invalid_policy_snapshot");

async function recommendations(body) {
  const response = await fetch(`${APP_ORIGIN}/api/recommendations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await response.json();
  assert.equal(response.status, 200, "Recommendation request failed.");
  assert.equal(payload.ok, true);
  assert.equal(payload.source, "supabase");
  assert.equal(payload.recommendations.length, 3);
  return payload.recommendations;
}

const withoutPdf = await recommendations({
  ...submission,
  policyFile: null,
  uploadDecision: "skipped",
});
assert.equal(withoutPdf.every((item) => item.policyComparison === null), true);
const withoutPolicy = await recommendations(submission);
const withPolicy = await recommendations({
  ...submission,
  policySnapshot: policyPayload.analysis.snapshot,
});

const withoutPolicyRanking = withoutPolicy.map((recommendation) => ({
  programId: recommendation.programId,
  category: recommendation.category,
  matchScore: recommendation.matchScore,
}));
const withPolicyRanking = withPolicy.map((recommendation) => ({
  programId: recommendation.programId,
  category: recommendation.category,
  matchScore: recommendation.matchScore,
}));
assert.deepEqual(withPolicyRanking, withoutPolicyRanking);
assert.equal(new Set(withPolicy.map((item) => item.programId)).size, 3);
assert.equal(
  withPolicy.every(
    (item) =>
      item.policyComparison?.programId === item.programId &&
      Array.isArray(item.policyComparison.unknownItems),
  ),
  true,
);
assert.equal(
  withoutPolicy.every((item) => item.policyComparison === null),
  true,
);

const comparisonFacts = withPolicy.flatMap((recommendation) =>
  Object.values(recommendation.policyComparison.displayGroups).flatMap(
    (items) =>
      items.flatMap((item) =>
        (item.proposedFacts ?? []).map((fact) => ({
          ...fact,
          programId: recommendation.programId,
        })),
      ),
  ),
);
assert.equal(comparisonFacts.length > 0, true);
assert.equal(
  withPolicy.every((recommendation) =>
    Object.values(recommendation.policyComparison.displayGroups)
      .flat()
      .every(
        (item) =>
          (item.proposedFacts?.length ?? 0) === 0 ||
          !item.proposedProgramSummary.includes(
            "Δεν υπάρχει σχετικό structured record",
          ),
      ),
  ),
  true,
  "A related structured record must never render the generic missing message.",
);

const factKeys = comparisonFacts.map((fact) =>
  [
    fact.programId,
    fact.sourceRecordType,
    fact.factId,
    fact.topicKey,
    fact.scope,
    fact.measureType,
    fact.valueNumber ?? "",
    fact.currency ?? "",
    fact.exactText,
    fact.conditions.join("|"),
  ].join("::"),
);
assert.equal(new Set(factKeys).size, factKeys.length, "Exact product fact duplicates found.");

const detailCounts = {};
for (const productId of ["GEN-MP", "GEN-MF", "GRO-SPR", "INT-MS"]) {
  const response = await fetch(`${APP_ORIGIN}/api/programs/${productId}`);
  const payload = await response.json();
  assert.equal(response.status, 200);
  assert.equal(payload.ok, true);
  assert.equal(payload.source, "supabase");
  assert.equal(payload.program.contractVersion, "product-detail-2026-07-v2");
  detailCounts[productId] = Object.fromEntries(
    [
      "coverageFacts",
      "deductibleRules",
      "monetaryFacts",
      "waitingPeriods",
      "exclusions",
      "providerNetworks",
      "procedureFees",
      "supplementaryBenefits",
      "claimRules",
    ].map((field) => {
      assert.equal(Array.isArray(payload.program[field]), true);
      return [field, payload.program[field].length];
    }),
  );
}

const numericExampleKeys = new Set();
const numericExamples = comparisonFacts
  .filter((fact) => fact.valueNumber !== null)
  .sort((left, right) => right.valueNumber - left.valueNumber)
  .filter((fact) => {
    const key = `${fact.programId}|${fact.valueNumber}|${fact.currency ?? ""}|${fact.measureType}`;
    if (numericExampleKeys.has(key)) return false;
    numericExampleKeys.add(key);
    return true;
  })
  .slice(0, 6)
  .map((fact) => ({
    programId: fact.programId,
    title: fact.title,
    amount: fact.valueNumber,
    currency: fact.currency,
    measureType: fact.measureType,
  }));
const monetaryExcerptExamples = comparisonFacts
  .filter((fact) => fact.sourceRecordType === "monetary_fact")
  .slice(0, 3)
  .map((fact) => ({
    programId: fact.programId,
    excerpt: fact.exactText.slice(0, 180),
    parsedValue: fact.valueNumber,
  }));
assert.equal(numericExamples.length > 0, true);
assert.equal(monetaryExcerptExamples.length > 0, true);

console.log(
  JSON.stringify({
    policyAnalysisStatus: policyResponse.status,
    source: policyPayload.source,
    outputParsed: policyPayload.outputParsed,
    snapshotCreated: true,
    personalDataReturned: false,
    invalidPdfRejected: true,
    nonPdfRejected: true,
    oversizedPdfRejected: true,
    multipleFilesRejected: true,
    stableErrorContracts: true,
    noStore: true,
    phaseTimingsMs: phaseTimings,
    comparisonCount: withPolicy.length,
    noPdfRecommendationCount: withoutPdf.length,
    rankingUnchanged: true,
    productIds: withPolicy.map((item) => item.programId),
    detailCounts,
    databaseFactsShown: comparisonFacts.length,
    exactDuplicates: false,
    genericMissingWithRelatedRecord: false,
    numericExamples,
    monetaryExcerptExamples,
  }),
);
