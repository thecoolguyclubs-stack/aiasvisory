"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  isLiveRecommendationsResponse,
  isRecommendationApiError,
  type LiveRecommendationsResponse,
  type RecommendationApiError,
} from "@/lib/recommendations/contracts";
import {
  readRecommendationSnapshot,
  writeRecommendationSnapshot,
} from "@/lib/recommendations/storage";
import { readPolicyAnalysisSession } from "@/lib/policy-analysis/storage";

import {
  AdvisoryLoading,
  AdvisoryShell,
  PageHeading,
} from "./AdvisoryUI";
import styles from "./advisory.module.css";
import { RecommendationCard } from "./RecommendationCard";
import { useStoredSubmission } from "./useStoredSubmission";

function AdvisorDecisionSummary({
  response,
}: {
  response: LiveRecommendationsResponse;
}) {
  const recommendations = response.recommendations;
  const bestRecommendation =
    recommendations.find(
      (recommendation) => recommendation.category === "best-match",
    ) ?? recommendations[0];
  const hasPolicyComparison = recommendations.some(
    (recommendation) => recommendation.policyComparison,
  );
  const evidenceCount = new Set(
    recommendations.flatMap((recommendation) =>
      recommendation.evidenceReferences.map(
        (reference) => `${reference.type}:${reference.id}`,
      ),
    ),
  ).size;
  const strongestScore = Math.max(
    ...recommendations.map((recommendation) => recommendation.matchScore),
  );

  return (
    <section className={styles.advisorDecisionPanel}>
      <div className={styles.advisorDecisionMain}>
        <p className={styles.sectionEyebrow}>ADVISOR OS RESULT</p>
        <h2>
          Πρώτη κατεύθυνση:{" "}
          <span>{bestRecommendation.programName}</span>
        </h2>
        <p>
          Το σύστημα αξιολόγησε τις απαντήσεις σου, τα διαθέσιμα product facts
          και {hasPolicyComparison ? "το υπάρχον συμβόλαιο" : "τις δηλωμένες προτεραιότητες"}.
          Η παρακάτω τριάδα δεν είναι απλή λίστα προϊόντων, αλλά ταξινόμηση με
          βάση τεκμηρίωση, περιορισμούς και σημεία που χρειάζονται σύμβουλο.
        </p>
      </div>
      <dl className={styles.advisorDecisionMetrics}>
        <div>
          <dt>Καλύτερο score</dt>
          <dd>{strongestScore}%</dd>
        </div>
        <div>
          <dt>Επιλογές</dt>
          <dd>{recommendations.length}</dd>
        </div>
        <div>
          <dt>Στοιχεία τεκμηρίωσης</dt>
          <dd>{evidenceCount}</dd>
        </div>
        <div>
          <dt>Υπάρχον συμβόλαιο</dt>
          <dd>{hasPolicyComparison ? "Συγκρίθηκε" : "Δεν ανέβηκε"}</dd>
        </div>
      </dl>
    </section>
  );
}

