import type {
  DatabaseProgramDetail,
  EvidenceReference,
  LiveRecommendation,
  LiveRecommendationCategory,
  LiveRecommendationCategoryLabel,
  MissingEvidenceItem,
  RecommendationStrength,
  RecommendationWarning,
} from "./contracts";
import { z } from "zod";

interface CategoryDefinition {
  category: LiveRecommendationCategory;
  label: LiveRecommendationCategoryLabel;
}

const categoryDefinitions: Readonly<Record<string, CategoryDefinition>> = {
  best_match: { category: "best-match", label: "Best Match" },
  premium_choice: { category: "premium-choice", label: "Premium Choice" },
  smart_budget_choice: {
    category: "smart-budget-choice",
    label: "Smart Budget Choice",
  },
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const optionalString = (value: unknown) =>
  typeof value === "string" && value.trim() ? value : undefined;

const optionalNumber = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;

function normalizeWarning(value: unknown): RecommendationWarning | null {
  if (!isRecord(value)) return null;

  const code = optionalString(value.code);
  const message = optionalString(value.message);

  return code && message ? { code, message } : null;
}

function normalizeStrength(value: unknown): RecommendationStrength | null {
  if (!isRecord(value)) return null;

  const id = optionalString(value.signal_code);
  const title = optionalString(value.signal_name) ?? optionalString(value.name);

  if (!id || !title) return null;

  return {
    id,
    title,
    description: optionalString(value.basis),
    score: optionalNumber(value.product_score) ?? optionalNumber(value.score),
    confidence: optionalString(value.confidence),
  };
}

function normalizeMissingEvidence(value: unknown): MissingEvidenceItem | null {
  if (!isRecord(value)) return null;

  const signalCode = optionalString(value.signal_code);
  const title = optionalString(value.signal_name);

  if (!signalCode || !title) return null;

  return {
    signalCode,
    title,
    weight: optionalNumber(value.user_weight),
  };
}

function collectReasons(matchedSignals: unknown[]) {
  const reasons: string[] = [];

  for (const signal of matchedSignals) {
    if (!isRecord(signal) || !Array.isArray(signal.source_answers)) continue;

    for (const sourceAnswer of signal.source_answers) {
      if (!isRecord(sourceAnswer)) continue;
      const reason = optionalString(sourceAnswer.reason);
      if (reason && !reasons.includes(reason)) reasons.push(reason);
    }
  }

  return reasons.slice(0, 2).join(" ") || undefined;
}

function collectEvidenceReferences(value: unknown) {
  const references: EvidenceReference[] = [];
  const seen = new Set<string>();

  const visit = (
    current: unknown,
    inheritedSignalCode?: string,
    depth = 0,
  ) => {
    if (depth > 6 || references.length >= 24) return;

    if (Array.isArray(current)) {
      for (const item of current) visit(item, inheritedSignalCode, depth + 1);
      return;
    }

    if (!isRecord(current)) return;

    const signalCode =
      optionalString(current.signal_code) ?? inheritedSignalCode;
    const id = optionalString(current.id);
    const type = optionalString(current.type);

    if (id && type) {
      const dedupeKey = `${type}:${id}`;

      if (!seen.has(dedupeKey)) {
        seen.add(dedupeKey);
        references.push({
          id,
          type,
          title: optionalString(current.title),
          excerpt: optionalString(current.excerpt),
          sourceFilename: optionalString(current.source_filename),
          articleSection: optionalString(current.article_section),
          pdfPage: optionalNumber(current.pdf_page),
          signalCode,
        });
      }
    }

    if ("evidence" in current) {
      visit(current.evidence, signalCode, depth + 1);
    }
  };

  visit(value);
  return references;
}

function normalizeRecommendationRow(value: unknown): LiveRecommendation | null {
  if (!isRecord(value)) return null;

  const categoryCode = optionalString(value.category_code);
  const categoryDefinition = categoryCode
    ? categoryDefinitions[categoryCode]
    : undefined;
  const programId = optionalString(value.product_id);
  const programName = optionalString(value.product_name);
  const insurer = optionalString(value.company_name);
  const score = optionalNumber(value.score);

  if (
    !categoryDefinition ||
    value.category_label !== categoryDefinition.label ||
    !programId ||
    !programName ||
    !insurer ||
    score === undefined ||
    !Array.isArray(value.matched_signals) ||
    !Array.isArray(value.missing_signals) ||
    !Array.isArray(value.evidence) ||
    !Array.isArray(value.warnings)
  ) {
    return null;
  }

  const strengths = value.matched_signals
    .map(normalizeStrength)
    .filter((item): item is RecommendationStrength => Boolean(item));
  const missingEvidence = value.missing_signals
    .map(normalizeMissingEvidence)
    .filter((item): item is MissingEvidenceItem => Boolean(item));
  const warnings = value.warnings
    .map(normalizeWarning)
    .filter((item): item is RecommendationWarning => Boolean(item));

  return {
    programId,
    programName,
    insurer,
    category: categoryDefinition.category,
    categoryLabel: categoryDefinition.label,
    matchScore: Math.max(0, Math.min(100, Math.round(score))),
    reason: collectReasons(value.matched_signals),
    strengths,
    tradeOffs: missingEvidence.map((item) => item.title),
    itemsToConfirm: warnings
      .filter((warning) => warning.code !== "demo_only")
      .map((warning) => warning.message),
    warnings,
    missingEvidence,
    evidenceReferences: collectEvidenceReferences(value.evidence),
    policyComparison: null,
  };
}

export function normalizeDatabaseRecommendations(
  value: unknown,
): LiveRecommendation[] | null {
  if (!Array.isArray(value)) return null;

  const recommendations = value.map(normalizeRecommendationRow);

  if (
    recommendations.some((recommendation) => !recommendation) ||
    recommendations.length !== 3
  ) {
    return null;
  }

  const normalized = recommendations as LiveRecommendation[];
  const categories = new Set(
    normalized.map((recommendation) => recommendation.category),
  );
  const programIds = new Set(
    normalized.map((recommendation) => recommendation.programId),
  );

  if (categories.size !== 3 || programIds.size !== 3) return null;

  return normalized;
}

const optionalDatabaseText = z.string().optional();
const humanValidated = z.boolean();

const coverageFactSchema = z
  .object({
    fact_id: z.string(),
    category: optionalDatabaseText,
    topic: z.string(),
    coverage_status: optionalDatabaseText,
    term_analysis: z.string(),
    limit_frequency: optionalDatabaseText,
    deductible_participation: optionalDatabaseText,
    waiting_period_text: optionalDatabaseText,
    geography: optionalDatabaseText,
    network: optionalDatabaseText,
    source_filename: optionalDatabaseText,
    article_section: optionalDatabaseText,
    confidence: optionalDatabaseText,
    evidence_level: optionalDatabaseText,
    human_validated: humanValidated,
  })
  .strict();

const deductibleRuleSchema = z
  .object({
    deductible_id: z.string(),
    coverage_case: z.string(),
    exact_rule: z.string(),
    practical_meaning: optionalDatabaseText,
    period_frequency: optionalDatabaseText,
    source_filename: optionalDatabaseText,
    article_section: optionalDatabaseText,
    confidence: optionalDatabaseText,
    human_validated: humanValidated,
  })
  .strict();

const monetaryFactSchema = z
  .object({
    monetary_id: z.string(),
    exact_excerpt: z.string(),
    source_filename: optionalDatabaseText,
    pdf_page: z.number().int().positive().optional(),
    human_validated: humanValidated,
  })
  .strict();

const waitingPeriodSchema = z
  .object({
    waiting_id: z.string(),
    coverage_case: z.string(),
    duration_text: z.string(),
    application_text: optionalDatabaseText,
    source_filename: optionalDatabaseText,
    article_section: optionalDatabaseText,
    confidence: optionalDatabaseText,
    human_validated: humanValidated,
  })
  .strict();

const exclusionSchema = z
  .object({
    exclusion_id: z.string(),
    record_type: optionalDatabaseText,
    exclusion_text: z.string(),
    source_filename: optionalDatabaseText,
    pdf_page: z.number().int().positive().optional(),
    validation_note: optionalDatabaseText,
    human_validated: humanValidated,
  })
  .strict();

const providerNetworkSchema = z
  .object({
    network_id: z.string(),
    provider_type: optionalDatabaseText,
    provider_name: z.string(),
    region: optionalDatabaseText,
    network_status: optionalDatabaseText,
    version_note: optionalDatabaseText,
    valid_from: optionalDatabaseText,
    valid_to: optionalDatabaseText,
    last_verified_at: optionalDatabaseText,
    human_validated: humanValidated,
  })
  .strict();

const procedureFeeSchema = z
  .object({
    fee_id: z.string(),
    fee_type: optionalDatabaseText,
    medical_specialty: optionalDatabaseText,
    severity_category: optionalDatabaseText,
    amount: z.number().finite().nonnegative().optional(),
    currency: optionalDatabaseText,
    source_filename: optionalDatabaseText,
    human_validated: humanValidated,
  })
  .strict();

const supplementaryBenefitSchema = z
  .object({
    benefit_id: z.string(),
    benefit_name: z.string(),
    exact_operation_conditions: optionalDatabaseText,
    waiting_text: optionalDatabaseText,
    duration_expiry: optionalDatabaseText,
    source_filename: optionalDatabaseText,
    human_validated: humanValidated,
  })
  .strict();

const claimRuleSchema = z
  .object({
    claim_rule_id: z.string(),
    claim_case: z.string(),
    exact_process: optionalDatabaseText,
    deadline_limit: optionalDatabaseText,
    human_validated: humanValidated,
  })
  .strict();

const productDetailV2Schema = z
  .object({
    contract_version: z.literal("product-detail-2026-07-v2"),
    product_id: z.string(),
    name: z.string(),
    company: z.string(),
    product_type: optionalDatabaseText,
    category: optionalDatabaseText,
    scope_text: optionalDatabaseText,
    critical_note: optionalDatabaseText,
    version_label: optionalDatabaseText,
    effective_from: optionalDatabaseText,
    effective_to: optionalDatabaseText,
    signals: z.array(z.unknown()),
    coverage_facts: z.array(coverageFactSchema),
    deductible_rules: z.array(deductibleRuleSchema),
    monetary_facts: z.array(monetaryFactSchema),
    waiting_periods: z.array(waitingPeriodSchema),
    exclusions: z.array(exclusionSchema),
    provider_networks: z.array(providerNetworkSchema),
    procedure_fees: z.array(procedureFeeSchema),
    supplementary_benefits: z.array(supplementaryBenefitSchema),
    claim_rules: z.array(claimRuleSchema),
    data_quality_warning: optionalDatabaseText,
  })
  .strict();

export function normalizeDatabaseProgramDetail(
  value: unknown,
): DatabaseProgramDetail | null {
  const parsed = productDetailV2Schema.safeParse(value);
  if (!parsed.success) return null;

  const detail = parsed.data;
  const programId = optionalString(detail.product_id);
  const name = optionalString(detail.name);
  const insurer = optionalString(detail.company);
  if (!programId || !name || !insurer) return null;

  const rawSignals = detail.signals;
  const signals = rawSignals
    .map(normalizeStrength)
    .filter((item): item is RecommendationStrength => Boolean(item));

  return {
    contractVersion: detail.contract_version,
    programId,
    name,
    insurer,
    productType: optionalString(detail.product_type),
    category: optionalString(detail.category),
    scopeText: optionalString(detail.scope_text),
    criticalNote: optionalString(detail.critical_note),
    versionLabel: optionalString(detail.version_label),
    effectiveFrom: optionalString(detail.effective_from),
    effectiveTo: optionalString(detail.effective_to),
    dataQualityWarning: optionalString(detail.data_quality_warning),
    signals,
    evidenceReferences: collectEvidenceReferences(rawSignals),
    coverageFacts: detail.coverage_facts.map((fact) => ({
      factId: fact.fact_id,
      category: fact.category,
      topic: fact.topic,
      coverageStatus: fact.coverage_status,
      termAnalysis: fact.term_analysis,
      limitFrequency: fact.limit_frequency,
      deductibleParticipation: fact.deductible_participation,
      waitingPeriodText: fact.waiting_period_text,
      geography: fact.geography,
      network: fact.network,
      sourceFilename: fact.source_filename,
      articleSection: fact.article_section,
      confidence: fact.confidence,
      evidenceLevel: fact.evidence_level,
      humanValidated: fact.human_validated,
    })),
    deductibleRules: detail.deductible_rules.map((rule) => ({
      deductibleId: rule.deductible_id,
      coverageCase: rule.coverage_case,
      exactRule: rule.exact_rule,
      practicalMeaning: rule.practical_meaning,
      periodFrequency: rule.period_frequency,
      sourceFilename: rule.source_filename,
      articleSection: rule.article_section,
      confidence: rule.confidence,
      humanValidated: rule.human_validated,
    })),
    monetaryFacts: detail.monetary_facts.map((fact) => ({
      monetaryId: fact.monetary_id,
      exactExcerpt: fact.exact_excerpt,
      sourceFilename: fact.source_filename,
      pdfPage: fact.pdf_page,
      humanValidated: fact.human_validated,
    })),
    waitingPeriods: detail.waiting_periods.map((period) => ({
      waitingId: period.waiting_id,
      coverageCase: period.coverage_case,
      durationText: period.duration_text,
      applicationText: period.application_text,
      sourceFilename: period.source_filename,
      articleSection: period.article_section,
      confidence: period.confidence,
      humanValidated: period.human_validated,
    })),
    exclusions: detail.exclusions.map((exclusion) => ({
      exclusionId: exclusion.exclusion_id,
      recordType: exclusion.record_type,
      exclusionText: exclusion.exclusion_text,
      sourceFilename: exclusion.source_filename,
      pdfPage: exclusion.pdf_page,
      validationNote: exclusion.validation_note,
      humanValidated: exclusion.human_validated,
    })),
    providerNetworks: detail.provider_networks.map((network) => ({
      networkId: network.network_id,
      providerType: network.provider_type,
      providerName: network.provider_name,
      region: network.region,
      networkStatus: network.network_status,
      versionNote: network.version_note,
      validFrom: network.valid_from,
      validTo: network.valid_to,
      lastVerifiedAt: network.last_verified_at,
      humanValidated: network.human_validated,
    })),
    procedureFees: detail.procedure_fees.map((fee) => ({
      feeId: fee.fee_id,
      feeType: fee.fee_type,
      medicalSpecialty: fee.medical_specialty,
      severityCategory: fee.severity_category,
      amount: fee.amount,
      currency: fee.currency,
      sourceFilename: fee.source_filename,
      humanValidated: fee.human_validated,
    })),
    supplementaryBenefits: detail.supplementary_benefits.map((benefit) => ({
      benefitId: benefit.benefit_id,
      benefitName: benefit.benefit_name,
      exactOperationConditions: benefit.exact_operation_conditions,
      waitingText: benefit.waiting_text,
      durationExpiry: benefit.duration_expiry,
      sourceFilename: benefit.source_filename,
      humanValidated: benefit.human_validated,
    })),
    claimRules: detail.claim_rules.map((rule) => ({
      claimRuleId: rule.claim_rule_id,
      claimCase: rule.claim_case,
      exactProcess: rule.exact_process,
      deadlineLimit: rule.deadline_limit,
      humanValidated: rule.human_validated,
    })),
  };
}
