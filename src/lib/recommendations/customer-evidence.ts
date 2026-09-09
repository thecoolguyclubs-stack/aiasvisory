import type { EvidenceReference } from "./contracts";
import { toCustomerGreekText } from "./explanation";

export interface CustomerEvidenceItem {
  topicKey: string;
  kind:
    | "coverage"
    | "deductible"
    | "limit"
    | "waiting_period"
    | "exclusion"
    | "network"
    | "service";
  title: string;
  summary: string;
  sourceReferences: string[];
  relevanceScore: number;
}

interface EvidenceCandidate extends CustomerEvidenceItem {
  articleKey: string;
  baseTitleKey: string;
  normalizedSummary: string;
  isGenericChunk: boolean;
}

const kindWeights: Record<CustomerEvidenceItem["kind"], number> = {
  coverage: 50,
  deductible: 44,
  limit: 46,
  waiting_period: 38,
  exclusion: 36,
  network: 54,
  service: 52,
};

const specificity: Record<CustomerEvidenceItem["kind"], number> = {
  coverage: 1,
  service: 2,
  network: 3,
  limit: 4,
  deductible: 5,
  waiting_period: 6,
  exclusion: 7,
};

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("el-GR")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

const slug = (value: string) => normalize(value).replace(/\s+/g, "-");

const normalizedPresentationText = (value: string) =>
  value.trim().replace(/\s+/gu, " ");

const exactPresentationIdentity = (item: CustomerEvidenceItem) =>
  JSON.stringify([
    normalizedPresentationText(item.title),
    normalizedPresentationText(item.summary),
  ]);

export const customerEvidenceIdentity = (item: CustomerEvidenceItem) =>
  JSON.stringify([
    item.kind,
    item.topicKey,
    normalizedPresentationText(item.title),
    normalizedPresentationText(item.summary),
  ]);

function deduplicateCustomerEvidence(
  items: CustomerEvidenceItem[],
): CustomerEvidenceItem[] {
  const result: CustomerEvidenceItem[] = [];
  const positions = new Map<string, number>();

  for (const item of items) {
    const identity = exactPresentationIdentity(item);
    const existingPosition = positions.get(identity);
    if (existingPosition === undefined) {
      positions.set(identity, result.length);
      result.push(item);
      continue;
    }

    const existing = result[existingPosition];
    result[existingPosition] = {
      ...existing,
      sourceReferences: [
        ...new Set([...existing.sourceReferences, ...item.sourceReferences]),
      ],
    };
  }

  return result;
}

function evidenceKind(type: string): CustomerEvidenceItem["kind"] {
  const normalizedType = type.toLocaleLowerCase("en-US");

  if (normalizedType.includes("deductible") || normalizedType.includes("participation")) {
    return "deductible";
  }
  if (normalizedType.includes("waiting")) return "waiting_period";
  if (normalizedType.includes("exclusion") || normalizedType.includes("restriction")) {
    return "exclusion";
  }
  if (normalizedType.includes("limit") || normalizedType.includes("monetary")) {
    return "limit";
  }
  if (normalizedType.includes("network") || normalizedType.includes("provider")) {
    return "network";
  }
  if (
    normalizedType.includes("service") ||
    normalizedType.includes("assistance") ||
    normalizedType.includes("claim_rule")
  ) {
    return "service";
  }
  return "coverage";
}

function customerTitle(
  baseTitle: string,
  kind: CustomerEvidenceItem["kind"],
) {
  const title = toCustomerGreekText(baseTitle).replace(/\s*&\s*/gu, " και ");
  const normalizedTitle = normalize(title);

  if (kind === "deductible") {
    return /απαλλαγ|συμμετοχ/u.test(normalizedTitle)
      ? title
      : `Απαλλαγή ή συμμετοχή για ${title}`;
  }
  if (kind === "waiting_period") {
    return normalizedTitle.includes("περιοδος αναμονης")
      ? title
      : `Περίοδος αναμονής για ${title}`;
  }
  if (kind === "exclusion") {
    return /εξαιρεσ|περιορισμ/u.test(normalizedTitle)
      ? title
      : `Περιορισμός για ${title}`;
  }
  if (kind === "limit") {
    return normalizedTitle.includes("οριο") ? title : `Όριο για ${title}`;
  }
  return title;
}

const isGenericReference = (reference: EvidenceReference) => {
  const type = reference.type.toLocaleLowerCase("en-US");
  const title = normalize(reference.title ?? "");
  return (
    type.includes("chunk") ||
    type.includes("document") ||
    title === "document evidence" ||
    title === "στοιχειο εγγραφου"
  );
};

