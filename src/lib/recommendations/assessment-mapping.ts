import type { AssessmentSubmission } from "@/lib/assessment/types";
import { deductibleBands, isDeductibleBand } from "@/lib/assessment/preferences";

export interface DatabaseAssessmentAnswers {
  deductible_band?: "up-to-1500" | "1500-to-5000" | "over-5000";
  care_access?: "network" | "freedom" | "unsure";
  insured_people: "self" | "self_spouse" | "family" | "child";
  birth_dates: Array<{ birth_date: string }>;
  existing_insurance:
    | "none"
    | "individual"
    | "employer_group"
    | "individual_and_group";
  evaluation_goal:
    | "first_time"
    | "independent_from_employer"
    | "evaluate_existing"
    | "improve_value";
  priorities: Array<
    | "private_hospitals"
    | "low_or_zero_deductible"
    | "outpatient_doctors_diagnostics"
    | "major_hospitalization"
    | "emergency"
    | "prevention_checkup"
    | "international"
    | "pediatric"
  >;
  deductible_preference: "minimum" | "balanced" | "higher_for_lower_premium";
  protection_cost: "maximum_protection" | "balanced" | "essential_lower_cost";
  additional_needs: Array<
    | "outpatient_visits"
    | "frequent_travel"
    | "immediate_use"
    | "maternity"
    | "young_children"
    | "physiotherapy"
    | "prevention_checkup"
    | "provider_freedom"
    | "low_bureaucracy"
  >;
  existing_policy_upload: Record<string, string | number>;
}

export interface AssessmentMappingError {
  field:
    | "insuredPeople"
    | "birthDates"
    | "currentInsurance"
    | "evaluationGoal"
    | "priorities"
    | "deductible"
    | "costApproach"
    | "additionalNeeds";
  code: "missing_value" | "unsupported_value" | "invalid_value";
  message: string;
}

export type AssessmentMappingResult =
  | { ok: true; data: DatabaseAssessmentAnswers }
  | { ok: false; errors: AssessmentMappingError[] };

type MappableValue = string | null;

const insuredPeopleMap = {
  self: "self",
  "self-partner": "self_spouse",
  family: "family",
  children: "child",
} as const;

const currentInsuranceMap = {
  none: "none",
  individual: "individual",
  group: "employer_group",
  "individual-group": "individual_and_group",
} as const;

export const evaluationGoalMap = {
  first_time: "first_time",
  independent_from_employer: "independent_from_employer",
  evaluate_existing: "evaluate_existing",
  improve_value: "improve_value",
} as const satisfies Readonly<
  Record<
    DatabaseAssessmentAnswers["evaluation_goal"],
    DatabaseAssessmentAnswers["evaluation_goal"]
  >
>;

const prioritiesMap = {
  "hospital-network": "private_hospitals",
  surgery: "major_hospitalization",
  emergency: "emergency",
  "serious-illness": "major_hospitalization",
  "high-limit": "major_hospitalization",
  "low-deductible": "low_or_zero_deductible",
  outpatient: "outpatient_doctors_diagnostics",
  checkup: "prevention_checkup",
  abroad: "international",
  pediatric: "pediatric",
} as const;

const deductibleMap = {
  "up-to-1500": "minimum",
  "1500-to-5000": "balanced",
  "over-5000": "higher_for_lower_premium",
  minimum: "minimum",
  small: "balanced",
  large: "higher_for_lower_premium",
} as const;

const costApproachMap = {
  complete: "maximum_protection",
  balanced: "balanced",
  basic: "essential_lower_cost",
} as const;

export const additionalNeedsMap = {
  outpatient_visits: "outpatient_visits",
  frequent_travel: "frequent_travel",
  immediate_use: "immediate_use",
  maternity: "maternity",
  young_children: "young_children",
  physiotherapy: "physiotherapy",
  prevention_checkup: "prevention_checkup",
  provider_freedom: "provider_freedom",
  low_bureaucracy: "low_bureaucracy",
} as const satisfies Readonly<
  Record<string, DatabaseAssessmentAnswers["additional_needs"][number]>
>;

const additionalNeedsContractOrder = [...new Set(Object.values(additionalNeedsMap))];

