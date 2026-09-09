import type { AssessmentViewId } from "./config";
import type { AssessmentSessionSnapshot } from "./types";
import { deductibleBands, isDeductibleBand, type CareAccess } from "./preferences";

export type PersonRole = "self" | "partner" | "child" | "other";

export interface InsuredPerson {
  id: string;
  role: PersonRole;
  label: string;
  birthDate: string;
}

export interface LocalPolicyFile {
  name: string;
  size: number;
  type: string;
}

export interface AssessmentAnswers {
  insuredPeople: string | null;
  currentInsurance: string | null;
  evaluationGoal: string | null;
  priorities: string[];
  deductible: string | null;
  costApproach: string | null;
  additionalNeeds: string[];
  careAccess?: CareAccess | null;
}

export interface AssessmentState {
  view: AssessmentViewId;
  history: AssessmentViewId[];
  answers: AssessmentAnswers;
  people: InsuredPerson[];
  nextPersonId: number;
  policyFile: LocalPolicyFile | null;
  uploadDecision: "uploaded" | "later" | "skipped" | null;
  uploadPromptHandled: boolean;
  uploadNext: AssessmentViewId | null;
  uploadError: string | null;
  reminderOpen: boolean;
}

type SingleAnswerKey =
  | "currentInsurance"
  | "evaluationGoal"
  | "deductible"
  | "costApproach";

type MultiAnswerKey = "priorities" | "additionalNeeds";

export type AssessmentAction =
  | { type: "set-care-access"; value: CareAccess }
  | { type: "hydrate"; snapshot: AssessmentSessionSnapshot }
  | { type: "set-composition"; value: string }
  | {
      type: "set-single";
      key: SingleAnswerKey;
      value: string;
    }
  | {
      type: "toggle-multi";
      key: MultiAnswerKey;
      value: string;
      max?: number;
    }
  | { type: "set-birth-date"; personId: string; value: string }
  | { type: "add-person" }
  | { type: "remove-person"; personId: string }
  | { type: "navigate"; to: AssessmentViewId }
  | { type: "back" }
  | { type: "enter-upload"; next: AssessmentViewId }
  | {
      type: "set-upload-decision";
      decision: "later" | "skipped";
    }
  | { type: "set-file"; file: LocalPolicyFile }
  | { type: "remove-file" }
  | { type: "set-upload-error"; message: string | null }
  | { type: "open-reminder" }
  | { type: "close-reminder" };

const person = (
  id: string,
  role: PersonRole,
  label: string,
  existing: InsuredPerson[],
): InsuredPerson => {
  const previous = existing.find((candidate) => candidate.role === role);

  return {
    id,
    role,
    label,
    birthDate: previous?.birthDate ?? "",
  };
};

function peopleForComposition(
  composition: string,
  existing: InsuredPerson[],
): InsuredPerson[] {
  switch (composition) {
    case "self-partner":
      return [
        person("self", "self", "Δική σου ημερομηνία γέννησης", existing),
        person("partner", "partner", "Άτομο 2 · Σύντροφος", existing),
      ];
    case "family":
      return [
        person("self", "self", "Δική σου ημερομηνία γέννησης", existing),
        person("partner", "partner", "Άτομο 2 · Σύντροφος", existing),
        person("child-1", "child", "Άτομο 3 · Παιδί", existing),
      ];
    case "children":
      return [person("child-1", "child", "Άτομο 1 · Παιδί", existing)];
    default:
      return [
        person("self", "self", "Δική σου ημερομηνία γέννησης", existing),
      ];
  }
}

export const initialAssessmentState: AssessmentState = {
  view: "insuredPeople",
  history: [],
  answers: {
    insuredPeople: null,
    currentInsurance: null,
    evaluationGoal: null,
    priorities: [],
    deductible: null,
    costApproach: null,
    additionalNeeds: [],
    careAccess: null,
  },
  people: [],
  nextPersonId: 1,
  policyFile: null,
  uploadDecision: null,
  uploadPromptHandled: false,
  uploadNext: null,
  uploadError: null,
  reminderOpen: false,
};

