import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

import { assessmentConfig } from "../src/lib/assessment/config.ts";
import {
  questionnaireV1,
  versionBaseline,
} from "./fixtures/milestone-3b-v1-baseline.mjs";
import {
  artifactPath,
  canonicalJson,
  hashContract,
  isApprovedMutationAllowed,
  isValidStatusTransition,
  loadAuthoritativeContract,
  projectRoot,
  renderArtifact,
  validateContract,
  validateContractRegistry,
} from "./generate-questionnaire-v2-contract.mjs";

const clone = (value) => structuredClone(value);
const hasError = (errors, code) => errors.some((error) => error.code === code);
const sha256 = (value) =>
  createHash("sha256").update(value, "utf8").digest("hex");
const countMatches = (value, pattern) => [...value.matchAll(pattern)].length;

function extractSqlBlock(startMarker, endMarker) {
  const start = migrationSql.indexOf(startMarker);
  assert.notEqual(start, -1, `${startMarker} was not found.`);
  const end = migrationSql.indexOf(endMarker, start);
  assert.notEqual(end, -1, `${endMarker} was not found.`);
  return migrationSql.slice(start, end + endMarker.length);
}

function extractFunctionDefinition(name) {
  const startMarker = `CREATE OR REPLACE FUNCTION ${name}`;
  const start = migrationSql.indexOf(startMarker);
  assert.notEqual(start, -1, `${name} definition was not found.`);
  const endMarker = "\n$$;";
  const end = migrationSql.indexOf(endMarker, start);
  assert.notEqual(end, -1, `${name} definition terminator was not found.`);
  return migrationSql.slice(start, end + endMarker.length);
}

const { contract, migrationSql } = await loadAuthoritativeContract();
const artifact = await readFile(artifactPath, "utf8");

assert.deepEqual(validateContractRegistry([contract]), []);
assert.equal(contract.contractVersion, "im-health-assessment-2026-07-v2");
assert.equal(contract.answerSchemaVersion, "im-health-assessment-answers-2026-07-v2");
assert.equal(contract.semanticVersion, "2.0.0-draft.1");
assert.equal(contract.contentRevision, 1);
assert.equal(contract.status, "draft");
assert.equal(contract.runtimeActive, false);
assert.equal(contract.effectiveFrom, null);
assert.equal(contract.effectiveTo, null);
assert.equal(contract.maxMembers, 8);
assert.equal(contract.questions.length, 8);
assert.equal(contract.evidenceWorkflows.length, 1);

const expectedHash = "3e899fa79cfd77183b682299f3507b506facc80ddbc393514a1b2fecea52054a";
assert.equal(hashContract(contract), expectedHash);
assert.match(migrationSql, new RegExp(`v_contract_hash text := '${expectedHash}'`, "u"));
assert.match(artifact, new RegExp(`"contractHash": "${expectedHash}"`, "u"));
assert.equal(renderArtifact(contract), artifact);
assert.equal(renderArtifact(clone(contract)), renderArtifact(contract));
assert.equal(hashContract(clone(contract)), hashContract(contract));
assert.equal(canonicalJson(clone(contract)), canonicalJson(contract));
assert.notEqual(
  hashContract({
    ...clone(contract),
    status: "approved",
    runtimeActive: true,
    effectiveFrom: "2026-08-01T00:00:00.000Z",
  }),
  expectedHash,
);

const v1FixtureSource = await readFile(
  join(projectRoot, "scripts/fixtures/milestone-3b-v1-baseline.mjs"),
  "utf8",
);
assert.equal(
  sha256(v1FixtureSource),
  "c28e45daa6c28e4adc1b19aff8bfba19801486311b05cf95f146430d96132026",
);
assert.equal(versionBaseline.questionnaireContractVersion, "im-health-assessment-2026-07-v1");
assert.equal(versionBaseline.assessmentSubmissionVersion, 4);