export function ResultsView() {
  const submission = useStoredSubmission();
  const [requestKey, setRequestKey] = useState(0);
  const [result, setResult] = useState<
    | { status: "loading" }
    | { status: "success"; response: LiveRecommendationsResponse }
    | { status: "error"; error: RecommendationApiError }
  >({ status: "loading" });

  useEffect(() => {
    if (!submission) return;

    const storedResponse = readRecommendationSnapshot(submission);
    if (storedResponse) {
      const hydrationTimer = window.setTimeout(
        () => setResult({ status: "success", response: storedResponse }),
        0,
      );
      return () => window.clearTimeout(hydrationTimer);
    }

    const controller = new AbortController();

    const loadRecommendations = async () => {
      try {
        const policySnapshot = readPolicyAnalysisSession()?.snapshot ?? null;
        const response = await fetch("/api/recommendations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...submission, policySnapshot }),
          cache: "no-store",
          signal: controller.signal,
        });
        const payload: unknown = await response.json();

        if (!response.ok || !isLiveRecommendationsResponse(payload)) {
          const safeError: RecommendationApiError = isRecommendationApiError(
            payload,
          )
            ? payload
            : {
                ok: false,
                code: "invalid_database_response",
                message: "Οι προτάσεις δεν είναι διαθέσιμες αυτή τη στιγμή.",
              };

          setResult({ status: "error", error: safeError });
          return;
        }

        writeRecommendationSnapshot(submission, payload);
        setResult({ status: "success", response: payload });
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;

        setResult({
          status: "error",
          error: {
            ok: false,
            code: "database_unavailable",
            message: "Οι προτάσεις δεν είναι διαθέσιμες αυτή τη στιγμή.",
          },
        });
      }
    };

    void loadRecommendations();

    return () => controller.abort();
  }, [requestKey, submission]);

  if (!submission) return <AdvisoryLoading />;

  return (
    <AdvisoryShell wide>
      <PageHeading
        description="Αξιολόγηση με βάση τις ανάγκες σου και τα διαθέσιμα στοιχεία των ασφαλιστικών προγραμμάτων."
        eyebrow="ΠΡΟΣΩΠΟΠΟΙΗΜΕΝΗ ΑΞΙΟΛΟΓΗΣΗ"
        title="Η προσωπική σου ασφαλιστική αξιολόγηση"
      />
      {result.status === "loading" && (
        <section aria-live="polite" className={styles.statePanel}>
          <span className={styles.loadingMark} aria-hidden="true" />
          <h2>Αναλύουμε τα δεδομένα του ασφαλιστικού σου προφίλ</h2>
          <p>Σε λίγο θα εμφανιστούν οι τρεις κατευθύνσεις που σου ταιριάζουν.</p>
        </section>
      )}

      {result.status === "error" && (
        <section className={styles.statePanel} role="alert">
          <span className={styles.stateErrorIcon} aria-hidden="true">!</span>
          <h2>Δεν μπορέσαμε να δημιουργήσουμε τις προτάσεις</h2>
          <p>{result.error.message}</p>
          {result.error.mappingErrors && result.error.mappingErrors.length > 0 && (
            <ul className={styles.mappingErrorList}>
              {result.error.mappingErrors.map((mappingError, index) => (
                <li key={`${index}-${mappingError.message}`}>
                  <span>{mappingError.message}</span>
                </li>
              ))}
            </ul>
          )}
          <div className={styles.footerActions}>
            {result.error.code === "assessment_mapping_error" && (
              <Link className={styles.secondaryLink} href="/assessment">
                Επεξεργασία απαντήσεων
              </Link>
            )}
            <button
              className={styles.primaryButton}
              onClick={() => {
                setResult({ status: "loading" });
                setRequestKey((current) => current + 1);
              }}
              type="button"
            >
              Προσπάθησε ξανά
            </button>
          </div>
        </section>
      )}

      {result.status === "success" && (
        <>
          <AdvisorDecisionSummary response={result.response} />
          {result.response.recommendations.some(
            (recommendation) => recommendation.policyComparison,
          ) && (
            <aside className={styles.policyAnalysisBanner}>
              <span aria-hidden="true">✓</span>
              Οι προτάσεις λαμβάνουν υπόψη και τα στοιχεία που εξήχθησαν από
              το υπάρχον συμβόλαιό σου.
            </aside>
          )}
          <section
            aria-label="Προτεινόμενα ασφαλιστικά προγράμματα"
            className={styles.resultsGrid}
          >
            {result.response.recommendations.map((recommendation) => (
              <RecommendationCard
                key={recommendation.category}
                recommendation={recommendation}
                submission={submission}
              />
            ))}
          </section>
        </>
      )}

      <aside className={styles.resultsDisclaimer}>
        <span aria-hidden="true">i</span>
        <p>
          Πρόκειται για ενημερωτική demo αξιολόγηση και όχι δεσμευτική
          ασφαλιστική προσφορά. Οι καλύψεις και οι τελικοί όροι επιβεβαιώνονται
          από ασφαλιστικό σύμβουλο. Η τιμολόγηση απαιτεί εξατομικευμένη προσφορά.
        </p>
      </aside>
    </AdvisoryShell>
  );
}
