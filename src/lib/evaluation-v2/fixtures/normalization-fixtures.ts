export const evaluationV2NormalizationFixtures = {
  metadata: {
    fixtureSetId: "im-health-evaluation-v2-normalization-fixtures-draft",
    status: "draft",
    runtimeActive: false,
    sourceAudit: "docs/insurance-evaluation-v2-product-evidence-audit.md",
    allowedSignals: [
      "low_deductible_or_copayment",
      "private_hospitalization",
      "surgery",
      "high_long_term_hospitalization_limit",
      "waiting_period_immediate_use",
      "provider_network_freedom",
    ],
    blockedSignals: [
      "emergency",
      "serious_illness",
      "outpatient_visits",
      "diagnostics_checkup",
      "international_coverage",
      "maternity",
      "physiotherapy_rehabilitation",
      "pediatric_coverage",
      "existing_policy_context",
      "evaluation_goal",
    ],
    activationBoundary: {
      fixtureOnly: true,
      normalizationEngineImplemented: false,
      runtimeIntegrationAllowed: false,
      scoringImplementationAllowed: false,
      v2DraftOnly: true,
    },
  },
  cases: [
    {
      caseId: "allowed-low-deductible-positive",
      kind: "allowed_signal",
      signalFocus: "low_deductible_or_copayment",
      variant: "positive",
      description: "Low deductible preference with explicit 300 EUR deductible evidence.",
      selectedAnswers: {
        priorities: ["low-deductible"],
        deductible: "minimum",
      },
      productEvidenceShape: {
        deductibleRules: ["Deductible: 300 EUR per hospitalization incident."],
        coverageFacts: ["Hospitalization includes 10% participation up to 300 EUR."],
      },
      expectedNormalizedSignals: [
        {
          signalId: "low_deductible_or_copayment",
          evidenceState: "sufficient",
          safetyStatus: "scoreable_now",
          scoreableForThisSlice: true,
        },
      ],
      expectedWarnings: [],
      mustNotClaim: [
        "Do not promise final out-of-pocket cost.",
        "Do not infer premium savings from the deductible preference alone.",
      ],
    },
    {
      caseId: "allowed-low-deductible-partial",
      kind: "allowed_signal",
      signalFocus: "low_deductible_or_copayment",
      variant: "partial",
      description: "Low deductible preference with vague low participation wording but no exact amount.",
      selectedAnswers: {
        priorities: ["low-deductible"],
        deductible: "minimum",
      },
      productEvidenceShape: {
        deductibleRules: ["Low participation applies according to the selected benefit schedule."],
      },
      expectedNormalizedSignals: [
        {
          signalId: "low_deductible_or_copayment",
          evidenceState: "partial",
          safetyStatus: "scoreable_with_penalty",
          scoreableForThisSlice: true,
        },
      ],
      expectedWarnings: ["Exact deductible or copayment amount is not structured."],
      mustNotClaim: [
        "Do not classify participation as low without an exact amount or approved band.",
      ],
    },
    {
      caseId: "allowed-low-deductible-ambiguous",
      kind: "allowed_signal",
      signalFocus: "low_deductible_or_copayment",
      variant: "ambiguous",
      description: "Low deductible preference with mixed percentage and amount wording that stays ambiguous.",
      selectedAnswers: {
        priorities: ["low-deductible"],
        deductible: "minimum",
      },
      productEvidenceShape: {
        monetaryFacts: ["Coverage 80% with participation 500 EUR depending on the incident."],
      },
      expectedNormalizedSignals: [
        {
          signalId: "low_deductible_or_copayment",
          evidenceState: "ambiguous",
          safetyStatus: "scoreable_with_penalty",
          scoreableForThisSlice: true,
        },
      ],
      expectedWarnings: ["Mixed deductible and percentage wording needs advisor confirmation."],
      mustNotClaim: [
        "Do not normalize ambiguous mixed-number text into a definite low deductible.",
      ],
    },
    {
      caseId: "allowed-private-hospitalization-positive",
      kind: "allowed_signal",
      signalFocus: "private_hospitalization",
      variant: "positive",
      description: "Private hospitalization priority with explicit private-network inpatient access.",
      selectedAnswers: {
        priorities: ["hospital-network"],
      },
      productEvidenceShape: {
        coverageFacts: [
          "Private inpatient hospitalization benefit in partner private hospitals.",
        ],
        providerNetworks: ["Partner private hospital network active in Greece."],
      },
      expectedNormalizedSignals: [
        {
          signalId: "private_hospitalization",
          evidenceState: "sufficient",
          safetyStatus: "scoreable_with_penalty",
          scoreableForThisSlice: true,
        },
      ],
      expectedWarnings: ["Direct access mode still needs confirmation unless reimbursement terms are explicit."],
      mustNotClaim: [
        "Do not imply unrestricted network freedom from private hospitalization evidence alone.",
      ],
    },
    {
      caseId: "allowed-private-hospitalization-partial",
      kind: "allowed_signal",
      signalFocus: "private_hospitalization",
      variant: "partial",
      description: "Hospitalization evidence exists but private-network access is only implied by general network text.",
      selectedAnswers: {
        priorities: ["hospital-network"],
      },
      productEvidenceShape: {
        coverageFacts: ["Hospitalization benefit available in cooperating facilities."],
        providerNetworks: ["Network list available on request."],
      },
      expectedNormalizedSignals: [
        {
          signalId: "private_hospitalization",
          evidenceState: "partial",
          safetyStatus: "scoreable_with_penalty",
          scoreableForThisSlice: true,
        },
      ],
      expectedWarnings: ["Private-hospital access is not explicitly structured."],
      mustNotClaim: [
        "Do not claim private hospitalization access from generic cooperating-facility wording.",
      ],
    },
    {
      caseId: "allowed-private-hospitalization-ambiguous",
      kind: "allowed_signal",
      signalFocus: "private_hospitalization",
      variant: "ambiguous",
      description: "Hospitalization wording exists with no clear inpatient/private distinction.",
      selectedAnswers: {
        priorities: ["hospital-network"],
      },
      productEvidenceShape: {
        coverageFacts: ["Medical care support according to policy terms."],
      },
      expectedNormalizedSignals: [
        {
          signalId: "private_hospitalization",
          evidenceState: "ambiguous",
          safetyStatus: "scoreable_with_penalty",
          scoreableForThisSlice: true,
        },
      ],
      expectedWarnings: ["Private inpatient access is not explicit."],
      mustNotClaim: [
        "Do not normalize generic care support into private hospitalization coverage.",
      ],
    },
    {
      caseId: "allowed-surgery-positive",
      kind: "allowed_signal",
      signalFocus: "surgery",
      variant: "positive",
      description: "Surgery priority with explicit surgery coverage and surgeon-fee record.",
      selectedAnswers: {
        priorities: ["surgery"],
      },
      productEvidenceShape: {
        coverageFacts: ["Surgery and operating room charges are covered in partner hospitals."],
        procedureFees: ["Surgeon fee: 4550 EUR for major procedure."],
      },
      expectedNormalizedSignals: [
        {
          signalId: "surgery",
          evidenceState: "sufficient",
          safetyStatus: "scoreable_with_penalty",
          scoreableForThisSlice: true,
        },
      ],
      expectedWarnings: ["Post-surgery conditions may still require confirmation."],
      mustNotClaim: [
        "Do not imply serious illness coverage from surgery benefit evidence.",
      ],
    },
    {
      caseId: "allowed-surgery-partial",
      kind: "allowed_signal",
      signalFocus: "surgery",
      variant: "partial",
      description: "Surgery priority with only procedure-fee evidence and no full benefit scope.",
      selectedAnswers: {
        priorities: ["surgery"],
      },
      productEvidenceShape: {
        procedureFees: ["Surgeon fee schedule exists for selected procedures."],
      },
      expectedNormalizedSignals: [
        {
          signalId: "surgery",
          evidenceState: "partial",
          safetyStatus: "scoreable_with_penalty",
          scoreableForThisSlice: true,
        },
      ],
      expectedWarnings: ["Procedure fee evidence alone does not prove full surgery benefit scope."],
      mustNotClaim: [
        "Do not claim complete surgery coverage from fee schedule evidence alone.",
      ],
    },
    {
      caseId: "allowed-surgery-ambiguous",
      kind: "allowed_signal",
      signalFocus: "surgery",
      variant: "ambiguous",
      description: "Surgery priority with generic hospitalization text and no named surgery terms.",
      selectedAnswers: {
        priorities: ["surgery"],
      },
      productEvidenceShape: {
        coverageFacts: ["Hospital treatment expenses are covered according to terms."],
      },
      expectedNormalizedSignals: [
        {
          signalId: "surgery",
          evidenceState: "ambiguous",
          safetyStatus: "scoreable_with_penalty",
          scoreableForThisSlice: true,
        },
      ],
      expectedWarnings: ["Surgery wording is not explicit."],
      mustNotClaim: [
        "Do not infer surgery benefit from generic hospitalization wording.",
      ],
    },
    {
      caseId: "allowed-high-limit-positive",
      kind: "allowed_signal",
      signalFocus: "high_long_term_hospitalization_limit",
      variant: "positive",
      description: "High-limit priority with explicit annual hospitalization limit and ICU support text.",
      selectedAnswers: {
        priorities: ["high-limit"],
      },
      productEvidenceShape: {
        monetaryFacts: ["Annual hospitalization limit: 500000 EUR."],
        coverageFacts: ["ICU and long-stay hospitalization support within the annual benefit limit."],
      },
      expectedNormalizedSignals: [
        {
          signalId: "high_long_term_hospitalization_limit",
          evidenceState: "sufficient",
          safetyStatus: "scoreable_with_penalty",
          scoreableForThisSlice: true,
        },
      ],
      expectedWarnings: ["Lifetime-limit confirmation may still be separate from annual limit evidence."],
      mustNotClaim: [
        "Do not claim unlimited cover unless the evidence says unlimited.",
      ],
    },
    {
      caseId: "allowed-high-limit-partial",
      kind: "allowed_signal",
      signalFocus: "high_long_term_hospitalization_limit",
      variant: "partial",
      description: "High-limit priority with annual limit text but no clear long-stay or ICU context.",
      selectedAnswers: {
        priorities: ["high-limit"],
      },
      productEvidenceShape: {
        monetaryFacts: ["Annual hospitalization limit: 100000 EUR."],
      },
      expectedNormalizedSignals: [
        {
          signalId: "high_long_term_hospitalization_limit",
          evidenceState: "partial",
          safetyStatus: "scoreable_with_penalty",
          scoreableForThisSlice: true,
        },
      ],
      expectedWarnings: ["Long-stay and ICU support are not explicit."],
      mustNotClaim: [
        "Do not equate an annual limit with proven long-term hospitalization adequacy.",
      ],
    },
    {
      caseId: "allowed-high-limit-ambiguous",
      kind: "allowed_signal",
      signalFocus: "high_long_term_hospitalization_limit",
      variant: "ambiguous",
      description: "High-limit priority with vague strong protection copy and no numeric limit.",
      selectedAnswers: {
        priorities: ["high-limit"],
      },
      productEvidenceShape: {
        coverageFacts: ["Strong financial protection for demanding hospitalization cases."],
      },
      expectedNormalizedSignals: [
        {
          signalId: "high_long_term_hospitalization_limit",
          evidenceState: "ambiguous",
          safetyStatus: "scoreable_with_penalty",
          scoreableForThisSlice: true,
        },
      ],
      expectedWarnings: ["No numeric or approved high-limit band exists."],
      mustNotClaim: [
        "Do not normalize strong-protection wording into a high limit without explicit amount or band.",
      ],
    },
    {
      caseId: "allowed-waiting-period-positive",
      kind: "allowed_signal",
      signalFocus: "waiting_period_immediate_use",
      variant: "positive",
      description: "Immediate-use need with explicit short waiting-period evidence.",
      selectedAnswers: {
        additionalNeeds: ["immediate_use"],
      },
      productEvidenceShape: {
        waitingPeriods: ["Waiting period: 15 days for hospitalization after accident."],
      },
      expectedNormalizedSignals: [
        {
          signalId: "waiting_period_immediate_use",
          evidenceState: "sufficient",
          safetyStatus: "scoreable_with_penalty",
          scoreableForThisSlice: true,
        },
      ],
      expectedWarnings: ["The short waiting period may apply only to selected triggers."],
      mustNotClaim: [
        "Do not claim immediate use across all coverages from one short waiting-period record.",
      ],
    },
    {
      caseId: "allowed-waiting-period-partial",
      kind: "allowed_signal",
      signalFocus: "waiting_period_immediate_use",
      variant: "partial",
      description: "Immediate-use need with generic waiting-period evidence not bound to the requested coverage.",
      selectedAnswers: {
        additionalNeeds: ["immediate_use"],
      },
      productEvidenceShape: {
        waitingPeriods: ["Waiting period applies according to the selected service."],
      },
      expectedNormalizedSignals: [
        {
          signalId: "waiting_period_immediate_use",
          evidenceState: "partial",
          safetyStatus: "scoreable_with_penalty",
          scoreableForThisSlice: true,
        },
      ],
      expectedWarnings: ["Waiting period is not mapped to a specific coverage."],
      mustNotClaim: [
        "Do not normalize generic waiting wording into immediate-use support.",
      ],
    },
    {
      caseId: "allowed-waiting-period-ambiguous",
      kind: "allowed_signal",
      signalFocus: "waiting_period_immediate_use",
      variant: "ambiguous",
      description: "Immediate-use need with contradictory waiting and exception wording.",
      selectedAnswers: {
        additionalNeeds: ["immediate_use"],
      },
      productEvidenceShape: {
        waitingPeriods: ["Waiting period may be waived in selected cases after approval."],
      },
      expectedNormalizedSignals: [
        {
          signalId: "waiting_period_immediate_use",
          evidenceState: "ambiguous",
          safetyStatus: "scoreable_with_penalty",
          scoreableForThisSlice: true,
        },
      ],
      expectedWarnings: ["Waiver language is conditional and not deterministic."],
      mustNotClaim: [
        "Do not claim no waiting period from conditional waiver language.",
      ],
    },
    {
      caseId: "allowed-provider-network-positive",
      kind: "allowed_signal",
      signalFocus: "provider_network_freedom",
      variant: "positive",
      description: "Provider freedom need with explicit broad partner network and reimbursement outside network.",
      selectedAnswers: {
        additionalNeeds: ["provider_freedom"],
      },
      productEvidenceShape: {
        providerNetworks: ["Broad partner hospital and doctor network across Greece."],
        coverageFacts: ["Reimbursement outside the network is allowed according to the plan."],
      },
      expectedNormalizedSignals: [
        {
          signalId: "provider_network_freedom",
          evidenceState: "sufficient",
          safetyStatus: "scoreable_with_penalty",
          scoreableForThisSlice: true,
        },
      ],
      expectedWarnings: ["Reimbursement conditions outside the network may still require detail review."],
      mustNotClaim: [
        "Do not imply unrestricted provider freedom without explicit outside-network terms.",
      ],
    },
    {
      caseId: "allowed-provider-network-partial",
      kind: "allowed_signal",
      signalFocus: "provider_network_freedom",
      variant: "partial",
      description: "Provider freedom need with provider-network records but no open-network or outside-network wording.",
      selectedAnswers: {
        additionalNeeds: ["provider_freedom"],
      },
      productEvidenceShape: {
        providerNetworks: ["Contracted hospital network active in major cities."],
      },
      expectedNormalizedSignals: [
        {
          signalId: "provider_network_freedom",
          evidenceState: "partial",
          safetyStatus: "scoreable_with_penalty",
          scoreableForThisSlice: true,
        },
      ],
      expectedWarnings: ["Network existence does not prove network freedom."],
      mustNotClaim: [
        "Do not normalize contracted network presence into provider freedom.",
      ],
    },
    {
      caseId: "allowed-provider-network-ambiguous",
      kind: "allowed_signal",
      signalFocus: "provider_network_freedom",
      variant: "ambiguous",
      description: "Provider freedom need with generic access copy and no structured network breadth.",
      selectedAnswers: {
        additionalNeeds: ["provider_freedom"],
      },
      productEvidenceShape: {
        coverageFacts: ["Access to selected providers according to policy terms."],
      },
      expectedNormalizedSignals: [
        {
          signalId: "provider_network_freedom",
          evidenceState: "ambiguous",
          safetyStatus: "scoreable_with_penalty",
          scoreableForThisSlice: true,
        },
      ],
      expectedWarnings: ["Provider access wording is too generic to prove freedom."],
      mustNotClaim: [
        "Do not claim open network or provider freedom from generic access wording.",
      ],
    },
    {
      caseId: "cross-low-deductible-high-limit",
      kind: "cross_signal",
      signalFocus: "low_deductible_or_copayment",
      variant: "cross",
      description: "Low deductible and high limit selected together with explicit numeric evidence for both.",
      selectedAnswers: {
        priorities: ["low-deductible", "high-limit"],
        deductible: "minimum",
      },
      productEvidenceShape: {
        deductibleRules: ["Deductible: 250 EUR per incident."],
        monetaryFacts: ["Annual hospitalization limit: 250000 EUR."],
      },
      expectedNormalizedSignals: [
        {
          signalId: "low_deductible_or_copayment",
          evidenceState: "sufficient",
          safetyStatus: "scoreable_now",
          scoreableForThisSlice: true,
        },
        {
          signalId: "high_long_term_hospitalization_limit",
          evidenceState: "sufficient",
          safetyStatus: "scoreable_with_penalty",
          scoreableForThisSlice: true,
        },
      ],
      expectedWarnings: ["High-limit support is still not proof of unlimited or lifetime cover."],
      mustNotClaim: [
        "Do not convert high annual limit into unlimited cover.",
      ],
    },
    {
      caseId: "cross-surgery-high-limit-overlap",
      kind: "cross_signal",
      signalFocus: "surgery",
      variant: "cross",
      description: "Surgery and high limit selected together with overlapping hospitalization evidence.",
      selectedAnswers: {
        priorities: ["surgery", "high-limit"],
      },
      productEvidenceShape: {
        coverageFacts: [
          "Surgery, ICU support, and high annual hospitalization limit are included.",
        ],
        procedureFees: ["Major procedure fee schedule available."],
        monetaryFacts: ["Annual hospitalization limit: 300000 EUR."],
      },
      expectedNormalizedSignals: [
        {
          signalId: "surgery",
          evidenceState: "partial",
          safetyStatus: "scoreable_with_penalty",
          scoreableForThisSlice: true,
        },
        {
          signalId: "high_long_term_hospitalization_limit",
          evidenceState: "partial",
          safetyStatus: "scoreable_with_penalty",
          scoreableForThisSlice: true,
        },
      ],
      expectedWarnings: ["Overlap-cap note: one hospitalization fact must not double-claim both signals without control."],
      mustNotClaim: [
        "Do not collapse surgery and high-limit support into one unqualified strength claim.",
      ],
    },
    {
      caseId: "cross-private-hospitalization-provider-freedom",
      kind: "cross_signal",
      signalFocus: "private_hospitalization",
      variant: "cross",
      description: "Private hospitalization and provider freedom selected together with a contracted network only.",
      selectedAnswers: {
        priorities: ["hospital-network"],
        additionalNeeds: ["provider_freedom"],
      },
      productEvidenceShape: {
        coverageFacts: ["Private hospitalization in contracted hospitals."],
        providerNetworks: ["Contracted hospital network in major cities."],
      },
      expectedNormalizedSignals: [
        {
          signalId: "private_hospitalization",
          evidenceState: "sufficient",
          safetyStatus: "scoreable_with_penalty",
          scoreableForThisSlice: true,
        },
        {
          signalId: "provider_network_freedom",
          evidenceState: "partial",
          safetyStatus: "scoreable_with_penalty",
          scoreableForThisSlice: true,
        },
      ],
      expectedWarnings: ["Contracted private network does not by itself prove provider freedom."],
      mustNotClaim: [
        "Do not equate private hospitalization access with open provider choice.",
      ],
    },
    {
      caseId: "cross-waiting-period-missing-evidence",
      kind: "cross_signal",
      signalFocus: "waiting_period_immediate_use",
      variant: "cross",
      description: "Immediate-use need with no waiting-period records present.",
      selectedAnswers: {
        additionalNeeds: ["immediate_use"],
      },
      productEvidenceShape: {
        waitingPeriods: [],
        coverageFacts: ["Hospitalization benefit available according to policy terms."],
      },
      expectedNormalizedSignals: [
        {
          signalId: "waiting_period_immediate_use",
          evidenceState: "missing",
          safetyStatus: "scoreable_with_penalty",
          scoreableForThisSlice: true,
        },
      ],
      expectedWarnings: ["Missing waiting-period evidence requires penalty and advisor confirmation."],
      mustNotClaim: [
        "Do not claim immediate use when waiting-period evidence is missing.",
      ],
    },
    {
      caseId: "cross-allowed-plus-blocked-outpatient",
      kind: "cross_signal",
      signalFocus: "low_deductible_or_copayment",
      variant: "cross",
      description: "Allowed low deductible signal selected together with blocked outpatient visits.",
      selectedAnswers: {
        priorities: ["low-deductible"],
        deductible: "minimum",
        additionalNeeds: ["outpatient_visits"],
      },
      productEvidenceShape: {
        deductibleRules: ["Deductible: 200 EUR per incident."],
        coverageFacts: ["General outpatient support according to network terms."],
      },
      expectedNormalizedSignals: [
        {
          signalId: "low_deductible_or_copayment",
          evidenceState: "sufficient",
          safetyStatus: "scoreable_now",
          scoreableForThisSlice: true,
        },
        {
          signalId: "outpatient_visits",
          evidenceState: "ambiguous",
          safetyStatus: "advisor_confirmation_only",
          scoreableForThisSlice: false,
        },
      ],
      expectedWarnings: ["Blocked outpatient signal must stay advisor_confirmation_only in this slice."],
      mustNotClaim: [
        "Do not promote blocked outpatient visits into a scoreable signal in Phase 2 fixtures.",
      ],
    },
    {
      caseId: "blocked-emergency-negative",
      kind: "blocked_signal",
      signalFocus: "emergency",
      variant: "blocked",
      description: "Emergency selected with generic hospitalization text only.",
      selectedAnswers: {
        priorities: ["emergency"],
      },
      productEvidenceShape: {
        coverageFacts: ["Hospitalization support according to policy terms."],
      },
      expectedNormalizedSignals: [
        {
          signalId: "emergency",
          evidenceState: "ambiguous",
          safetyStatus: "advisor_confirmation_only",
          scoreableForThisSlice: false,
        },
      ],
      expectedWarnings: ["Emergency remains blocked for scoring in this slice."],
      mustNotClaim: ["Do not infer emergency coverage from generic hospitalization wording."],
    },
    {
      caseId: "blocked-serious-illness-negative",
      kind: "blocked_signal",
      signalFocus: "serious_illness",
      variant: "blocked",
      description: "Serious illness selected with oncology-like wording but no structured severe-condition field.",
      selectedAnswers: {
        priorities: ["serious-illness"],
      },
      productEvidenceShape: {
        coverageFacts: ["Major hospitalization support for difficult medical cases."],
      },
      expectedNormalizedSignals: [
        {
          signalId: "serious_illness",
          evidenceState: "partial",
          safetyStatus: "advisor_confirmation_only",
          scoreableForThisSlice: false,
        },
      ],
      expectedWarnings: ["Serious illness remains blocked until dedicated product fields exist."],
      mustNotClaim: ["Do not normalize serious illness as a scoreable signal from generic major-case wording."],
    },
    {
      caseId: "blocked-outpatient-negative",
      kind: "blocked_signal",
      signalFocus: "outpatient_visits",
      variant: "blocked",
      description: "Outpatient visits selected with only generic outpatient support text.",
      selectedAnswers: {
        additionalNeeds: ["outpatient_visits"],
      },
      productEvidenceShape: {
        coverageFacts: ["Outpatient support according to policy terms."],
      },
      expectedNormalizedSignals: [
        {
          signalId: "outpatient_visits",
          evidenceState: "ambiguous",
          safetyStatus: "advisor_confirmation_only",
          scoreableForThisSlice: false,
        },
      ],
      expectedWarnings: ["Doctor-visit evidence is not structured enough for scoring."],
      mustNotClaim: ["Do not collapse outpatient doctor visits into a scoreable generic outpatient signal."],
    },
    {
      caseId: "blocked-diagnostics-negative",
      kind: "blocked_signal",
      signalFocus: "diagnostics_checkup",
      variant: "blocked",
      description: "Diagnostics/check-up selected with vague prevention wording only.",
      selectedAnswers: {
        additionalNeeds: ["prevention_checkup"],
      },
      productEvidenceShape: {
        coverageFacts: ["Preventive care support according to the selected plan."],
      },
      expectedNormalizedSignals: [
        {
          signalId: "diagnostics_checkup",
          evidenceState: "ambiguous",
          safetyStatus: "advisor_confirmation_only",
          scoreableForThisSlice: false,
        },
      ],
      expectedWarnings: ["Diagnostics and check-up remain blocked until structured coverage fields expand."],
      mustNotClaim: ["Do not claim diagnostics or annual check-up support from generic prevention wording."],
    },
    {
      caseId: "blocked-international-negative",
      kind: "blocked_signal",
      signalFocus: "international_coverage",
      variant: "blocked",
      description: "International coverage selected with vague abroad wording only.",
      selectedAnswers: {
        additionalNeeds: ["frequent_travel"],
      },
      productEvidenceShape: {
        coverageFacts: ["Support may apply abroad according to policy conditions."],
      },
      expectedNormalizedSignals: [
        {
          signalId: "international_coverage",
          evidenceState: "ambiguous",
          safetyStatus: "advisor_confirmation_only",
          scoreableForThisSlice: false,
        },
      ],
      expectedWarnings: ["Territory and treatment scope are not explicit."],
      mustNotClaim: ["Do not claim international coverage without explicit territory and scope evidence."],
    },
    {
      caseId: "blocked-maternity-negative",
      kind: "blocked_signal",
      signalFocus: "maternity",
      variant: "blocked",
      description: "Maternity selected with family-oriented wording and no maternity sub-benefit structure.",
      selectedAnswers: {
        additionalNeeds: ["maternity"],
      },
      productEvidenceShape: {
        coverageFacts: ["Family support benefit available according to the plan."],
        waitingPeriods: ["Waiting period applies according to service category."],
      },
      expectedNormalizedSignals: [
        {
          signalId: "maternity",
          evidenceState: "partial",
          safetyStatus: "advisor_confirmation_only",
          scoreableForThisSlice: false,
        },
      ],
      expectedWarnings: ["Maternity remains blocked until structured maternity evidence exists."],
      mustNotClaim: ["Do not imply maternity coverage or immediate maternity use from family-oriented text."],
    },
    {
      caseId: "blocked-physiotherapy-negative",
      kind: "blocked_signal",
      signalFocus: "physiotherapy_rehabilitation",
      variant: "blocked",
      description: "Physiotherapy selected with generic rehabilitation reference only.",
      selectedAnswers: {
        additionalNeeds: ["physiotherapy"],
      },
      productEvidenceShape: {
        supplementaryBenefits: ["Rehabilitation support according to selected terms."],
      },
      expectedNormalizedSignals: [
        {
          signalId: "physiotherapy_rehabilitation",
          evidenceState: "partial",
          safetyStatus: "advisor_confirmation_only",
          scoreableForThisSlice: false,
        },
      ],
      expectedWarnings: ["Session limits and trigger rules are not explicit."],
      mustNotClaim: ["Do not normalize physiotherapy or rehabilitation as scoreable without structured session evidence."],
    },
    {
      caseId: "blocked-pediatric-negative",
      kind: "blocked_signal",
      signalFocus: "pediatric_coverage",
      variant: "blocked",
      description: "Pediatric coverage selected with family copy but no structured child eligibility or pediatric benefit field.",
      selectedAnswers: {
        insuredPeople: "family",
        additionalNeeds: ["young_children"],
      },
      productEvidenceShape: {
        coverageFacts: ["Family-oriented support in cooperating facilities."],
      },
      expectedNormalizedSignals: [
        {
          signalId: "pediatric_coverage",
          evidenceState: "ambiguous",
          safetyStatus: "advisor_confirmation_only",
          scoreableForThisSlice: false,
        },
      ],
      expectedWarnings: ["Pediatric benefit scope and child eligibility remain unresolved."],
      mustNotClaim: ["Do not claim pediatric coverage from family-oriented copy."],
    },
    {
      caseId: "blocked-existing-policy-context-negative",
      kind: "blocked_signal",
      signalFocus: "existing_policy_context",
      variant: "blocked",
      description: "Existing policy comparison context selected with uploaded policy snapshot present.",
      selectedAnswers: {
        currentInsurance: "individual",
      },
      productEvidenceShape: {
        policyContext: ["Current policy snapshot available for comparison only."],
      },
      expectedNormalizedSignals: [
        {
          signalId: "existing_policy_context",
          evidenceState: "sufficient",
          safetyStatus: "not_rankable",
          scoreableForThisSlice: false,
        },
      ],
      expectedWarnings: ["Existing policy context must never become proposed-product evidence."],
      mustNotClaim: ["Do not convert current policy advantages into proposed-product scoreable evidence."],
    },
    {
      caseId: "blocked-evaluation-goal-negative",
      kind: "blocked_signal",
      signalFocus: "evaluation_goal",
      variant: "blocked",
      description: "Evaluation goal selected for compare-existing workflow.",
      selectedAnswers: {
        evaluationGoal: "compare-existing",
      },
      productEvidenceShape: {
        policyContext: ["Customer goal is comparison, not product evidence."],
      },
      expectedNormalizedSignals: [
        {
          signalId: "evaluation_goal",
          evidenceState: "sufficient",
          safetyStatus: "not_rankable",
          scoreableForThisSlice: false,
        },
      ],
      expectedWarnings: ["Evaluation goal is context only in this slice."],
      mustNotClaim: ["Do not treat evaluation goal as product evidence or a scoreable coverage signal."],
    },
  ],
} as const;
