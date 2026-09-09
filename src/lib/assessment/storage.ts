import type {
  AssessmentSessionSnapshot,
  AssessmentStateSnapshotSource,
  AssessmentSubmission,
} from "./types";
import { ASSESSMENT_SESSION_VERSION } from "./types";
import { assessmentConfig, type AssessmentViewId } from "./config";
import { POLICY_PDF_CANONICAL_FILENAME } from "@/lib/policy-analysis/file-validation";

export const ASSESSMENT_SESSION_KEY =
  "insurancemarket.health-assessment.session.v4";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const viewIds = new Set<AssessmentViewId>([
  ...Object.keys(assessmentConfig) as AssessmentViewId[],
  "policyUpload",
]);

const optionIds = (key: keyof typeof assessmentConfig) => {
  const step = assessmentConfig[key] as {
    readonly options?: readonly { readonly id: string }[];
  };

  return new Set<string>(step.options?.map((option) => option.id) ?? []);
};

const insuredPeopleIds = optionIds("insuredPeople");
const currentInsuranceIds = optionIds("currentInsurance");
const evaluationGoalIds = optionIds("evaluationGoal");
const priorityIds = optionIds("priorities");
const deductibleIds = optionIds("deductible");
// Read old v4 sessions without assigning new meanings to their answers.
priorityIds.add("low-deductible");
for (const id of ["minimum", "small", "large"]) deductibleIds.add(id);
const costApproachIds = optionIds("costApproach");
const additionalNeedIds = optionIds("additionalNeeds");

const isNullableOption = (value: unknown, options: Set<string>) =>
  value === null || (typeof value === "string" && options.has(value));

const isOptionArray = (
  value: unknown,
  options: Set<string>,
  maximum = Number.POSITIVE_INFINITY,
) =>
  Array.isArray(value) &&
  value.length <= maximum &&
  new Set(value).size === value.length &&
  value.every((item) => typeof item === "string" && options.has(item));

const isIsoDateTime = (value: unknown) =>
  typeof value === "string" &&
  value.length <= 40 &&
  Number.isFinite(Date.parse(value));

const isViewId = (value: unknown): value is AssessmentViewId =>
  typeof value === "string" && viewIds.has(value as AssessmentViewId);

const isBirthDate = (value: unknown) => {
  if (value === "") return true;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/u.test(value)) {
    return false;
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);
  return (
    Number.isFinite(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value &&
    parsed.getTime() <= Date.now()
  );
};

const isPerson = (value: unknown) => {
  if (!isRecord(value)) return false;

  return Boolean(
    typeof value.id === "string" &&
      value.id.length > 0 &&
      value.id.length <= 80 &&
      ["self", "partner", "child", "other"].includes(String(value.role)) &&
      typeof value.label === "string" &&
      value.label.length > 0 &&
      value.label.length <= 120 &&
      isBirthDate(value.birthDate),
  );
};

const isPolicyFile = (value: unknown) => {
  if (value === null) return true;
  if (!isRecord(value)) return false;

  return Boolean(
    value.name === POLICY_PDF_CANONICAL_FILENAME &&
      Number.isSafeInteger(value.size) &&
      Number(value.size) > 0 &&
      typeof value.type === "string" &&
      value.type === "application/pdf",
  );
};

export function createAssessmentSessionSnapshot(
  state: AssessmentStateSnapshotSource,
  submittedAt: string | null,
): AssessmentSessionSnapshot {
  const submission: AssessmentSubmission = {
    version: ASSESSMENT_SESSION_VERSION,
    answers: {
      ...state.answers,
      priorities: [...state.answers.priorities],
      additionalNeeds: [...state.answers.additionalNeeds],
    },
    people: state.people.map((person) => ({ ...person })),
    policyFile: state.policyFile ? { ...state.policyFile } : null,
    uploadDecision: state.uploadDecision,
    submittedAt,
  };

  return {
    version: ASSESSMENT_SESSION_VERSION,
    submission,
    navigation: {
      view: state.view,
      history: [...state.history],
      uploadNext: state.uploadNext,
    },
    ui: {
      nextPersonId: state.nextPersonId,
      uploadPromptHandled: state.uploadPromptHandled,
    },
  };
}

