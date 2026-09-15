"use client";

import { useRouter } from "next/navigation";
import { useEffect, useReducer, useRef, useState } from "react";

import {
  assessmentConfig,
  goalRequiresUpload,
  insuranceRequiresUpload,
  policyAnalysisBenefits,
} from "@/lib/assessment/config";
import {
  assessmentReducer,
  initialAssessmentState,
  type AssessmentState,
} from "@/lib/assessment/state";
import {
  clearAssessmentSession,
  createAssessmentSessionSnapshot,
  readAssessmentSession,
  writeAssessmentSession,
} from "@/lib/assessment/storage";
import {
  isPolicyAnalysisApiError,
  POLICY_ANALYSIS_ERROR_MESSAGES,
} from "@/lib/policy-analysis/contracts";
import {
  createPolicyAnalysisFormData,
  PolicyAnalysisUploadError,
  runPolicyAnalysisUpload,
  type PolicyAnalysisStatus,
} from "@/lib/policy-analysis/client-upload";
import {
  hasPdfMagicBytesInFile,
  validatePolicyFileMetadata,
} from "@/lib/policy-analysis/file-validation";
import {
  PolicyAnalysisRequestManager,
  policyFileFingerprint,
  type PolicyAnalysisCancelReason,
} from "@/lib/policy-analysis/request-manager";
import {
  clearPolicyAnalysisSession,
  readPolicyAnalysisSession,
  validatePolicyAnalysisRecord,
  writePolicyAnalysisSession,
} from "@/lib/policy-analysis/storage";
import { clearLeadSubmission } from "@/lib/leads/session";
import { clearRecommendationSnapshot } from "@/lib/recommendations/storage";
import { clearExplanations } from "@/lib/recommendations/explanation-storage";
import { careAccessOptions, isDeductibleBand, type CareAccess } from "@/lib/assessment/preferences";
import { BirthdayInput } from "./BirthdayInput";

import { CalendarIcon, CheckIcon, PlusIcon, UploadIcon } from "./AssessmentIcons";
import {
  AssessmentHeader,
  MultiChoiceOptions,
  SingleChoiceOptions,
  StepCard,
  StepNavigation,
  UploadActionLabel,
  UploadDropzone,
} from "./AssessmentUI";
import styles from "@/app/assessment/assessment.module.css";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

type AssessmentInputReferences = Pick<
  AssessmentState,
  "answers" | "people" | "policyFile" | "uploadDecision"
>;

const assessmentInputsChanged = (
  previous: AssessmentInputReferences,
  current: AssessmentInputReferences,
) =>
  previous.answers !== current.answers ||
  previous.people !== current.people ||
  previous.policyFile !== current.policyFile ||
  previous.uploadDecision !== current.uploadDecision;

