import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
export const projectRoot = resolve(scriptDirectory, "..");
export const migrationPath = resolve(
  projectRoot,
  "supabase/migrations/202607160003_draft_questionnaire_contract_v2.sql",
);
export const artifactPath = resolve(
  projectRoot,
  "generated/questionnaire-v2-contract.generated.ts",
);

const sourcePattern =
  /\$questionnaire_v2_contract\$\r?\n([\s\S]*?)\r?\n\$questionnaire_v2_contract\$/u;

const isRecord = (value) =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function sortForCanonicalJson(value) {
  if (Array.isArray(value)) return value.map(sortForCanonicalJson);
  if (!isRecord(value)) return value;

  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, sortForCanonicalJson(value[key])]),
  );
}

export const canonicalJson = (value) =>
  JSON.stringify(sortForCanonicalJson(value));

export const hashContract = (contract) =>
  createHash("sha256").update(canonicalJson(contract), "utf8").digest("hex");

export function extractContractSource(migrationSql) {
  const match = migrationSql.match(sourcePattern);
  if (!match) {
    throw new Error("Questionnaire v2 contract source block was not found.");
  }

  return JSON.parse(match[1]);
}

const collectQuestionReferences = (value, references = []) => {
  if (Array.isArray(value)) {
    for (const item of value) collectQuestionReferences(item, references);
    return references;
  }
  if (!isRecord(value)) return references;

  if (Object.hasOwn(value, "questionId")) references.push(value.questionId);
  for (const child of Object.values(value)) {
    collectQuestionReferences(child, references);
  }
  return references;
};

const duplicateValues = (values) => {
  const seen = new Set();
  const duplicates = new Set();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates];
};

const isValidDateTime = (value) =>
  typeof value === "string" && Number.isFinite(Date.parse(value));