const frontendByQuestionId = {
  Q_INSURED_PEOPLE: "insuredPeople",
  Q_BIRTH_DATES: "birthDates",
  Q_EXISTING_INSURANCE: "currentInsurance",
  Q_EVALUATION_GOAL: "evaluationGoal",
  Q_PRIORITIES: "priorities",
  Q_DEDUCTIBLE_PREFERENCE: "deductible",
  Q_PROTECTION_COST: "costApproach",
  Q_ADDITIONAL_NEEDS: "additionalNeeds",
};
const frontendCanonicalQuestionIds = new Set([
  "Q_PRIORITIES",
  "Q_DEDUCTIBLE_PREFERENCE",
  "Q_PROTECTION_COST",
  "Q_ADDITIONAL_NEEDS",
]);
const questionById = Object.fromEntries(
  contract.questions.map((question) => [question.questionId, question]),
);
const frontendOptionProjection = (option) => ({
  canonicalValue: option.id,
  label: option.label,
  ...(option.description === undefined ? {} : { description: option.description }),
  ...(option.categoryBadge === undefined
    ? {}
    : { categoryBadge: option.categoryBadge }),
});
const contractOptionProjection = (option) => ({
  canonicalValue: option.canonicalValue,
  label: option.label,
  ...(option.description === undefined ? {} : { description: option.description }),
  ...(option.categoryBadge === undefined
    ? {}
    : { categoryBadge: option.categoryBadge }),
});
assert.deepEqual(
  contract.questions.map((question) => question.questionId),
  Object.keys(frontendByQuestionId),
);
for (const question of contract.questions) {
  const frontendKey = frontendByQuestionId[question.questionId];
  const v1Definition = questionnaireV1.frontend[frontendKey];
  const config = assessmentConfig[frontendKey];
  assert.equal(question.questionText, config.title);
  assert.equal(question.required, v1Definition.required);
  assert.equal(question.questionRevision, 1);
  assert.equal(question.contentRevision, 1);
  assert.deepEqual(question.conditionalVisibility, { operator: "always" });

  if (v1Definition.values) {
    const expectedCanonicalValues = frontendCanonicalQuestionIds.has(
      question.questionId,
    )
      ? config.options.map((option) => option.id)
      : Object.values(v1Definition.values);
    assert.deepEqual(
      question.options.map((option) => option.canonicalValue),
      expectedCanonicalValues,
    );
    assert.deepEqual(
      question.options.map((option) => option.label),
      config.options.map((option) => option.label),
    );
    if (frontendCanonicalQuestionIds.has(question.questionId)) {
      assert.deepEqual(
        question.options.map(contractOptionProjection),
        config.options.map(frontendOptionProjection),
      );
    }
    assert.deepEqual(
      question.validation.allowedValues,
      question.options.map((option) => option.canonicalValue),
    );
  } else {
    assert.deepEqual(question.options, []);
  }

  for (const forbiddenKey of ["score", "signal", "weight", "eligibility"]) {
    assert.equal(Object.hasOwn(question, forbiddenKey), false);
  }
}

assert.deepEqual(
  questionById.Q_PRIORITIES.options.map(contractOptionProjection),
  assessmentConfig.priorities.options.map(frontendOptionProjection),
);
assert.deepEqual(
  questionById.Q_DEDUCTIBLE_PREFERENCE.options.map(contractOptionProjection),
  assessmentConfig.deductible.options.map(frontendOptionProjection),
);
assert.deepEqual(
  questionById.Q_PROTECTION_COST.options.map(contractOptionProjection),
  assessmentConfig.costApproach.options.map(frontendOptionProjection),
);
assert.deepEqual(
  questionById.Q_ADDITIONAL_NEEDS.options.map(contractOptionProjection),
  assessmentConfig.additionalNeeds.options.map(frontendOptionProjection),
);

assert.equal(
  contract.questions.some((question) =>
    ["Q_EXISTING_POLICY_UPLOAD", "policyUpload"].includes(question.questionId),
  ),
  false,
);
assert.equal(
  contract.questions.some((question) =>
    ["existing_policy_upload", "policyFile", "policySnapshot"].includes(
      question.answerKey,
    ),
  ),
  false,
);
const evidenceWorkflow = contract.evidenceWorkflows[0];
assert.deepEqual(
  {
    id: evidenceWorkflow.workflowId,
    required: evidenceWorkflow.required,
    inQuestionCount: evidenceWorkflow.includedInQuestionCount,
    inScoring: evidenceWorkflow.includedInScoringAnswers,
    purpose: evidenceWorkflow.metadata.purpose,
  },
  {
    id: "EXISTING_POLICY_PDF_UPLOAD",
    required: false,
    inQuestionCount: false,
    inScoring: false,
    purpose: "optional_evidence",
  },
);