export function AssessmentFlow() {
  const router = useRouter();
  const [state, dispatch] = useReducer(
    assessmentReducer,
    initialAssessmentState,
  );
  const [hydrated, setHydrated] = useState(false);
  const [analysisStatus, setAnalysisStatus] =
    useState<PolicyAnalysisStatus>("idle");
  const submittedAtRef = useRef<string | null>(null);
  const lastInputReferencesRef = useRef<AssessmentInputReferences | null>(null);
  const analysisRequestsRef = useRef<PolicyAnalysisRequestManager | null>(null);
  if (analysisRequestsRef.current === null) {
    analysisRequestsRef.current = new PolicyAnalysisRequestManager();
  }

  useEffect(() => {
    const startFresh =
      new URLSearchParams(window.location.search).get("start") === "new";

    if (startFresh) {
      clearAssessmentSession();
      clearPolicyAnalysisSession();
      clearRecommendationSnapshot();
      clearExplanations();
      clearLeadSubmission();
      // Consume the reset flag once. Next synchronizes native history updates;
      // a second router replacement can restore the stale reset URL.
      window.history.replaceState(null, "", "/assessment");
    }

    const storedSession = startFresh ? null : readAssessmentSession();

    if (storedSession) {
      submittedAtRef.current = storedSession.submission.submittedAt;
      dispatch({ type: "hydrate", snapshot: storedSession });
    }

    const policyAnalysisCandidate = startFresh
      ? null
      : readPolicyAnalysisSession();
    const storedPolicyFile = storedSession?.submission.policyFile;
    const storedPolicyAnalysis =
      policyAnalysisCandidate &&
      storedPolicyFile &&
      storedPolicyFile.name === policyAnalysisCandidate.filename &&
      storedPolicyFile.size === policyAnalysisCandidate.fileSize &&
      storedPolicyFile.type === "application/pdf"
        ? policyAnalysisCandidate
        : null;

    if (policyAnalysisCandidate && !storedPolicyAnalysis) {
      clearPolicyAnalysisSession();
    }

    if (storedPolicyAnalysis) {
      dispatch({
        type: "set-file",
        file: {
          name: storedPolicyAnalysis.filename,
          size: storedPolicyAnalysis.fileSize,
          type: "application/pdf",
        },
      });
    } else if (storedSession?.submission.policyFile) {
      dispatch({ type: "remove-file" });
      submittedAtRef.current = null;
      clearRecommendationSnapshot();
      clearExplanations();
    }

    const hydrationTimer = window.setTimeout(() => {
      if (storedPolicyAnalysis) setAnalysisStatus("success");
      setHydrated(true);
    }, 0);

    return () => {
      window.clearTimeout(hydrationTimer);
      analysisRequestsRef.current?.cancel("unmount");
    };
  }, [router]);

  useEffect(() => {
    if (!hydrated) return;

    const inputReferences: AssessmentInputReferences = {
      answers: state.answers,
      people: state.people,
      policyFile: state.policyFile,
      uploadDecision: state.uploadDecision,
    };
    if (
      lastInputReferencesRef.current !== null &&
      assessmentInputsChanged(lastInputReferencesRef.current, inputReferences) &&
      submittedAtRef.current
    ) {
      submittedAtRef.current = null;
      clearRecommendationSnapshot();
      clearExplanations();
    }
    lastInputReferencesRef.current = inputReferences;

    writeAssessmentSession(
      createAssessmentSessionSnapshot(state, submittedAtRef.current),
    );
  }, [hydrated, state]);

  const cancelActiveAnalysis = (
    reason: Exclude<PolicyAnalysisCancelReason, "timeout">,
  ) => {
    analysisRequestsRef.current?.cancel(reason);
  };

  const handleFile = async (file: File) => {
    const manager = analysisRequestsRef.current;
    if (!manager) return;

    await runPolicyAnalysisUpload({
      manager,
      fingerprint: policyFileFingerprint(file),
      retrying: analysisStatus === "error",
      validateMetadata: () => validatePolicyFileMetadata(file),
      readSignature: () => hasPdfMagicBytesInFile(file),
      beforeAnalyze: () => {
        clearPolicyAnalysisSession();
        clearRecommendationSnapshot();
        dispatch({ type: "remove-file" });
      },
      analyze: async (signal) => {
        const response = await fetch("/api/policy-analysis", {
          method: "POST",
          body: createPolicyAnalysisFormData(file),
          cache: "no-store",
          signal,
        });
        const payload: unknown = await response.json();
        const analysis =
          isRecord(payload) &&
          payload.ok === true &&
          payload.source === "openai" &&
          payload.outputParsed === true &&
          isRecord(payload.analysis)
            ? validatePolicyAnalysisRecord({
                version: 1,
                ...payload.analysis,
              })
            : null;

        if (!response.ok || !analysis) {
          throw new PolicyAnalysisUploadError(
            isPolicyAnalysisApiError(payload)
              ? payload.message
              : POLICY_ANALYSIS_ERROR_MESSAGES.invalid_provider_output,
          );
        }

        return analysis;
      },
      commit: (analysis) => {
        if (!writePolicyAnalysisSession(analysis)) return false;
        dispatch({
          type: "set-file",
          file: {
            name: analysis.filename,
            size: analysis.fileSize,
            type: "application/pdf",
          },
        });
        return true;
      },
      onStatus: setAnalysisStatus,
      onError: (message) =>
        dispatch({ type: "set-upload-error", message }),
    });
  };

  const removePolicyAnalysis = () => {
    cancelActiveAnalysis("removed");
    clearPolicyAnalysisSession();
    clearRecommendationSnapshot();
    setAnalysisStatus("idle");
    dispatch({ type: "remove-file" });
    dispatch({ type: "set-upload-error", message: null });
  };

  const back = () => {
    if (state.view === "policyUpload") cancelActiveAnalysis("navigation");
    dispatch({ type: "back" });
  };

  const uploadRequired =
    insuranceRequiresUpload(state.answers.currentInsurance) ||
    goalRequiresUpload(state.answers.evaluationGoal);

  const completeAndContinue = () => {
    cancelActiveAnalysis("navigation");
    const submittedAt = new Date().toISOString();
    submittedAtRef.current = submittedAt;
    writeAssessmentSession(
      createAssessmentSessionSnapshot(state, submittedAt),
    );
    router.push("/assessment/profile");
  };

  const finishAssessment = () => {
    if (uploadRequired && !state.policyFile) {
      dispatch({ type: "open-reminder" });
      return;
    }
    completeAndContinue();
  };

  const continueAfterUpload = (decision: "later" | "skipped") => {
    cancelActiveAnalysis("navigation");
    const next = state.uploadNext ?? "evaluationGoal";
    dispatch({ type: "set-upload-decision", decision });
    dispatch({ type: "navigate", to: next });
  };

  if (!hydrated) return <main aria-busy="true" className={styles.assessment} />;

  if (state.view === "policyUpload") {
    const inputId = "policy-upload-step";
    return (
      <main className={styles.assessment}>
        <AssessmentHeader displayStep={3} />
        <div className={styles.stage}>
          <StepCard
            eyebrow="ΠΡΟΑΙΡΕΤΙΚΗ ΑΝΑΛΥΣΗ ΑΣΦΑΛΙΣΤΗΡΙΟΥ"
            size="upload"
            title="Θέλεις να εξετάσουμε το υπάρχον ασφαλιστήριό σου;"
          >
            <p className={styles.helper}>Μπορείς να το ανεβάσεις ώστε να εντοπίσουμε:</p>
            <div className={styles.benefitList}>
              {policyAnalysisBenefits.map((benefit) => (
                <span key={benefit}>
                  <CheckIcon /> {benefit}
                </span>
              ))}
            </div>
            <UploadDropzone
              analysisStatus={analysisStatus}
              error={state.uploadError}
              file={state.policyFile}
              inputId={inputId}
              onFile={(file) => void handleFile(file)}
              onRemove={removePolicyAnalysis}
              onSelectionError={(message) => {
                cancelActiveAnalysis("replaced");
                setAnalysisStatus("error");
                dispatch({ type: "set-upload-error", message });
              }}
            />
            <div className={styles.uploadFooter}>
              <button className={styles.backButton} onClick={back} type="button">
                <span aria-hidden="true">←</span> Πίσω
              </button>
              <div className={styles.uploadActions}>
                <button
                  className={styles.secondaryButton}
                  onClick={() => continueAfterUpload("later")}
                  type="button"
                >
                  Θα το προσθέσω αργότερα
                </button>
                {state.policyFile ? (
                  <button
                    className={styles.uploadPrimaryLabel}
                    onClick={() =>
                      dispatch({
                        type: "navigate",
                        to: state.uploadNext ?? "evaluationGoal",
                      })
                    }
                    type="button"
                  >
                    Συνέχεια με ασφαλιστήριο
                  </button>
                ) : (
                  <UploadActionLabel htmlFor={inputId}>
                    Ανέβασμα ασφαλιστηρίου
                  </UploadActionLabel>
                )}
              </div>
            </div>
          </StepCard>
        </div>
      </main>
    );
  }

  const step = assessmentConfig[state.view];

  return (
    <main className={styles.assessment}>
      <AssessmentHeader displayStep={step.displayStep} />
      <div className={styles.stage}>
        {state.view === "insuredPeople" && (
          <StepCard
            eyebrow={step.eyebrow}
            layout="insured"
            size="wide"
            title={step.title}
          >
            <SingleChoiceOptions
              iconSet="insuredPeople"
              name="insured-people"
              onChange={(value) =>
                dispatch({ type: "set-composition", value })
              }
              options={assessmentConfig.insuredPeople.options}
              value={state.answers.insuredPeople}
            />
            <StepNavigation
              disabled={!state.answers.insuredPeople}
              onNext={() => dispatch({ type: "navigate", to: "birthDates" })}
            />
          </StepCard>
        )}

        {state.view === "birthDates" && (
          <StepCard
            eyebrow={step.eyebrow}
            helper={assessmentConfig.birthDates.helper}
            layout="birthDates"
            size="medium"
            title={step.title}
          >
            <div className={styles.birthDateList}>
              {state.people.map((insured, index) => (
                <div className={styles.dateField} key={insured.id}>
                  <span className={styles.dateFieldIcon} aria-hidden="true">
                    <CalendarIcon />
                  </span>
                  <div className={styles.dateFieldBody}>
                    <div className={styles.dateLabelRow}>
                      <span className={styles.dateLabelText}>
                        <span className={styles.personCount} aria-hidden="true">
                          Άτομο {index + 1}
                        </span>
                        <label htmlFor={`birth-date-${insured.id}`}>{insured.label}</label>
                      </span>
                      {insured.role !== "self" && (
                        <button
                          onClick={() =>
                            dispatch({
                              type: "remove-person",
                              personId: insured.id,
                            })
                          }
                          type="button"
                        >
                          Αφαίρεση
                        </button>
                      )}
                    </div>
                      <BirthdayInput
                        label={insured.label}
                        id={`birth-date-${insured.id}`}
                        onChange={(value) =>
                          dispatch({
                            type: "set-birth-date",
                            personId: insured.id,
                            value,
                          })
                        }
                        value={insured.birthDate}
                      />
                  </div>
                </div>
              ))}
            </div>
            <button
              className={styles.addPersonButton}
              disabled={state.people.length >= 8}
              onClick={() => dispatch({ type: "add-person" })}
              type="button"
            >
              <PlusIcon /> Προσθήκη άλλου ατόμου
            </button>
            <StepNavigation
              disabled={
                state.people.length === 0 ||
                state.people.some((insured) => !insured.birthDate)
              }
              onBack={back}
              onNext={() =>
                dispatch({ type: "navigate", to: "currentInsurance" })
              }
            />
          </StepCard>
        )}

        {state.view === "currentInsurance" && (
          <StepCard
            eyebrow={step.eyebrow}
            layout="insurance"
            size="wide"
            title={step.title}
          >
            <SingleChoiceOptions
              iconSet="currentInsurance"
              name="current-insurance"
              onChange={(value) =>
                dispatch({
                  type: "set-single",
                  key: "currentInsurance",
                  value,
                })
              }
              options={assessmentConfig.currentInsurance.options}
              value={state.answers.currentInsurance}
            />
            <StepNavigation
              disabled={!state.answers.currentInsurance}
              onBack={back}
              onNext={() => {
                if (
                  insuranceRequiresUpload(state.answers.currentInsurance) &&
                  !state.uploadPromptHandled &&
                  !state.policyFile
                ) {
                  dispatch({ type: "enter-upload", next: "evaluationGoal" });
                } else {
                  dispatch({ type: "navigate", to: "evaluationGoal" });
                }
              }}
            />
          </StepCard>
        )}

        {state.view === "evaluationGoal" && (
          <StepCard
            eyebrow={step.eyebrow}
            size="wide"
            title={step.title}
          >
              <SingleChoiceOptions
                columns={2}
                dense
                iconSet="evaluationGoal"
                name="evaluation-goal"
                onChange={(value) =>
                  dispatch({
                  type: "set-single",
                  key: "evaluationGoal",
                  value,
                })
              }
              options={assessmentConfig.evaluationGoal.options}
              value={state.answers.evaluationGoal}
            />
            <StepNavigation
              disabled={!state.answers.evaluationGoal}
              onBack={back}
              onNext={() => {
                if (
                  goalRequiresUpload(state.answers.evaluationGoal) &&
                  !state.uploadPromptHandled &&
                  !state.policyFile
                ) {
                  dispatch({ type: "enter-upload", next: "priorities" });
                } else {
                  dispatch({ type: "navigate", to: "priorities" });
                }
              }}
            />
          </StepCard>
        )}

        {state.view === "priorities" && (
          <StepCard
            eyebrow={step.eyebrow}
            layout="priority"
            size="wide"
            title={step.title}
          >
            <div className={styles.helperRow}>
              <p className={styles.helper}>{assessmentConfig.priorities.helper}</p>
              <span className={styles.selectionCount} aria-live="polite">
                {state.answers.priorities.length} / 3
              </span>
            </div>
            <MultiChoiceOptions
              iconSet="priorities"
              max={3}
              name="priorities"
              onToggle={(value) =>
                dispatch({
                  type: "toggle-multi",
                  key: "priorities",
                  value,
                  max: 3,
                })
              }
              options={assessmentConfig.priorities.options}
              values={state.answers.priorities}
            />
            <section className={styles.careAccessQuestion}>
              <h2>Πόσο σημαντικό είναι να επιλέγεις γιατρό ή νοσοκομείο εκτός δικτύου;</h2>
              <SingleChoiceOptions
                name="care-access"
                options={careAccessOptions}
                value={state.answers.careAccess ?? null}
                onChange={(value) => dispatch({ type: "set-care-access", value: value as CareAccess })}
              />
            </section>
            <StepNavigation
              disabled={state.answers.priorities.length === 0 || !state.answers.careAccess}
              onBack={back}
              onNext={() => dispatch({ type: "navigate", to: "deductible" })}
            />
          </StepCard>
        )}

        {state.view === "deductible" && (
          <StepCard
            eyebrow={step.eyebrow}
            layout="deductible"
            size="wide"
            title={step.title}
          >
            <SingleChoiceOptions
              iconSet="deductible"
              name="deductible"
              onChange={(value) =>
                dispatch({
                  type: "set-single",
                  key: "deductible",
                  value,
                })
              }
              options={assessmentConfig.deductible.options}
              descriptionVariant="badge"
              value={state.answers.deductible}
            />
            <StepNavigation
              disabled={!isDeductibleBand(state.answers.deductible)}
              onBack={back}
              onNext={() => dispatch({ type: "navigate", to: "additionalNeeds" })}
            />
          </StepCard>
        )}

        {state.view === "additionalNeeds" && (
          <StepCard
            eyebrow={step.eyebrow}
            helper={assessmentConfig.additionalNeeds.helper}
            layout="additionalNeeds"
            size="wide"
            title={step.title}
          >
            <MultiChoiceOptions
              descriptionVisibility="selected"
              iconSet="additionalNeeds"
              name="additional-needs"
              onToggle={(value) =>
                dispatch({
                  type: "toggle-multi",
                  key: "additionalNeeds",
                  value,
                })
              }
              options={assessmentConfig.additionalNeeds.options}
              values={state.answers.additionalNeeds}
            />
            <StepNavigation
              nextLabel="Ολοκλήρωση"
              onBack={back}
              onNext={finishAssessment}
            />
          </StepCard>
        )}
      </div>

      {state.reminderOpen && (
        <div
          aria-labelledby="upload-reminder-title"
          aria-modal="true"
          className={styles.modalOverlay}
          role="dialog"
        >
          <section className={styles.modal}>
            <span className={styles.modalIcon} aria-hidden="true">
              <UploadIcon />
            </span>
            <h2 id="upload-reminder-title">
              Θέλεις να προσθέσεις τώρα το ασφαλιστήριό σου;
            </h2>
            <p>
              Η ανάλυσή του μπορεί να βελτιώσει την ακρίβεια της σύγκρισης.
              Μπορείς επίσης να συνεχίσεις χωρίς αρχείο.
            </p>
            <UploadDropzone
              analysisStatus={analysisStatus}
              compact
              error={state.uploadError}
              file={state.policyFile}
              inputId="policy-upload-reminder"
              onFile={(file) => void handleFile(file)}
              onRemove={removePolicyAnalysis}
              onSelectionError={(message) => {
                cancelActiveAnalysis("replaced");
                setAnalysisStatus("error");
                dispatch({ type: "set-upload-error", message });
              }}
            />
            <div className={styles.modalActions}>
              <button
                className={styles.secondaryButton}
                onClick={completeAndContinue}
                type="button"
              >
                Συνέχεια χωρίς αρχείο
              </button>
              {state.policyFile ? (
                <button
                  className={styles.uploadPrimaryLabel}
                  onClick={completeAndContinue}
                  type="button"
                >
                  Ολοκλήρωση με αρχείο
                </button>
              ) : (
                <UploadActionLabel htmlFor="policy-upload-reminder">
                  Ανέβασμα ασφαλιστηρίου
                </UploadActionLabel>
              )}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