export function validateContract(contract) {
  const errors = [];
  const add = (code, path, message) => errors.push({ code, path, message });

  if (!isRecord(contract)) {
    return [{ code: "invalid_contract", path: "$", message: "Contract must be an object." }];
  }
  if (!["draft", "approved", "retired"].includes(contract.status)) {
    add("invalid_status", "status", "Status must be draft, approved, or retired.");
  }
  if (!Number.isInteger(contract.contentRevision) || contract.contentRevision < 1) {
    add("invalid_content_revision", "contentRevision", "Content revision must be positive.");
  }
  if (!Number.isInteger(contract.maxMembers) || contract.maxMembers < 1 || contract.maxMembers > 50) {
    add("invalid_max_members", "maxMembers", "maxMembers must be between 1 and 50.");
  }
  if (!Array.isArray(contract.questions) || contract.questions.length === 0) {
    add("invalid_questions", "questions", "At least one question is required.");
  }
  if (contract.status === "draft") {
    if (contract.runtimeActive !== false) {
      add("draft_runtime_active", "runtimeActive", "Draft contracts cannot be runtime-active.");
    }
    if (contract.effectiveFrom !== null || contract.effectiveTo !== null) {
      add("draft_effective_dates", "effectiveFrom", "Draft contracts cannot have effective dates.");
    }
  }
  if (contract.effectiveFrom !== null && !isValidDateTime(contract.effectiveFrom)) {
    add("invalid_effective_from", "effectiveFrom", "effectiveFrom must be an ISO timestamp or null.");
  }
  if (contract.effectiveTo !== null && !isValidDateTime(contract.effectiveTo)) {
    add("invalid_effective_to", "effectiveTo", "effectiveTo must be an ISO timestamp or null.");
  }
  if (
    isValidDateTime(contract.effectiveFrom) &&
    isValidDateTime(contract.effectiveTo) &&
    Date.parse(contract.effectiveTo) <= Date.parse(contract.effectiveFrom)
  ) {
    add("invalid_effective_range", "effectiveTo", "effectiveTo must be later than effectiveFrom.");
  }

  const questions = Array.isArray(contract.questions) ? contract.questions : [];
  const questionIds = questions.map((question) => question.questionId);
  for (const duplicate of duplicateValues(questionIds)) {
    add("duplicate_question_id", "questions", `Duplicate question ID: ${duplicate}`);
  }
  const questionPairs = questions.map(
    (question) => `${question.questionId}@${question.questionRevision}`,
  );
  for (const duplicate of duplicateValues(questionPairs)) {
    add("duplicate_question_revision", "questions", `Duplicate question revision: ${duplicate}`);
  }

  const questionIdSet = new Set(questionIds);
  for (const [questionIndex, question] of questions.entries()) {
    const questionPath = `questions[${questionIndex}]`;
    if (!Number.isInteger(question.questionRevision) || question.questionRevision < 1) {
      add("invalid_question_revision", `${questionPath}.questionRevision`, "Question revision must be positive.");
    }
    const options = Array.isArray(question.options) ? question.options : [];
    const optionIds = options.map((option) => option.optionId);
    const optionValues = options.map((option) => option.canonicalValue);
    for (const [optionIndex, option] of options.entries()) {
      const optionPath = `${questionPath}.options[${optionIndex}]`;
      if (
        option.description !== undefined &&
        (typeof option.description !== "string" ||
          option.description.trim().length === 0)
      ) {
        add("invalid_option_description", `${optionPath}.description`, "Option description must be a non-empty string.");
      }
      if (
        option.categoryBadge !== undefined &&
        (typeof option.categoryBadge !== "string" ||
          option.categoryBadge.trim().length === 0)
      ) {
        add("invalid_option_category_badge", `${optionPath}.categoryBadge`, "Option categoryBadge must be a non-empty string.");
      }
    }
    for (const duplicate of duplicateValues(optionIds)) {
      add("duplicate_option_id", `${questionPath}.options`, `Duplicate option ID: ${duplicate}`);
    }
    for (const duplicate of duplicateValues(optionValues)) {
      add(
        "duplicate_canonical_option",
        `${questionPath}.options`,
        `Duplicate canonical option value: ${duplicate}`,
      );
    }

    const allowedValues = question.validation?.allowedValues;
    if (allowedValues !== undefined) {
      if (!Array.isArray(allowedValues)) {
        add("invalid_allowed_values", `${questionPath}.validation.allowedValues`, "allowedValues must be an array.");
      } else if (canonicalJson(allowedValues) !== canonicalJson(optionValues)) {
        add("option_validation_mismatch", `${questionPath}.validation.allowedValues`, "Options and allowedValues must match in order.");
      }
    } else if (options.length > 0) {
      add("missing_allowed_values", `${questionPath}.validation`, "Questions with options require allowedValues.");
    }

    for (const reference of collectQuestionReferences(question.conditionalVisibility)) {
      if (!questionIdSet.has(reference)) {
        add("unknown_visibility_question", `${questionPath}.conditionalVisibility`, `Unknown question reference: ${reference}`);
      }
    }
  }

  const evidenceWorkflows = Array.isArray(contract.evidenceWorkflows)
    ? contract.evidenceWorkflows
    : [];
  for (const [workflowIndex, workflow] of evidenceWorkflows.entries()) {
    const workflowPath = `evidenceWorkflows[${workflowIndex}]`;
    if (workflow.includedInQuestionCount !== false) {
      add("evidence_in_question_count", `${workflowPath}.includedInQuestionCount`, "Evidence workflow cannot be a questionnaire question.");
    }
    if (workflow.includedInScoringAnswers !== false) {
      add("evidence_in_scoring", `${workflowPath}.includedInScoringAnswers`, "Evidence workflow cannot be a scoring answer.");
    }
    for (const reference of collectQuestionReferences(workflow.conditionalVisibility)) {
      if (!questionIdSet.has(reference)) {
        add("unknown_visibility_question", `${workflowPath}.conditionalVisibility`, `Unknown question reference: ${reference}`);
      }
    }
  }

  return errors;
}