function mapSingleValue<T extends string>(
  field: AssessmentMappingError["field"],
  value: MappableValue,
  mapping: Readonly<Record<string, T | null>>,
  errors: AssessmentMappingError[],
): T | null {
  if (!value) {
    errors.push({
      field,
      code: "missing_value",
      message: "Λείπει απαιτούμενη απάντηση για το database contract.",
    });
    return null;
  }

  if (!(value in mapping)) {
    errors.push({
      field,
      code: "invalid_value",
      message: "Η απάντηση δεν ανήκει στις υποστηριζόμενες frontend τιμές.",
    });
    return null;
  }

  const mapped = mapping[value];

  if (mapped === null) {
    errors.push({
      field,
      code: "unsupported_value",
      message: "Η συγκεκριμένη απάντηση δεν έχει ακριβές ισοδύναμο στο database contract.",
    });
    return null;
  }

  return mapped;
}

function mapMultipleValues<T extends string>(
  field: AssessmentMappingError["field"],
  values: string[],
  mapping: Readonly<Record<string, T | null>>,
  errors: AssessmentMappingError[],
): T[] {
  const mapped: T[] = [];

  for (const value of values) {
    const result = mapSingleValue(field, value, mapping, errors);
    if (result) mapped.push(result);
  }

  return [...new Set(mapped)];
}

function isContractDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const parsed = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value &&
    value >= "1900-01-01" &&
    parsed.getTime() <= Date.now()
  );
}

export function mapAssessmentSubmissionToDatabase(
  submission: AssessmentSubmission,
): AssessmentMappingResult {
  const errors: AssessmentMappingError[] = [];
  const insuredPeople = mapSingleValue(
    "insuredPeople",
    submission.answers.insuredPeople,
    insuredPeopleMap,
    errors,
  );
  const currentInsurance = mapSingleValue(
    "currentInsurance",
    submission.answers.currentInsurance,
    currentInsuranceMap,
    errors,
  );
  const evaluationGoal = mapSingleValue(
    "evaluationGoal",
    submission.answers.evaluationGoal,
    evaluationGoalMap,
    errors,
  );
  const deductible = mapSingleValue(
    "deductible",
    submission.answers.deductible,
    deductibleMap,
    errors,
  );
  const costApproach = mapSingleValue(
    "costApproach",
    isDeductibleBand(submission.answers.deductible)
      ? deductibleBands[submission.answers.deductible].approach
      : submission.answers.costApproach,
    costApproachMap,
    errors,
  );
  const priorities = mapMultipleValues(
    "priorities",
    submission.answers.priorities,
    prioritiesMap,
    errors,
  );
  const mappedAdditionalNeeds = mapMultipleValues(
    "additionalNeeds",
    submission.answers.additionalNeeds,
    additionalNeedsMap,
    errors,
  );
  const selectedAdditionalNeeds = new Set(mappedAdditionalNeeds);
  if (submission.answers.careAccess === "freedom") selectedAdditionalNeeds.add("provider_freedom");
  const additionalNeeds = additionalNeedsContractOrder.filter((value) =>
    selectedAdditionalNeeds.has(value),
  );
  const birthDates = submission.people.map((person) => ({
    birth_date: person.birthDate,
  }));

  if (
    birthDates.length === 0 ||
    birthDates.some(({ birth_date: birthDate }) => !isContractDate(birthDate))
  ) {
    errors.push({
      field: "birthDates",
      code: "invalid_value",
      message: "Οι ημερομηνίες γέννησης δεν είναι έγκυρες για το database contract.",
    });
  }

  if (priorities.length === 0 || priorities.length > 3) {
    errors.push({
      field: "priorities",
      code: "invalid_value",
      message: "Το database contract απαιτεί από μία έως τρεις προτεραιότητες.",
    });
  }

  if (
    errors.length > 0 ||
    !insuredPeople ||
    !currentInsurance ||
    !evaluationGoal ||
    !deductible ||
    !costApproach
  ) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    data: {
      ...(isDeductibleBand(submission.answers.deductible)
        ? { deductible_band: submission.answers.deductible } : {}),
      ...(submission.answers.careAccess ? { care_access: submission.answers.careAccess } : {}),
      insured_people: insuredPeople,
      birth_dates: birthDates,
      existing_insurance: currentInsurance,
      evaluation_goal: evaluationGoal,
      priorities,
      deductible_preference: deductible,
      protection_cost: costApproach,
      additional_needs: additionalNeeds,
      existing_policy_upload: submission.policyFile
        ? {
            filename: submission.policyFile.name,
            mime_type: submission.policyFile.type,
            size_bytes: submission.policyFile.size,
          }
        : {},
    },
  };
}
