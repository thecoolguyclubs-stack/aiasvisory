"use client";

import {
  MAX_POLICY_PDF_SIZE,
  POLICY_PDF_CANONICAL_FILENAME,
} from "./file-validation.ts";
import { normalizeExistingPolicySnapshot } from "./normalization.ts";
import type {
  ExistingPolicySnapshot,
  PolicyEvidenceReference,
} from "./schema.ts";
import { containsUnsafePolicyStorageMaterial } from "./storage-safety.ts";

export { containsUnsafePolicyStorageMaterial } from "./storage-safety.ts";

export const POLICY_ANALYSIS_SESSION_KEY =
  "insurance-market-policy-analysis-v1";

export interface PolicyAnalysisRecord {
  version: 1;
  snapshot: ExistingPolicySnapshot;
  filename: string;
  fileSize: number;
  analyzedAt: string;
  extractionConfidence: ExistingPolicySnapshot["extractionConfidence"];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const hasOnlyKeys = (
  value: Record<string, unknown>,
  keys: readonly string[],
) => {
  const actualKeys = Object.keys(value);
  return (
    actualKeys.length === keys.length &&
    actualKeys.every((key) => keys.includes(key))
  );
};

const normalizedLength = (value: string) =>
  value.trim().replace(/\s+/gu, " ").length;

const personalDataPatterns = [
  /\b[A-Z]{2}\d{2}[A-Z0-9]{10,30}\b/u,
  /\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\b/u,
  /\b(?:\+?30[\s.-]?)?(?:69\d|2\d{2})[\s.-]?\d{3}[\s.-]?\d{4}\b/u,
  /(?:όνομα\s+ασφαλισμένου|ονοματεπώνυμο|α\.?φ\.?μ\.?|αμκα|αριθμός\s+ταυτότητας|διεύθυνση\s+κατοικίας|στοιχεία\s+πληρωμής|ιστορικό\s+υγείας|insured\s+name|policyholder\s+name|tax\s+id|identity\s+number|home\s+address|payment\s+details|medical\s+history)\s*[:#-]\s*\S+/iu,
];

const isSafeText = (value: unknown): value is string =>
  typeof value === "string" &&
  normalizedLength(value) > 0 &&
  normalizedLength(value) <= 1_500 &&
  !personalDataPatterns.some((pattern) => pattern.test(value));

const isNullableSafeText = (value: unknown) =>
  value === null || isSafeText(value);

const isSafeTextArray = (value: unknown) =>
  Array.isArray(value) && value.every(isSafeText);

const isNullableNonNegativeNumber = (value: unknown) =>
  value === null ||
  (typeof value === "number" && Number.isFinite(value) && value >= 0);

const isNullablePercentage = (value: unknown) =>
  value === null ||
  (typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 100);

const isNullablePositiveInteger = (value: unknown) =>
  value === null ||
  (typeof value === "number" && Number.isSafeInteger(value) && value > 0);

const factStatuses = new Set([
  "confirmed",
  "conditional",
  "unknown",
  "needs_confirmation",
]);
const coverageCategories = new Set([
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
]);
const insuredScopeTypes = new Set([
  "individual",
  "couple",
  "family",
  "child",
  "unknown",
]);
const durationUnits = new Set(["days", "months", "years"]);
const confidenceLevels = new Set(["high", "medium", "low"]);
const knownCurrencyCodes = new Set([
  "AED", "AUD", "BGN", "CAD", "CHF", "CNY", "CZK", "DKK", "EUR",
  "GBP", "HKD", "HUF", "ILS", "INR", "JPY", "NOK", "NZD", "PLN",
  "RON", "SEK", "SGD", "TRY", "USD", "ZAR",
]);

const isStatus = (value: unknown) =>
  typeof value === "string" && factStatuses.has(value);

const isNullableCurrency = (value: unknown) =>
  value === null ||
  (typeof value === "string" && knownCurrencyCodes.has(value));

const isEvidence = (value: unknown): value is PolicyEvidenceReference => {
  if (!isRecord(value) || !hasOnlyKeys(value, ["page", "section", "excerpt"])) {
    return false;
  }

  return Boolean(
    isNullablePositiveInteger(value.page) &&
      isNullableSafeText(value.section) &&
      isSafeText(value.excerpt) &&
      normalizedLength(value.excerpt) <= 280 &&
      (value.section === null || normalizedLength(value.section as string) <= 160),
  );
};

const isEvidenceArray = (value: unknown) =>
  Array.isArray(value) && value.every(isEvidence);

const isCoverage = (value: unknown) => {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, [
      "id",
      "category",
      "title",
      "description",
      "status",
      "annualLimit",
      "perIncidentLimit",
      "currency",
      "coveragePercentage",
      "conditions",
      "evidence",
    ])
  ) {
    return false;
  }

