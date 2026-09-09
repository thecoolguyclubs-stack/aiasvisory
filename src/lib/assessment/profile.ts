import { assessmentConfig } from "./config";
import type { AssessmentOption } from "./config";
import type { AssessmentSubmission, InsuranceProfile } from "./types";
import { deductibleBands, isDeductibleBand } from "./preferences";

const insuredTitles: Record<string, string> = {
  self: "Μόνο εμένα",
  "self-partner": "Εμένα και σύντροφο",
  family: "Την οικογένειά μου",
  children: "Το παιδί ή τα παιδιά μου",
};

const goalDetails: Record<string, string> = {
  first_time: "Νέα προσωπική κάλυψη",
  independent_from_employer: "Ανεξαρτησία από εργοδότη",
  evaluate_existing: "Αξιολόγηση υπάρχοντος προγράμματος",
  improve_value: "Καλύτερη σχέση καλύψεων και κόστους",
};

const insuranceDetails: Record<string, string> = {
  none: "Αναζήτηση νέας ιδιωτικής κάλυψης",
  individual: "Αξιολόγηση ατομικού ή οικογενειακού συμβολαίου",
  group: "Αξιολόγηση κάλυψης μέσω εργασίας",
  "individual-group": "Συνδυασμός ατομικής και ομαδικής κάλυψης",
};

const optionLabel = (
  options: readonly AssessmentOption[],
  value: string | null,
) => options.find((option) => option.id === value)?.label ?? ({
  minimum: "Θέλω μηδενική ή ελάχιστη δυνατή συμμετοχή",
  small: "Μπορώ να δεχτώ μια μικρή συμμετοχή για καλύτερη τιμή",
  large: "Μπορώ να δεχτώ μεγάλη απαλλαγή για χαμηλό ασφάλιστρο",
  "low-deductible": "Μηδενική ή χαμηλή συμμετοχή",
} as Record<string, string>)[value ?? ""] ?? "Δεν δηλώθηκε";

const optionLabels = (
  options: readonly AssessmentOption[],
  values: string[],
) => values
  .map((value) => optionLabel(options, value))
  .filter((label) => label !== "Δεν δηλώθηκε");

export interface NeedInsight {
  title: string;
  detail: string;
}

const priorityInsightDetails: Record<string, string> = {
  "hospital-network":
    "Δείχνει ανάγκη για άμεση πρόσβαση σε ιδιωτικές δομές υγείας.",
  surgery:
    "Δείχνει έμφαση στην κάλυψη σημαντικών και υψηλού κόστους ιατρικών πράξεων.",
  emergency: "Δείχνει ανάγκη για άμεση προστασία σε ξαφνικά περιστατικά.",
  "serious-illness":
    "Δείχνει προτεραιότητα σε βαριές και απαιτητικές ιατρικές περιπτώσεις.",
  "high-limit":
    "Δείχνει ανάγκη για ισχυρή προστασία σε παρατεταμένες νοσηλείες.",
  "low-deductible":
    "Δείχνει προτίμηση για περιορισμένο προσωπικό κόστος κατά τη χρήση του προγράμματος.",
};

const insightFor = (
  options: readonly AssessmentOption[],
  value: string,
  details: Readonly<Record<string, string>>,
): NeedInsight | null => {
  const option = options.find((candidate) => candidate.id === value);
  if (!option) return null;

  return {
    title: option.label,
    detail: details[value] ?? option.description ?? "Χρειάζεται επιβεβαίωση με σύμβουλο.",
  };
};

export const getPriorityInsight = (value: string) =>
  insightFor(
    assessmentConfig.priorities.options,
    value,
    priorityInsightDetails,
  );

export const getAdditionalNeedInsight = (value: string) =>
  insightFor(assessmentConfig.additionalNeeds.options, value, {});

export function calculateAge(birthDate: string, referenceDate: string) {
  const birth = new Date(`${birthDate}T00:00:00.000Z`);
  const reference = new Date(referenceDate);

  let age = reference.getUTCFullYear() - birth.getUTCFullYear();
  const beforeBirthday =
    reference.getUTCMonth() < birth.getUTCMonth() ||
    (reference.getUTCMonth() === birth.getUTCMonth() &&
      reference.getUTCDate() < birth.getUTCDate());

  if (beforeBirthday) age -= 1;
  return Math.max(0, age);
}

export function generateInsuranceProfile(
  submission: AssessmentSubmission,
): InsuranceProfile {
  const referenceDate =
    submission.submittedAt ?? "2026-01-01T00:00:00.000Z";
  const ages = submission.people.map((person) =>
    calculateAge(person.birthDate, referenceDate),
  );
  const minimumAge = Math.min(...ages);
  const maximumAge = Math.max(...ages);
  const ageTitle =
    ages.length === 1
      ? `${ages[0]} ετών`
      : minimumAge === maximumAge
        ? `${minimumAge} ετών`
        : `${minimumAge}–${maximumAge} ετών`;
  const ageDetail = submission.people
    .map((person, index) => `${index + 1}. ${person.label}: ${ages[index]} ετών`)
    .join(" · ");
  const insuredAnswer = submission.answers.insuredPeople ?? "";
  const insuranceAnswer = submission.answers.currentInsurance;
  const goalAnswer = submission.answers.evaluationGoal;

  return {
    insuredPeople: {
      title: insuredTitles[insuredAnswer] ?? "Ασφαλιζόμενα μέλη",
      detail: `${submission.people.length} ${submission.people.length === 1 ? "ασφαλισμένος" : "ασφαλισμένοι"}`,
      count: submission.people.length,
    },
    ageProfile: { title: ageTitle, detail: ageDetail, ages },
    currentInsurance: {
      title: optionLabel(
        assessmentConfig.currentInsurance.options,
        insuranceAnswer,
      ),
      detail: insuranceDetails[insuranceAnswer ?? ""] ?? "Καταγραφή κάλυψης",
    },
    mainGoal: {
      title: optionLabel(assessmentConfig.evaluationGoal.options, goalAnswer),
      detail: goalDetails[goalAnswer ?? ""] ?? "Προσωπικός στόχος αξιολόγησης",
    },
    priorities: optionLabels(
      assessmentConfig.priorities.options,
      submission.answers.priorities,
    ),
    deductiblePreference: isDeductibleBand(submission.answers.deductible)
      ? deductibleBands[submission.answers.deductible].label
      : optionLabel(
      assessmentConfig.deductible.options,
      submission.answers.deductible,
    ),
    costAndProtectionApproach: optionLabel(
      assessmentConfig.costApproach.options,
      submission.answers.costApproach,
    ),
    additionalNeeds: optionLabels(
      assessmentConfig.additionalNeeds.options,
      [...new Set([...submission.answers.additionalNeeds,
        ...(submission.answers.careAccess === "freedom" ? ["provider_freedom"] : [])])],
    ),
    hasUploadedPolicy: Boolean(submission.policyFile),
    generatedAt: referenceDate,
  };
}
