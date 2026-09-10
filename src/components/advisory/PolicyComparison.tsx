import type {
  PolicyComparisonItem,
  ProgramPolicyComparison,
} from "@/lib/policy-analysis/comparison";
import { compactPolicyComparisonDisplay } from "@/lib/policy-analysis/comparison";
import { currentPolicyGuidance } from "@/lib/policy-analysis/retention";
import type { ComparableProductFact } from "@/lib/recommendations/product-facts";

import styles from "./advisory.module.css";

const badgeLabels: Record<ProgramPolicyComparison["overallStatus"], string> = {
  meaningful_improvement: "Βελτιώνει συγκεκριμένες καλύψεις",
  mixed: "Μικτή εικόνα",
  broadly_similar: "Παρόμοιο σε όσα συγκρίθηκαν",
  insufficient_evidence: "Χρειάζεται περισσότερη επιβεβαίωση",
};

const legacySectionDefinitions: Array<{
  key:
    | "improvements"
    | "tradeoffs"
    | "currentPolicyAdvantages"
    | "similarItems"
    | "unknownItems";
  title: string;
}> = [
  { key: "improvements", title: "Βελτιώσεις" },
  { key: "tradeoffs", title: "Συμβιβασμοί" },
  {
    key: "currentPolicyAdvantages",
    title: "Τι διατηρεί καλύτερο το υπάρχον",
  },
  { key: "similarItems", title: "Παρόμοια σημεία" },
  { key: "unknownItems", title: "Χρειάζεται επιβεβαίωση" },
];

const comparableProductFactIdentity = (fact: ComparableProductFact) =>
  JSON.stringify([
    fact.sourceRecordType,
    fact.factId,
    fact.topicKey,
    fact.measureType,
    fact.title,
    fact.exactText,
    fact.valueNumber,
    fact.currency,
    fact.durationValue,
    fact.durationUnit,
    fact.scope,
    fact.conditions,
    fact.sourceFilename,
    fact.articleSection,
    fact.pdfPage,
  ]);

const comparableProductFactPresentationIdentity = (
  fact: ComparableProductFact,
) =>
  JSON.stringify([
    fact.measureType,
    fact.title,
    fact.exactText,
    fact.valueNumber,
    fact.currency,
    fact.durationValue,
    fact.durationUnit,
    fact.scope,
    fact.conditions,
  ]);

const comparisonItemIdentity = (item: PolicyComparisonItem) =>
  JSON.stringify([
    item.category,
    item.status,
    item.topicKey,
    item.title,
    item.userPriority,
    item.existingPolicySummary,
    item.proposedProgramSummary,
    item.reasoning,
    item.currentEvidence,
    item.proposedEvidenceIds,
    (item.proposedFacts ?? []).map(comparableProductFactIdentity),
    item.requiresAdvisorConfirmation,
  ]);

function deduplicateComparisonCards(items: PolicyComparisonItem[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const identity = comparisonItemIdentity(item);
    if (seen.has(identity)) return false;
    seen.add(identity);
    return true;
  });
}

export function comparisonBadgeLabel(
  overallStatus: ProgramPolicyComparison["overallStatus"],
) {
  return badgeLabels[overallStatus];
}

function comparisonHighlights(comparison: ProgramPolicyComparison) {
  const improvement = comparison.improvements.at(0);
  const caution =
    comparison.tradeoffs.at(0) ??
    comparison.currentPolicyAdvantages.at(0) ??
    comparison.unknownItems.at(0);

  return deduplicateComparisonCards(
    [improvement, caution].filter(
      (item): item is PolicyComparisonItem => Boolean(item),
    ),
  );
}

