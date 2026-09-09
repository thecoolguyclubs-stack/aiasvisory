"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";

import { generateInsuranceProfile } from "@/lib/assessment/profile";
import type { AssessmentSubmission } from "@/lib/assessment/types";
import {
  createLeadSubmission,
  LEAD_CONTACT_TIME_OPTIONS,
  validateLeadFormData,
  writeLeadSubmission,
  type LeadFormDraftData,
  type LeadFormErrors,
  type LeadFormField,
  type LeadPreferredContactTime,
} from "@/lib/leads";
import {
  readPolicyAnalysisSession,
  type PolicyAnalysisRecord,
} from "@/lib/policy-analysis/storage";
import type { LiveRecommendation } from "@/lib/recommendations/contracts";
import { readRecommendationSnapshot } from "@/lib/recommendations/storage";

import {
  AdvisoryLoading,
  AdvisoryShell,
} from "./AdvisoryUI";
import { InsurerLogo } from "./InsurerLogo";
import styles from "./advisory.module.css";
import { useStoredSubmission } from "./useStoredSubmission";

const initialFormData: LeadFormDraftData = {
  fullName: "",
  email: "",
  phone: "",
  preferredContactTime: "",
  consents: {
    advisorContact: false,
    privacyTerms: false,
  },
};



interface InterestContext {
  recommendation: LiveRecommendation;
  policyAnalysis: PolicyAnalysisRecord | null;
}

const matchesAssessmentPolicy = (
  policyAnalysis: PolicyAnalysisRecord,
  policyFile: AssessmentSubmission["policyFile"],
) =>
  Boolean(
    policyFile &&
      policyFile.name === policyAnalysis.filename &&
      policyFile.size === policyAnalysis.fileSize &&
      policyFile.type === "application/pdf",
  );