export function validateContractRegistry(contracts) {
  const errors = contracts.flatMap((contract, index) =>
    validateContract(contract).map((error) => ({
      ...error,
      path: `contracts[${index}].${error.path}`,
    })),
  );
  for (const duplicate of duplicateValues(contracts.map((item) => item.contractVersion))) {
    errors.push({
      code: "duplicate_contract_version",
      path: "contracts",
      message: `Duplicate contract version: ${duplicate}`,
    });
  }
  const revisionPairs = contracts.flatMap((contract) =>
    (contract.questions ?? []).map(
      (question) => `${question.questionId}@${question.questionRevision}`,
    ),
  );
  for (const duplicate of duplicateValues(revisionPairs)) {
    errors.push({
      code: "duplicate_question_revision",
      path: "contracts.questions",
      message: `Duplicate question revision: ${duplicate}`,
    });
  }
  return errors;
}

export const isValidStatusTransition = (from, to) =>
  (from === "draft" && ["draft", "approved"].includes(to)) ||
  (from === "approved" && ["approved", "retired"].includes(to)) ||
  (from === "retired" && to === "retired");

const immutableApprovedProjection = (contract) => {
  const immutable = { ...contract };
  delete immutable.effectiveTo;
  delete immutable.retiredAt;
  delete immutable.retiredBy;
  delete immutable.runtimeActive;
  delete immutable.status;
  return immutable;
};

export function isApprovedMutationAllowed(previous, next) {
  if (previous.status !== "approved") return true;
  if (!isValidStatusTransition(previous.status, next.status)) return false;
  if (canonicalJson(immutableApprovedProjection(previous)) !== canonicalJson(immutableApprovedProjection(next))) {
    return false;
  }
  if (next.status === "approved") return canonicalJson(previous) === canonicalJson(next);
  return (
    next.status === "retired" &&
    next.runtimeActive === false &&
    isValidDateTime(next.effectiveTo) &&
    isValidDateTime(next.retiredAt) &&
    typeof next.retiredBy === "string" &&
    next.retiredBy.trim().length > 0
  );
}

export function renderArtifact(contract) {
  const contractHash = hashContract(contract);
  const artifactContract = sortForCanonicalJson({ ...contract, contractHash });
  return [
    "/* This file is generated by scripts/generate-questionnaire-v2-contract.mjs. */",
    "/* Source: supabase/migrations/202607160003_draft_questionnaire_contract_v2.sql */",
    "/* Draft infrastructure only. Do not import into the v1 runtime. */",
    "",
    `export const questionnaireContractV2 = ${JSON.stringify(artifactContract, null, 2)} as const;`,
    "",
    "export type QuestionnaireContractV2 = typeof questionnaireContractV2;",
    "",
  ].join("\n");
}

export async function loadAuthoritativeContract() {
  const migrationSql = await readFile(migrationPath, "utf8");
  return { contract: extractContractSource(migrationSql), migrationSql };
}

async function run() {
  const { contract } = await loadAuthoritativeContract();
  const errors = validateContractRegistry([contract]);
  if (errors.length > 0) {
    throw new Error(`Invalid questionnaire v2 contract:\n${JSON.stringify(errors, null, 2)}`);
  }

  const expectedArtifact = renderArtifact(contract);
  const write = process.argv.includes("--write");
  if (write) {
    await mkdir(dirname(artifactPath), { recursive: true });
    await writeFile(artifactPath, expectedArtifact, "utf8");
    console.log(`Generated ${artifactPath}`);
    console.log(`contractHash=${hashContract(contract)}`);
    return;
  }

  const checkedInArtifact = await readFile(artifactPath, "utf8");
  if (checkedInArtifact !== expectedArtifact) {
    throw new Error(
      "Generated questionnaire v2 artifact is stale. Run this script with --write.",
    );
  }
  console.log(`Questionnaire v2 artifact parity passed (${hashContract(contract)}).`);
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  await run();
}