  return Boolean(
    isSafeText(value.id) &&
      typeof value.category === "string" &&
      coverageCategories.has(value.category) &&
      isSafeText(value.title) &&
      isSafeText(value.description) &&
      isStatus(value.status) &&
      isNullableNonNegativeNumber(value.annualLimit) &&
      isNullableNonNegativeNumber(value.perIncidentLimit) &&
      isNullableCurrency(value.currency) &&
      isNullablePercentage(value.coveragePercentage) &&
      isSafeTextArray(value.conditions) &&
      isEvidenceArray(value.evidence),
  );
};

const isDeductible = (value: unknown) => {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, [
      "title",
      "amount",
      "percentage",
      "currency",
      "appliesTo",
      "conditions",
      "status",
      "evidence",
    ])
  ) {
    return false;
  }

  return Boolean(
    isSafeText(value.title) &&
      isNullableNonNegativeNumber(value.amount) &&
      isNullablePercentage(value.percentage) &&
      isNullableCurrency(value.currency) &&
      isSafeText(value.appliesTo) &&
      isSafeTextArray(value.conditions) &&
      isStatus(value.status) &&
      isEvidenceArray(value.evidence),
  );
};

const isWaitingPeriod = (value: unknown) => {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, [
      "appliesTo",
      "durationValue",
      "durationUnit",
      "conditions",
      "status",
      "evidence",
    ])
  ) {
    return false;
  }

  return Boolean(
    isSafeText(value.appliesTo) &&
      isNullableNonNegativeNumber(value.durationValue) &&
      (value.durationUnit === null ||
        (typeof value.durationUnit === "string" &&
          durationUnits.has(value.durationUnit))) &&
      isSafeTextArray(value.conditions) &&
      isStatus(value.status) &&
      isEvidenceArray(value.evidence),
  );
};

const isDescribedCondition = (value: unknown) => {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, [
      "title",
      "description",
      "conditions",
      "status",
      "evidence",
    ])
  ) {
    return false;
  }

  return Boolean(
    isSafeText(value.title) &&
      isSafeText(value.description) &&
      isSafeTextArray(value.conditions) &&
      isStatus(value.status) &&
      isEvidenceArray(value.evidence),
  );
};

const isImportantCondition = (value: unknown) => {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, ["title", "description", "status", "evidence"])
  ) {
    return false;
  }

  return Boolean(
    isSafeText(value.title) &&
      isSafeText(value.description) &&
      isStatus(value.status) &&
      isEvidenceArray(value.evidence),
  );
};

