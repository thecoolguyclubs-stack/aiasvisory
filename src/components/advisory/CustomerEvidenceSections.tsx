import type { EvidenceReference } from "@/lib/recommendations/contracts";
import {
  customerEvidenceIdentity,
  type CustomerEvidenceItem,
} from "@/lib/recommendations/customer-evidence";

import styles from "./advisory.module.css";

interface EvidenceSectionDefinition {
  key: string;
  title: string;
  kinds: CustomerEvidenceItem["kind"][];
}

const sections: EvidenceSectionDefinition[] = [
  {
    key: "coverage",
    title: "Καλύψεις που ξεχωρίζουν",
    kinds: ["coverage", "network", "service"],
  },
  {
    key: "financial",
    title: "Οικονομικοί όροι και απαλλαγές",
    kinds: ["deductible", "limit"],
  },
  {
    key: "restrictions",
    title: "Περίοδοι αναμονής και περιορισμοί",
    kinds: ["waiting_period", "exclusion"],
  },
];

function EvidenceCard({
  item,
  referencesById,
}: {
  item: CustomerEvidenceItem;
  referencesById: Map<string, EvidenceReference>;
}) {
  const articleReferences = [
    ...new Set(
      item.sourceReferences
        .map((id) => referencesById.get(id)?.articleSection)
        .filter((value): value is string => Boolean(value?.trim())),
    ),
  ];

  return (
    <article
      className={styles.customerEvidenceCard}
      data-evidence-kind={item.kind}
      data-evidence-topic={item.topicKey}
    >
      <h3>{item.title}</h3>
      <p>{item.summary}</p>
      {articleReferences.length > 0 && (
        <small>Όροι: {articleReferences.join(" · ")}</small>
      )}
    </article>
  );
}

function EvidenceGroup({
  definition,
  items,
  referencesById,
  compact = false,
}: {
  definition: EvidenceSectionDefinition;
  items: CustomerEvidenceItem[];
  referencesById: Map<string, EvidenceReference>;
  compact?: boolean;
}) {
  if (items.length === 0) return null;

  return (
    <section className={styles.customerEvidenceGroup}>
      <h3>{definition.title}</h3>
      <div
        className={`${styles.customerEvidenceGrid} ${
          compact ? styles.customerEvidenceGridCompact : ""
        }`}
      >
        {items.map((item) => (
          <EvidenceCard
            item={item}
            key={customerEvidenceIdentity(item)}
            referencesById={referencesById}
          />
        ))}
      </div>
    </section>
  );
}

export function CustomerEvidenceSections({
  items,
  references,
}: {
  items: CustomerEvidenceItem[];
  references: EvidenceReference[];
}) {
  const referencesById = new Map(
    references.map((reference) => [reference.id, reference]),
  );
  const initialItems = items.slice(0, 6);
  const remainingItems = items.slice(6);

  return (
    <div className={styles.customerEvidenceSections}>
      {sections.map((definition) => (
        <EvidenceGroup
          definition={definition}
          items={initialItems.filter((item) =>
            definition.kinds.includes(item.kind),
          )}
          key={definition.key}
          referencesById={referencesById}
        />
      ))}

      {remainingItems.length > 0 && (
        <details className={styles.moreEvidenceDetails}>
          <summary>Δες περισσότερα στοιχεία τεκμηρίωσης</summary>
          <div>
            {sections.map((definition) => (
              <EvidenceGroup
                compact
                definition={definition}
                items={remainingItems.filter((item) =>
                  definition.kinds.includes(item.kind),
                )}
                key={definition.key}
                referencesById={referencesById}
              />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
