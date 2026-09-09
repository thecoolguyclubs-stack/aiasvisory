"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { estimateDemoPrice } from "@/lib/pricing/demo-pricing";
import {
  isProgramDetailResponse,
  isRecommendationApiError,
  type DatabaseProgramDetail,
  type LiveRecommendation,
  type RecommendationApiError,
} from "@/lib/recommendations/contracts";
import {
  createRecommendationExplanationInput,
  toCustomerGreekText,
} from "@/lib/recommendations/explanation";
import { buildRecommendationPresentation } from "@/lib/recommendations/presentation";
import { readRecommendationSnapshot } from "@/lib/recommendations/storage";

import {
  AdvisoryLoading,
  AdvisoryShell,
  ContentSection,
} from "./AdvisoryUI";
import { CustomerEvidenceSections } from "./CustomerEvidenceSections";
import { DemoPrice } from "./DemoPrice";
import { InsurerLogo } from "./InsurerLogo";
import { PolicyComparisonSection } from "./PolicyComparison";
import { RecommendationExplanation } from "./RecommendationExplanation";
import styles from "./advisory.module.css";
import { useStoredSubmission } from "./useStoredSubmission";

type DetailState =
  | { status: "loading" }
  | { status: "success"; program: DatabaseProgramDetail }
  | { status: "error"; error: RecommendationApiError };

const unique = (values: Array<string | undefined>) =>
  [...new Set(values.filter((value): value is string => Boolean(value?.trim())))];

