export const versionBaseline = Object.freeze({
  questionnaireContractVersion: "im-health-assessment-2026-07-v1",
  assessmentSubmissionVersion: 4,
  legacyEvaluation: Object.freeze({
    rulesetId: "22222222-2222-4222-8222-222222222222",
    rulesetVersion: "2026-07-v1-draft",
  }),
  // Legacy v1 exposes neither a product dataset version nor a content hash.
  productDatasetSnapshotId: null,
});

export const questionnaireV1 = Object.freeze({
  activeQuestionIds: Object.freeze([
    "Q_INSURED_PEOPLE",
    "Q_BIRTH_DATES",
    "Q_EXISTING_INSURANCE",
    "Q_EXISTING_POLICY_UPLOAD",
    "Q_EVALUATION_GOAL",
    "Q_PRIORITIES",
    "Q_DEDUCTIBLE_PREFERENCE",
    "Q_PROTECTION_COST",
    "Q_ADDITIONAL_NEEDS",
  ]),
  frontend: Object.freeze({
    insuredPeople: Object.freeze({
      questionId: "Q_INSURED_PEOPLE",
      required: true,
      values: Object.freeze({
        self: "self",
        "self-partner": "self_spouse",
        family: "family",
        children: "child",
      }),
    }),
    birthDates: Object.freeze({
      questionId: "Q_BIRTH_DATES",
      required: true,
      values: null,
    }),
    currentInsurance: Object.freeze({
      questionId: "Q_EXISTING_INSURANCE",
      required: true,
      values: Object.freeze({
        none: "none",
        individual: "individual",
        group: "employer_group",
        "individual-group": "individual_and_group",
      }),
    }),
    policyUpload: Object.freeze({
      questionId: "Q_EXISTING_POLICY_UPLOAD",
      required: false,
      values: null,
    }),
    evaluationGoal: Object.freeze({
      questionId: "Q_EVALUATION_GOAL",
      required: true,
      values: Object.freeze({
        first_time: "first_time",
        independent_from_employer: "independent_from_employer",
        evaluate_existing: "evaluate_existing",
        improve_value: "improve_value",
      }),
    }),
    priorities: Object.freeze({
      questionId: "Q_PRIORITIES",
      required: true,
      minimumSelections: 1,
      maximumSelections: 3,
      values: Object.freeze({
        "hospital-network": "private_hospitals",
        "low-deductible": "low_or_zero_deductible",
        outpatient: "outpatient_doctors_diagnostics",
        "high-limit": "major_hospitalization",
        emergency: "emergency",
        checkup: "prevention_checkup",
        abroad: "international",
        pediatric: "pediatric",
      }),
    }),
    deductible: Object.freeze({
      questionId: "Q_DEDUCTIBLE_PREFERENCE",
      required: true,
      values: Object.freeze({
        minimum: "minimum",
        small: "balanced",
        large: "higher_for_lower_premium",
      }),
    }),
    costApproach: Object.freeze({
      questionId: "Q_PROTECTION_COST",
      required: true,
      values: Object.freeze({
        complete: "maximum_protection",
        balanced: "balanced",
        basic: "essential_lower_cost",
      }),
    }),
    additionalNeeds: Object.freeze({
      questionId: "Q_ADDITIONAL_NEEDS",
      required: false,
      values: Object.freeze({
        frequent_travel: "frequent_travel",
        immediate_use: "immediate_use",
        maternity: "maternity",
        young_children: "young_children",
        physiotherapy: "physiotherapy",
        prevention_checkup: "prevention_checkup",
        provider_freedom: "provider_freedom",
        low_bureaucracy: "low_bureaucracy",
      }),
    }),
  }),
  memberLimits: Object.freeze({ uiAndSession: 8, databaseContract: 10 }),
});

