import type { AssessmentSubmission } from "@/lib/assessment/types";

export type DemoAgeCategory =
  | "under-18"
  | "18-29"
  | "30-44"
  | "45-59"
  | "60-plus"
  | "not-available";

export type DemoHouseholdProfile = "individual" | "couple" | "family";

export interface DemoPricingProfile {
  ageCategory: DemoAgeCategory;
  insuredCount: number;
  householdProfile: DemoHouseholdProfile;
  deductiblePreference: string;
  protectionLevel: string;
}

export interface DemoPriceEstimate {
  monthlyFrom: number;
  monthlyTo: number;
  yearlyFrom: number;
  yearlyTo: number;
  basis: string[];
  isIllustrative: true;
}

const ageCategoryLabels: Record<DemoAgeCategory, string> = {
  "under-18": "κάτω των 18 ετών",
  "18-29": "18–29 ετών",
  "30-44": "30–44 ετών",
  "45-59": "45–59 ετών",
  "60-plus": "60 ετών και άνω",
  "not-available": "δεν ήταν διαθέσιμη",
};

const householdLabels: Record<DemoHouseholdProfile, string> = {
  individual: "ατομικό",
  couple: "ζευγάρι",
  family: "οικογενειακό",
};

const deductibleLabels: Record<string, string> = {
  minimum: "ελάχιστη δυνατή συμμετοχή",
  small: "μικρή συμμετοχή",
  large: "μεγαλύτερη απαλλαγή",
};

const protectionLabels: Record<string, string> = {
  complete: "αυξημένο επίπεδο προστασίας",
  balanced: "ισορροπημένο επίπεδο προστασίας",
  basic: "βασικό επίπεδο προστασίας",
};

const ageFactors: Record<DemoAgeCategory, number> = {
  "under-18": 0.64,
  "18-29": 0.78,
  "30-44": 1,
  "45-59": 1.34,
  "60-plus": 1.72,
  "not-available": 1,
};

const deductibleFactors: Record<string, number> = {
  minimum: 1.18,
  small: 1,
  large: 0.84,
};

const protectionFactors: Record<string, number> = {
  complete: 1.2,
  balanced: 1,
  basic: 0.82,
};

const parseDate = (value: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

function ageAt(birthDate: string, referenceDate: Date) {
  const birth = parseDate(birthDate);
  if (!birth) return null;

  let age = referenceDate.getUTCFullYear() - birth.getUTCFullYear();
  const beforeBirthday =
    referenceDate.getUTCMonth() < birth.getUTCMonth() ||
    (referenceDate.getUTCMonth() === birth.getUTCMonth() &&
      referenceDate.getUTCDate() < birth.getUTCDate());
  if (beforeBirthday) age -= 1;
  return age >= 0 && age <= 120 ? age : null;
}

function toAgeCategory(age: number | null): DemoAgeCategory {
  if (age === null) return "not-available";
  if (age < 18) return "under-18";
  if (age < 30) return "18-29";
  if (age < 45) return "30-44";
  if (age < 60) return "45-59";
  return "60-plus";
}

function householdProfile(
  insuredPeople: string | null,
  insuredCount: number,
): DemoHouseholdProfile {
  if (insuredPeople === "self-partner" && insuredCount <= 2) return "couple";
  if (
    insuredPeople === "family" ||
    insuredPeople === "children" ||
    insuredCount > 2
  ) {
    return "family";
  }
  return "individual";
}

const roundToFive = (value: number) => Math.max(5, Math.round(value / 5) * 5);

const programScenarioFactor = (programId: string) => {
  const checksum = [...programId].reduce(
    (total, character) => total + character.charCodeAt(0),
    0,
  );
  return 0.92 + (checksum % 17) / 100;
};

export function buildDemoPricingProfile(
  submission: AssessmentSubmission,
): DemoPricingProfile {
  const referenceDate =
    parseDate(submission.submittedAt) ?? new Date("2026-01-01T00:00:00.000Z");
  const ages = submission.people
    .map((person) => ageAt(person.birthDate, referenceDate))
    .filter((age): age is number => age !== null);
  const representativeAge = ages.length > 0 ? Math.max(...ages) : null;
  const insuredCount = Math.max(1, submission.people.length);

  return {
    ageCategory: toAgeCategory(representativeAge),
    insuredCount,
    householdProfile: householdProfile(
      submission.answers.insuredPeople,
      insuredCount,
    ),
    deductiblePreference: submission.answers.deductible ?? "small",
    protectionLevel: submission.answers.costApproach ?? "balanced",
  };
}

export function estimateDemoPrice(
  submission: AssessmentSubmission,
  programId: string,
): DemoPriceEstimate {
  const profile = buildDemoPricingProfile(submission);
  const additionalPeopleFactor =
    1 + Math.max(0, profile.insuredCount - 1) * 0.58;
  const familyAdjustment =
    profile.householdProfile === "family"
      ? 0.92
      : profile.householdProfile === "couple"
        ? 0.96
        : 1;
  const midpoint =
    82 *
    programScenarioFactor(programId) *
    ageFactors[profile.ageCategory] *
    additionalPeopleFactor *
    familyAdjustment *
    (deductibleFactors[profile.deductiblePreference] ?? 1) *
    (protectionFactors[profile.protectionLevel] ?? 1);
  const monthlyFrom = roundToFive(midpoint * 0.88);
  const monthlyTo = Math.max(monthlyFrom + 10, roundToFive(midpoint * 1.14));

  return {
    monthlyFrom,
    monthlyTo,
    yearlyFrom: monthlyFrom * 12,
    yearlyTo: monthlyTo * 12,
    basis: [
      `Ηλικιακή κατηγορία: ${ageCategoryLabels[profile.ageCategory]}`,
      `Αριθμός ασφαλιζομένων: ${profile.insuredCount}`,
      `Προφίλ: ${householdLabels[profile.householdProfile]}`,
      `Προτίμηση απαλλαγής: ${
        deductibleLabels[profile.deductiblePreference] ?? "δεν δηλώθηκε"
      }`,
      `Επίπεδο προστασίας: ${
        protectionLabels[profile.protectionLevel] ?? "δεν δηλώθηκε"
      }`,
    ],
    isIllustrative: true,
  };
}