const duplicateVersion = validateContractRegistry([contract, clone(contract)]);
assert.ok(hasError(duplicateVersion, "duplicate_contract_version"));

const duplicateQuestion = clone(contract);
duplicateQuestion.questions.push(clone(duplicateQuestion.questions[0]));
const duplicateQuestionErrors = validateContract(duplicateQuestion);
assert.ok(hasError(duplicateQuestionErrors, "duplicate_question_id"));
assert.ok(hasError(duplicateQuestionErrors, "duplicate_question_revision"));

const secondContractWithReusedRevision = clone(contract);
secondContractWithReusedRevision.contractVersion = "im-health-assessment-2026-07-v3-test";
const duplicateRevisionErrors = validateContractRegistry([
  contract,
  secondContractWithReusedRevision,
]);
assert.ok(hasError(duplicateRevisionErrors, "duplicate_question_revision"));

const duplicateOptionId = clone(contract);
duplicateOptionId.questions[0].options[1].optionId =
  duplicateOptionId.questions[0].options[0].optionId;
assert.ok(hasError(validateContract(duplicateOptionId), "duplicate_option_id"));

const duplicateCanonicalOption = clone(contract);
duplicateCanonicalOption.questions[0].options[1].canonicalValue =
  duplicateCanonicalOption.questions[0].options[0].canonicalValue;
duplicateCanonicalOption.questions[0].validation.allowedValues[1] =
  duplicateCanonicalOption.questions[0].validation.allowedValues[0];
assert.ok(
  hasError(validateContract(duplicateCanonicalOption), "duplicate_canonical_option"),
);

const invalidOptionDescription = clone(contract);
invalidOptionDescription.questions[5].options[0].description = "";
assert.ok(
  hasError(validateContract(invalidOptionDescription), "invalid_option_description"),
);

const invalidOptionCategoryBadge = clone(contract);
invalidOptionCategoryBadge.questions[6].options[0].categoryBadge = "";
assert.ok(
  hasError(validateContract(invalidOptionCategoryBadge), "invalid_option_category_badge"),
);

const invalidStatus = clone(contract);
invalidStatus.status = "active";
assert.ok(hasError(validateContract(invalidStatus), "invalid_status"));

for (const [from, to] of [
  ["draft", "retired"],
  ["approved", "draft"],
  ["retired", "approved"],
]) {
  assert.equal(isValidStatusTransition(from, to), false, `${from}->${to}`);
}
for (const [from, to] of [
  ["draft", "approved"],
  ["approved", "retired"],
]) {
  assert.equal(isValidStatusTransition(from, to), true, `${from}->${to}`);
}

const approved = {
  ...clone(contract),
  status: "approved",
  runtimeActive: true,
  effectiveFrom: "2026-08-01T00:00:00.000Z",
  approvedAt: "2026-07-20T00:00:00.000Z",
  approvedBy: "reviewer-fixture",
};
assert.equal(isApprovedMutationAllowed(approved, clone(approved)), true);
const mutatedApproved = clone(approved);
mutatedApproved.maxMembers = 9;
assert.equal(isApprovedMutationAllowed(approved, mutatedApproved), false);
const retired = {
  ...clone(approved),
  status: "retired",
  runtimeActive: false,
  effectiveTo: "2027-01-01T00:00:00.000Z",
  retiredAt: "2026-12-01T00:00:00.000Z",
  retiredBy: "reviewer-fixture",
};
assert.equal(isApprovedMutationAllowed(approved, retired), true);

for (const maxMembers of [0, -1, 51, 1.5, "8"]) {
  const invalidMembers = clone(contract);
  invalidMembers.maxMembers = maxMembers;
  assert.ok(hasError(validateContract(invalidMembers), "invalid_max_members"));
}

