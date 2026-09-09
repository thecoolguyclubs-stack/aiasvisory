export type ProgramCostTier = 1 | 2 | 3;

export interface ProgramStrength {
  id: string;
  title: string;
  description: string;
}

export interface MockInsuranceProgram {
  id: string;
  providerName: string;
  providerMark: string;
  programName: string;
  subtitle: string;
  accent: string;
  tint: string;
  costTier: ProgramCostTier;
  priorityFit: readonly string[];
  additionalNeedsFit: readonly string[];
  deductibleFit: readonly string[];
  approachFit: readonly string[];
  goalFit: readonly string[];
  compositionFit: readonly string[];
  strengths: readonly ProgramStrength[];
  tradeOffs: readonly string[];
  advisorConfirmations: readonly string[];
  networkExamples: readonly string[];
}

export const mockProgramCatalog = [
  {
    id: "aegis-total-protect",
    providerName: "Aegis Demo Insurance",
    providerMark: "A",
    programName: "Total Protect Plus",
    subtitle: "Εκτεταμένη προστασία για αυξημένες απαιτήσεις",
    accent: "#0a7f82",
    tint: "#e9f7f7",
    costTier: 3,
    priorityFit: [
      "hospital-network",
      "low-deductible",
      "outpatient",
      "surgery",
      "high-limit",
      "serious-illness",
      "abroad",
      "emergency",
    ],
    additionalNeedsFit: [
      "outpatient_visits",
      "frequent_travel",
      "abroad",
      "immediate_use",
      "waiting-periods",
      "physiotherapy",
      "prevention_checkup",
      "preventive",
      "provider_freedom",
      "broad-network",
      "direct-cover",
      "emergency",
    ],
    deductibleFit: ["minimum", "small"],
    approachFit: ["complete"],
    goalFit: [
      "review-existing",
      "compare-existing",
      "serious-hospitalization",
      "future-cover",
    ],
    compositionFit: ["self", "self-partner", "family"],
    strengths: [
      {
        id: "high-limit",
        title: "Υψηλά όρια προστασίας",
        description: "Demo σχεδιασμός για σοβαρά περιστατικά και απαιτητικές νοσηλείες.",
      },
      {
        id: "hospital-network",
        title: "Ευρύ μοντέλο δικτύου",
        description: "Προτεραιότητα σε περισσότερες επιλογές ιδιωτικής περίθαλψης.",
      },
      {
        id: "outpatient",
        title: "Συνδυασμένη φροντίδα",
        description: "Ενδεικτική σύνδεση νοσοκομειακών και εξωνοσοκομειακών παροχών.",
      },
      {
        id: "abroad",
        title: "Διεθνής κατεύθυνση",
        description: "Πρόβλεψη για ανάγκες περίθαλψης εκτός Ελλάδας προς επιβεβαίωση.",
      },
      {
        id: "direct-cover",
        title: "Απλούστερη διαχείριση",
        description: "Demo δυνατότητα απευθείας διακανονισμού σε συνεργαζόμενο δίκτυο.",
      },
      {
        id: "preventive",
        title: "Έμφαση στην πρόληψη",
        description: "Ενδεικτικές παροχές ελέγχου και παρακολούθησης υγείας.",
      },
    ],
    tradeOffs: [
      "Η πληρέστερη κατεύθυνση συνδέεται συνήθως με υψηλότερο σχετικό κόστος.",
      "Τα όρια και οι εξαιρέσεις χρειάζονται αναλυτική επιβεβαίωση.",
    ],
    advisorConfirmations: [
      "Τελικό ασφάλιστρο μετά την αξιολόγηση κινδύνου",
      "Ακριβές ύψος απαλλαγής και συμμετοχών",
      "Ισχύον δίκτυο, εξαιρέσεις και περίοδοι αναμονής",
    ],
    networkExamples: [
      "Ιδιωτικά νοσοκομεία μεγάλων αστικών κέντρων",
      "Συνεργαζόμενα διαγνωστικά κέντρα",
      "Δίκτυο επείγουσας υποστήριξης",
    ],
  },
  {
    id: "orion-global-care",
    providerName: "Orion Demo Health",
    providerMark: "O",
    programName: "Global Care Prime",
    subtitle: "Premium κατεύθυνση με διεθνή προσανατολισμό",
    accent: "#263d78",
    tint: "#eef1fa",
    costTier: 3,
    priorityFit: [
      "hospital-network",
      "low-deductible",
      "surgery",
      "high-limit",
      "serious-illness",
      "emergency",
      "checkup",
      "abroad",
      "pediatric",
    ],
    additionalNeedsFit: [
      "frequent_travel",
      "abroad",
      "maternity",
      "young_children",
      "immediate_use",
      "preventive",
      "provider_freedom",
      "broad-network",
      "direct-cover",
      "emergency",
    ],
    deductibleFit: ["minimum", "small"],
    approachFit: ["complete"],
    goalFit: ["first-policy", "serious-hospitalization", "future-cover"],
    compositionFit: ["self-partner", "family", "children"],
    strengths: [
      {
        id: "abroad",
        title: "Διεθνής προσανατολισμός",
        description: "Demo σχεδιασμός για όσους αξιολογούν και κάλυψη στο εξωτερικό.",
      },
      {
        id: "low-deductible",
        title: "Χαμηλή συμμετοχή",
        description: "Έμφαση σε επιλογές χαμηλότερης προσωπικής επιβάρυνσης.",
      },
      {
        id: "pediatric",
        title: "Οικογενειακή φροντίδα",
        description: "Ενδεικτικό πλαίσιο για παιδιατρικές και οικογενειακές ανάγκες.",
      },
      {
        id: "emergency",
        title: "Υποστήριξη επειγόντων",
        description: "Προτεραιότητα στην πρόσβαση για απρόβλεπτα περιστατικά.",
      },
      {
        id: "preventive",
        title: "Προληπτικός έλεγχος",
        description: "Demo παροχές περιοδικής πρόληψης προς επιβεβαίωση.",
      },
      {
        id: "hospital-network",
        title: "Επιλογές περίθαλψης",
        description: "Ευρύτερη ενδεικτική πρόσβαση σε ιδιωτικές δομές.",
      },
    ],
    tradeOffs: [
      "Ο διεθνής προσανατολισμός μπορεί να αυξάνει το σχετικό κόστος.",
      "Οι γεωγραφικοί περιορισμοί διαφέρουν ανά τελικούς όρους.",
    ],
    advisorConfirmations: [
      "Χώρες και περιστατικά που περιλαμβάνονται",
      "Όρια παιδιατρικών ή οικογενειακών παροχών",
      "Τελικές προϋποθέσεις απευθείας κάλυψης",
    ],
    networkExamples: [
      "Ενδεικτικό πανελλαδικό δίκτυο",
      "Διεθνείς συνεργασίες προς επιβεβαίωση",
      "Παιδιατρικές δομές σε επιλεγμένες πόλεις",
    ],
  },
  {
    id: "helix-flex-care",
    providerName: "Helix Demo Care",
    providerMark: "H",
    programName: "Flex Care Balance",
    subtitle: "Ισορροπημένη προστασία με ευέλικτες επιλογές",
    accent: "#0b8d79",
    tint: "#eaf8f4",
    costTier: 2,
    priorityFit: [
      "hospital-network",
      "outpatient",
      "surgery",
      "high-limit",
      "emergency",
      "checkup",
    ],
    additionalNeedsFit: [
      "outpatient_visits",
      "immediate_use",
      "waiting-periods",
      "physiotherapy",
      "prevention_checkup",
      "preventive",
      "provider_freedom",
      "broad-network",
      "direct-cover",
      "emergency",
    ],
    deductibleFit: ["small", "large"],
    approachFit: ["balanced"],
    goalFit: [
      "first-policy",
      "group-gaps",
      "review-existing",
      "compare-existing",
    ],
    compositionFit: ["self", "self-partner", "family"],
    strengths: [
      {
        id: "hospital-network",
        title: "Ισορροπημένο δίκτυο",
        description: "Demo συνδυασμός επιλογών περίθαλψης και ελεγχόμενου κόστους.",
      },
      {
        id: "outpatient",
        title: "Εξωνοσοκομειακή φροντίδα",
        description: "Ενδεικτική υποστήριξη για γιατρούς και διαγνωστικές εξετάσεις.",
      },
      {
        id: "physiotherapy",
        title: "Αποκατάσταση",
        description: "Δυνατότητα επιλογής σχετικών παροχών προς επιβεβαίωση.",
      },
      {
        id: "emergency",
        title: "Κάλυψη επειγόντων",
        description: "Πρακτική κατεύθυνση για μη προγραμματισμένα περιστατικά.",
      },
      {
        id: "preventive",
        title: "Πρόληψη",
        description: "Ενδεικτικό ετήσιο πλαίσιο προληπτικών ελέγχων.",
      },
      {
        id: "direct-cover",
        title: "Άμεσος διακανονισμός",
        description: "Demo ευκολία σε επιλεγμένο συνεργαζόμενο δίκτυο.",
      },
    ],
    tradeOffs: [
      "Η ισορροπία κόστους μπορεί να σημαίνει επιλογές συμμετοχής.",
      "Ορισμένες πρόσθετες παροχές μπορεί να χρειάζονται ξεχωριστή επιλογή.",
    ],
    advisorConfirmations: [
      "Διαθέσιμες βαθμίδες απαλλαγής",
      "Όρια εξωνοσοκομειακών παροχών",
      "Διαθεσιμότητα αποκατάστασης ανά περιοχή",
    ],
    networkExamples: [
      "Ιδιωτικά θεραπευτήρια σε βασικές πόλεις",
      "Διαγνωστικά κέντρα συνεργαζόμενου δικτύου",
      "Επιλεγμένες υπηρεσίες αποκατάστασης",
    ],
  },
  {
    id: "atlas-family-balance",
    providerName: "Atlas Demo Mutual",
    providerMark: "AT",
    programName: "Family Balance",
    subtitle: "Ισορροπημένη οικογενειακή κατεύθυνση",
    accent: "#a46b12",
    tint: "#fff7e8",
    costTier: 2,
    priorityFit: [
      "hospital-network",
      "outpatient",
      "emergency",
      "checkup",
      "pediatric",
    ],
    additionalNeedsFit: [
      "maternity",
      "young_children",
      "outpatient_visits",
      "physiotherapy",
      "prevention_checkup",
      "preventive",
      "provider_freedom",
      "broad-network",
      "emergency",
    ],
    deductibleFit: ["small", "large"],
    approachFit: ["balanced"],
    goalFit: ["first-policy", "group-gaps", "future-cover"],
    compositionFit: ["self-partner", "family", "children"],
    strengths: [
      {
        id: "pediatric",
        title: "Παιδιατρική κατεύθυνση",
        description: "Demo σχεδιασμός για ανάγκες παιδιών και οικογένειας.",
      },
      {
        id: "maternity",
        title: "Επιλογές μητρότητας",
        description: "Ενδεικτικές παροχές με όρους και αναμονές προς επιβεβαίωση.",
      },
      {
        id: "checkup",
        title: "Τακτική πρόληψη",
        description: "Πλαίσιο περιοδικού ελέγχου για τα ασφαλιζόμενα μέλη.",
      },
      {
        id: "hospital-network",
        title: "Οικογενειακό δίκτυο",
        description: "Έμφαση σε δομές που εξυπηρετούν διαφορετικές ηλικίες.",
      },
      {
        id: "emergency",
        title: "Επείγουσα φροντίδα",
        description: "Demo πρόβλεψη για απρόβλεπτα οικογενειακά περιστατικά.",
      },
      {
        id: "outpatient",
        title: "Καθημερινή φροντίδα",
        description: "Ενδεικτική πρόσβαση σε ιατρούς και εξετάσεις.",
      },
    ],
    tradeOffs: [
      "Οι οικογενειακές παροχές έχουν διαφορετικές προϋποθέσεις ανά μέλος.",
      "Η μητρότητα συνήθως συνοδεύεται από ειδικές περιόδους αναμονής.",
    ],
    advisorConfirmations: [
      "Όρια και προϋποθέσεις ανά ασφαλιζόμενο μέλος",
      "Περίοδοι αναμονής για μητρότητα",
      "Διαθέσιμο παιδιατρικό δίκτυο",
    ],
    networkExamples: [
      "Επιλεγμένες παιδιατρικές κλινικές",
      "Οικογενειακά διαγνωστικά κέντρα",
      "Ιδιωτικά νοσοκομεία συνεργαζόμενου δικτύου",
    ],
  },
  {
    id: "nova-essential-guard",
    providerName: "Nova Demo Cover",
    providerMark: "N",
    programName: "Essential Guard",
    subtitle: "Βασική νοσοκομειακή προστασία με έλεγχο κόστους",
    accent: "#9b4b61",
    tint: "#fff0f4",
    costTier: 1,
    priorityFit: [
      "high-limit",
      "surgery",
      "serious-illness",
      "emergency",
      "hospital-network",
    ],
    additionalNeedsFit: [
      "immediate_use",
      "provider_freedom",
      "direct-cover",
      "emergency",
      "broad-network",
    ],
    deductibleFit: ["large", "small"],
    approachFit: ["basic"],
    goalFit: [
      "first-policy",
      "employer-independent",
      "serious-hospitalization",
    ],
    compositionFit: ["self", "self-partner"],
    strengths: [
      {
        id: "high-limit",
        title: "Προστασία σοβαρής νοσηλείας",
        description: "Demo εστίαση στο οικονομικό βάρος μεγάλων περιστατικών.",
      },
      {
        id: "emergency",
        title: "Βασική επείγουσα κάλυψη",
        description: "Ενδεικτική προστασία για απρόβλεπτη νοσηλεία.",
      },
      {
        id: "direct-cover",
        title: "Ελεγχόμενη διαδικασία",
        description: "Demo απευθείας κάλυψη σε συγκεκριμένο δίκτυο.",
      },
      {
        id: "hospital-network",
        title: "Επιλεγμένο δίκτυο",
        description: "Στοχευμένες συνεργασίες για συγκράτηση του κόστους.",
      },
      {
        id: "deductible",
        title: "Ευελιξία απαλλαγής",
        description: "Κατεύθυνση μεγαλύτερης συμμετοχής για χαμηλότερο σχετικό κόστος.",
      },
      {
        id: "simple",
        title: "Απλή δομή",
        description: "Πιο περιορισμένο demo πλαίσιο βασικών καλύψεων.",
      },
    ],
    tradeOffs: [
      "Η χαμηλότερη σχετική τιμή συνδέεται με μεγαλύτερη προσωπική συμμετοχή.",
      "Οι καθημερινές και προληπτικές παροχές είναι πιο περιορισμένες.",
    ],
    advisorConfirmations: [
      "Ακριβές ποσό απαλλαγής ανά περιστατικό",
      "Νοσοκομεία που συμμετέχουν στο επιλεγμένο δίκτυο",
      "Εξαιρέσεις εξωνοσοκομειακών παροχών",
    ],
    networkExamples: [
      "Επιλεγμένο δίκτυο ιδιωτικών νοσοκομείων",
      "Βασική γραμμή επείγουσας υποστήριξης",
      "Συνεργαζόμενα κέντρα προέγκρισης",
    ],
  },
  {
    id: "pulse-smart-start",
    providerName: "Pulse Demo Health",
    providerMark: "P",
    programName: "Smart Start",
    subtitle: "Οικονομική αφετηρία για ουσιαστική προστασία",
    accent: "#526c2e",
    tint: "#f3f8e9",
    costTier: 1,
    priorityFit: [
      "emergency",
      "checkup",
      "pediatric",
      "outpatient",
    ],
    additionalNeedsFit: [
      "outpatient_visits",
      "young_children",
      "prevention_checkup",
      "preventive",
      "emergency",
      "physiotherapy",
    ],
    deductibleFit: ["large"],
    approachFit: ["basic"],
    goalFit: ["first-policy", "employer-independent", "group-gaps"],
    compositionFit: ["self", "family", "children"],
    strengths: [
      {
        id: "emergency",
        title: "Έμφαση στα απρόβλεπτα",
        description: "Demo βάση προστασίας για επείγοντα περιστατικά.",
      },
      {
        id: "checkup",
        title: "Βασική πρόληψη",
        description: "Ενδεικτικό προληπτικό check-up προς επιβεβαίωση.",
      },
      {
        id: "pediatric",
        title: "Επιλογή για παιδιά",
        description: "Οικονομική κατεύθυνση για βασικές παιδιατρικές ανάγκες.",
      },
      {
        id: "outpatient",
        title: "Καθημερινή υποστήριξη",
        description: "Περιορισμένες demo παροχές ιατρών και εξετάσεων.",
      },
      {
        id: "physiotherapy",
        title: "Προαιρετική αποκατάσταση",
        description: "Δυνατότητα πρόσθετης επιλογής με ξεχωριστούς όρους.",
      },
      {
        id: "simple",
        title: "Οικονομικός προσανατολισμός",
        description: "Σχεδιασμένο ως demo εναλλακτική χαμηλότερου κόστους.",
      },
    ],
    tradeOffs: [
      "Η έκταση δικτύου και τα όρια είναι πιο περιορισμένα.",
      "Πρόσθετες παροχές μπορεί να αυξάνουν το τελικό κόστος.",
    ],
    advisorConfirmations: [
      "Διαθέσιμα όρια νοσηλείας",
      "Περιεχόμενο προληπτικού ελέγχου",
      "Πρόσθετο κόστος προαιρετικών παροχών",
    ],
    networkExamples: [
      "Βασικό συνεργαζόμενο νοσοκομειακό δίκτυο",
      "Επιλεγμένα διαγνωστικά κέντρα",
      "Παιδιατρική υποστήριξη ανά περιοχή",
    ],
  },
] as const satisfies readonly MockInsuranceProgram[];

export function getProgramById(programId: string) {
  return mockProgramCatalog.find((program) => program.id === programId);
}