const isExistingPolicySnapshot = (
  value: unknown,
): value is ExistingPolicySnapshot => {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, [
      "schemaVersion",
      "documentMetadata",
      "insuredScope",
      "coverages",
      "deductibles",
      "waitingPeriods",
      "exclusions",
      "networks",
      "importantConditions",
      "extractionWarnings",
      "unverifiedItems",
      "extractionConfidence",
    ]) ||
    value.schemaVersion !== "existing-policy-v1"
  ) {
    return false;
  }

  const metadata = value.documentMetadata;
  const insuredScope = value.insuredScope;
  if (
    !isRecord(metadata) ||
    !hasOnlyKeys(metadata, [
      "insurer",
      "productName",
      "policyType",
      "currency",
      "pageCount",
    ]) ||
    !isRecord(insuredScope) ||
    !hasOnlyKeys(insuredScope, ["type", "memberCount"])
  ) {
    return false;
  }

  return Boolean(
    isNullableSafeText(metadata.insurer) &&
      isNullableSafeText(metadata.productName) &&
      isNullableSafeText(metadata.policyType) &&
      isNullableCurrency(metadata.currency) &&
      isNullablePositiveInteger(metadata.pageCount) &&
      typeof insuredScope.type === "string" &&
      insuredScopeTypes.has(insuredScope.type) &&
      isNullablePositiveInteger(insuredScope.memberCount) &&
      Array.isArray(value.coverages) &&
      value.coverages.every(isCoverage) &&
      Array.isArray(value.deductibles) &&
      value.deductibles.every(isDeductible) &&
      Array.isArray(value.waitingPeriods) &&
      value.waitingPeriods.every(isWaitingPeriod) &&
      Array.isArray(value.exclusions) &&
      value.exclusions.every(isDescribedCondition) &&
      Array.isArray(value.networks) &&
      value.networks.every(isDescribedCondition) &&
      Array.isArray(value.importantConditions) &&
      value.importantConditions.every(isImportantCondition) &&
      isSafeTextArray(value.extractionWarnings) &&
      isSafeTextArray(value.unverifiedItems) &&
      typeof value.extractionConfidence === "string" &&
      confidenceLevels.has(value.extractionConfidence),
  );
};

export function validatePolicyAnalysisRecord(
  value: unknown,
): PolicyAnalysisRecord | null {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, [
      "version",
      "snapshot",
      "filename",
      "fileSize",
      "analyzedAt",
      "extractionConfidence",
    ])
  ) {
    return null;
  }

  if (
    value.version !== 1 ||
    !isExistingPolicySnapshot(value.snapshot) ||
    containsUnsafePolicyStorageMaterial(value) ||
    value.filename !== POLICY_PDF_CANONICAL_FILENAME ||
    !Number.isSafeInteger(value.fileSize) ||
    Number(value.fileSize) <= 0 ||
    Number(value.fileSize) > MAX_POLICY_PDF_SIZE ||
    typeof value.analyzedAt !== "string" ||
    !Number.isFinite(Date.parse(value.analyzedAt)) ||
    value.extractionConfidence !== value.snapshot.extractionConfidence
  ) {
    return null;
  }

  return {
    version: 1,
    snapshot: normalizeExistingPolicySnapshot(value.snapshot),
    filename: POLICY_PDF_CANONICAL_FILENAME,
    fileSize: Number(value.fileSize),
    analyzedAt: value.analyzedAt as string,
    extractionConfidence:
      value.extractionConfidence as PolicyAnalysisRecord["extractionConfidence"],
  };
}

export function readPolicyAnalysisSession(): PolicyAnalysisRecord | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.sessionStorage.getItem(POLICY_ANALYSIS_SESSION_KEY);
    if (!raw) return null;
    const record = validatePolicyAnalysisRecord(JSON.parse(raw));
    if (record) return record;

    window.sessionStorage.removeItem(POLICY_ANALYSIS_SESSION_KEY);
    return null;
  } catch {
    try {
      window.sessionStorage.removeItem(POLICY_ANALYSIS_SESSION_KEY);
    } catch {
      // Ignore storage failures and continue without policy analysis.
    }
    return null;
  }
}

export function writePolicyAnalysisSession(value: PolicyAnalysisRecord) {
  if (typeof window === "undefined") return false;
  const record = validatePolicyAnalysisRecord(value);
  if (!record) return false;

  try {
    window.sessionStorage.setItem(
      POLICY_ANALYSIS_SESSION_KEY,
      JSON.stringify(record),
    );
    return true;
  } catch {
    return false;
  }
}

export function clearPolicyAnalysisSession() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(POLICY_ANALYSIS_SESSION_KEY);
  } catch {
    // The assessment remains usable when storage is blocked.
  }
}
