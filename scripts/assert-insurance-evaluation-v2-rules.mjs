import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

import {
  artifactPath,
  renderArtifact,
  ruleArtifact,
} from "./generate-insurance-evaluation-v2-rules.mjs";

const projectRoot = process.cwd();
const checkedInArtifact = await readFile(artifactPath, "utf8");
assert.equal(checkedInArtifact, renderArtifact());

const { insuranceEvaluationV2Rules } = await import(
  "../generated/insurance-evaluation-v2-rules.generated.ts"
);

assert.deepEqual(insuranceEvaluationV2Rules, ruleArtifact);
assert.equal(insuranceEvaluationV2Rules.metadata.status, "draft");
assert.equal(insuranceEvaluationV2Rules.metadata.runtimeActive, false);
assert.deepEqual(insuranceEvaluationV2Rules.metadata.approvedBusinessGroups, [
  "eligibility",
  "scoring_weights",
  "missing_evidence",
  "overlap_caps",
  "categories",
  "existing_policy",
  "tie_breaks",
  "activation_gates",
]);

const inputPolicyByStep = Object.fromEntries(
  insuranceEvaluationV2Rules.questionnaireInputPolicy.map((item) => [item.stepId, item]),
);
for (const stepId of ["evaluationGoal", "priorities", "deductible", "additionalNeeds"]) {
  assert.equal(inputPolicyByStep[stepId].mainWeightEmphasis, true, stepId);
}
assert.equal(inputPolicyByStep.costApproach.mainWeightEmphasis, false);

assert.ok(Object.hasOwn(insuranceEvaluationV2Rules.signals, "outpatient_visits"));
assert.ok(Object.hasOwn(insuranceEvaluationV2Rules.signals, "diagnostics_checkup"));
assert.notDeepEqual(
  insuranceEvaluationV2Rules.signals.outpatient_visits.evidenceRequirements,
  insuranceEvaluationV2Rules.signals.diagnostics_checkup.evidenceRequirements,
);
assert.ok(Object.hasOwn(insuranceEvaluationV2Rules.signals, "surgery"));
assert.ok(Object.hasOwn(insuranceEvaluationV2Rules.signals, "serious_illness"));

assert.equal(
  insuranceEvaluationV2Rules.scoringPolicy.missingEvidenceNeverPositiveScore,
  true,
);
assert.match(
  insuranceEvaluationV2Rules.explanationPolicy.missingEvidence,
  /never as positive evidence/u,
);

for (const category of ["bestMatch", "premiumChoice", "smartBudgetChoice"]) {
  assert.ok(
    insuranceEvaluationV2Rules.categoryPolicy[category].requiredEvidenceCertainty.length > 0,
    category,
  );
}

assert.ok(
  insuranceEvaluationV2Rules.existingPolicyPolicy.mustNotAffectRanking.includes(
    "current policy facts as proposed-product evidence",
  ),
);
assert.deepEqual(insuranceEvaluationV2Rules.tieBreakPolicy, [
  "eligibility certainty",
  "evidence completeness",
  "hard priorities",
  "deductible/cost fit",
  "coverage breadth",
  "fewer unresolved confirmations",
  "deterministic product_id fallback",
]);
assert.deepEqual(insuranceEvaluationV2Rules.activationGates, [
  "product evidence audit",
  "deterministic tests",
  "v1 characterization protection",
  "release/rollback plan",
  "explicit activation approval",
]);
assert.deepEqual(insuranceEvaluationV2Rules.forbiddenRuntimeClaims, [
  "v2 is not active",
  "no runtime implementation in this slice",
  "artifact must not be imported by production src yet",
  "no scoring/ranking engine is implemented by this artifact",
]);

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
  assert.doesNotMatch(
    source,
    /insurance-evaluation-v2-rules\.generated|insuranceEvaluationV2Rules/u,
    runtimeFile,
  );
}

console.log("Insurance evaluation v2 rules artifact assertions passed.");