export function PolicyComparisonCardSummary({
  comparison,
}: {
  comparison: ProgramPolicyComparison;
}) {
  const highlights = comparisonHighlights(comparison);

  return (
    <div className={styles.policyComparisonCardSummary}>
      {currentPolicyGuidance(comparison) && <p>{currentPolicyGuidance(comparison)}</p>}
      <span className={styles.policyComparisonBadge}>
        {comparisonBadgeLabel(comparison.overallStatus)}
      </span>
      {highlights.length > 0 && (
        <ul>
          {highlights.map((item) => (
            <li key={comparisonItemIdentity(item)}>
              <span aria-hidden="true">
                {item.status === "improvement" ? "↑" : "!"}
              </span>
              {item.title}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const measureLabels: Record<ComparableProductFact["measureType"], string> = {
  annual_limit: "Ετήσιο όριο",
  per_incident_limit: "Όριο ανά περιστατικό",
  coverage_percentage: "Ποσοστό κάλυψης",
  deductible_amount: "Απαλλαγή",
  deductible_percentage: "Ποσοστιαία απαλλαγή",
  copayment_amount: "Συμμετοχή",
  copayment_percentage: "Ποσοστιαία συμμετοχή",
  waiting_period: "Περίοδος αναμονής",
  confirmed_coverage: "Κάλυψη",
  exclusion: "Περιορισμός",
  network: "Δίκτυο",
  service: "Υπηρεσία",
  procedure_fee: "Ιατρική αμοιβή",
  raw_monetary_term: "Οικονομικός όρος",
  unknown: "Όρος προγράμματος",
};

const scopeLabels: Record<ComparableProductFact["scope"], string | null> = {
  annual: "ετησίως",
  per_incident: "ανά περιστατικό",
  per_person: "ανά ασφαλισμένο",
  family: "οικογενειακό",
  individual: "ατομικό",
  unknown: null,
};

const needsStructuredConfirmation =
  "Δεν υπάρχει ακόμη αριθμητικά επιβεβαιωμένο στοιχείο για ασφαλή σύγκριση. Χρειάζεται έλεγχος από σύμβουλο.";

function comparableValue(fact: ComparableProductFact) {
  if (fact.valueNumber !== null) {
    return `${fact.valueNumber.toLocaleString("el-GR")}${fact.currency ? ` ${fact.currency}` : fact.measureType.includes("percentage") ? "%" : ""}${scopeLabels[fact.scope] ? ` · ${scopeLabels[fact.scope]}` : ""}`;
  }
  if (fact.durationValue !== null && fact.durationUnit) {
    return `${fact.durationValue} ${fact.durationUnit}`;
  }
  return scopeLabels[fact.scope];
}

function compactText(value: string) {
  return value
    .replace(/\s+/gu, " ")
    .replace(/\s+([.,;:])/gu, "$1")
    .trim();
}

function compactSentence(value: string) {
  const text = compactText(value);
  if (!text) return "";
  const firstSentence = text.match(/^(.{1,180}?[.!;·]|.{1,180})(\s|$)/u)?.[1] ?? text;
  return firstSentence.length > 190
    ? `${firstSentence.slice(0, 187).trim()}...`
    : firstSentence.trim();
}

function compactFactSummary(fact: ComparableProductFact) {
  const value = comparableValue(fact);
  if (value) {
    return `${measureLabels[fact.measureType]}: ${value}`;
  }
  if (["confirmed_coverage", "service", "network"].includes(fact.measureType)) {
    const conditions = fact.conditions
      .map(compactText)
      .filter((condition) => condition.length > 0 && condition.length <= 80)
      .slice(0, 2);
    if (conditions.length > 0) {
      return `${measureLabels[fact.measureType]}: ${conditions.join(" · ")}.`;
    }
    return `${measureLabels[fact.measureType]}: ${fact.title}.`;
  }
  if (fact.measureType === "exclusion") return "Περιορισμός: χρειάζεται έλεγχος όρων.";
  return null;
}

function displayFacts(facts: ComparableProductFact[]) {
  const seen = new Set<string>();
  return facts.filter((fact) => {
    const key = comparableProductFactPresentationIdentity(fact);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function ProposedFact({ fact }: { fact: ComparableProductFact }) {
  const summary = compactFactSummary(fact);
  return (
    <li>
      <strong>{fact.title}</strong>
      <p>{summary ?? needsStructuredConfirmation}</p>
    </li>
  );
}

function ProposedFacts({ item }: { item: PolicyComparisonItem }) {
  const display = compactPolicyComparisonDisplay(item);
  if (display.proposedProgramText) return <p>{display.proposedProgramText}</p>;
  const facts = displayFacts(item.proposedFacts ?? []);
  if (facts.length === 0) {
    const summary = compactSentence(item.proposedProgramSummary);
    return <p>{summary && summary.length <= 180 ? summary : needsStructuredConfirmation}</p>;
  }

  const visibleFacts = facts.slice(0, 3);
  return (
    <ul className={styles.proposedFactList}>
      {visibleFacts.map((fact) => (
        <ProposedFact
          fact={fact}
          key={comparableProductFactIdentity(fact)}
        />
      ))}
      {facts.length > visibleFacts.length && (
        <li className={styles.proposedFactRemainder}>
          <details>
            <summary>Δες ακόμη {facts.length - visibleFacts.length} σύντομα στοιχεία</summary>
            <ul className={styles.proposedFactList}>
              {facts.slice(visibleFacts.length).map((fact) => (
                <ProposedFact
                  fact={fact}
                  key={comparableProductFactIdentity(fact)}
                />
              ))}
            </ul>
          </details>
        </li>
      )}
    </ul>
  );
}

function ComparisonRow({ item }: { item: PolicyComparisonItem }) {
  const display = compactPolicyComparisonDisplay(item);
  return (
    <article className={styles.comparisonRow}>
      <div className={styles.comparisonRowHeading}>
        <h4>{item.title}</h4>
        {item.userPriority && <span>Δική σου προτεραιότητα</span>}
      </div>
      <div className={styles.comparisonColumns}>
        <div>
          <strong>Υπάρχον συμβόλαιο:</strong>
          <p>{display.existingPolicyText}</p>
        </div>
        <div>
          <strong>Προτεινόμενο πρόγραμμα:</strong>
          <ProposedFacts item={item} />
        </div>
      </div>
      <p className={styles.comparisonConclusion}>
        <strong>Συμπέρασμα:</strong> {display.conclusionText}
      </p>
    </article>
  );
}

function compactOverview(comparison: ProgramPolicyComparison) {
  const improved = comparison.priorityCoverageSummary.improvedPriorities.length;
  const unresolved = comparison.priorityCoverageSummary.unresolvedPriorities.length;
  if (comparison.overallStatus === "meaningful_improvement") {
    return improved > 0
      ? `Προτείνεται γιατί βελτιώνει ${improved} δηλωμένη ανάγκη σε σχέση με το υπάρχον.`
      : "Προτείνεται γιατί τα συγκρίσιμα στοιχεία δείχνουν ουσιαστική βελτίωση.";
  }
  if (comparison.overallStatus === "mixed") {
    return "Προτείνεται με επιμέρους οφέλη, αλλά υπάρχουν σημεία που θέλουν έλεγχο.";
  }
  if (comparison.overallStatus === "broadly_similar") {
    return "Τα συγκρίσιμα στοιχεία δείχνουν παρόμοια εικόνα με το υπάρχον.";
  }
  return unresolved > 0
    ? `Χρειάζεται επιβεβαίωση για ${unresolved} δηλωμένη ανάγκη πριν εξαχθεί ασφαλές συμπέρασμα.`
    : "Χρειάζεται επιβεβαίωση από σύμβουλο πριν εξαχθεί ασφαλές συμπέρασμα.";
}

export function PolicyComparisonSection({
  comparison,
}: {
  comparison: ProgramPolicyComparison;
}) {
  const sections = comparison.displayGroups
    ? [
        {
          key: "directlyComparable",
          title: "Άμεσα συγκρίσιμα στοιχεία",
          items: comparison.displayGroups.directlyComparable,
        },
        {
          key: "proposedAdditionalCoverages",
          title: "Πρόσθετες καλύψεις προτεινόμενου",
          items: comparison.displayGroups.proposedAdditionalCoverages,
        },
        {
          key: "currentNeedsConfirmation",
          title: "Καλύψεις υπάρχοντος που χρειάζονται επιβεβαίωση",
          items: comparison.displayGroups.currentNeedsConfirmation,
        },
        {
          key: "financialTermsAndDeductibles",
          title: "Οικονομικοί όροι και απαλλαγές",
          items: comparison.displayGroups.financialTermsAndDeductibles,
        },
        {
          key: "waitingPeriodsAndRestrictions",
          title: "Περίοδοι αναμονής και περιορισμοί",
          items: comparison.displayGroups.waitingPeriodsAndRestrictions,
        },
      ]
    : legacySectionDefinitions.map((section) => ({
        ...section,
        items: comparison[section.key],
      }));
  const allDedupedItems = deduplicateComparisonCards(
    sections.flatMap((section) => section.items),
  );
  const selectedItems = allDedupedItems.filter((item) => item.userPriority);
  const primaryItems =
    selectedItems.length > 0 ? selectedItems : allDedupedItems.slice(0, 3);
  const primaryIds = new Set(primaryItems.map(comparisonItemIdentity));
  const additionalSections = sections
    .map((section) => ({
      ...section,
      items: deduplicateComparisonCards(section.items).filter(
        (item) => !primaryIds.has(comparisonItemIdentity(item)),
      ),
    }))
    .filter((section) => section.items.length > 0);
  const hasItems = primaryItems.length > 0 || additionalSections.length > 0;

  return (
    <div className={styles.policyComparisonDetail}>
      {currentPolicyGuidance(comparison) && <aside className={styles.policyAnalysisBanner}>{currentPolicyGuidance(comparison)}</aside>}
      <div className={styles.policyComparisonOverview}>
        <span className={styles.policyComparisonBadge}>
          {comparisonBadgeLabel(comparison.overallStatus)}
        </span>
        <p>{compactOverview(comparison)}</p>
      </div>

      {hasItems ? (
        <>
          {primaryItems.length > 0 && (
            <section className={styles.comparisonGroup}>
              <h3>Καλύψεις που συνδέονται με τις επιλογές σου</h3>
              <div className={styles.comparisonRows}>
                {primaryItems.map((item) => (
                  <ComparisonRow item={item} key={comparisonItemIdentity(item)} />
                ))}
              </div>
            </section>
          )}

          {additionalSections.length > 0 && (
            <details className={styles.additionalComparisonDetails}>
              <summary>
                <span>Δες επιπλέον καλύψεις</span>
                <small>
                  {additionalSections.reduce(
                    (total, section) => total + section.items.length,
                    0,
                  )}{" "}
                  ακόμη σημεία
                </small>
              </summary>
              <div className={styles.additionalComparisonContent}>
                {additionalSections.map((section) => (
                  <section className={styles.comparisonGroup} key={section.key}>
                    <h3>{section.title}</h3>
                    <div className={styles.comparisonRows}>
                      {section.items.map((item) => (
                        <ComparisonRow
                          item={item}
                          key={comparisonItemIdentity(item)}
                        />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </details>
          )}
        </>
      ) : (
        <p className={styles.comparisonEmpty}>
          Δεν υπάρχουν αρκετά στοιχεία για ασφαλές συμπέρασμα.
        </p>
      )}

      {comparison.advisorConfirmationItems.length > 0 && (
        <section className={styles.comparisonAdvisorItems}>
          <h3>Σημεία για επιβεβαίωση από σύμβουλο</h3>
          <p>
            Οι μη ισοδύναμοι όροι, οι περιορισμοί και οι τελικές εκδόσεις των
            καλύψεων επιβεβαιώνονται μία φορά συνολικά από ασφαλιστικό σύμβουλο.
          </p>
        </section>
      )}

      <p className={styles.policyComparisonDisclaimer}>
        Η σύγκριση βασίζεται στην αυτοματοποιημένη εξαγωγή των όρων του
        ανεβασμένου εγγράφου και στα διαθέσιμα στοιχεία των προγραμμάτων. Δεν
        αντικαθιστά τον έλεγχο του πλήρους συμβολαίου και την επιβεβαίωση από
        ασφαλιστικό σύμβουλο.
      </p>
    </div>
  );
}
