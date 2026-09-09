import type {
  ExistingPolicySnapshot,
  PolicyEvidenceReference,
} from "./schema.ts";

const normalizedText = (value: string) => value.trim().replace(/\s+/gu, " ");

function dedupeBy<T>(items: readonly T[], keyFor: (item: T) => string) {
  const seen = new Set<string>();

  return items.filter((item) => {
    const key = keyFor(item).toLocaleLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function dedupePolicyEvidence(
  references: readonly PolicyEvidenceReference[],
) {
  return dedupeBy(
    references,
    (reference) =>
      `${reference.page ?? ""}|${normalizedText(reference.section ?? "")}|${normalizedText(reference.excerpt)}`,
  );
}

const normalizeEvidence = <T extends { evidence: PolicyEvidenceReference[] }>(
  item: T,
) => ({ ...item, evidence: dedupePolicyEvidence(item.evidence) });

export function normalizeExistingPolicySnapshot(
  snapshot: ExistingPolicySnapshot,
): ExistingPolicySnapshot {
  return {
    ...snapshot,
    coverages: dedupeBy(
      snapshot.coverages.map(normalizeEvidence),
      (item) => `${item.category}|${item.title}|${item.description}`,
    ),
    deductibles: dedupeBy(
      snapshot.deductibles.map(normalizeEvidence),
      (item) =>
        `${item.title}|${item.appliesTo}|${item.amount}|${item.percentage}`,
    ),
    waitingPeriods: dedupeBy(
      snapshot.waitingPeriods.map(normalizeEvidence),
      (item) =>
        `${item.appliesTo}|${item.durationValue}|${item.durationUnit}`,
    ),
    exclusions: dedupeBy(
      snapshot.exclusions.map(normalizeEvidence),
      (item) => `${item.title}|${item.description}`,
    ),
    networks: dedupeBy(
      snapshot.networks.map(normalizeEvidence),
      (item) => `${item.title}|${item.description}`,
    ),
    importantConditions: dedupeBy(
      snapshot.importantConditions.map(normalizeEvidence),
      (item) => `${item.title}|${item.description}`,
    ),
    extractionWarnings: [...new Set(snapshot.extractionWarnings)],
    unverifiedItems: [...new Set(snapshot.unverifiedItems)],
  };
}
