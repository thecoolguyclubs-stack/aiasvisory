import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
export const projectRoot = resolve(scriptDirectory, "..");
export const artifactPath = resolve(
  projectRoot,
  "generated/insurance-evaluation-v2-rules.generated.ts",
);

export const ruleArtifact = {
  metadata: {
    ruleSetId: "im-health-insurance-evaluation-v2-draft",
    semanticVersion: "0.1.0-draft",
    status: "draft",
    runtimeActive: false,
    sourceDecisionMatrix: "docs/insurance-evaluation-v2-decision-matrix.md",
    sourceRulesSpec: "docs/insurance-evaluation-v2-rules.md",
    approvedBusinessGroups: [
      "eligibility",
      "scoring_weights",
      "missing_evidence",
      "overlap_caps",
      "categories",
      "existing_policy",
      "tie_breaks",
      "activation_gates",
    ],
    approvedWeightingDirection: {
      allInputsConsidered: true,
      strongerInitialEmphasisSteps: [
        "evaluationGoal",
        "priorities",
        "deductible",
        "additionalNeeds",
      ],
      consideredButNotMainEmphasisSteps: ["costApproach"],
      note: "Business-approved direction for future implementation design only; not a production scoring constant.",
    },
    generatedAtPolicy: "deterministic-static-no-current-timestamp",
  },
  questionnaireInputPolicy: [
    {
      stepId: "insuredPeople",
      role: ["eligibility", "scoring", "explanation", "advisor_confirmation"],
      considered: true,
      mainWeightEmphasis: false,
      signalsEmitted: ["insured_composition", "pediatric_context"],
      mustNotAffect: [
        "Must not imply pediatric coverage exists.",
        "Must not override age eligibility or product member limits.",
      ],
    },
    {
      stepId: "birthDates",
      role: ["eligibility", "explanation", "advisor_confirmation"],
      considered: true,
      mainWeightEmphasis: false,
      signalsEmitted: ["age_band", "age_limit_confirmation_required"],
      mustNotAffect: [
        "Must not create positive product fit by itself.",
        "Must not rank products by assumed premium.",
      ],
    },
    {
      stepId: "currentInsurance",
      role: ["scoring", "explanation", "advisor_confirmation", "context"],
      considered: true,
      mainWeightEmphasis: false,
      signalsEmitted: ["existing_policy_context"],
      mustNotAffect: [
        "Must not automatically make a product better.",
        "Must not treat group insurance as equivalent to individual lifetime coverage.",
      ],
    },
    {
      stepId: "evaluationGoal",
      role: ["scoring", "explanation", "advisor_confirmation", "context"],
      considered: true,
      mainWeightEmphasis: true,
      signalsEmitted: ["evaluation_goal", "existing_policy_context"],
      mustNotAffect: [
        "Must not change whether coverage exists.",
        "Must not override hard eligibility or product exclusions.",
      ],
    },
    {
      stepId: "priorities",
      role: ["eligibility", "scoring", "explanation", "advisor_confirmation"],
      considered: true,
      mainWeightEmphasis: true,
      signalsEmitted: [
        "private_hospitalization",
        "surgery",
        "emergency",
        "serious_illness",
        "high_long_term_hospitalization_limit",
        "low_deductible_or_copayment",
      ],
      mustNotAffect: [
        "Must not collapse surgery and serious illness in explanation.",
        "Must not imply unlimited cover unless evidence states it.",
      ],
    },
    {
      stepId: "deductible",
      role: ["scoring", "explanation", "advisor_confirmation"],
      considered: true,
      mainWeightEmphasis: true,
      signalsEmitted: ["low_deductible_or_copayment"],
      mustNotAffect: [
        "Must not claim premium savings.",
        "Must not infer deductible from category or price tier.",
      ],
    },
    {
      stepId: "costApproach",
      role: ["scoring", "category assignment", "explanation"],
      considered: true,
      mainWeightEmphasis: false,
      signalsEmitted: ["cost_protection_approach"],
      mustNotAffect: [
        "Must not assign a recommendation category by itself.",
        "Must not override hard mismatches in Step 5 priorities.",
      ],
    },
    {
      stepId: "additionalNeeds",
      role: ["eligibility", "scoring", "explanation", "advisor_confirmation"],
      considered: true,
      mainWeightEmphasis: true,
      signalsEmitted: [
        "outpatient_visits",
        "diagnostics_checkup",
        "international_coverage",
        "maternity",
        "physiotherapy_rehabilitation",
        "pediatric_coverage",
        "waiting_period_immediate_use",
        "provider_network_freedom",
      ],
      mustNotAffect: [
        "Must not collapse outpatient visits into diagnostics/check-up.",
        "Must not imply maternity, worldwide cover, or immediate use without evidence.",
      ],
    },
  ],
  signals: {
    private_hospitalization: {
      sourceSteps: ["priorities"],
      evidenceRequirements: ["private hospital access", "inpatient hospitalization benefit", "partner/private network"],
      scoringBand: "hard_priority",
      missingEvidenceBehavior: "penalty_and_advisor_confirmation",
      overclaimingGuardrail: "Do not infer private hospitalization from generic care wording.",
      explanationBoundary: "Use evidence-bound access wording only.",
    },
    surgery: {
      sourceSteps: ["priorities"],
      evidenceRequirements: ["surgery benefit", "operation coverage", "surgical fees", "operating room", "major procedure benefit"],
      scoringBand: "hard_priority_overlap_capped",
      missingEvidenceBehavior: "penalty_and_advisor_confirmation",
      overclaimingGuardrail: "Do not infer surgery from all hospitalization wording.",
      explanationBoundary: "Keep surgery distinct from serious illness and high-limit explanation.",
    },
    emergency: {
      sourceSteps: ["priorities"],
      evidenceRequirements: ["emergency hospitalization", "urgent admission", "emergency support"],
      scoringBand: "hard_priority",
      missingEvidenceBehavior: "penalty_and_advisor_confirmation",
      overclaimingGuardrail: "Do not claim ambulance or ER cover unless named.",
      explanationBoundary: "Use urgent-care wording only when evidence supports it.",
    },
    serious_illness: {
      sourceSteps: ["priorities"],
      evidenceRequirements: ["major hospitalization", "high-cost illness", "serious condition", "ICU/critical care", "critical illness evidence"],
      scoringBand: "hard_priority_overlap_capped",
      missingEvidenceBehavior: "penalty_and_advisor_confirmation",
      overclaimingGuardrail: "Do not treat serious illness as confirmed from generic hospitalization alone.",
      explanationBoundary: "Keep serious illness distinct from surgery and high-limit explanation.",
    },
    high_long_term_hospitalization_limit: {
      sourceSteps: ["priorities"],
      evidenceRequirements: ["annual/lifetime limit amount", "unlimited cover statement", "approved high-limit band", "ICU/long-stay evidence"],
      scoringBand: "hard_priority_overlap_capped",
      missingEvidenceBehavior: "penalty_and_advisor_confirmation",
      overclaimingGuardrail: "Do not claim high or unlimited limit without explicit evidence.",
      explanationBoundary: "State limit strength only from limit evidence.",
    },
    low_deductible_or_copayment: {
      sourceSteps: ["priorities", "deductible"],
      evidenceRequirements: ["amount", "0-500 EUR band", "zero deductible", "low copayment", "deductible waiver"],
      scoringBand: "deductible_preference",
      missingEvidenceBehavior: "zero_or_penalty_and_advisor_confirmation",
      overclaimingGuardrail: "Do not infer low participation from price tier.",
      explanationBoundary: "Do not promise final out-of-pocket cost.",
    },
    outpatient_visits: {
      sourceSteps: ["additionalNeeds"],
      evidenceRequirements: ["doctor visits", "outpatient consultation", "specialist visits", "visit network", "visit reimbursement"],
      scoringBand: "additional_need_distinct",
      missingEvidenceBehavior: "zero_or_near_zero_and_advisor_confirmation",
      overclaimingGuardrail: "Must remain distinct from diagnostics_checkup.",
      explanationBoundary: "Describe as doctor visits without hospitalization.",
    },
    diagnostics_checkup: {
      sourceSteps: ["additionalNeeds"],
      evidenceRequirements: ["diagnostic exams", "laboratory tests", "imaging", "annual check-up", "preventive screening"],
      scoringBand: "additional_need_distinct",
      missingEvidenceBehavior: "zero_or_near_zero_and_advisor_confirmation",
      overclaimingGuardrail: "Must remain distinct from outpatient_visits.",
      explanationBoundary: "Describe as diagnostics, imaging, lab tests, or preventive check-up.",
    },
    international_coverage: {
      sourceSteps: ["additionalNeeds"],
      evidenceRequirements: ["territory scope", "Europe/worldwide wording", "emergency abroad", "planned treatment abroad", "reimbursement abroad terms"],
      scoringBand: "additional_need",
      missingEvidenceBehavior: "zero_or_near_zero_and_advisor_confirmation",
      overclaimingGuardrail: "Do not claim worldwide cover unless evidence states it.",
      explanationBoundary: "State territory and treatment scope only when known.",
    },
    maternity: {
      sourceSteps: ["additionalNeeds"],
      evidenceRequirements: ["delivery", "caesarean", "pregnancy complications", "maternity allowance", "waiting periods", "pregnancy restrictions"],
      scoringBand: "additional_need_or_advisor_confirmation",
      missingEvidenceBehavior: "degrade_and_advisor_confirmation",
      overclaimingGuardrail: "Do not imply immediate maternity cover.",
      explanationBoundary: "Always surface waiting-period and eligibility confirmation.",
    },
    physiotherapy_rehabilitation: {
      sourceSteps: ["additionalNeeds"],
      evidenceRequirements: ["physiotherapy sessions", "rehabilitation", "post-accident therapy", "post-surgery therapy", "session limits"],
      scoringBand: "additional_need",
      missingEvidenceBehavior: "zero_or_near_zero_and_advisor_confirmation",
      overclaimingGuardrail: "Do not infer rehabilitation from generic outpatient cover.",
      explanationBoundary: "Mention session or trigger limits when available.",
    },
    pediatric_coverage: {
      sourceSteps: ["insuredPeople", "additionalNeeds"],
      evidenceRequirements: ["child eligibility", "pediatric doctors", "pediatric hospitalization", "dependant rules", "pediatric network"],
      scoringBand: "eligibility_context_and_additional_need",
      missingEvidenceBehavior: "degrade_or_advisor_confirmation",
      overclaimingGuardrail: "Do not imply child-only eligibility without evidence.",
      explanationBoundary: "Separate child eligibility from pediatric benefits.",
    },
    waiting_period_immediate_use: {
      sourceSteps: ["additionalNeeds"],
      evidenceRequirements: ["waiting-period table", "immediate cover wording", "reduced waiting period", "accident exception", "continuity rules"],
      scoringBand: "advisor_confirmation_sensitive",
      missingEvidenceBehavior: "advisor_confirmation_only_for_strong_claims",
      overclaimingGuardrail: "Do not claim no waiting period without exact evidence.",
      explanationBoundary: "Use confirmation wording unless explicit.",
    },
    provider_network_freedom: {
      sourceSteps: ["additionalNeeds"],
      evidenceRequirements: ["free choice of doctor/hospital", "broad network", "out-of-network reimbursement", "direct settlement options"],
      scoringBand: "additional_need_overlap_capped",
      missingEvidenceBehavior: "zero_or_near_zero_and_advisor_confirmation",
      overclaimingGuardrail: "Do not treat any network as freedom.",
      explanationBoundary: "State breadth or freedom only from network evidence.",
    },
    existing_policy_context: {
      sourceSteps: ["currentInsurance", "evaluationGoal", "optionalPdfEvidence"],
      evidenceRequirements: ["existing policy evidence", "confirmed gaps", "current policy advantages", "comparison unknowns"],
      scoringRole: "limited_context_and_tie_break",
      missingEvidenceBehavior: "no_penalty_for_first_time_or_no_pdf",
      overclaimingGuardrail: "Existing policy evidence must not be used as proposed-product evidence.",
      explanationBoundary: "Separate comparison from proposed-product strengths.",
    },
    evaluation_goal: {
      sourceSteps: ["evaluationGoal"],
      evidenceRequirements: ["selected evaluation goal"],
      scoringBand: "main_emphasis_context",
      missingEvidenceBehavior: "required_question_for_v2_scoring_design",
      overclaimingGuardrail: "Must not create coverage claims or override eligibility.",
      explanationBoundary: "Use only to frame guidance, continuity, comparison, or value-improvement context.",
    },
  },
  eligibilityRules: {
    excludeOnlyOnExplicitProductConflict: true,
    degrade: "Use when product remains eligible but evidence suggests weak fit or material missing data.",
    advisorConfirmation: "Use when eligibility or material coverage facts are unknown or incomplete.",
    pass: "Use only when no known eligibility blocker exists and enough evidence supports the relevant profile.",
    missingUnknownProductDataBehavior: "Missing or unknown data cannot create strong wording; route hard constraints to advisor confirmation and apply scoring penalty where approved.",
  },
  scoringPolicy: {
    mainWeightEmphasisSteps: ["evaluationGoal", "priorities", "deductible", "additionalNeeds"],
    consideredButNotMainEmphasisSteps: ["insuredPeople", "birthDates", "currentInsurance", "costApproach"],
    weightBands: {
      evaluationGoal: "approved main-emphasis context; final points not production constants",
      priorities: "20-35 draft points",
      deductible: "10-18 draft points",
      additionalNeeds: "8-20 draft points",
      costApproach: "10-18 draft points, category-shaping, not main emphasis",
      evidenceCompleteness: "10-20 draft points or equivalent penalty band",
    },
    missingEvidenceNeverPositiveScore: true,
    hardPriorityGaps: "Can create penalty plus advisor confirmation.",
    overlapCaps: [
      ["surgery", "serious_illness", "high_long_term_hospitalization_limit"],
      ["private_hospitalization", "provider_network_freedom"],
    ],
    distinctSignals: [["outpatient_visits", "diagnostics_checkup"]],
  },
  categoryPolicy: {
    bestMatch: {
      insuranceMeaning: "Strongest balanced fit to stated needs among eligible candidates.",
      requiredEvidenceCertainty: ["acceptable eligibility certainty", "meaningful Step 5 fit", "no unresolved hard-priority conflict"],
      mustNotMean: ["objectively best", "cheapest", "fully confirmed"],
    },
    premiumChoice: {
      insuranceMeaning: "Evidence-supported broader protection, richer benefits, higher relevant limits, or broader network access.",
      requiredEvidenceCertainty: ["breadth evidence", "network/limit/benefit evidence", "minimum certainty threshold"],
      mustNotMean: ["highest price", "guaranteed superior cover", "luxury"],
    },
    smartBudgetChoice: {
      insuranceMeaning: "Essential hard-priority fit with stronger cost-control alignment.",
      requiredEvidenceCertainty: ["acceptable hard-priority fit", "deductible/cost trade-off evidence", "coherent narrower coverage"],
      mustNotMean: ["cheapest", "low quality", "sufficient for every stated need"],
    },
    noCategoryConditions: [
      "material eligibility uncertainty",
      "unresolved hard-priority evidence",
      "exclusions or waiting periods undermine core need",
      "category evidence incomplete",
    ],
  },
  existingPolicyPolicy: {
    mayAffectRanking: ["reliable confirmed gaps aligned with proposed-product evidence", "continuity risks supported by product evidence"],
    mustNotAffectRanking: ["unknown current policy terms", "PDF absence", "current policy facts as proposed-product evidence"],
    advisorConfirmationRules: ["waiting-period continuity", "pre-existing condition handling", "duplicate cover", "current policy advantages worth preserving"],
    currentPolicyAdvantagesHandling: "Display separately, reduce replacement confidence wording, and route material advantages to advisor review.",
  },
  tieBreakPolicy: [
    "eligibility certainty",
    "evidence completeness",
    "hard priorities",
    "deductible/cost fit",
    "coverage breadth",
    "fewer unresolved confirmations",
    "deterministic product_id fallback",
  ],
  explanationPolicy: {
    strengths: "Must cite evidence-supported product fact tied to selected need.",
    tradeOffs: "Must include deductibles, waiting periods, exclusions, narrower networks, lower limits, missing evidence, or cost/protection compromises.",
    missingEvidence: "Must appear as limitation or advisor-confirmation item, never as positive evidence.",
    currentPolicyAdvantages: "Must be separated from proposed-product strengths.",
    itemsToConfirm: "Include eligibility unknowns, restrictions, deductibles, waiting periods, exclusions, maternity, pediatric, international, network, outpatient, and diagnostic limits.",
    customerWordingBoundaries: ["supports", "appears aligned", "needs confirmation", "avoid covered/excluded/unlimited/no waiting period/no participation without exact evidence"],
    advisorWordingBoundaries: "Identify unresolved evidence, affected area, and whether it impacts eligibility, score, comparison, or explanation.",
  },
  activationGates: [
    "product evidence audit",
    "deterministic tests",
    "v1 characterization protection",
    "release/rollback plan",
    "explicit activation approval",
  ],
  forbiddenRuntimeClaims: [
    "v2 is not active",
    "no runtime implementation in this slice",
    "artifact must not be imported by production src yet",
    "no scoring/ranking engine is implemented by this artifact",
  ],
};

export function renderArtifact() {
  return [
    "/* This file is generated by scripts/generate-insurance-evaluation-v2-rules.mjs. */",
    "/* Blueprint only. Do not import into production src until a future activation milestone. */",
    "",
    `export const insuranceEvaluationV2Rules = ${JSON.stringify(ruleArtifact, null, 2)} as const;`,
    "",
    "export type InsuranceEvaluationV2Rules = typeof insuranceEvaluationV2Rules;",
    "",
  ].join("\n");
}

async function run() {
  const expected = renderArtifact();
  const write = process.argv.includes("--write");
  const verify = process.argv.includes("--verify") || !write;

  if (write) {
    await mkdir(dirname(artifactPath), { recursive: true });
    await writeFile(artifactPath, expected, "utf8");
    console.log(`Generated ${artifactPath}`);
    return;
  }

  if (verify) {
    const actual = await readFile(artifactPath, "utf8");
    if (actual !== expected) {
      throw new Error(
        "Generated insurance evaluation v2 rules artifact is stale. Run this script with --write.",
      );
    }
    console.log("Insurance evaluation v2 rules artifact parity passed.");
  }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  await run();
}
