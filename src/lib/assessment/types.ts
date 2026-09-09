import type { AssessmentViewId } from "./config";
import type {
  AssessmentAnswers,
  AssessmentState,
  InsuredPerson,
  LocalPolicyFile,
} from "./state";

export const ASSESSMENT_SESSION_VERSION = 4 as const;

export interface AssessmentSubmission {
  version: typeof ASSESSMENT_SESSION_VERSION;
  answers: AssessmentAnswers;
  people: InsuredPerson[];
  policyFile: LocalPolicyFile | null;
  uploadDecision: "uploaded" | "later" | "skipped" | null;
  submittedAt: string | null;
}

export interface AssessmentSessionSnapshot {
  version: typeof ASSESSMENT_SESSION_VERSION;
  submission: AssessmentSubmission;
  navigation: {
    view: AssessmentViewId;
    history: AssessmentViewId[];
    uploadNext: AssessmentViewId | null;
  };
  ui: {
    nextPersonId: number;
    uploadPromptHandled: boolean;
  };
}

export interface ProfileSummary {
  title: string;
  detail: string;
}

export interface AgeProfile extends ProfileSummary {
  ages: number[];
}

export interface InsuranceProfile {
  insuredPeople: ProfileSummary & { count: number };
  ageProfile: AgeProfile;
  currentInsurance: ProfileSummary;
  mainGoal: ProfileSummary;
  priorities: string[];
  deductiblePreference: string;
  costAndProtectionApproach: string;
  additionalNeeds: string[];
  hasUploadedPolicy: boolean;
  generatedAt: string;
}

export type AssessmentStateSnapshotSource = Pick<
  AssessmentState,
  | "answers"
  | "people"
  | "policyFile"
  | "uploadDecision"
  | "view"
  | "history"
  | "uploadNext"
  | "nextPersonId"
  | "uploadPromptHandled"
>;
