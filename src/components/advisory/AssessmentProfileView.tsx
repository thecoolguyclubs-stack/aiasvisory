"use client";

import Link from "next/link";
import { careAccessOptions } from "@/lib/assessment/preferences";

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
  const additionalNeedInsights = [...new Set([...submission.answers.additionalNeeds, ...(submission.answers.careAccess === "freedom" ? ["provider_freedom"] : [])])]
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
          <div className={styles.profileHeroCopy}>
            <span className={styles.profileHeroBadge}>ΤΟ ΑΣΦΑΛΙΣΤΙΚΟ ΣΟΥ ΠΡΟΦΙΛ</span>
            <h1>Η εικόνα των αναγκών σου</h1>
            <p>
              Συγκεντρώσαμε τις απαντήσεις σου σε ένα καθαρό προφίλ αναγκών πριν
              περάσουμε στις ενδεικτικές επιλογές.
            </p>
          </div>
        </header>
        <section className={styles.needSummaryPanel}>
          <div className={styles.needSummaryCopy}>
            <div className={styles.summaryHeadingRow}>
              <span className={styles.summaryCheck} aria-hidden="true">
                ✓
              </span>
              <span className={styles.summaryEyebrow}>Ο στόχος της αξιολόγησής σου</span>
            </div>
            <strong>{profile.mainGoal.title}</strong>
            <p>Η αξιολόγηση δίνει προτεραιότητα σε: {profile.priorities.join(" · ") || "ανάγκες που θα επιβεβαιωθούν με σύμβουλο"}.</p>
            <p>Προσωπική συμμετοχή που επέλεξες: <b>{profile.deductiblePreference}</b>. Το ποσό αυτό είναι προτίμηση, όχι επιβεβαιωμένος όρος προγράμματος.</p>
          </div>
          <aside className={styles.profileBrief}>
            <span>ΤΟ ΔΙΚΟ ΣΟΥ ΣΗΜΕΙΟ ΕΚΚΙΝΗΣΗΣ</span>
            <strong>{profile.insuredPeople.count.toString().padStart(2, "0")}</strong>
            <p>{profile.insuredPeople.count === 1 ? "άτομο προς ασφάλιση" : "άτομα προς ασφάλιση"}</p>
            <div>{profile.currentInsurance.detail}</div>
          </aside>
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

        <section className={styles.profileAccess}>
          <div><p className={styles.sectionEyebrow}>ΠΡΟΣΒΑΣΗ ΣΤΗ ΦΡΟΝΤΙΔΑ</p>
          <h2>{careAccessOptions.find(option => option.id === submission.answers.careAccess)?.label ?? "Δεν έχει δηλωθεί προτίμηση δικτύου"}</h2>
          <p>{careAccessOptions.find(option => option.id === submission.answers.careAccess)?.description ?? "Η προτίμηση μπορεί να συμπληρωθεί στις απαντήσεις σου."}</p></div>
          <div><p className={styles.sectionEyebrow}>ΥΠΑΡΧΟΝ ΣΥΜΒΟΛΑΙΟ</p>
          <h2>{profile.hasUploadedPolicy ? "Έχει επιλεγεί αρχείο" : "Δεν έχει επισυναφθεί αρχείο"}</h2>
          <p>Η δήλωση υπάρχουσας ασφάλισης δεν αρκεί για σύγκριση όρων. Χρειάζεται ολοκληρωμένη ανάλυση του συμβολαίου.</p></div>
        </section>
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