export const optionSignalBaseline = Object.freeze({
  Q_INSURED_PEOPLE: Object.freeze({
    self: Object.freeze([]),
    self_spouse: Object.freeze([]),
    family: Object.freeze([{ signal: "pediatric", weight: 0.6 }]),
    child: Object.freeze([{ signal: "pediatric", weight: 1.2 }]),
  }),
  Q_EXISTING_INSURANCE: Object.freeze({
    none: Object.freeze([]),
    individual: Object.freeze([]),
    employer_group: Object.freeze([
      { signal: "continuity_independent", weight: 0.8 },
    ]),
    individual_and_group: Object.freeze([
      { signal: "continuity_independent", weight: 0.5 },
    ]),
  }),
  Q_EVALUATION_GOAL: Object.freeze({
    first_time: Object.freeze([{ signal: "first_time_guidance", weight: 1 }]),
    independent_from_employer: Object.freeze([
      { signal: "continuity_independent", weight: 1.2 },
    ]),
    evaluate_existing: Object.freeze([
      { signal: "existing_policy_comparison", weight: 1 },
    ]),
    improve_value: Object.freeze([{ signal: "balanced_value", weight: 1 }]),
  }),
  Q_PRIORITIES: Object.freeze({
    private_hospitals: Object.freeze([
      { signal: "private_hospitals", weight: 1.4 },
    ]),
    low_or_zero_deductible: Object.freeze([
      { signal: "low_deductible", weight: 1.4 },
    ]),
    outpatient_doctors_diagnostics: Object.freeze([
      { signal: "outpatient", weight: 1.3 },
    ]),
    major_hospitalization: Object.freeze([
      { signal: "major_hospitalization", weight: 1.4 },
    ]),
    emergency: Object.freeze([{ signal: "emergency", weight: 1.2 }]),
    prevention_checkup: Object.freeze([{ signal: "prevention", weight: 1 }]),
    international: Object.freeze([{ signal: "international", weight: 1.2 }]),
    pediatric: Object.freeze([{ signal: "pediatric", weight: 1.4 }]),
  }),
  Q_DEDUCTIBLE_PREFERENCE: Object.freeze({
    minimum: Object.freeze([{ signal: "low_deductible", weight: 1.3 }]),
    balanced: Object.freeze([
      { signal: "deductible_flexibility", weight: 0.8 },
      { signal: "balanced_value", weight: 0.8 },
    ]),
    higher_for_lower_premium: Object.freeze([
      { signal: "deductible_flexibility", weight: 1 },
      { signal: "essential_budget", weight: 1.2 },
    ]),
  }),
  Q_PROTECTION_COST: Object.freeze({
    maximum_protection: Object.freeze([
      { signal: "maximum_protection", weight: 1.5 },
    ]),
    balanced: Object.freeze([{ signal: "balanced_value", weight: 1.4 }]),
    essential_lower_cost: Object.freeze([
      { signal: "essential_budget", weight: 1.5 },
    ]),
  }),
  Q_ADDITIONAL_NEEDS: Object.freeze({
    frequent_travel: Object.freeze([{ signal: "international", weight: 1.2 }]),
    immediate_use: Object.freeze([
      { signal: "waiting_period_sensitivity", weight: 1 },
    ]),
    maternity: Object.freeze([{ signal: "maternity", weight: 1.3 }]),
    young_children: Object.freeze([{ signal: "pediatric", weight: 1.2 }]),
    physiotherapy: Object.freeze([{ signal: "physiotherapy", weight: 1.1 }]),
    prevention_checkup: Object.freeze([{ signal: "prevention", weight: 1.1 }]),
    provider_freedom: Object.freeze([{ signal: "provider_freedom", weight: 1.2 }]),
    low_bureaucracy: Object.freeze([{ signal: "low_bureaucracy", weight: 1.1 }]),
  }),
});

export const warningOnlySignals = Object.freeze([
  "existing_policy_comparison",
  "first_time_guidance",
  "waiting_period_sensitivity",
]);

export const activeRecommendationBaseline = Object.freeze({
  observedOn: "2026-07-16",
  productDatasetSnapshotId: null,
  categories: Object.freeze([
    "best-match",
    "premium-choice",
    "smart-budget-choice",
  ]),
  outcomes: Object.freeze([
    Object.freeze({ category: "best-match", programId: "GEN-MP", matchScore: 89 }),
    Object.freeze({ category: "premium-choice", programId: "GRO-SPR", matchScore: 77 }),
    Object.freeze({ category: "smart-budget-choice", programId: "GEN-MF", matchScore: 76 }),
  ]),
});

export const documentedLegacyFindings = Object.freeze([
  "UI/session member limit is 8 while the active DB contract allows 10.",
  "The mapper and recommendation request validator do not reject duplicate priorities; the mapper deduplicates them.",
  "The recommendation request validator is intentionally broader than the session and canonical DB validators.",
  "Minor derivation uses database current_date; characterization uses a controlled asOfDate.",
  "Missing product signals contribute zero while their user weights remain in the denominator.",
  "Overlapping signals are summed without a cap.",
  "self/self_spouse, none/individual, and adult birth dates have no direct scoring signal.",
  "first_time and evaluate_existing are warning-only and do not affect score or ranking.",
  "A policy snapshot adds comparison output after ranking and does not alter v1 scores or order.",
  "The product dataset has no exposed version or snapshot identifier in v1.",
]);
