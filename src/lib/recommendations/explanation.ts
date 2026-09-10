import type {
  LiveRecommendation,
  LiveRecommendationCategory,
} from "./contracts";

export interface AllowedClaim {
  id: string;
  topic: string;
  statement: string;
  evidenceIds: string[];
  sourceType: string;
}

export interface RecommendationExplanationInput {
  category: LiveRecommendationCategory;
  relatedNeeds: string[];
  allowedClaims: AllowedClaim[];
  restrictions: string[];
  productName: string;
  insurer: string;
  strengthTitles: string[];
  tradeOffs: string[];
  missingEvidenceTitles: string[];
}

export interface RecommendationExplanationOutput {
  paragraph: string;
  usedClaimIds: string[];
  confirmationNote: string;
}

interface GroundedPresentationSource {
  relatedNeeds: string[];
  allowedClaims: AllowedClaim[];
  restrictions: string[];
  strengths: Array<{ title: string }>;
  tradeOffs: string[];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const hasOnlyKeys = (
  value: Record<string, unknown>,
  expected: readonly string[],
) => {
  const keys = Object.keys(value);
  return (
    keys.length === expected.length &&
    keys.every((key) => expected.includes(key))
  );
};

const isBoundedString = (value: unknown, maximum = 800): value is string =>
  typeof value === "string" &&
  value.trim().length > 0 &&
  value.length <= maximum;

const isBoundedStringArray = (
  value: unknown,
  maximumItems: number,
  maximumLength = 500,
  minimumItems = 0,
): value is string[] =>
  Array.isArray(value) &&
  value.length >= minimumItems &&
  value.length <= maximumItems &&
  value.every((item) => isBoundedString(item, maximumLength));

const normalizeForComparison = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("el-GR")
    .replace(/\s+/g, " ")
    .trim();

const absoluteForbiddenPhrases = [
  "πλήρης κάλυψη",
  "πληρης καλυψη",
  "πληρέστερη κάλυψη",
  "πληρεστερη καλυψη",
  "καλύτερο πρόγραμμα",
  "καλυτερο προγραμμα",
  "εγγυημένη κάλυψη",
  "εγγυημενη καλυψη",
  "εγγυημένο",
  "εγγυημενο",
  "σίγουρα",
  "σιγουρα",
] as const;

const conditionallyAllowedPhrases = [
  "μεγάλο δίκτυο νοσοκομείων",
  "μεγαλο δικτυο νοσοκομειων",
  "μηδενική απαλλαγή",
  "μηδενικη απαλλαγη",
  "άμεση χρήση",
  "αμεση χρηση",
] as const;

const englishTechnicalTerms =
  /\b(waiting periods?|deductible|coverage|network fact|evidence|claim ids?|proxy|database signal|active individual-product scope|text-derived indicator)\b/iu;

const hasEllipsis = (value: string) => /…|\.\.\./u.test(value);

export function explanationWordCount(value: string) {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

function hasForbiddenLanguage(value: string, allowedSource = "") {
  const normalized = normalizeForComparison(value);
  const normalizedAllowedSource = normalizeForComparison(allowedSource);

  if (
    absoluteForbiddenPhrases.some((phrase) =>
      normalized.includes(normalizeForComparison(phrase)),
    )
  ) {
    return true;
  }

  return conditionallyAllowedPhrases.some((phrase) => {
    const normalizedPhrase = normalizeForComparison(phrase);
    return (
      normalized.includes(normalizedPhrase) &&
      !normalizedAllowedSource.includes(normalizedPhrase)
    );
  });
}

function hasAbsoluteForbiddenLanguage(value: string) {
  const normalized = normalizeForComparison(value);
  return absoluteForbiddenPhrases.some((phrase) =>
    normalized.includes(normalizeForComparison(phrase)),
  );
}

function extractNumericTokens(value: string) {
  return [...value.matchAll(/\d+(?:[.,]\d+)*/gu)].map((match) =>
    match[0].replace(/\s+/g, ""),
  );
}

function hasUnsupportedNumericTokens(
  output: string,
  input: RecommendationExplanationInput,
) {
  const allowedText = [
    input.productName,
    input.insurer,
    ...input.allowedClaims.map((claim) => claim.statement),
    ...input.restrictions,
  ].join(" ");
  const allowedTokens = new Set(extractNumericTokens(allowedText));

  return extractNumericTokens(output).some((token) => !allowedTokens.has(token));
}

export function isValidExplanationParagraph(value: unknown): value is string {
  if (!isBoundedString(value, 2_000)) return false;
  const words = explanationWordCount(value);
  return (
    words >= 80 &&
    words <= 120 &&
    !hasEllipsis(value) &&
    !englishTechnicalTerms.test(value) &&
    !hasAbsoluteForbiddenLanguage(value)
  );
}

export function validateRecommendationExplanationInput(
  value: unknown,
): RecommendationExplanationInput | null {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, [
      "category",
      "relatedNeeds",
      "allowedClaims",
      "restrictions",
      "productName",
      "insurer",
      "strengthTitles",
      "tradeOffs",
      "missingEvidenceTitles",
    ]) ||
    !["best-match", "premium-choice", "smart-budget-choice"].includes(
      String(value.category),
    ) ||
    !isBoundedStringArray(value.relatedNeeds, 10, 260, 1) ||
    !Array.isArray(value.allowedClaims) ||
    value.allowedClaims.length < 2 ||
    value.allowedClaims.length > 12 ||
    !value.allowedClaims.every(
      (claim) =>
        isRecord(claim) &&
        hasOnlyKeys(claim, [
          "id",
          "topic",
          "statement",
          "evidenceIds",
          "sourceType",
        ]) &&
        isBoundedString(claim.id, 100) &&
        isBoundedString(claim.topic, 180) &&
        isBoundedString(claim.statement, 1_200) &&
        isBoundedStringArray(claim.evidenceIds, 20, 180, 1) &&
        isBoundedString(claim.sourceType, 100),
    ) ||
    new Set(
      value.allowedClaims.map((claim) =>
        isRecord(claim) ? String(claim.id) : "",
      ),
    ).size !== value.allowedClaims.length ||
    !isBoundedStringArray(value.restrictions, 8, 1_200) ||
    !isBoundedString(value.productName, 160) ||
    !isBoundedString(value.insurer, 160) ||
    !isBoundedStringArray(value.strengthTitles, 6, 240) ||
    !isBoundedStringArray(value.tradeOffs, 6, 700) ||
    !isBoundedStringArray(value.missingEvidenceTitles, 6, 220)
  ) {
    return null;
  }

