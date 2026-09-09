import type { AssessmentSubmission } from "@/lib/assessment/types";
import { ASSESSMENT_SESSION_VERSION } from "@/lib/assessment/types";

type ValidationResult =
  | { ok: true; submission: AssessmentSubmission }
  | { ok: false };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isNullableString = (value: unknown): value is string | null =>
  value === null || typeof value === "string";

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string");

const MAX_ADDITIONAL_NEEDS = 8;

export function validateAssessmentSubmission(value: unknown): ValidationResult {
  if (!isRecord(value) || value.version !== ASSESSMENT_SESSION_VERSION) {
    return { ok: false };
  }

  const answers = value.answers;
  const people = value.people;
  const policyFile = value.policyFile;

  if (
    !isRecord(answers) ||
    !isNullableString(answers.insuredPeople) ||
    !isNullableString(answers.currentInsurance) ||
    !isNullableString(answers.evaluationGoal) ||
    !isStringArray(answers.priorities) ||
    !isNullableString(answers.deductible) ||
    !isNullableString(answers.costApproach) ||
    !isStringArray(answers.additionalNeeds) ||
    answers.additionalNeeds.length > MAX_ADDITIONAL_NEEDS ||
    !Array.isArray(people) ||
    people.length === 0 ||
    !people.every(
      (person) =>
        isRecord(person) &&
        typeof person.id === "string" &&
        ["self", "partner", "child", "other"].includes(
          String(person.role),
        ) &&
        typeof person.label === "string" &&
        typeof person.birthDate === "string",
    ) ||
    ![null, "uploaded", "later", "skipped"].includes(
      value.uploadDecision as null | string,
    ) ||
    !isNullableString(value.submittedAt)
  ) {
    return { ok: false };
  }

  if (
    policyFile !== null &&
    (!isRecord(policyFile) ||
      typeof policyFile.name !== "string" ||
      typeof policyFile.size !== "number" ||
      !Number.isFinite(policyFile.size) ||
      policyFile.size < 0 ||
      typeof policyFile.type !== "string")
  ) {
    return { ok: false };
  }

  return { ok: true, submission: value as unknown as AssessmentSubmission };
}
