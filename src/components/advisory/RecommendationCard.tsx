import Link from "next/link";

import type { AssessmentSubmission } from "@/lib/assessment/types";
import type { LiveRecommendation } from "@/lib/recommendations/contracts";
import { customerEvidenceIdentity } from "@/lib/recommendations/customer-evidence";
import { buildRecommendationPresentation } from "@/lib/recommendations/presentation";

import { PriceAvailability } from "./PriceAvailability";
import { InsurerLogo } from "./InsurerLogo";
import { PolicyComparisonCardSummary } from "./PolicyComparison";
import styles from "./advisory.module.css";

export function RecommendationCard({
  recommendation,
  submission,
}: {
  recommendation: LiveRecommendation;
  submission: AssessmentSubmission;
}) {
  const presentation = buildRecommendationPresentation(
    submission,
    recommendation,
  );
  const visualMatchScore = Math.max(
    0,
    Math.min(100, recommendation.matchScore),
  );
  const scoreToneClass =
    recommendation.matchScore >= 80
      ? styles.matchHigh
      : recommendation.matchScore >= 70
        ? styles.matchMedium
        : styles.matchLow;
  const scoreTierLabel =
    recommendation.matchScore >= 80
      ? "Ισχυρή αντιστοίχιση"
      : recommendation.matchScore >= 70
        ? "Καλή αντιστοίχιση"
        : "Θέλει επιβεβαίωση";

  return (
    <article
      className={`${styles.recommendationCard} ${styles[recommendation.category]}`}
    >
      <div className={styles.recommendationHeader}>
        <div className={styles.recommendationVisual}>
          <InsurerLogo
            compact
            insurer={recommendation.insurer}
            programId={recommendation.programId}
          />
        </div>
        <span className={styles.recommendationBadge}>
          {presentation.categoryLabel}
        </span>
      </div>

      <div className={styles.programIdentity}>
        <p className={styles.recommendationInsurerName}>{recommendation.insurer}</p>
        <h2>{recommendation.programName}</h2>
        <p>{presentation.subtitle}</p>
      </div>

      <div className={styles.scorePanel}>
        <div className={styles.scoreHeader}>
          <div className={styles.scoreCopy}>
            <span className={styles.scoreLabel}>Συμβατότητα αναγκών</span>
            <strong className={styles.scoreValue}>
              {recommendation.matchScore}%
            </strong>
          </div>
          <span className={`${styles.scoreTier} ${scoreToneClass}`}>
            {scoreTierLabel}
          </span>
        </div>
        <div
          aria-hidden="true"
          className={styles.scoreProgressTrack}
        >
          <span
            className={`${styles.scoreProgressFill} ${scoreToneClass}`}
            style={{ width: `${visualMatchScore}%` }}
          />
        </div>
      </div>



      <details open className={styles.reasonBox}>
        <summary>
          <span>Γιατί σου ταιριάζει</span>
        </summary>
        <p>{presentation.reason}</p>
      </details>

      <div className={styles.cardSection}>
        <h3>Σημεία που ξεχωρίζουν</h3>
        {presentation.strengths.length > 0 ? (
          <ul className={styles.miniFeatureList}>
            {presentation.strengths.map((strength) => (
              <li key={customerEvidenceIdentity(strength)}>
                <span aria-hidden="true">✓</span>
                {strength.title}
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.confirmationLine}>Απαιτείται επιβεβαίωση</p>
        )}
      </div>

      {recommendation.policyComparison && (
        <PolicyComparisonCardSummary
          comparison={recommendation.policyComparison}
        />
      )}

      <details className={styles.reasonBox}>
        <summary>Περιορισμοί και σημεία προσοχής</summary>
        <ul className={styles.miniFeatureList}>
          {[...new Set([...presentation.restrictions, ...presentation.tradeOffs, ...presentation.confirmations])].slice(0, 5).map((item) => <li key={item}>{item}</li>)}
        </ul>
        {recommendation.missingEvidence.length > 0 && <p>Δεν έχει τεκμηριωθεί πλήρως: {recommendation.missingEvidence.map((item) => item.title).join(" · ")}.</p>}
      </details>

      <div className={styles.priceBlock}>
        <PriceAvailability compact />
      </div>
      <div className={styles.cardActions}>
        <Link
          className={styles.primaryLink}
          href={`/results/${recommendation.programId}`}
        >
          Δες λεπτομέρειες
        </Link>
        <Link
          className={styles.tertiaryLink}
          href={`/interest/${recommendation.programId}`}
        >
          Με ενδιαφέρει <span aria-hidden="true">→</span>
        </Link>
      </div>
    </article>
  );
}