function toCandidate(
  reference: EvidenceReference,
  relevantSignalCodes: ReadonlySet<string>,
): EvidenceCandidate | null {
  const rawTitle = reference.title?.trim();
  const rawSummary = reference.excerpt?.trim();
  if (!rawTitle || !rawSummary || !reference.id.trim()) return null;

  const kind = evidenceKind(reference.type);
  const baseTitle = toCustomerGreekText(rawTitle).replace(/\s*&\s*/gu, " και ");
  const summary = toCustomerGreekText(rawSummary);
  if (!baseTitle || !summary) return null;

  const signal = reference.signalCode?.trim() ?? "";
  const signalMatch = signal && relevantSignalCodes.has(signal) ? 100 : 0;
  const isGenericChunk = isGenericReference(reference);
  const articleKey = normalize(reference.articleSection ?? "");
  const baseTitleKey = normalize(baseTitle);
  const topicKey = slug(signal || baseTitle);

  return {
    topicKey,
    kind,
    title: customerTitle(baseTitle, kind),
    summary,
    sourceReferences: [reference.id],
    relevanceScore:
      signalMatch + kindWeights[kind] + (isGenericChunk ? -35 : 20),
    articleKey,
    baseTitleKey,
    normalizedSummary: normalize(summary),
    isGenericChunk,
  };
}

function preferMoreSpecific(
  current: EvidenceCandidate,
  candidate: EvidenceCandidate,
) {
  if (specificity[candidate.kind] !== specificity[current.kind]) {
    return specificity[candidate.kind] > specificity[current.kind]
      ? candidate
      : current;
  }
  return candidate.relevanceScore > current.relevanceScore
    ? candidate
    : current;
}

export function buildCustomerEvidenceItems(
  references: EvidenceReference[],
  relevantSignalCodes: readonly string[] = [],
): CustomerEvidenceItem[] {
  const relevantSignals = new Set(relevantSignalCodes);
  const seenIds = new Set<string>();
  const candidates = references.reduce<EvidenceCandidate[]>((items, reference) => {
    if (seenIds.has(reference.id)) return items;
    seenIds.add(reference.id);
    const candidate = toCandidate(reference, relevantSignals);
    if (candidate) items.push(candidate);
    return items;
  }, []);

  const preciseArticles = new Set(
    candidates
      .filter((candidate) => !candidate.isGenericChunk && candidate.articleKey)
      .map((candidate) => candidate.articleKey),
  );
  const withoutGenericDuplicates = candidates.filter(
    (candidate) =>
      !candidate.isGenericChunk ||
      !candidate.articleKey ||
      !preciseArticles.has(candidate.articleKey),
  );

  const byTitleAndSummary = new Map<string, EvidenceCandidate>();
  for (const candidate of withoutGenericDuplicates) {
    const key = `${candidate.baseTitleKey}:${candidate.normalizedSummary}`;
    const current = byTitleAndSummary.get(key);
    if (!current) {
      byTitleAndSummary.set(key, candidate);
      continue;
    }

    const preferred = preferMoreSpecific(current, candidate);
    byTitleAndSummary.set(key, {
      ...preferred,
      sourceReferences: [
        ...new Set([
          ...current.sourceReferences,
          ...candidate.sourceReferences,
        ]),
      ],
      relevanceScore: Math.max(
        current.relevanceScore,
        candidate.relevanceScore,
      ),
    });
  }

  const byArticleTopicAndKind = new Map<string, EvidenceCandidate>();
  for (const candidate of byTitleAndSummary.values()) {
    const key = [
      candidate.articleKey,
      candidate.topicKey,
      candidate.kind,
      candidate.baseTitleKey,
      candidate.normalizedSummary,
    ].join(":");
    const current = byArticleTopicAndKind.get(key);

    if (!current) {
      byArticleTopicAndKind.set(key, candidate);
      continue;
    }

    const preferred = preferMoreSpecific(current, candidate);
    byArticleTopicAndKind.set(key, {
      ...preferred,
      sourceReferences: [
        ...new Set([
          ...current.sourceReferences,
          ...candidate.sourceReferences,
        ]),
      ],
      relevanceScore: Math.max(
        current.relevanceScore,
        candidate.relevanceScore,
      ),
    });
  }

  const sortedItems = [...byArticleTopicAndKind.values()]
    .sort(
      (left, right) =>
        right.relevanceScore - left.relevanceScore ||
        left.title.localeCompare(right.title, "el") ||
        left.normalizedSummary.localeCompare(right.normalizedSummary, "el") ||
        left.kind.localeCompare(right.kind, "en") ||
        left.sourceReferences.join("|").localeCompare(
          right.sourceReferences.join("|"),
          "en",
        ),
    )
    .map((candidate) => ({
      topicKey: candidate.topicKey,
      kind: candidate.kind,
      title: candidate.title,
      summary: candidate.summary,
      sourceReferences: candidate.sourceReferences,
      relevanceScore: candidate.relevanceScore,
    }));

  return deduplicateCustomerEvidence(sortedItems);
}
