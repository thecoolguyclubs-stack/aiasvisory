import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { pathToFileURL } from "node:url";

const projectRoot = process.cwd();
const fixturePath = join(
  projectRoot,
  "src",
  "lib",
  "evaluation-v2",
  "fixtures",
  "normalization-fixtures.ts",
);
const artifactPath = join(
  projectRoot,
  "generated",
  "insurance-evaluation-v2-rules.generated.ts",
);

const fixtureFile = await readFile(fixturePath, "utf8");
assert.doesNotMatch(
  fixtureFile,
  /\b(?:export\s+function|function\s+[A-Za-z0-9_]+\s*\(|class\s+[A-Za-z0-9_]+|normalize[A-Z]|score[A-Z]|evaluate[A-Z]|assign[A-Z]|explain[A-Z])\b/u,
  "Normalization fixtures must not implement normalization, scoring, eligibility, category, or explanation logic.",
);

const { evaluationV2NormalizationFixtures } = await import(pathToFileURL(fixturePath).href);
const { insuranceEvaluationV2Rules } = await import(pathToFileURL(artifactPath).href);

assert.equal(evaluationV2NormalizationFixtures.metadata.status, "draft");
assert.equal(evaluationV2NormalizationFixtures.metadata.runtimeActive, false);

const expectedAllowedSignals = [
  "low_deductible_or_copayment",
  "private_hospitalization",
  "surgery",
  "high_long_term_hospitalization_limit",
  "waiting_period_immediate_use",
  "provider_network_freedom",
];

assert.deepEqual(
  evaluationV2NormalizationFixtures.metadata.allowedSignals,
  expectedAllowedSignals,
  "Allowed signals must match the exact Phase 2 scope.",
);

const expectedBlockedSignals = [
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
];

assert.deepEqual(
  evaluationV2NormalizationFixtures.metadata.blockedSignals,
  expectedBlockedSignals,
  "Blocked signals must match the exact Phase 2 blocked scope.",
);

const allowedCases = evaluationV2NormalizationFixtures.cases.filter(
  (fixtureCase) => fixtureCase.kind === "allowed_signal",
);

for (const signalId of expectedAllowedSignals) {
  const signalCases = allowedCases.filter(
    (fixtureCase) => fixtureCase.signalFocus === signalId,
  );
  assert.ok(signalCases.some((fixtureCase) => fixtureCase.variant === "positive"));
  assert.ok(signalCases.some((fixtureCase) => fixtureCase.variant === "partial"));
  assert.ok(signalCases.some((fixtureCase) => fixtureCase.variant === "ambiguous"));
}

for (const fixtureCase of evaluationV2NormalizationFixtures.cases) {
  assert.ok(fixtureCase.mustNotClaim.length > 0, `Fixture ${fixtureCase.caseId} must include mustNotClaim guardrails.`);
  for (const signal of fixtureCase.expectedNormalizedSignals) {
    if (expectedBlockedSignals.includes(signal.signalId)) {
      assert.ok(
        !["scoreable_now", "scoreable_with_penalty"].includes(signal.safetyStatus),
        `Blocked signal ${signal.signalId} must not become scoreable in ${fixtureCase.caseId}.`,
      );
    }
  }
}

const crossSignalCaseIds = new Set(
  evaluationV2NormalizationFixtures.cases
    .filter((fixtureCase) => fixtureCase.kind === "cross_signal")
    .map((fixtureCase) => fixtureCase.caseId),
);

for (const caseId of [
  "cross-low-deductible-high-limit",
  "cross-surgery-high-limit-overlap",
  "cross-private-hospitalization-provider-freedom",
  "cross-waiting-period-missing-evidence",
  "cross-allowed-plus-blocked-outpatient",
]) {
  assert.ok(crossSignalCaseIds.has(caseId), `Missing required cross-signal fixture: ${caseId}`);
}

const srcFiles = [];

const collectFiles = async (directoryPath) => {
  const { readdir } = await import("node:fs/promises");
  const entries = await readdir(directoryPath, { withFileTypes: true });

  for (const entry of entries) {
    const entryPath = join(directoryPath, entry.name);
    if (entry.isDirectory()) {
      await collectFiles(entryPath);
      continue;
    }
    if (entry.isFile()) {
      srcFiles.push(entryPath);
    }
  }
};

await collectFiles(join(projectRoot, "src"));

for (const filePath of srcFiles) {
  const relativePath = relative(projectRoot, filePath).replaceAll("\\", "/");
  if (relativePath === "src/lib/evaluation-v2/fixtures/normalization-fixtures.ts") {
    continue;
  }
  const fileContents = await readFile(filePath, "utf8");
  assert.doesNotMatch(
    fileContents,
    /normalization-fixtures/u,
    `Runtime source must not import or reference normalization fixtures: ${relativePath}`,
  );
}

assert.equal(insuranceEvaluationV2Rules.metadata.status, "draft");
assert.equal(insuranceEvaluationV2Rules.metadata.runtimeActive, false);

console.log("Evaluation v2 normalization fixture assertions passed.");