const invalidDateRange = {
  ...clone(contract),
  status: "approved",
  runtimeActive: false,
  effectiveFrom: "2027-01-01T00:00:00.000Z",
  effectiveTo: "2026-12-31T00:00:00.000Z",
};
assert.ok(hasError(validateContract(invalidDateRange), "invalid_effective_range"));

const invalidVisibility = clone(contract);
invalidVisibility.evidenceWorkflows[0].conditionalVisibility.conditions.push({
  questionId: "Q_DOES_NOT_EXIST",
  operator: "equals",
  value: "x",
});
assert.ok(
  hasError(validateContract(invalidVisibility), "unknown_visibility_question"),
);

const evidenceAsQuestion = clone(contract);
evidenceAsQuestion.evidenceWorkflows[0].includedInQuestionCount = true;
assert.ok(hasError(validateContract(evidenceAsQuestion), "evidence_in_question_count"));
const evidenceAsScore = clone(contract);
evidenceAsScore.evidenceWorkflows[0].includedInScoringAnswers = true;
assert.ok(hasError(validateContract(evidenceAsScore), "evidence_in_scoring"));

const permissionsBlock = extractSqlBlock(
  "DO $questionnaire_v2_permissions$",
  "$questionnaire_v2_permissions$;",
);
const migrationWithoutPermissionsBlock = migrationSql.replace(permissionsBlock, "");
for (const roleName of ["anon", "authenticated", "service_role"]) {
  assert.match(
    permissionsBlock,
    new RegExp(`IF EXISTS \\(SELECT 1 FROM pg_roles WHERE rolname = '${roleName}'\\) THEN`, "u"),
    `${roleName} grants must be conditional on pg_roles.`,
  );
}
assert.doesNotMatch(
  migrationWithoutPermissionsBlock,
  /\b(?:GRANT|REVOKE)\b[\s\S]*?\b(?:anon|authenticated|service_role)\b[\s\S]*?;/iu,
);
assert.ok(
  permissionsBlock.includes(
    "EXECUTE 'GRANT EXECUTE ON FUNCTION intake.questionnaire_visibility_references_are_valid(text, jsonb) TO service_role'",
  ),
);

const visibilityHelper = extractFunctionDefinition(
  "intake.questionnaire_visibility_references_are_valid",
);
assert.match(visibilityHelper, /\bSECURITY DEFINER\b/u);
assert.match(visibilityHelper, /SET search_path = pg_catalog, intake/u);
assert.doesNotMatch(
  permissionsBlock,
  /GRANT EXECUTE ON FUNCTION intake\.questionnaire_visibility_references_are_valid\(text, jsonb\) TO (?:anon|authenticated)/u,
);

const contentGuard = extractFunctionDefinition(
  "intake.guard_questionnaire_contract_content",
);
assert.equal(countMatches(contentGuard, /\bFOR UPDATE\b/gu), 2);
assert.match(contentGuard, /OLD\.contract_version/u);
assert.match(contentGuard, /NEW\.contract_version/u);
assert.match(contentGuard, /Questionnaire child row references an unknown contract version\./u);