  return value as unknown as RecommendationExplanationInput;
}

export function validateRecommendationExplanationOutput(
  value: unknown,
  input: RecommendationExplanationInput,
): RecommendationExplanationOutput | null {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, ["paragraph", "usedClaimIds", "confirmationNote"]) ||
    !isBoundedString(value.paragraph, 2_000) ||
    !isBoundedStringArray(value.usedClaimIds, 6, 100, 2) ||
    !isBoundedString(value.confirmationNote, 600)
  ) {
    return null;
  }

  const allowedIds = new Set(input.allowedClaims.map((claim) => claim.id));
  if (
    new Set(value.usedClaimIds).size !== value.usedClaimIds.length ||
    value.usedClaimIds.some((id) => !allowedIds.has(id))
  ) {
    return null;
  }

  const outputText = `${value.paragraph} ${value.confirmationNote}`;
  const allowedSource = [
    ...input.allowedClaims.map((claim) => claim.statement),
    ...input.restrictions,
  ].join(" ");
  const words = explanationWordCount(value.paragraph);

  if (
    words < 80 ||
    words > 120 ||
    hasEllipsis(outputText) ||
    englishTechnicalTerms.test(outputText) ||
    hasForbiddenLanguage(outputText, allowedSource) ||
    hasUnsupportedNumericTokens(outputText, input)
  ) {
    return null;
  }

  return value as unknown as RecommendationExplanationOutput;
}

export function toCustomerGreekText(value: string) {
  return value
    .replace(/One Day Surgery/giu, "Χειρουργείο μίας ημέρας")
    .replace(/One Day Clinic/giu, "Κλινική ημερήσιας νοσηλείας")
    .replace(/check[ -]?up/giu, "προληπτικό έλεγχο")
    .replace(/Call Center/giu, "τηλεφωνικό κέντρο")
    .replace(/outpatient/giu, "εξωνοσοκομειακή χρήση")
    .replace(/waiting periods?/giu, "περίοδος αναμονής")
    .replace(/deductible/giu, "απαλλαγή")
    .replace(/coverage/giu, "κάλυψη")
    .replace(/plafond/giu, "διαθέσιμο όριο")
    .replace(/Emergency benefits/giu, "παροχές επειγόντων")
    .replace(/…|\.\.\./gu, ".")
    .replace(/\.{2,}/gu, ".")
    .replace(/\s+/g, " ")
    .trim();
}

const truncateWordsWithoutEllipsis = (value: string, maximum: number) => {
  const words = toCustomerGreekText(value).split(/\s+/).filter(Boolean);
  return words.slice(0, maximum).join(" ").replace(/[.,:;]$/u, "");
};