export function InterestView({ programId }: { programId: string }) {
  const router = useRouter();
  const submission = useStoredSubmission();
  const [context, setContext] = useState<InterestContext>();
  const [formData, setFormData] =
    useState<LeadFormDraftData>(initialFormData);
  const [errors, setErrors] = useState<LeadFormErrors>({});
  const [submitError, setSubmitError] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!submission) return;

    const storedRecommendation = readRecommendationSnapshot(
      submission,
    )?.recommendations.find((candidate) => candidate.programId === programId);

    if (!storedRecommendation) {
      router.replace("/results");
      return;
    }

    const policyCandidate = readPolicyAnalysisSession();
    const policyAnalysis =
      policyCandidate &&
      matchesAssessmentPolicy(policyCandidate, submission.policyFile)
        ? policyCandidate
        : null;
    const hydrationTimer = window.setTimeout(
      () => setContext({ recommendation: storedRecommendation, policyAnalysis }),
      0,
    );

    return () => window.clearTimeout(hydrationTimer);
  }, [programId, router, submission]);

  const insuranceProfile = useMemo(
    () => (submission ? generateInsuranceProfile(submission) : null),
    [submission],
  );

  if (!submission || !context || !insuranceProfile) {
    return (
      <AdvisoryLoading
        className={styles.leadScreen}
        statusText="Δεν πρόκειται για online αγορά"
      />
    );
  }

  const { recommendation, policyAnalysis } = context;


  const clearError = (field: LeadFormField) => {
    setErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
    setSubmitError(undefined);
  };

  const updateTextField = (
    field: "fullName" | "email" | "phone",
    value: string,
  ) => {
    setFormData((current) => ({ ...current, [field]: value }));
    clearError(field);
  };

  const updateContactTime = (value: LeadPreferredContactTime | "") => {
    setFormData((current) => ({
      ...current,
      preferredContactTime: value,
    }));
    clearError("preferredContactTime");
  };

  const updateConsent = (
    field: "advisorContact" | "privacyTerms",
    checked: boolean,
  ) => {
    setFormData((current) => ({
      ...current,
      consents: { ...current.consents, [field]: checked },
    }));
    clearError(field);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    const validation = validateLeadFormData(formData);
    if (!validation.ok) {
      setErrors(validation.errors);
      setSubmitError("Έλεγξε τα πεδία που χρειάζονται διόρθωση.");
      return;
    }

    setErrors({});
    setSubmitError(undefined);
    setIsSubmitting(true);

    await new Promise((resolve) => window.setTimeout(resolve, 250));

    const result = createLeadSubmission({
      formData: validation.data,
      assessmentSubmission: submission,
      insuranceProfile,
      policyAnalysis,
      recommendation,
    });

    if (!result.ok) {
      if (result.code === "invalid_form") {
        setErrors(result.errors);
        setSubmitError("Έλεγξε τα πεδία που χρειάζονται διόρθωση.");
      } else {
        setSubmitError(result.message);
      }
      setIsSubmitting(false);
      return;
    }

    if (!writeLeadSubmission(result.submission)) {
      setSubmitError(
        "Δεν μπορέσαμε να αποθηκεύσουμε με ασφάλεια το αίτημα σε αυτή τη συνεδρία.",
      );
      setIsSubmitting(false);
      return;
    }

    router.replace("/interest/confirmation");
  };

  return (
    <AdvisoryShell
      className={styles.leadScreen}
      contentClassName={styles.leadPageContent}
      statusText="Δεν πρόκειται για online αγορά"
      wide
    >
      <section className={styles.figmaLeadCard}>
        <aside className={styles.figmaLeadSummary}>
          <span className={styles.leadCategoryBadge}>
            {recommendation.categoryLabel.toUpperCase()}
          </span>
          <div className={styles.leadSelectionSummary}>
            <div className={styles.leadSelectionBrand}>
              <InsurerLogo
                compact
                insurer={recommendation.insurer}
                programId={recommendation.programId}
              />
              <div>
                <span>Ασφαλιστική εταιρεία</span>
                <strong>{recommendation.insurer}</strong>
              </div>
            </div>
            <div className={styles.leadSelectionProgram}>
              <span>Πρόγραμμα</span>
              <h1>{recommendation.programName}</h1>
            </div>
            <p className={styles.leadProgramMeta}>
              Ασφάλιστρο: <strong>Απαιτείται εξατομικευμένη προσφορά</strong>
            </p>
          </div>
          <p className={styles.leadSummaryCopy}>
            Στην παρούσα επίδειξη, το αίτημα και η επιλεγμένη πρόταση
            {recommendation.programName} αποθηκεύονται μόνο σε αυτή τη συνεδρία.
          </p>
          <div className={styles.leadSummaryDivider} />
          <h2>Τι θα συμβεί μετά</h2>
          <ul className={styles.leadNextSteps}>
            <li>
              <span aria-hidden="true">✓</span>
              Αποθήκευση αιτήματος στη συνεδρία
            </li>
            <li>
              <span aria-hidden="true">✓</span>
              Προετοιμασία σύνοψης για σύμβουλο
            </li>
            <li>
              <span aria-hidden="true">✓</span>
              Η αποστολή σε συνεργάτη δεν έχει ακόμη ενεργοποιηθεί
            </li>
          </ul>
          <p className={styles.leadPriceDisclaimer}>
            Η τελική τιμολόγηση
            προκύπτει μετά την επίσημη προσφορά και την ασφαλιστική αξιολόγηση.
          </p>
        </aside>

        <section className={styles.figmaLeadFormPanel}>
          <h2>Σε ενδιαφέρει αυτή η επιλογή;</h2>
          <p>
            Χρησιμοποίησε δοκιμαστικά στοιχεία για να δεις τη σύνοψη του αιτήματος.
            Δεν θα σταλεί αίτημα επικοινωνίας σε συνεργάτη.
          </p>
          <form noValidate onSubmit={(event) => void handleSubmit(event)}>
            <div className={styles.leadField}>
              <label htmlFor="lead-full-name">Ονοματεπώνυμο</label>
              <input
                aria-describedby={
                  errors.fullName ? "lead-full-name-error" : undefined
                }
                aria-invalid={Boolean(errors.fullName)}
                autoComplete="name"
                id="lead-full-name"
                name="fullName"
                onChange={(event) =>
                  updateTextField("fullName", event.target.value)
                }
                placeholder="π.χ. Μαρία Παπαδοπούλου"
                required
                type="text"
                value={formData.fullName}
              />
              {errors.fullName && (
                <span className={styles.fieldError} id="lead-full-name-error">
                  {errors.fullName}
                </span>
              )}
            </div>

            <div className={styles.leadFieldGrid}>
              <div className={styles.leadField}>
                <label htmlFor="lead-email">Email</label>
                <input
                  aria-describedby={
                    errors.email ? "lead-email-error" : undefined
                  }
                  aria-invalid={Boolean(errors.email)}
                  autoComplete="email"
                  id="lead-email"
                  inputMode="email"
                  name="email"
                  onChange={(event) =>
                    updateTextField("email", event.target.value)
                  }
                  placeholder="name@example.com"
                  required
                  type="email"
                  value={formData.email}
                />
                {errors.email && (
                  <span className={styles.fieldError} id="lead-email-error">
                    {errors.email}
                  </span>
                )}
              </div>

              <div className={styles.leadField}>
                <label htmlFor="lead-phone">Τηλέφωνο</label>
                <input
                  aria-describedby={
                    errors.phone ? "lead-phone-error" : undefined
                  }
                  aria-invalid={Boolean(errors.phone)}
                  autoComplete="tel"
                  id="lead-phone"
                  inputMode="tel"
                  name="phone"
                  onChange={(event) =>
                    updateTextField("phone", event.target.value)
                  }
                  placeholder="69X XXX XXXX"
                  required
                  type="tel"
                  value={formData.phone}
                />
                {errors.phone && (
                  <span className={styles.fieldError} id="lead-phone-error">
                    {errors.phone}
                  </span>
                )}
              </div>
            </div>

            <div className={styles.leadField}>
              <label htmlFor="lead-contact-time">
                Προτιμώμενη ώρα επικοινωνίας
              </label>
              <select
                aria-describedby={
                  errors.preferredContactTime
                    ? "lead-contact-time-error"
                    : undefined
                }
                aria-invalid={Boolean(errors.preferredContactTime)}
                id="lead-contact-time"
                name="preferredContactTime"
                onChange={(event) =>
                  updateContactTime(
                    event.target.value as LeadPreferredContactTime | "",
                  )
                }
                required
                value={formData.preferredContactTime}
              >
                <option value="">Επίλεξε χρονικό διάστημα</option>
                {LEAD_CONTACT_TIME_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {errors.preferredContactTime && (
                <span
                  className={styles.fieldError}
                  id="lead-contact-time-error"
                >
                  {errors.preferredContactTime}
                </span>
              )}
            </div>

            <div className={styles.leadConsentBlock}>
              <label className={styles.consentField}>
                <input
                  aria-describedby={
                    errors.advisorContact
                      ? "lead-advisor-consent-error"
                      : undefined
                  }
                  aria-invalid={Boolean(errors.advisorContact)}
                  checked={formData.consents.advisorContact}
                  name="advisorContact"
                  onChange={(event) =>
                    updateConsent("advisorContact", event.target.checked)
                  }
                  required
                  type="checkbox"
                />
                <span>
                  Συμφωνώ να χρησιμοποιηθούν τα στοιχεία μου αποκλειστικά για
                  την επικοινωνία σχετικά με το ενδιαφέρον μου.
                </span>
              </label>
              {errors.advisorContact && (
                <span
                  className={styles.fieldError}
                  id="lead-advisor-consent-error"
                >
                  {errors.advisorContact}
                </span>
              )}
            </div>

            <div className={styles.leadConsentBlock}>
              <label className={styles.consentField}>
                <input
                  aria-describedby={
                    errors.privacyTerms
                      ? "lead-privacy-terms-error"
                      : undefined
                  }
                  aria-invalid={Boolean(errors.privacyTerms)}
                  checked={formData.consents.privacyTerms}
                  name="privacyTerms"
                  onChange={(event) =>
                    updateConsent("privacyTerms", event.target.checked)
                  }
                  required
                  type="checkbox"
                />
                <span>
                  Έχω διαβάσει και αποδέχομαι την ενημέρωση απορρήτου για τη
                  χρήση των στοιχείων μου στο συγκεκριμένο αίτημα.
                </span>
              </label>
              {errors.privacyTerms && (
                <span
                  className={styles.fieldError}
                  id="lead-privacy-terms-error"
                >
                  {errors.privacyTerms}
                </span>
              )}
            </div>

            {submitError && (
              <p aria-live="polite" className={styles.formError} role="alert">
                {submitError}
              </p>
            )}

            <button
              className={styles.leadSubmitButton}
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? "Υποβολή αιτήματος…" : "Αποθήκευση δοκιμαστικού αιτήματος"}
            </button>
            <p className={styles.leadLegalLine}>
              Η υποβολή δεν σε δεσμεύει και δεν ολοκληρώνει αγορά ασφαλιστικού
              προϊόντος.
            </p>
          </form>
        </section>
      </section>
    </AdvisoryShell>
  );
}
