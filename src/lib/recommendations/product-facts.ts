import type { DatabaseProgramDetail } from "./contracts";

export type ComparableProductFact = {
  factId: string;
  sourceRecordType:
    | "coverage_fact"
    | "deductible_rule"
    | "monetary_fact"
    | "waiting_period"
    | "exclusion"
    | "provider_network"
    | "procedure_fee"
    | "supplementary_benefit"
    | "claim_rule";
  topicKey: string;
  category: string;
  measureType:
    | "annual_limit"
    | "per_incident_limit"
    | "coverage_percentage"
    | "deductible_amount"
    | "deductible_percentage"
    | "copayment_amount"
    | "copayment_percentage"
    | "waiting_period"
    | "confirmed_coverage"
    | "exclusion"
    | "network"
    | "service"
    | "procedure_fee"
    | "raw_monetary_term"
    | "unknown";
  valueNumber: number | null;
  currency: string | null;
  durationValue: number | null;
  durationUnit: "days" | "months" | "years" | null;
  scope:
    | "annual"
    | "per_incident"
    | "per_person"
    | "family"
    | "individual"
    | "unknown";
  title: string;
  exactText: string;
  conditions: string[];
  sourceFilename: string | null;
  articleSection: string | null;
  pdfPage: number | null;
  humanValidated: boolean;
};