const navigate = (
  state: AssessmentState,
  to: AssessmentViewId,
): AssessmentState => ({
  ...state,
  history: [...state.history, state.view],
  view: to,
});

export function assessmentReducer(
  state: AssessmentState,
  action: AssessmentAction,
): AssessmentState {
  switch (action.type) {
    case "hydrate":
      return {
        ...state,
        view: action.snapshot.navigation.view === "costApproach" ? "deductible" : action.snapshot.navigation.view,
        history: action.snapshot.navigation.history.filter((view) => view !== "costApproach"),
        answers: {
          ...action.snapshot.submission.answers,
          priorities: [...action.snapshot.submission.answers.priorities],
          additionalNeeds: [
            ...action.snapshot.submission.answers.additionalNeeds,
          ],
        },
        people: action.snapshot.submission.people.map((person) => ({
          ...person,
        })),
        nextPersonId: action.snapshot.ui.nextPersonId,
        policyFile: action.snapshot.submission.policyFile
          ? { ...action.snapshot.submission.policyFile }
          : null,
        uploadDecision: action.snapshot.submission.uploadDecision,
        uploadPromptHandled: action.snapshot.ui.uploadPromptHandled,
        uploadNext: action.snapshot.navigation.uploadNext,
        uploadError: null,
        reminderOpen: false,
      };
    case "set-composition":
      return {
        ...state,
        answers: { ...state.answers, insuredPeople: action.value },
        people: peopleForComposition(action.value, state.people),
      };
    case "set-care-access":
      return { ...state, answers: { ...state.answers, careAccess: action.value } };
    case "set-single":
      return {
        ...state,
        answers: {
          ...state.answers,
          [action.key]: action.value,
          ...(action.key === "deductible" && isDeductibleBand(action.value)
            ? { costApproach: deductibleBands[action.value].approach }
            : {}),
        },
      };
    case "toggle-multi": {
      const selected = state.answers[action.key];
      const isSelected = selected.includes(action.value);

      if (!isSelected && action.max && selected.length >= action.max) {
        return state;
      }

      return {
        ...state,
        answers: {
          ...state.answers,
          [action.key]: isSelected
            ? selected.filter((value) => value !== action.value)
            : [...selected, action.value],
        },
      };
    }
    case "set-birth-date":
      return {
        ...state,
        people: state.people.map((insured) =>
          insured.id === action.personId
            ? { ...insured, birthDate: action.value }
            : insured,
        ),
      };
    case "add-person": {
      if (state.people.length >= 8) return state;
      const personNumber = state.people.length + 1;
      return {
        ...state,
        nextPersonId: state.nextPersonId + 1,
        people: [
          ...state.people,
          {
            id: `other-${state.nextPersonId}`,
            role: "other",
            label: `Άτομο ${personNumber} · Επιπλέον μέλος`,
            birthDate: "",
          },
        ],
      };
    }
    case "remove-person":
      return {
        ...state,
        people: state.people.filter(
          (insured) => insured.id !== action.personId,
        ),
      };
    case "navigate":
      return navigate(state, action.to);
    case "back": {
      const previous = state.history.at(-1);
      if (!previous) return state;
      return {
        ...state,
        view: previous,
        history: state.history.slice(0, -1),
        reminderOpen: false,
      };
    }
    case "enter-upload":
      return {
        ...navigate(state, "policyUpload"),
        uploadNext: action.next,
      };
    case "set-upload-decision":
      return {
        ...state,
        uploadDecision: action.decision,
        uploadPromptHandled: true,
        uploadError: null,
      };
    case "set-file":
      return {
        ...state,
        policyFile: action.file,
        uploadDecision: "uploaded",
        uploadPromptHandled: true,
        uploadError: null,
      };
    case "remove-file":
      return {
        ...state,
        policyFile: null,
        uploadDecision: null,
        uploadPromptHandled: false,
      };
    case "set-upload-error":
      return { ...state, uploadError: action.message };
    case "open-reminder":
      return { ...state, reminderOpen: true };
    case "close-reminder":
      return { ...state, reminderOpen: false };
    default:
      return state;
  }
}
