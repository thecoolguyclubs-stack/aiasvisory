import { z } from "zod";

import { normalizeExistingPolicySnapshot } from "./normalization.ts";

const PolicyFactStatusSchema = z.enum([
  "confirmed",
  "conditional",
  "unknown",
  "needs_confirmation",
]);

const PolicyEvidenceReferenceSchema = z
  .object({
    page: z.number().nullable(),
    section: z.string().nullable(),
    excerpt: z.string(),
  })
  .strict();

const ExistingPolicyCoverageSchema = z
  .object({
    id: z.string(),
    category: z.enum([
      "hospitalization",
      "outpatient",
      "emergency",
      "diagnostics",
      "prevention",
      "maternity",
      "pediatric",
      "physiotherapy",
      "international",
      "assistance",
      "other",
    ]),
    title: z.string(),
    description: z.string(),
    status: PolicyFactStatusSchema,
    annualLimit: z.number().nullable(),
    perIncidentLimit: z.number().nullable(),
    currency: z.string().nullable(),
    coveragePercentage: z.number().nullable(),
    conditions: z.array(z.string()),
    evidence: z.array(PolicyEvidenceReferenceSchema),
  })
  .strict();

const ExistingPolicyDeductibleSchema = z
  .object({
    title: z.string(),
    amount: z.number().nullable(),
    percentage: z.number().nullable(),
    currency: z.string().nullable(),
    appliesTo: z.string(),
    conditions: z.array(z.string()),
    status: PolicyFactStatusSchema,
    evidence: z.array(PolicyEvidenceReferenceSchema),
  })
  .strict();

const ExistingPolicyWaitingPeriodSchema = z
  .object({
    appliesTo: z.string(),
    durationValue: z.number().nullable(),
    durationUnit: z.enum(["days", "months", "years"]).nullable(),
    conditions: z.array(z.string()),
    status: PolicyFactStatusSchema,
    evidence: z.array(PolicyEvidenceReferenceSchema),
  })
  .strict();

const ExistingPolicyExclusionSchema = z
  .object({
    title: z.string(),
    description: z.string(),
    conditions: z.array(z.string()),
    status: PolicyFactStatusSchema,
    evidence: z.array(PolicyEvidenceReferenceSchema),
  })
  .strict();

const ExistingPolicyNetworkSchema = z
  .object({
    title: z.string(),
    description: z.string(),
    conditions: z.array(z.string()),
    status: PolicyFactStatusSchema,
    evidence: z.array(PolicyEvidenceReferenceSchema),
  })
  .strict();

const ExistingPolicyImportantConditionSchema = z
  .object({
    title: z.string(),
    description: z.string(),
    status: PolicyFactStatusSchema,
    evidence: z.array(PolicyEvidenceReferenceSchema),
  })
  .strict();

export const ExistingPolicySnapshotSchema = z
  .object({
    schemaVersion: z.literal("existing-policy-v1"),
    documentMetadata: z
      .object({
        insurer: z.string().nullable(),
        productName: z.string().nullable(),
        policyType: z.string().nullable(),
        currency: z.string().nullable(),
        pageCount: z.number().nullable(),
      })
      .strict(),
    insuredScope: z
      .object({
        type: z.enum(["individual", "couple", "family", "child", "unknown"]),
        memberCount: z.number().nullable(),
      })
      .strict(),
    coverages: z.array(ExistingPolicyCoverageSchema),
    deductibles: z.array(ExistingPolicyDeductibleSchema),
    waitingPeriods: z.array(ExistingPolicyWaitingPeriodSchema),
    exclusions: z.array(ExistingPolicyExclusionSchema),
    networks: z.array(ExistingPolicyNetworkSchema),
    importantConditions: z.array(ExistingPolicyImportantConditionSchema),
    extractionWarnings: z.array(z.string()),
    unverifiedItems: z.array(z.string()),
    extractionConfidence: z.enum(["high", "medium", "low"]),
  })
  .strict();

export type PolicyFactStatus = z.infer<typeof PolicyFactStatusSchema>;
export type PolicyEvidenceReference = z.infer<
  typeof PolicyEvidenceReferenceSchema
>;
export type ExistingPolicyCoverage = z.infer<
  typeof ExistingPolicyCoverageSchema
>;
export type ExistingPolicyDeductible = z.infer<
  typeof ExistingPolicyDeductibleSchema
>;
export type ExistingPolicyWaitingPeriod = z.infer<
  typeof ExistingPolicyWaitingPeriodSchema
>;
export type ExistingPolicyExclusion = z.infer<
  typeof ExistingPolicyExclusionSchema
>;
export type ExistingPolicySnapshot = z.infer<
  typeof ExistingPolicySnapshotSchema
>;

export type PolicySnapshotValidationCode =
  | "invalid_structure"
  | "invalid_number"
  | "invalid_currency"
  | "invalid_reference"
  | "unsafe_personal_data"
  | "invalid_text";

export type PolicySnapshotValidationResult =
  | { ok: true; snapshot: ExistingPolicySnapshot }
  | { ok: false; code: PolicySnapshotValidationCode };