const normalizedPayloadFunction = extractFunctionDefinition(
  "intake.questionnaire_contract_normalized_payload",
);
assert.match(normalizedPayloadFunction, /\bSECURITY DEFINER\b/u);
assert.match(normalizedPayloadFunction, /p_answer_schema_version text/u);
assert.match(normalizedPayloadFunction, /p_status intake\.questionnaire_contract_status/u);
assert.match(normalizedPayloadFunction, /'answerSchemaVersion', p_answer_schema_version/u);
assert.match(normalizedPayloadFunction, /'status', p_status::text/u);
assert.match(normalizedPayloadFunction, /jsonb_strip_nulls\(jsonb_build_object/u);
assert.match(normalizedPayloadFunction, /'description', option\.description/u);
assert.match(normalizedPayloadFunction, /'categoryBadge', option\.category_badge/u);
assert.match(normalizedPayloadFunction, /ORDER BY question\.display_order/u);
assert.match(normalizedPayloadFunction, /ORDER BY option\.display_order/u);
assert.match(
  normalizedPayloadFunction,
  /ORDER BY workflow\.workflow_id, workflow\.workflow_revision/u,
);
assert.doesNotMatch(
  normalizedPayloadFunction,
  /FROM\s+intake\.questionnaire_contract_version/iu,
);

const versionGuard = extractFunctionDefinition(
  "intake.guard_questionnaire_contract_version",
);
const approvalHashBlock = extractSqlBlock(
  "SELECT intake.questionnaire_contract_hash(",
  "INTO v_normalized_hash;",
);
assert.match(
  versionGuard,
  /NEW\.contract_hash IS DISTINCT FROM intake\.questionnaire_contract_hash\(NEW\.source_payload\)/u,
);
for (const newField of [
  "NEW.contract_version",
  "NEW.answer_schema_version",
  "NEW.semantic_version",
  "NEW.content_revision",
  "NEW.status",
  "NEW.runtime_active",
  "NEW.effective_from",
  "NEW.effective_to",
  "NEW.max_members",
  "NEW.review_metadata",
]) {
  assert.ok(approvalHashBlock.includes(newField), newField);
}
assert.doesNotMatch(
  approvalHashBlock,
  /questionnaire_contract_normalized_payload\(\s*NEW\.contract_version\s*\)/u,
);
assert.doesNotMatch(
  approvalHashBlock,
  /FROM\s+intake\.questionnaire_contract_version/iu,
);
assert.match(
  versionGuard,
  /Approved questionnaire source payload does not match normalized revisions\./u,
);

for (const expectedSql of [
  "UNIQUE (question_id, question_revision)",
  "UNIQUE (contract_version, question_id, question_revision, canonical_value)",
  "description text CHECK (description IS NULL OR length(btrim(description)) > 0)",
  "category_badge text CHECK (category_badge IS NULL OR length(btrim(category_badge)) > 0)",
  "option->>'description'",
  "option->>'categoryBadge'",
  "Invalid questionnaire contract status transition.",
  "Approved questionnaire contracts are immutable.",
  "Questionnaire contract versions are append-only and cannot be deleted.",
  "Questionnaire contract versions must be inserted as inactive drafts.",
  "CHECK (max_members BETWEEN 1 AND 50)",
  "CHECK (contract_hash = intake.questionnaire_contract_hash(source_payload))",
  "CHECK (NOT included_in_question_count)",
  "CHECK (NOT included_in_scoring_answers)",
  "DEFERRABLE INITIALLY DEFERRED",
  "CREATE OR REPLACE FUNCTION intake.questionnaire_canonical_json",
  "CREATE OR REPLACE FUNCTION intake.questionnaire_contract_normalized_payload",
  "DO $questionnaire_v2_permissions$",
]) {
  assert.ok(migrationSql.includes(expectedSql), expectedSql);
}
assert.doesNotMatch(migrationSql, /CREATE OR REPLACE FUNCTION app_api\./u);
assert.doesNotMatch(migrationSql, /GRANT [^;]+ TO (anon|authenticated)/u);
assert.doesNotMatch(migrationSql, /UPDATE\s+intake\.question\b/iu);
assert.doesNotMatch(migrationSql, /DELETE\s+FROM\s+intake\.question\b/iu);

async function sourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await sourceFiles(path));
    else if (/\.(?:ts|tsx|js|jsx|mjs)$/u.test(entry.name)) files.push(path);
  }
  return files;
}

for (const runtimeFile of await sourceFiles(join(projectRoot, "src"))) {
  const source = await readFile(runtimeFile, "utf8");
  assert.doesNotMatch(source, /questionnaireContractV2/u, runtimeFile);
  assert.doesNotMatch(source, /questionnaire-v2-contract\.generated/u, runtimeFile);
  assert.doesNotMatch(source, /im-health-assessment-2026-07-v2/u, runtimeFile);
}

console.log(
  `Questionnaire v2 draft schema/artifact assertions passed (${expectedHash}).`,
);