export function ProgramDetailView({ programId }: { programId: string }) {
  const router = useRouter();
  const submission = useStoredSubmission();
  const [recommendation, setRecommendation] = useState<LiveRecommendation>();
  const [detailState, setDetailState] = useState<DetailState>({
    status: "loading",
  });
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (!submission) return;

    const storedResponse = readRecommendationSnapshot(submission);
    const storedRecommendation = storedResponse?.recommendations.find(
      (candidate) => candidate.programId === programId,
    );

    if (!storedRecommendation) {
      router.replace("/results");
      return;
    }

    const hydrationTimer = window.setTimeout(
      () => setRecommendation(storedRecommendation),
      0,
    );

    return () => window.clearTimeout(hydrationTimer);
  }, [programId, router, submission]);

  useEffect(() => {
    if (!recommendation) return;

    const controller = new AbortController();

    const loadProgramDetail = async () => {
      try {
        const response = await fetch(
          `/api/programs/${encodeURIComponent(programId)}`,
          { cache: "no-store", signal: controller.signal },
        );
        const payload: unknown = await response.json();

        if (!response.ok || !isProgramDetailResponse(payload)) {
          setDetailState({
            status: "error",
            error: isRecommendationApiError(payload)
              ? payload
              : {
                  ok: false,
                  code: "invalid_database_response",
                  message:
                    "Οι λεπτομέρειες δεν είναι διαθέσιμες αυτή τη στιγμή.",
                },
          });
          return;
        }

        setDetailState({ status: "success", program: payload.program });
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;

        setDetailState({
          status: "error",
          error: {
            ok: false,
            code: "database_unavailable",
            message: "Οι λεπτομέρειες δεν είναι διαθέσιμες αυτή τη στιγμή.",
          },
        });
      }
    };

    void loadProgramDetail();
    return () => controller.abort();
  }, [programId, recommendation, retryKey]);

  const detail = detailState.status === "success" ? detailState.program : null;
  const evidenceReferences = useMemo(() => {
    if (!recommendation) return [];
    return [
      ...new Map(
        [
          ...recommendation.evidenceReferences,
          ...(detail?.evidenceReferences ?? []),
        ].map((reference) => [
          `${reference.type}:${reference.id}`,
          reference,
        ]),
      ).values(),
    ];
  }, [detail, recommendation]);
  const presentation = useMemo(
    () =>
      submission && recommendation
        ? buildRecommendationPresentation(submission, recommendation, detail)
        : null,
    [detail, recommendation, submission],
  );
  const explanationInput = useMemo(
    () =>
      recommendation && presentation
        ? createRecommendationExplanationInput(recommendation, presentation)
        : null,
    [presentation, recommendation],
  );
  const demoPrice = useMemo(
    () =>
      submission && recommendation
        ? estimateDemoPrice(submission, recommendation.programId)
        : null,
    [recommendation, submission],
  );

  if (
    !submission ||
    !recommendation ||
    !presentation ||
    !explanationInput ||
    !demoPrice
  ) {
    return <AdvisoryLoading />;
  }

  const programFacts = [
    { label: "Κατηγορία πρότασης", value: presentation.categoryLabel },
    { label: "Τύπος προϊόντος", value: detail?.productType },
    { label: "Κατηγορία", value: detail?.category },
    { label: "Πεδίο παροχών", value: detail?.scopeText },
    { label: "Έκδοση", value: detail?.versionLabel },
    { label: "Ισχύς από", value: detail?.effectiveFrom },
    { label: "Ισχύς έως", value: detail?.effectiveTo },
  ].filter((fact): fact is { label: string; value: string } => Boolean(fact.value));
  const confirmationItems = unique([
    ...recommendation.missingEvidence.map(
      (item) => `Χρειάζεται επιβεβαίωση για ${item.title}.`,
    ),
    detail?.criticalNote ? toCustomerGreekText(detail.criticalNote) : undefined,
    detail?.dataQualityWarning
      ? toCustomerGreekText(detail.dataQualityWarning)
      : undefined,
    presentation.confirmationNote,
  ]);
  const insurerName = detail?.insurer ?? recommendation.insurer;
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

  return (
    <AdvisoryShell
      backHref="/results"
      backLabel="Επιστροφή στα αποτελέσματα"
      wide
    >
      <section
        className={`${styles.detailHero} ${styles[recommendation.category]}`}
      >
        <div className={styles.detailHeroMain}>
          <div className={styles.detailHeaderTop}>
            <div className={styles.detailBrand}>
              <InsurerLogo
                insurer={insurerName}
                programId={recommendation.programId}
              />
              <strong className={styles.detailInsurerName}>{insurerName}</strong>
            </div>
            <span
              className={`${styles.recommendationBadge} ${styles.detailCategoryBadge}`}
            >
              {presentation.categoryLabel}
            </span>
          </div>
          <div className={styles.detailTitleBlock}>
            <p className={styles.eyebrow}>ΛΕΠΤΟΜΕΡΕΙΕΣ ΠΡΟΓΡΑΜΜΑΤΟΣ</p>
            <h1>{detail?.name ?? recommendation.programName}</h1>
            <p>{presentation.subtitle}</p>
          </div>
        </div>
        <aside className={styles.detailScoreCard}>
          <div className={styles.detailScoreSummary}>
            <strong>{recommendation.matchScore}%</strong>
            <span>Βαθμός συμβατότητας με το προφίλ σου</span>
            <div
              aria-hidden="true"
              className={styles.detailScoreProgressTrack}
            >
              <span
                className={`${styles.detailScoreProgressFill} ${scoreToneClass}`}
                style={{ width: `${visualMatchScore}%` }}
              />
            </div>
          </div>
          <div className={styles.detailEvidenceCount}>
            <strong>{presentation.customerEvidence.length}</strong>
            <span>Διακριτά στοιχεία τεκμηρίωσης</span>
          </div>
          <Link
            className={styles.primaryLink}
            href={`/interest/${recommendation.programId}`}
          >
            Εκδήλωση ενδιαφέροντος
          </Link>
        </aside>
      </section>

      {detailState.status === "loading" && (
        <section aria-live="polite" className={styles.inlineStatePanel}>
          <span className={styles.loadingMark} aria-hidden="true" />
          <p>Ανανεώνουμε τα διαθέσιμα στοιχεία του προγράμματος…</p>
        </section>
      )}

      {detailState.status === "error" && (
        <section className={styles.inlineStatePanel} role="alert">
          <span className={styles.stateErrorIcon} aria-hidden="true">!</span>
          <div>
            <strong>Δεν ανανεώθηκαν οι λεπτομέρειες</strong>
            <p>{detailState.error.message}</p>
          </div>
          <button
            className={styles.secondaryButton}
            onClick={() => {
              setDetailState({ status: "loading" });
              setRetryKey((current) => current + 1);
            }}
            type="button"
          >
            Επανάληψη
          </button>
        </section>
      )}

      {detailState.status !== "loading" && (
        <div
          className={`${styles.detailAccentScope} ${styles[recommendation.category]}`}
        >
          <RecommendationExplanation
            category={recommendation.category}
            input={explanationInput}
            programId={recommendation.programId}
          />
        </div>
      )}

      <DemoPrice estimate={demoPrice} />

      {programFacts.length > 0 && (
        <ContentSection
          className={styles.detailInfoSection}
          eyebrow="ΣΤΟΙΧΕΙΑ ΠΡΟΓΡΑΜΜΑΤΟΣ"
          title="Βασικές πληροφορίες"
        >
          <dl className={styles.programFacts}>
            {programFacts.map((fact) => (
              <div key={fact.label}>
                <dt>{fact.label}</dt>
                <dd>{fact.value}</dd>
              </div>
            ))}
          </dl>
        </ContentSection>
      )}

      {presentation.customerEvidence.length > 0 && (
        <ContentSection
          className={styles.detailInfoSection}
          eyebrow="ΟΡΟΙ / ΚΑΛΥΨΕΙΣ"
          title="Τεκμηριωμένα στοιχεία του προγράμματος"
        >
          <CustomerEvidenceSections
            items={presentation.customerEvidence}
            references={evidenceReferences}
          />
        </ContentSection>
      )}

      {recommendation.policyComparison && (
        <ContentSection
          className={styles.detailInfoSection}
          eyebrow="ΑΝΤΙΚΕΙΜΕΝΙΚΗ ΣΥΓΚΡΙΣΗ ΟΡΩΝ"
          title="Σύγκριση με το υπάρχον συμβόλαιό σου"
        >
          <PolicyComparisonSection
            comparison={recommendation.policyComparison}
          />
        </ContentSection>
      )}

      {confirmationItems.length > 0 && (
        <ContentSection
          className={styles.detailInfoSection}
          eyebrow="ΕΛΕΓΧΟΣ ΣΥΜΒΟΥΛΟΥ"
          title="Σημεία που θα επιβεβαιώσει ο σύμβουλος"
        >
          <ul className={styles.numberedList}>
            {confirmationItems.map((item, index) => (
              <li key={`${index}-${item}`}>
                <span>{index + 1}</span>
                {item}
              </li>
            ))}
          </ul>
        </ContentSection>
      )}

      <section className={styles.finalCta}>
        <div>
          <p>ΕΠΟΜΕΝΟ ΒΗΜΑ</p>
          <h2>Θέλεις να εξετάσουμε αυτή την κατεύθυνση πιο αναλυτικά;</h2>
          <span>
            Οι πραγματικές καλύψεις και οι τελικοί όροι χρειάζονται
            επιβεβαίωση από ασφαλιστικό σύμβουλο.
          </span>
        </div>
        <Link
          className={styles.lightCta}
          href={`/interest/${recommendation.programId}`}
        >
          Με ενδιαφέρει αυτό το πρόγραμμα <span aria-hidden="true">→</span>
        </Link>
      </section>

      <p className={styles.legalLine}>
        Ενημερωτική demo αξιολόγηση — δεν αποτελεί δεσμευτική ασφαλιστική
        προσφορά. Οι τελικοί όροι επιβεβαιώνονται από ασφαλιστικό σύμβουλο.
      </p>
    </AdvisoryShell>
  );
}