export type CanonicalProductTopic =
  | "hospitalization"
  | "accident_hospitalization"
  | "outpatient"
  | "emergency"
  | "diagnostics"
  | "surgery"
  | "serious_illness"
  | "international"
  | "physiotherapy"
  | "prevention"
  | "maternity"
  | "pediatric"
  | "assistance"
  | "network"
  | "other";

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .toLocaleLowerCase("el-GR")
    .replace(/[^\p{L}\p{N}%€$]+/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();

const nonEmpty = (values: Array<string | undefined>) =>
  [...new Set(values.filter((value): value is string => Boolean(value?.trim())))];

export function canonicalProductTopic(value: string): CanonicalProductTopic {
  const text = normalize(value);
  if (/μητροτ|τοκετ|εγκυμοσ|matern|pregnan/u.test(text)) return "maternity";
  if (/παιδιατρ|παιδ|τεκν|pediatr|child/u.test(text)) return "pediatric";
  if (/φυσικοθεραπ|physiotherap/u.test(text)) return "physiotherapy";
  if (/προληψ|check ?up|prevent/u.test(text)) return "prevention";
  if (/εξωτερικ|διεθν|ταξιδ|abroad|international|travel|ηπα|καναδ/u.test(text)) {
    return "international";
  }
  if (/επειγον|εκτακτ|emergenc|urgent/u.test(text)) return "emergency";
  if (/διαγνωσ|diagnostic|εξετασ/u.test(text)) return "diagnostics";
  if (/εξωνοσοκομ|outpatient|επισκεψ.*ιατρ/u.test(text)) return "outpatient";
  if (/χειρουργ|επεμβ|surg/u.test(text)) return "surgery";
  if (/ογκο|καρκ|χημειο|ακτινο|σοβαρ.*ασθεν|critical illness|oncolog/u.test(text)) {
    return "serious_illness";
  }
  if (/ατυχημ|accident/u.test(text) && /νοσηλει|hospital/u.test(text)) {
    return "accident_hospitalization";
  }
  if (/νοσηλει|νοσοκομ|hospital|inpatient|μεθ|μαφ/u.test(text)) {
    return "hospitalization";
  }
  if (/βοηθεια|assistance|μεταφορ|διακομιδ/u.test(text)) return "assistance";
  if (/δικτυ|network|παροχ|provider/u.test(text)) return "network";
  return "other";
}

function parseLocalizedNumber(token: string) {
  const compact = token.replace(/\s/gu, "");
  const comma = compact.lastIndexOf(",");
  const dot = compact.lastIndexOf(".");
  let normalized = compact;

  if (comma >= 0 && dot >= 0) {
    normalized =
      comma > dot
        ? compact.replace(/\./gu, "").replace(",", ".")
        : compact.replace(/,/gu, "");
  } else if (comma >= 0) {
    normalized = /,\d{1,2}$/u.test(compact)
      ? compact.replace(",", ".")
      : compact.replace(/,/gu, "");
  } else if (dot >= 0 && /\.\d{3}$/u.test(compact)) {
    normalized = compact.replace(/\./gu, "");
  }

  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

type ParsedMoney = { value: number; currency: string };

function canonicalCurrency(value: string | undefined) {
  if (!value) return null;
  const normalized = normalize(value);
  if (value.includes("€") || /\beur\b|ευρω/u.test(normalized)) return "EUR";
  if (value.includes("$") || /\busd\b/u.test(normalized)) return "USD";
  if (value.includes("£") || /\bgbp\b/u.test(normalized)) return "GBP";
  return value.trim().toUpperCase();
}

function moneyCandidates(value: string) {
  const matches = [
    ...value.matchAll(
      /(?:€\s*(\d[\d.,\s]*)|(\d[\d.,\s]*)\s*(€|EUR|ευρ(?:ώ|ω)?))/giu,
    ),
  ];
  const parsed = matches
    .map((match) => {
      const amount = parseLocalizedNumber(match[1] ?? match[2] ?? "");
      return amount === null ? null : { value: amount, currency: "EUR" };
    })
    .filter((item): item is ParsedMoney => item !== null);
  return [
    ...new Map(
      parsed.map((item) => [`${item.value}|${item.currency}`, item]),
    ).values(),
  ];
}

function percentageCandidates(value: string) {
  return [
    ...new Set(
      [...value.matchAll(/(\d+(?:[.,]\d+)?)\s*%/gu)]
        .map((match) => parseLocalizedNumber(match[1]))
        .filter((item): item is number => item !== null),
    ),
  ];
}

function uniquePercentage(value: string) {
  const percentages = percentageCandidates(value);
  return percentages.length === 1 ? percentages[0] : null;
}

function uniqueDuration(value: string): {
  value: number;
  unit: "days" | "months" | "years";
} | null {
  const durations = [...normalize(value).matchAll(/(\d+(?:[.,]\d+)?)\s*(ημερ\p{L}*|day\p{L}*|μην\p{L}*|month\p{L}*|ετ\p{L}*|year\p{L}*)/giu)]
    .map((match) => {
      const amount = parseLocalizedNumber(match[1]);
      const unitText = normalize(match[2]);
      if (amount === null) return null;
      const unit = /ημερ|day/u.test(unitText)
        ? "days"
        : /μην|month/u.test(unitText)
          ? "months"
          : "years";
      return { value: amount, unit } as const;
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);
  const unique = new Map(durations.map((item) => [`${item.value}|${item.unit}`, item]));
  return unique.size === 1 ? [...unique.values()][0] : null;
}

function safeCompactText(value: string) {
  return value.replace(/\s+/gu, " ").trim();
}

function displayGeography(value: string) {
  const text = normalize(value);
  const parts: string[] = [];
  if (/ελλαδ|greece/u.test(text)) parts.push("Ελλάδα");
  if (/εξωτερικ|διεθν|abroad|international/u.test(text)) parts.push("Εξωτερικό");
  if (/ηπα|καναδ|usa|canada/u.test(text)) parts.push("ΗΠΑ/Καναδάς");
  return parts.length > 0 ? parts.join(" / ") : safeCompactText(value);
}

function compactNetwork(value: string) {
  const text = normalize(value);
  if (/συνεργαζομεν.*μη|μη.*συνεργαζομεν/u.test(text)) {
    return "Συνεργαζόμενο ή μη νοσοκομείο";
  }
  if (/ειδικ.*συνεργαζομεν/u.test(text)) return "Ειδικά συνεργαζόμενο δίκτυο";
  if (/συνεργαζομεν|network|δικτυ/u.test(text)) return "Συνεργαζόμενο δίκτυο";
  if (/dynamic|current verification|επικαιρ/u.test(text)) return "Dynamic network";
  return safeCompactText(value);
}

function territoryPercentageSummary(value: string) {
  const text = safeCompactText(value);
  const outside = text.match(/(\d+(?:[.,]\d+)?)\s*%[^%.;,]*εκτός\s+ΗΠΑ\/Καναδά/iu);
  const inside = text.match(/(\d+(?:[.,]\d+)?)\s*%[^%.;,]*(?:σε|εντός)\s+ΗΠΑ\/Καναδά/iu);
  if (!outside || !inside) return null;
  return `Κάλυψη εξωτερικού: ${outside[1]}% εκτός ΗΠΑ/Καναδά, ${inside[1]}% σε ΗΠΑ/Καναδά`;
}

function durationSplitSummary(value: string) {
  const text = safeCompactText(value);
  const greece = text.match(/(\d+(?:[.,]\d+)?)\s*(ημέρες|ημερών|μήνες|μηνών|έτη|ετών)\s+για\s+Ελλάδα/iu);
  const abroad = text.match(/(\d+(?:[.,]\d+)?)\s*(ημέρες|ημερών|μήνες|μηνών|έτη|ετών)\s+για\s+εξωτερικό/iu);
  if (!greece || !abroad) return null;
  const unit = greece[2].startsWith("ημέρ") || greece[2].startsWith("ημερ")
    ? "ημέρες"
    : greece[2].startsWith("μήν") || greece[2].startsWith("μην")
      ? "μήνες"
      : "έτη";
  return `Χρονικό όριο: ${greece[1]} ${unit} Ελλάδα, ${abroad[1]} ${unit} εξωτερικό`;
}

function scopeFromText(value: string): ComparableProductFact["scope"] {
  const text = normalize(value);
  if (/ανα περιστατικ|κατα περιστατικ|per incident|per claim/u.test(text)) return "per_incident";
  if (/ετησι|ανα ετος|ασφαλιστικ.*ετος|annual|per year/u.test(text)) return "annual";
  if (/ανα ασφαλισμεν|ανα ατομο|per person/u.test(text)) return "per_person";
  if (/οικογεν|family/u.test(text)) return "family";
  if (/ατομικ|individual/u.test(text)) return "individual";
  return "unknown";
}

function monetaryMeasure(
  value: string,
  source: "coverage" | "deductible" | "monetary",
): ComparableProductFact["measureType"] {
  const text = normalize(value);
  const scope = scopeFromText(value);
  if (source === "deductible") {
    return uniquePercentage(value) !== null
      ? /συμμετοχ|copay/u.test(text)
        ? "copayment_percentage"
        : "deductible_percentage"
      : /συμμετοχ|copay/u.test(text)
        ? "copayment_amount"
        : "deductible_amount";
  }
  if (
    uniquePercentage(value) !== null &&
    /καλυπτ|καταβαλλει ποσοστο|ποσοστ.*καλυψ|coverage/u.test(text)
  ) {
    return "coverage_percentage";
  }
  if (/συμμετοχ|copay/u.test(text)) {
    return uniquePercentage(value) !== null ? "copayment_percentage" : "copayment_amount";
  }
  if (/απαλλαγ|deduct/u.test(text)) {
    return uniquePercentage(value) !== null ? "deductible_percentage" : "deductible_amount";
  }
  if (/ποσοστ.*καλυψ|coverage percentage|καλυπτ.*%/u.test(text)) return "coverage_percentage";
  if (/οριο|limit|κεφαλαι/u.test(text)) {
    return scope === "per_incident" ? "per_incident_limit" : "annual_limit";
  }
  return source === "monetary" ? "raw_monetary_term" : "unknown";
}

function createFact(
  input: Omit<ComparableProductFact, "valueNumber" | "currency" | "durationValue" | "durationUnit" | "scope"> &
    Partial<Pick<ComparableProductFact, "valueNumber" | "currency" | "durationValue" | "durationUnit" | "scope">>,
): ComparableProductFact {
  return {
    valueNumber: null,
    currency: null,
    durationValue: null,
    durationUnit: null,
    scope: "unknown",
    ...input,
  };
}

function monetaryValues(text: string) {
  const moneyValues = moneyCandidates(text);
  const percentageValues = percentageCandidates(text);
  const money = moneyValues.length === 1 && percentageValues.length === 0
    ? moneyValues[0]
    : null;
  const percentage = percentageValues.length === 1 && moneyValues.length === 0
    ? percentageValues[0]
    : null;
  return {
    valueNumber: money?.value ?? percentage,
    currency: money?.currency ?? null,
  };
}

function dedupeFacts(facts: ComparableProductFact[]) {
  const seen = new Set<string>();
  return facts.filter((fact) => {
    const key = [
      fact.sourceRecordType,
      fact.factId,
      fact.topicKey,
      fact.scope,
      fact.measureType,
      fact.valueNumber ?? "",
      fact.currency ?? "",
      fact.durationValue ?? "",
      fact.durationUnit ?? "",
      fact.exactText,
      fact.conditions.join("|"),
    ].join("::");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function normalizeComparableProductFacts(
  detail: DatabaseProgramDetail,
): ComparableProductFact[] {
  const facts: ComparableProductFact[] = [];

  for (const record of detail.coverageFacts) {
    const topicKey = canonicalProductTopic(`${record.category ?? ""} ${record.topic}`);
    const category = record.category ?? topicKey;
    const source = {
      factId: record.factId,
      sourceRecordType: "coverage_fact" as const,
      topicKey,
      category,
      title: record.topic,
      sourceFilename: record.sourceFilename ?? null,
      articleSection: record.articleSection ?? null,
      pdfPage: null,
      humanValidated: record.humanValidated,
    };
    const status = normalize(record.coverageStatus ?? "");
    const conditions = nonEmpty([record.coverageStatus, record.geography, record.network]);
    facts.push(
      createFact({
        ...source,
        measureType: /δεν καλυπτ|εξαιρ|not covered/u.test(status)
          ? "exclusion"
          : "confirmed_coverage",
        exactText: record.termAnalysis,
        conditions,
      }),
    );

    if (record.geography) {
      const geography = displayGeography(record.geography);
      facts.push(
        createFact({
          ...source,
          factId: `${record.factId}::geography`,
          measureType: "service",
          title: "Γεωγραφική ισχύς",
          exactText: `Γεωγραφική ισχύς: ${geography}`,
          conditions: [geography],
        }),
      );
    }

    if (record.network) {
      const network = compactNetwork(record.network);
      facts.push(
        createFact({
          ...source,
          factId: `${record.factId}::network`,
          topicKey: "network",
          measureType: "network",
          title: "Δίκτυο νοσοκομείων",
          exactText: `Δίκτυο: ${network}`,
          conditions: [network],
        }),
      );
    }

    const territoryCoverage = territoryPercentageSummary(record.termAnalysis);
    if (territoryCoverage) {
      facts.push(
        createFact({
          ...source,
          factId: `${record.factId}::territory-percentage`,
          measureType: "service",
          title: record.topic,
          exactText: territoryCoverage,
          conditions: [territoryCoverage.replace(/^Κάλυψη εξωτερικού:\s*/u, "")],
        }),
      );
    }

    const durationSplit = durationSplitSummary(record.termAnalysis);
    if (durationSplit) {
      facts.push(
        createFact({
          ...source,
          factId: `${record.factId}::duration-split`,
          topicKey: /εξωτερικό/iu.test(durationSplit) ? "international" : source.topicKey,
          measureType: "service",
          title: record.topic,
          exactText: durationSplit,
          conditions: [durationSplit.replace(/^Χρονικό όριο:\s*/u, "")],
        }),
      );
    }

    const termMeasure = monetaryMeasure(record.termAnalysis, "coverage");
    const termValues = monetaryValues(record.termAnalysis);
    if (termMeasure !== "unknown" && termValues.valueNumber !== null) {
      facts.push(
        createFact({
          ...source,
          measureType: termMeasure,
          exactText: record.termAnalysis,
          conditions: nonEmpty([record.coverageStatus, record.geography, record.network]),
          scope: scopeFromText(record.termAnalysis),
          ...termValues,
        }),
      );
    }

    if (record.limitFrequency) {
      facts.push(
        createFact({
          ...source,
          measureType:
            scopeFromText(record.limitFrequency) === "per_incident"
              ? "per_incident_limit"
              : "annual_limit",
          exactText: record.limitFrequency,
          conditions: [],
          scope: scopeFromText(record.limitFrequency),
          ...monetaryValues(record.limitFrequency),
        }),
      );
    }
    if (record.deductibleParticipation) {
      const measureType = monetaryMeasure(record.deductibleParticipation, "deductible");
      facts.push(
        createFact({
          ...source,
          measureType,
          exactText: record.deductibleParticipation,
          conditions: [],
          scope: scopeFromText(record.deductibleParticipation),
          ...monetaryValues(record.deductibleParticipation),
        }),
      );
    }
    if (record.waitingPeriodText) {
      const duration = uniqueDuration(record.waitingPeriodText);
      facts.push(
        createFact({
          ...source,
          measureType: "waiting_period",
          exactText: record.waitingPeriodText,
          conditions: [],
          durationValue: duration?.value ?? null,
          durationUnit: duration?.unit ?? null,
        }),
      );
    }
  }

  for (const record of detail.deductibleRules) {
    const topicKey = canonicalProductTopic(record.coverageCase);
    const measureType = monetaryMeasure(record.exactRule, "deductible");
    facts.push(
      createFact({
        factId: record.deductibleId,
        sourceRecordType: "deductible_rule",
        topicKey,
        category: "deductible",
        measureType,
        title: record.coverageCase,
        exactText: record.exactRule,
        conditions: nonEmpty([record.practicalMeaning, record.periodFrequency]),
        sourceFilename: record.sourceFilename ?? null,
        articleSection: record.articleSection ?? null,
        pdfPage: null,
        humanValidated: record.humanValidated,
        scope: scopeFromText(`${record.exactRule} ${record.periodFrequency ?? ""}`),
        ...monetaryValues(record.exactRule),
      }),
    );
  }

  for (const record of detail.monetaryFacts) {
    const topicKey = canonicalProductTopic(record.exactExcerpt);
    const measureType = monetaryMeasure(record.exactExcerpt, "monetary");
    facts.push(
      createFact({
        factId: record.monetaryId,
        sourceRecordType: "monetary_fact",
        topicKey,
        category: "monetary",
        measureType,
        title: "Οικονομικός όρος",
        exactText: record.exactExcerpt,
        conditions: [],
        sourceFilename: record.sourceFilename ?? null,
        articleSection: null,
        pdfPage: record.pdfPage ?? null,
        humanValidated: record.humanValidated,
        scope: scopeFromText(record.exactExcerpt),
        ...monetaryValues(record.exactExcerpt),
      }),
    );
  }

  for (const record of detail.waitingPeriods) {
    const duration = uniqueDuration(record.durationText);
    facts.push(
      createFact({
        factId: record.waitingId,
        sourceRecordType: "waiting_period",
        topicKey: canonicalProductTopic(record.coverageCase),
        category: "waiting_period",
        measureType: "waiting_period",
        title: record.coverageCase,
        exactText: record.durationText,
        conditions: nonEmpty([record.applicationText]),
        sourceFilename: record.sourceFilename ?? null,
        articleSection: record.articleSection ?? null,
        pdfPage: null,
        humanValidated: record.humanValidated,
        durationValue: duration?.value ?? null,
        durationUnit: duration?.unit ?? null,
      }),
    );
  }

  for (const record of detail.exclusions) {
    facts.push(
      createFact({
        factId: record.exclusionId,
        sourceRecordType: "exclusion",
        topicKey: canonicalProductTopic(`${record.recordType ?? ""} ${record.exclusionText}`),
        category: record.recordType ?? "exclusion",
        measureType: "exclusion",
        title: record.recordType ?? "Εξαίρεση ή περιορισμός",
        exactText: record.exclusionText,
        conditions: nonEmpty([record.validationNote]),
        sourceFilename: record.sourceFilename ?? null,
        articleSection: null,
        pdfPage: record.pdfPage ?? null,
        humanValidated: record.humanValidated,
      }),
    );
  }

  for (const record of detail.providerNetworks) {
    facts.push(
      createFact({
        factId: record.networkId,
        sourceRecordType: "provider_network",
        topicKey: "network",
        category: record.providerType ?? "network",
        measureType: "network",
        title: record.providerName,
        exactText: nonEmpty([record.providerName, record.region, record.networkStatus]).join(" · "),
        conditions: nonEmpty([record.versionNote, record.validFrom, record.validTo, record.lastVerifiedAt]),
        sourceFilename: null,
        articleSection: null,
        pdfPage: null,
        humanValidated: record.humanValidated,
      }),
    );
  }

  for (const record of detail.procedureFees) {
    facts.push(
      createFact({
        factId: record.feeId,
        sourceRecordType: "procedure_fee",
        topicKey: "surgery",
        category: record.feeType ?? "procedure_fee",
        measureType: "procedure_fee",
        title: nonEmpty([record.medicalSpecialty, record.severityCategory, record.feeType]).join(" · ") || "Ιατρική αμοιβή",
        exactText:
          record.amount !== undefined
            ? `${record.amount} ${record.currency ?? "(νόμισμα προς επιβεβαίωση)"}`
            : "Δεν έχει καταχωριστεί ποσό.",
        conditions: nonEmpty([record.severityCategory]),
        sourceFilename: record.sourceFilename ?? null,
        articleSection: null,
        pdfPage: null,
        humanValidated: record.humanValidated,
        valueNumber: record.amount ?? null,
        currency: canonicalCurrency(record.currency),
      }),
    );
  }

  for (const record of detail.supplementaryBenefits) {
    const topicKey = canonicalProductTopic(record.benefitName);
    const source = {
      factId: record.benefitId,
      sourceRecordType: "supplementary_benefit" as const,
      topicKey,
      category: "supplementary_benefit",
      title: record.benefitName,
      sourceFilename: record.sourceFilename ?? null,
      articleSection: null,
      pdfPage: null,
      humanValidated: record.humanValidated,
    };
    facts.push(
      createFact({
        ...source,
        measureType: "service",
        exactText: record.exactOperationConditions ?? record.benefitName,
        conditions: nonEmpty([record.durationExpiry]),
      }),
    );
    if (record.waitingText) {
      const duration = uniqueDuration(record.waitingText);
      facts.push(
        createFact({
          ...source,
          measureType: "waiting_period",
          exactText: record.waitingText,
          conditions: [],
          durationValue: duration?.value ?? null,
          durationUnit: duration?.unit ?? null,
        }),
      );
    }
  }

  for (const record of detail.claimRules) {
    facts.push(
      createFact({
        factId: record.claimRuleId,
        sourceRecordType: "claim_rule",
        topicKey: canonicalProductTopic(record.claimCase),
        category: "claim_rule",
        measureType: "service",
        title: record.claimCase,
        exactText: record.exactProcess ?? record.claimCase,
        conditions: nonEmpty([record.deadlineLimit]),
        sourceFilename: null,
        articleSection: null,
        pdfPage: null,
        humanValidated: record.humanValidated,
      }),
    );
  }

  return dedupeFacts(facts).sort((left, right) =>
    [left.topicKey, left.sourceRecordType, left.factId, left.measureType, left.exactText]
      .join("|")
      .localeCompare(
        [right.topicKey, right.sourceRecordType, right.factId, right.measureType, right.exactText].join("|"),
        "el",
      ),
  );
}

export const normalizeProductFacts = normalizeComparableProductFacts;