const knownCurrencyCodes = new Set([
  "AED", "AUD", "BGN", "CAD", "CHF", "CNY", "CZK", "DKK", "EUR",
  "GBP", "HKD", "HUF", "ILS", "INR", "JPY", "NOK", "NZD", "PLN",
  "RON", "SEK", "SGD", "TRY", "USD", "ZAR",
]);

const normalizedText = (value: string) => value.trim().replace(/\s+/gu, " ");

const personalDataPatterns = [
  /\b[A-Z]{2}\d{2}[A-Z0-9]{10,30}\b/u,
  /\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\b/u,
  /\b(?:\+?30[\s.-]?)?(?:69\d|2\d{2})[\s.-]?\d{3}[\s.-]?\d{4}\b/u,
  /(?:όνομα\s+ασφαλισμένου|ονοματεπώνυμο|α\.?φ\.?μ\.?|αμκα|αριθμός\s+ταυτότητας|διεύθυνση\s+κατοικίας|στοιχεία\s+πληρωμής|ιστορικό\s+υγείας|insured\s+name|policyholder\s+name|tax\s+id|identity\s+number|home\s+address|payment\s+details|medical\s+history)\s*[:#-]\s*\S+/iu,
];

function containsPersonalData(value: string) {
  return personalDataPatterns.some((pattern) => pattern.test(value));
}

function collectStrings(value: unknown, strings: string[] = []): string[] {
  if (typeof value === "string") strings.push(value);
  else if (Array.isArray(value)) {
    value.forEach((item) => collectStrings(item, strings));
  } else if (typeof value === "object" && value !== null) {
    Object.values(value).forEach((item) => collectStrings(item, strings));
  }
  return strings;
}

function validCurrency(value: string | null) {
  return value === null || knownCurrencyCodes.has(value);
}

function validMoney(value: number | null) {
  return value === null || (Number.isFinite(value) && value >= 0);
}

function validPercentage(value: number | null) {
  return value === null ||
    (Number.isFinite(value) && value >= 0 && value <= 100);
}

function validEvidence(reference: PolicyEvidenceReference) {
  return (
    (reference.page === null ||
      (Number.isSafeInteger(reference.page) && reference.page > 0)) &&
    normalizedText(reference.excerpt).length > 0 &&
    normalizedText(reference.excerpt).length <= 280 &&
    (reference.section === null ||
      normalizedText(reference.section).length <= 160)
  );
}

export function validateExistingPolicySnapshot(
  value: unknown,
): PolicySnapshotValidationResult {
  const parsed = ExistingPolicySnapshotSchema.safeParse(value);
  if (!parsed.success) return { ok: false, code: "invalid_structure" };

  const snapshot = parsed.data;
  const allStrings = collectStrings(snapshot);

  if (allStrings.some(containsPersonalData)) {
    return { ok: false, code: "unsafe_personal_data" };
  }

  if (
    allStrings.some((text) => {
      const length = normalizedText(text).length;
      return length === 0 || length > 1_500;
    })
  ) {
    return { ok: false, code: "invalid_text" };
  }

  if (
    snapshot.coverages.some(
      (item) =>
        !validMoney(item.annualLimit) ||
        !validMoney(item.perIncidentLimit) ||
        !validPercentage(item.coveragePercentage),
    ) ||
    snapshot.deductibles.some(
      (item) =>
        !validMoney(item.amount) ||
        !validPercentage(item.percentage),
    )
  ) {
    return { ok: false, code: "invalid_number" };
  }

  const currencies = [
    snapshot.documentMetadata.currency,
    ...snapshot.coverages.map((item) => item.currency),
    ...snapshot.deductibles.map((item) => item.currency),
  ].filter((currency): currency is string => currency !== null);
  if (
    !validCurrency(snapshot.documentMetadata.currency) ||
    currencies.some((currency) => !validCurrency(currency))
  ) {
    return { ok: false, code: "invalid_currency" };
  }

  if (
    (snapshot.documentMetadata.pageCount !== null &&
      (!Number.isSafeInteger(snapshot.documentMetadata.pageCount) ||
        snapshot.documentMetadata.pageCount <= 0)) ||
    (snapshot.insuredScope.memberCount !== null &&
      (!Number.isSafeInteger(snapshot.insuredScope.memberCount) ||
        snapshot.insuredScope.memberCount <= 0)) ||
    snapshot.waitingPeriods.some(
      (item) =>
        item.durationValue !== null &&
        (!Number.isFinite(item.durationValue) || item.durationValue < 0),
    )
  ) {
    return { ok: false, code: "invalid_number" };
  }

  const evidence = [
    ...snapshot.coverages.flatMap((item) => item.evidence),
    ...snapshot.deductibles.flatMap((item) => item.evidence),
    ...snapshot.waitingPeriods.flatMap((item) => item.evidence),
    ...snapshot.exclusions.flatMap((item) => item.evidence),
    ...snapshot.networks.flatMap((item) => item.evidence),
    ...snapshot.importantConditions.flatMap((item) => item.evidence),
  ];
  if (evidence.some((reference) => !validEvidence(reference))) {
    return { ok: false, code: "invalid_reference" };
  }

  return {
    ok: true,
    snapshot: normalizeExistingPolicySnapshot(snapshot),
  };
}

export function isExistingPolicySnapshot(
  value: unknown,
): value is ExistingPolicySnapshot {
  return validateExistingPolicySnapshot(value).ok;
}
