export type AssessmentStepId =
  | "insuredPeople"
  | "birthDates"
  | "currentInsurance"
  | "evaluationGoal"
  | "priorities"
  | "deductible"
  | "costApproach"
  | "additionalNeeds";

export type AssessmentViewId =
  | AssessmentStepId
  | "policyUpload";

export type OptionIcon = "shield" | "balance" | "wallet";

export interface AssessmentOption {
  readonly id: string;
  readonly label: string;
  readonly description?: string;
  readonly categoryBadge?: string;
  readonly icon?: OptionIcon;
}

interface StepBase {
  readonly id: AssessmentStepId;
  readonly displayStep: number;
  readonly eyebrow: string;
  readonly title: string;
  readonly helper?: string;
}

export interface SingleChoiceStep extends StepBase {
  readonly kind: "single";
  readonly options: readonly AssessmentOption[];
}

export interface MultiChoiceStep extends StepBase {
  readonly kind: "multi";
  readonly options: readonly AssessmentOption[];
  readonly maxSelections?: number;
  readonly optional?: boolean;
}

export interface BirthDateStep extends StepBase {
  readonly kind: "birthDates";
}

export type AssessmentStepConfig =
  | SingleChoiceStep
  | MultiChoiceStep
  | BirthDateStep;

export const assessmentConfig = {
  insuredPeople: {
    id: "insuredPeople",
    displayStep: 1,
    kind: "single",
    eyebrow: "ΝΟΣΟΚΟΜΕΙΑΚΗ ΑΣΦΑΛΙΣΗ",
    title: "Ποιον θέλεις να ασφαλίσεις;",
    options: [
      { id: "self", label: "Εμένα" },
      { id: "self-partner", label: "Εμένα και τον/τη σύντροφό μου" },
      { id: "family", label: "Την οικογένειά μου" },
      { id: "children", label: "Το παιδί ή τα παιδιά μου" },
    ],
  },
  birthDates: {
    id: "birthDates",
    displayStep: 2,
    kind: "birthDates",
    eyebrow: "ΗΛΙΚΙΑ ΑΣΦΑΛΙΣΜΕΝΩΝ",
    title: "Ποια είναι η ημερομηνία γέννησής σου;",
    helper: "Πρόσθεσε κάθε άλλο άτομο που θέλεις να συμπεριλάβεις.",
  },
  currentInsurance: {
    id: "currentInsurance",
    displayStep: 3,
    kind: "single",
    eyebrow: "ΥΠΑΡΧΟΥΣΑ ΑΣΦΑΛΙΣΗ",
    title: "Ποια είναι η ασφαλιστική σου κάλυψη σήμερα;",
    options: [
      { id: "none", label: "Δεν έχω ιδιωτική ασφάλιση υγείας" },
      {
        id: "individual",
        label: "Έχω ατομικό ή οικογενειακό ασφαλιστήριο",
      },
      {
        id: "group",
        label: "Έχω ομαδική ασφάλιση μέσω της εργασίας μου",
      },
      {
        id: "individual-group",
        label: "Έχω και ατομικό και ομαδικό πρόγραμμα",
      },
    ],
  },
  evaluationGoal: {
    id: "evaluationGoal",
    displayStep: 4,
    kind: "single",
    eyebrow: "ΣΤΟΧΟΣ ΑΞΙΟΛΟΓΗΣΗΣ",
    title: "Τι θέλεις να πετύχεις μέσα από αυτή την αξιολόγηση;",
    options: [
      {
        id: "first_time",
        label: "Αναζητώ ιδιωτική ασφάλιση για πρώτη φορά",
      },
      {
        id: "independent_from_employer",
        label: "Θέλω προσωπική κάλυψη ανεξάρτητη από τον εργοδότη μου",
      },
      {
        id: "evaluate_existing",
        label:
          "Θέλω να αξιολογήσω ή να συγκρίνω ένα υπάρχον πρόγραμμα ή μία ασφαλιστική προσφορά",
      },
      {
        id: "improve_value",
        label: "Θέλω καλύτερη σχέση καλύψεων και κόστους",
      },
    ],
  },
  priorities: {
    id: "priorities",
    displayStep: 5,
    kind: "multi",
    eyebrow: "ΚΥΡΙΕΣ ΠΡΟΤΕΡΑΙΟΤΗΤΕΣ",
    title: "Ποια χαρακτηριστικά είναι πιο σημαντικά για εσένα;",
    helper: "Επίλεξε έως 3.",
    maxSelections: 3,
    options: [
      {
        id: "hospital-network",
        label: "Νοσηλεία σε ιδιωτικό νοσοκομείο",
      },
      {
        id: "surgery",
        label: "Χειρουργικές επεμβάσεις",
      },
      {
        id: "emergency",
        label: "Κάλυψη επειγόντων περιστατικών",
      },
      {
        id: "serious-illness",
        label: "Κάλυψη σοβαρών ασθενειών",
      },
      {
        id: "high-limit",
        label: "Υψηλό όριο κάλυψης για μακροχρόνια νοσηλεία",
      },
      {
        id: "low-deductible",
        label: "Μηδενική ή χαμηλή συμμετοχή",
      },
    ],
  },
  deductible: {
    id: "deductible",
    displayStep: 6,
    kind: "single",
    eyebrow: "ΠΡΟΣΩΠΙΚΗ ΣΥΜΜΕΤΟΧΗ",
    title:
      "Πώς θέλεις να διαμορφώνεται η συμμετοχή σου σε περίπτωση νοσηλείας;",
    helper:
      "Χαμηλότερη συμμετοχή συνήθως συνδέεται με υψηλότερο ασφάλιστρο.",
    options: [
      {
        id: "minimum",
        label: "Θέλω μηδενική ή ελάχιστη δυνατή συμμετοχή",
        description: "0€ - 500€",
      },
      {
        id: "small",
        label: "Μπορώ να δεχτώ μια μικρή συμμετοχή για καλύτερη τιμή",
        description: "500€ - 1.500€",
      },
      {
        id: "large",
        label: "Μπορώ να δεχτώ μεγάλη απαλλαγή για χαμηλό ασφάλιστρο",
        description: "1.500€ και άνω",
      },
    ],
  },
  costApproach: {
    id: "costApproach",
    displayStep: 7,
    kind: "single",
    eyebrow: "ΠΡΟΣΤΑΣΙΑ ΚΑΙ ΚΟΣΤΟΣ",
    title: "Ποια προσέγγιση σε εκφράζει περισσότερο;",
    options: [
      {
        id: "complete",
        label: "Πληρέστερη διαθέσιμη προστασία",
        description:
          "Προτεραιότητα στις εκτεταμένες καλύψεις, στα υψηλά όρια και στην ελευθερία επιλογής.",
        categoryBadge: "Premium Choice",
        icon: "shield",
      },
      {
        id: "balanced",
        label: "Ισορροπία καλύψεων και κόστους",
        description:
          "Ουσιαστική προστασία, με καλύψεις που ανταποκρίνονται στις ανάγκες σου.",
        categoryBadge: "Best Match",
        icon: "balance",
      },
      {
        id: "basic",
        label: "Βασικές ανάγκες με χαμηλότερο κόστος",
        description:
          "Προστασία κυρίως από σοβαρά και απρόβλεπτα περιστατικά, με έμφαση στο χαμηλότερο ασφάλιστρο.",
        categoryBadge: "Smart Budget Choice",
        icon: "wallet",
      },
    ],
  },
  additionalNeeds: {
    id: "additionalNeeds",
    displayStep: 8,
    kind: "multi",
    eyebrow: "ΠΡΟΣΘΕΤΕΣ ΑΣΦΑΛΙΣΤΙΚΕΣ ΑΝΑΓΚΕΣ",
    title:
      "Υπάρχει κάποια κάλυψη ή παροχή που θα ήθελες να περιλαμβάνει το πρόγραμμά σου;",
    helper: "Μπορείς να επιλέξεις περισσότερες από μία.",
    optional: true,
    options: [
      {
        id: "outpatient_visits",
        label: "Εξωνοσοκομειακές επισκέψεις",
        description: "Επισκέψεις σε γιατρούς χωρίς να απαιτείται νοσηλεία.",
      },
      {
        id: "frequent_travel",
        label: "Ταξιδεύω συχνά στο εξωτερικό",
        description:
          "Κάλυψη σε Ευρώπη ή παγκόσμια, ανάλογα με το πρόγραμμα και τους όρους του.",
      },
      {
        id: "maternity",
        label: "Κάλυψη μητρότητας",
        description:
          "Κάλυψη τοκετού, καισαρικής, επιπλοκών κύησης ή σχετικών εξόδων, όπου προβλέπεται.",
      },
      {
        id: "physiotherapy",
        label: "Φυσικοθεραπείες / αποκατάσταση",
        description:
          "Κάλυψη μετά από ατύχημα, χειρουργική επέμβαση ή σοβαρή πάθηση.",
      },
      {
        id: "young_children",
        label: "Πλήρης παιδιατρική κάλυψη",
        description:
          "Κάλυψη για παιδιά, όπως παιδίατροι, νοσηλεία, εξετάσεις, επείγοντα και ειδικές παιδιατρικές παροχές.",
      },
      {
        id: "immediate_use",
        label: "Μικρή περίοδος αναμονής / άμεση χρήση προγράμματος",
        description:
          "Έναρξη της κάλυψης το συντομότερο δυνατό, με περιορισμένη περίοδο αναμονής όπου αυτό προβλέπεται.",
      },
      {
        id: "provider_freedom",
        label: "Μεγάλη ελευθερία επιλογής δικτύου γιατρών / νοσοκομείων",
        description:
          "Δυνατότητα επιλογής γιατρού ή νοσοκομείου, ώστε ο πελάτης να έχει μεγαλύτερο έλεγχο στη διαχείριση της περίθαλψής του.",
      },
      {
        id: "prevention_checkup",
        label: "Διαγνωστικές εξετάσεις χωρίς νοσηλεία / check-up",
        description:
          "Αιματολογικές εξετάσεις, ακτινογραφίες, υπέρηχοι, αξονικές, μαγνητικές και προληπτικός έλεγχος υγείας.",
      },
    ],
  },
} as const satisfies Record<AssessmentStepId, AssessmentStepConfig>;

export const policyAnalysisBenefits = [
  "Καλύψεις και εξαιρέσεις",
  "Απαλλαγές και συμμετοχές",
  "Ανώτατα όρια κάλυψης",
  "Δίκτυο νοσοκομείων",
  "Περίοδοι αναμονής",
  "Κενά ή επικαλύψεις",
] as const;

export const insuranceRequiresUpload = (answer: string | null) =>
  answer !== null && answer !== "none";

export const goalRequiresUpload = (answer: string | null) =>
  answer === "evaluate_existing";