const joinGreek = (values: string[]) => {
  if (values.length <= 1) return values[0] ?? "τις δηλωμένες ανάγκες";
  if (values.length === 2) return `${values[0]} και ${values[1]}`;
  return `${values.slice(0, -1).join(", ")} και ${values.at(-1)}`;
};

const claimTitle = (claim: AllowedClaim) =>
  truncateWordsWithoutEllipsis(claim.statement.split(":")[0] ?? claim.topic, 9);

function categoryLead(category: LiveRecommendationCategory) {
  switch (category) {
    case "premium-choice":
      return "Η συγκεκριμένη επιλογή λειτουργεί ως πιο ενισχυμένη κατεύθυνση μέσα στην τρέχουσα τριάδα.";
    case "smart-budget-choice":
      return "Η συγκεκριμένη επιλογή κρατά πιο ισορροπημένη κατεύθυνση μέσα στην τρέχουσα τριάδα.";
    case "best-match":
    default:
      return "Η συγκεκριμένη επιλογή είναι η πιο κοντινή αντιστοίχιση μέσα στην τρέχουσα τριάδα.";
  }
}

export function buildDeterministicExplanation(
  input: RecommendationExplanationInput,
): RecommendationExplanationOutput {
  const usedClaims = input.allowedClaims.slice(0, 3);
  const needs = input.relatedNeeds
    .slice(0, 3)
    .map((need) => truncateWordsWithoutEllipsis(need, 9));
  const titles = usedClaims.map((claim) => `«${claimTitle(claim)}»`);
  const strengthTitles = input.strengthTitles
    .slice(0, 2)
    .map((title) => `«${truncateWordsWithoutEllipsis(title, 8)}»`);
  const strengthSummary =
    strengthTitles.length > 0
      ? joinGreek(strengthTitles)
      : "τα τεκμηριωμένα στοιχεία που είναι διαθέσιμα";
  const tradeOff = truncateWordsWithoutEllipsis(
    input.tradeOffs[0] ??
      input.restrictions[0] ??
      "Η εφαρμογή των όρων χρειάζεται επιβεβαίωση από ασφαλιστικό σύμβουλο",
    18,
  );
  const missingEvidence = input.missingEvidenceTitles[0]
    ? `Παραμένει επίσης ανοιχτό το σημείο «${truncateWordsWithoutEllipsis(input.missingEvidenceTitles[0], 8)}».`
    : "";
  const restriction = truncateWordsWithoutEllipsis(
    input.restrictions[0] ??
      "Η εφαρμογή των όρων χρειάζεται επιβεβαίωση από ασφαλιστικό σύμβουλο",
    18,
  );
  const productName = truncateWordsWithoutEllipsis(input.productName, 8);
  const insurer = truncateWordsWithoutEllipsis(input.insurer, 6);
  const paragraph = `Για το ${productName} της ${insurer}, ${categoryLead(input.category).toLocaleLowerCase("el-GR")} Η αξιολόγηση βασίζεται σε διαθέσιμους όρους και συνδέει ${joinGreek(needs)} με συγκεκριμένη τεκμηρίωση. Εμφανίζονται ${joinGreek(titles)}, ενώ ως βασικά θετικά σημεία προκύπτουν ${strengthSummary}. Έτσι η πρόταση δεν πατά σε γενικές υποθέσεις για το προϊόν. Παράλληλα, ${tradeOff}. ${missingEvidence} Πριν προχωρήσει ο πελάτης, οι τελικές καλύψεις, οι εξαιρέσεις και ο τρόπος εφαρμογής τους πρέπει να επιβεβαιωθούν από ασφαλιστικό σύμβουλο.`
    .replace(/\s+/g, " ")
    .trim();

  return {
    paragraph,
    usedClaimIds: usedClaims.map((claim) => claim.id),
    confirmationNote: restriction,
  };
}

export function createRecommendationExplanationInput(
  recommendation: LiveRecommendation,
  presentation: GroundedPresentationSource,
): RecommendationExplanationInput {
  return {
    category: recommendation.category,
    relatedNeeds: presentation.relatedNeeds,
    allowedClaims: presentation.allowedClaims,
    restrictions: presentation.restrictions,
    productName: recommendation.programName,
    insurer: recommendation.insurer,
    strengthTitles: presentation.strengths.map((item) => item.title),
    tradeOffs: presentation.tradeOffs,
    missingEvidenceTitles: recommendation.missingEvidence.map(
      (item) => item.title,
    ),
  };
}