export function writeAssessmentSession(snapshot: AssessmentSessionSnapshot) {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(
      ASSESSMENT_SESSION_KEY,
      JSON.stringify(snapshot),
    );
  } catch {
    // The flow still works when storage is unavailable or full.
  }
}

export function readAssessmentSession(): AssessmentSessionSnapshot | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.sessionStorage.getItem(ASSESSMENT_SESSION_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (isAssessmentSessionSnapshot(parsed)) return parsed;

    window.sessionStorage.removeItem(ASSESSMENT_SESSION_KEY);
    return null;
  } catch {
    try {
      window.sessionStorage.removeItem(ASSESSMENT_SESSION_KEY);
    } catch {
      // Ignore storage failures and fall back to a fresh assessment.
    }
    return null;
  }
}

export function clearAssessmentSession() {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.removeItem(ASSESSMENT_SESSION_KEY);
  } catch {
    // Starting over still works in memory when storage is unavailable.
  }
}

export function hasMeaningfulAssessmentProgress(
  snapshot: AssessmentSessionSnapshot,
) {
  const { answers, people, policyFile, uploadDecision } = snapshot.submission;

  return Boolean(
    answers.insuredPeople ||
      answers.currentInsurance ||
      answers.evaluationGoal ||
      answers.priorities.length > 0 ||
      answers.deductible ||
      answers.costApproach ||
      answers.additionalNeeds.length > 0 ||
      people.some((person) => person.birthDate) ||
      policyFile ||
      uploadDecision ||
      snapshot.navigation.view !== "insuredPeople" ||
      snapshot.navigation.history.length > 0,
  );
}

export function isCompleteAssessmentSubmission(
  submission: AssessmentSubmission,
) {
  const { answers, people } = submission;

  return Boolean(
    submission.submittedAt &&
      answers.insuredPeople &&
      answers.currentInsurance &&
      answers.evaluationGoal &&
      answers.priorities.length > 0 &&
      answers.deductible &&
      answers.costApproach &&
      people.length > 0 &&
      people.every((person) => person.birthDate),
  );
}

function isAssessmentSessionSnapshot(
  value: unknown,
): value is AssessmentSessionSnapshot {
  if (!isRecord(value) || value.version !== ASSESSMENT_SESSION_VERSION) {
    return false;
  }

  const submission = value.submission;
  const navigation = value.navigation;
  const ui = value.ui;

  if (!isRecord(submission) || !isRecord(navigation) || !isRecord(ui)) {
    return false;
  }

  const answers = submission.answers;

  if (!isRecord(answers)) return false;

  const people = submission.people;
  const policyFile = submission.policyFile;
  const uploadDecision = submission.uploadDecision;
  const submittedAt = submission.submittedAt;
  const history = navigation.history;
  const uploadNext = navigation.uploadNext;

  return Boolean(
    submission.version === ASSESSMENT_SESSION_VERSION &&
      isNullableOption(answers.insuredPeople, insuredPeopleIds) &&
      isNullableOption(answers.currentInsurance, currentInsuranceIds) &&
      isNullableOption(answers.evaluationGoal, evaluationGoalIds) &&
      isOptionArray(answers.priorities, priorityIds, 3) &&
      isNullableOption(answers.deductible, deductibleIds) &&
      isNullableOption(answers.costApproach, costApproachIds) &&
      (answers.careAccess === undefined || answers.careAccess === null ||
        ["network", "freedom", "unsure"].includes(String(answers.careAccess))) &&
      isOptionArray(answers.additionalNeeds, additionalNeedIds) &&
      Array.isArray(people) &&
      people.length <= 8 &&
      people.every(isPerson) &&
      isPolicyFile(policyFile) &&
      [null, "uploaded", "later", "skipped"].includes(
        uploadDecision as null | string,
      ) &&
      (submittedAt === null || isIsoDateTime(submittedAt)) &&
      isViewId(navigation.view) &&
      Array.isArray(history) &&
      history.length <= 80 &&
      history.every(isViewId) &&
      (uploadNext === null || isViewId(uploadNext)) &&
      Number.isSafeInteger(ui.nextPersonId) &&
      Number(ui.nextPersonId) >= 1 &&
      typeof ui.uploadPromptHandled === "boolean",
  );
}
