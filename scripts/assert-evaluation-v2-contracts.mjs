import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { pathToFileURL } from "node:url";

const projectRoot = process.cwd();
const contractsPath = join(projectRoot, "src", "lib", "evaluation-v2", "contracts.ts");
const indexPath = join(projectRoot, "src", "lib", "evaluation-v2", "index.ts");
const rulesModulePath = join(
  projectRoot,
  "generated",
  "insurance-evaluation-v2-rules.generated.ts",
);

const contracts = await readFile(contractsPath, "utf8");
assert.ok(contracts.includes("EvaluationV2RuntimeActive = false"), "Contracts must pin runtimeActive to false.");
assert.ok(
  contracts.includes("EvaluationV2ActivationBoundary"),
  "Contracts must include an activation boundary.",
);
assert.ok(
  contracts.includes("approvedWeightingDirection: EvaluationV2ApprovedWeightingDirection;"),
  "Contracts metadata must include structured approvedWeightingDirection.",
);
assert.ok(
  contracts.includes("interface EvaluationV2ApprovedWeightingDirection"),
  "Contracts must define a structured approvedWeightingDirection contract.",
);
assert.ok(
  contracts.includes("signalsEmitted: readonly EvaluationV2QuestionnaireEmittedSignalId[];"),
  "Questionnaire input policy must use the broader emitted-signal union.",
);
assert.ok(
  !contracts.includes("signalsEmitted: readonly EvaluationV2SignalId[];"),
  "Questionnaire input policy must not narrow emitted signals to core signal ids only.",
);

const indexFile = await readFile(indexPath, "utf8");
assert.ok(indexFile.trim().length > 0, "index.ts must not be empty.");
assert.match(
  indexFile,
  /^export type \{[\s\S]+\} from "\.\/contracts";\r?\n?$/u,
  "index.ts may only re-export types from ./contracts.",
);

const requiredOutcomes = [
  "pass",
  "degrade",
  "advisor_confirmation",
  "exclude",
];

for (const outcome of requiredOutcomes) {
  assert.ok(
    contracts.includes(`"${outcome}"`),
    `Missing eligibility outcome contract: ${outcome}`,
  );
}

const requiredCategories = [
  "best_match",
  "premium_choice",
  "smart_budget_choice",
  "no_category",
];

for (const category of requiredCategories) {
  assert.ok(
    contracts.includes(`"${category}"`),
    `Missing recommendation category contract: ${category}`,
  );
}

const forbiddenImplementationPatterns = [
  /export\s+function\s+/u,
  /\bfunction\s+[A-Za-z0-9_]+\s*\(/u,
  /\bclass\s+[A-Za-z0-9_]+\b/u,
  /\bimplements\b/u,
  /\bnormalize[A-Z][A-Za-z0-9_]*\s*\(/u,
  /\bscore[A-Z][A-Za-z0-9_]*\s*\(/u,
  /\bevaluate[A-Z][A-Za-z0-9_]*\s*\(/u,
  /\bassign[A-Z][A-Za-z0-9_]*\s*\(/u,
  /\bexplain[A-Z][A-Za-z0-9_]*\s*\(/u,
];

for (const pattern of forbiddenImplementationPatterns) {
  assert.doesNotMatch(
    contracts,
    pattern,
    `Contracts must not include implementation logic: ${pattern}`,
  );
}

const srcFiles = [];

const collectFiles = async (directoryPath) => {
  const entries = await import("node:fs/promises").then(({ readdir }) =>
    readdir(directoryPath, { withFileTypes: true }),
  );

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
  const normalizedRelativePath = relative(projectRoot, filePath).replaceAll("\\", "/");
  if (normalizedRelativePath.startsWith("src/lib/evaluation-v2/")) {
    continue;
  }
  const fileContents = await readFile(filePath, "utf8");
  assert.doesNotMatch(
    fileContents,
    /evaluation-v2/u,
    `Production source must not import or reference evaluation-v2: ${normalizedRelativePath}`,
  );
}

const { insuranceEvaluationV2Rules } = await import(
  pathToFileURL(rulesModulePath).href,
);

assert.equal(
  insuranceEvaluationV2Rules.metadata.status,
  "draft",
  "Generated v2 rule artifact must remain draft.",
);
assert.equal(
  insuranceEvaluationV2Rules.metadata.runtimeActive,
  false,
  "Generated v2 rule artifact must remain runtimeActive=false.",
);

const coreSignalTupleMatch = contracts.match(
  /export const EVALUATION_V2_CORE_SIGNAL_IDS = \[(?<body>[\s\S]*?)\] as const;/u,
);

assert.ok(
  coreSignalTupleMatch?.groups?.body,
  "Unable to parse EVALUATION_V2_CORE_SIGNAL_IDS from contracts.",
);

const contractCoreSignalIds = Array.from(
  coreSignalTupleMatch.groups.body.matchAll(/"([^"]+)"/gu),
  (match) => match[1],
);

const artifactCoreSignalIds = Object.keys(insuranceEvaluationV2Rules.signals);

assert.deepEqual(
  contractCoreSignalIds,
  artifactCoreSignalIds,
  "Core/scoring signal ids must match generated rule artifact signal ids exactly.",
);

const emittedSignalTupleMatch = contracts.match(
  /export const EVALUATION_V2_QUESTIONNAIRE_EMITTED_SIGNAL_IDS = \[(?<body>[\s\S]*?)\] as const;/u,
);

assert.ok(
  emittedSignalTupleMatch?.groups?.body,
  "Unable to parse EVALUATION_V2_QUESTIONNAIRE_EMITTED_SIGNAL_IDS from contracts.",
);

const contractEmittedSignalIds = Array.from(
  emittedSignalTupleMatch.groups.body.matchAll(/"([^"]+)"/gu),
  (match) => match[1],
);

const artifactEmittedSignalIds = Array.from(
  new Set(
    insuranceEvaluationV2Rules.questionnaireInputPolicy.flatMap((policy) =>
      policy.signalsEmitted,
    ),
  ),
);

assert.deepEqual(
  contractEmittedSignalIds,
  artifactEmittedSignalIds,
  "Questionnaire emitted signal ids must match generated artifact questionnaireInputPolicy signalsEmitted.",
);

console.log("Evaluation v2 contracts assertions passed.");
