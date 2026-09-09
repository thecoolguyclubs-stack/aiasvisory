"use client";

import Image from "next/image";
import Link from "next/link";

import {
  generateInsuranceProfile,
  getAdditionalNeedInsight,
  getPriorityInsight,
  type NeedInsight,
} from "@/lib/assessment/profile";

import {
  AdvisoryLoading,
  AdvisoryShell,
} from "./AdvisoryUI";
import styles from "./advisory.module.css";
import { useStoredSubmission } from "./useStoredSubmission";

export function AssessmentProfileView() {
  const submission = useStoredSubmission();

  if (!submission) return <AdvisoryLoading />;

  const profile = generateInsuranceProfile(submission);
  const priorityInsights = submission.answers.priorities
    .map((id) => ({ id, insight: getPriorityInsight(id) }))
    .filter((item): item is { id: string; insight: NeedInsight } =>
      Boolean(item.insight),
    );
  const additionalNeedInsights = submission.answers.additionalNeeds
    .map((id) => ({ id, insight: getAdditionalNeedInsight(id) }))
    .filter((item): item is { id: string; insight: NeedInsight } =>
      Boolean(item.insight),
    );
  const profileMetrics = [
    {
      number: "01",
      label: "ΠΟΙΟΙ ΑΣΦΑΛΙΖΟΝΤΑΙ",
      value: profile.insuredPeople.title,
      detail: profile.insuredPeople.detail,
    },
    {
      number: "02",
      label: "ΗΛΙΚΙΑΚΟ ΠΡΟΦΙΛ",
      value: profile.ageProfile.title,
      detail: profile.ageProfile.detail,
    },
    {
      number: "03",
      label: "ΥΠΑΡΧΟΥΣΑ ΑΣΦΑΛΙΣΗ",
      value: profile.currentInsurance.title,
      detail: profile.currentInsurance.detail,
    },
    {
      number: "04",
      label: "ΚΥΡΙΟΣ ΣΤΟΧΟΣ",
      value: profile.mainGoal.title,
      detail: profile.mainGoal.detail,
    },
  ] as const;
  const priorityIconMap: Record<string, { icon: string; accent: "teal" | "magenta" }> = {
    "serious-illness": { icon: "+", accent: "magenta" },
    "hospital-network": { icon: "H", accent: "teal" },
    emergency: { icon: "!", accent: "teal" },
    "low-deductible": { icon: "€", accent: "teal" },
  };
  const additionalNeedIconMap: Record<
    string,
    { icon: string; accent: "teal" | "magenta" }
  > = {
    waiting_period_immediate_use: { icon: "T", accent: "teal" },
    prevention_checkup: { icon: "C", accent: "magenta" },
  };

  return (
    <AdvisoryShell wide>
      <article className={styles.profileBoard}>
        <header className={styles.profileHeroHeader}>
          <span className={styles.profileHeroBadge}>ΤΟ ΑΣΦΑΛΙΣΤΙΚΟ ΣΟΥ ΠΡΟΦΙΛ</span>
          <h1>Η εικόνα των αναγκών σου</h1>
          <p>
            Συγκεντρώσαμε τις απαντήσεις σου σε ένα καθαρό προφίλ αναγκών πριν
            περάσουμε στις ενδεικτικές επιλογές.
          </p>
        </header>
        <section className={styles.needSummaryPanel}>
          <div className={styles.needSummaryCopy}>
            <div className={styles.summaryHeadingRow}>
              <span className={styles.summaryCheck} aria-hidden="true">
                ✓
              </span>
              <span className={styles.summaryEyebrow}>Συνολική αξιολόγηση</span>
            </div>
            <strong>
              Ανάγκη για ουσιαστική κάλυψη με ελεγχόμενη συμμετοχή.
            </strong>
            <p>
              Με βάση τις επιλογές σου, το προφίλ σου δείχνει ποιες
              νοσοκομειακές καλύψεις είναι πιο σημαντικές, ποιο επίπεδο
              συμμετοχής σε εξυπηρετεί και ποιες πρόσθετες παροχές μπορούν να
              κάνουν το πρόγραμμα πιο ολοκληρωμένο για τις πραγματικές σου
              ανάγκες.
            </p>
          </div>
          <div className={styles.summaryArtwork} aria-hidden="true">
            <Image
              alt="Γραφιστικό ασφάλειας υγείας"
              className={styles.summaryArtworkImage}
              height={370}
              src="/graphics/profile-healthcare-illustration.svg"
              width={390}
            />
          </div>
        </section>
        <aside className={styles.profileNoticeStrip}>
          <span className={styles.profileNoticeIcon} aria-hidden="true">
            i
          </span>
          <p>
            Προσωρινή demo αξιολόγηση · Οι τελικοί όροι επιβεβαιώνονται από
            ασφαλιστικό σύμβουλο.
          </p>
        </aside>

        <div className={styles.metricsGrid}>
          {profileMetrics.map((metric) => (
            <article className={styles.metricCard} key={metric.number}>
              <span className={styles.metricNumber} aria-hidden="true">
                {metric.number}
              </span>
              <div>
                <p>{metric.label}</p>
                <h2>{metric.value}</h2>
                <span>{metric.detail}</span>
              </div>
            </article>
          ))}
        </div>

        <div className={styles.profileDetailGrid}>
          <section className={styles.profilePanel}>
            <div className={styles.profilePanelHeader}>
              <span className={styles.panelIcon} aria-hidden="true">
                ★
              </span>
              <p className={styles.sectionEyebrow}>ΚΥΡΙΕΣ ΠΡΟΤΕΡΑΙΟΤΗΤΕΣ</p>
            </div>
            <h2>Τι έχει μεγαλύτερη σημασία</h2>
            <ul className={styles.insightCardGrid}>
              {priorityInsights.map(({ id, insight }) => {
                const icon = priorityIconMap[id];
                return (
                  <li className={styles.insightCard} key={insight.title}>
                    <div className={styles.insightCardHead}>
                      {icon && (
                        <span
                          aria-hidden="true"
                          className={
                            icon.accent === "magenta"
                              ? styles.insightIconMagenta
                              : styles.insightIconTeal
                          }
                        >
                          {icon.icon}
                        </span>
                      )}
                      <strong>{insight.title}</strong>
                    </div>
                    <small>{insight.detail}</small>
                  </li>
                );
              })}
            </ul>
            <div className={styles.inlineSummary}>
              <span className={styles.inlineSummaryIcon} aria-hidden="true">
                €
              </span>
              <div className={styles.inlineSummaryCopy}>
                <span>Προτίμηση απαλλαγής</span>
                <strong>{profile.deductiblePreference}</strong>
              </div>
            </div>
          </section>

          <section className={styles.profilePanel}>
            <div className={styles.profilePanelHeader}>
              <span className={styles.panelIcon} aria-hidden="true">
                +
              </span>
              <p className={styles.sectionEyebrow}>ΠΡΟΣΘΕΤΕΣ ΑΝΑΓΚΕΣ</p>
            </div>
            <h2>Πώς συμπληρώνεται η προστασία</h2>
            {additionalNeedInsights.length > 0 ? (
              <ul className={styles.insightCardGrid}>
                {additionalNeedInsights.map(({ id, insight }) => {
                  const icon = additionalNeedIconMap[id];
                  return (
                    <li className={styles.insightCard} key={insight.title}>
                      <div className={styles.insightCardHead}>
                        {icon && (
                          <span
                            aria-hidden="true"
                            className={
                              icon.accent === "magenta"
                                ? styles.insightIconMagenta
                                : styles.insightIconTeal
                            }
                          >
                            {icon.icon}
                          </span>
                        )}
                        <strong>{insight.title}</strong>
                      </div>
                      <small>{insight.detail}</small>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className={styles.emptyNeeds}>Δεν δηλώθηκαν πρόσθετες ανάγκες.</p>
            )}
            <div className={styles.inlineSummary}>
              <span
                aria-hidden="true"
                className={`${styles.inlineSummaryIcon} ${styles.inlineSummaryIconMagenta}`}
              >
                ↔
              </span>
              <div className={styles.inlineSummaryCopy}>
                <span>Προσέγγιση κόστους και προστασίας</span>
                <strong>{profile.costAndProtectionApproach}</strong>
              </div>
            </div>
          </section>
        </div>

        <div className={styles.profileFooter}>
          <div className={styles.profileFootnote}>
            <span aria-hidden="true">i</span>
            <p>
              Το προφίλ δημιουργήθηκε αποκλειστικά από τις απαντήσεις σου και
              μπορείς να το διορθώσεις πριν συνεχίσεις.
            </p>
          </div>
          <div className={styles.footerActions}>
            <Link className={styles.secondaryLink} href="/assessment">
              <span aria-hidden="true">←</span>
              Επεξεργασία απαντήσεων
            </Link>
            <Link className={styles.primaryLink} href="/results">
              Δες τις προτάσεις <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </article>
    </AdvisoryShell>
  );
}
