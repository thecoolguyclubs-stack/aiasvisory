import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const projectRoot = process.cwd();
const planPath = join(projectRoot, "docs", "insurance-evaluation-v2-implementation-plan.md");
const plan = await readFile(planPath, "utf8");
const normalized = plan.toLocaleLowerCase("en-US");

for (const section of [
  "# Milestone 3G: v2 Evaluation Implementation Plan",
  "## 1. Architecture",
  "## 2. Runtime Isolation Strategy",
  "## 3. Data Flow",
  "## 4. Backward Compatibility",
  "## 5. Product Evidence Requirements",
  "## 6. Proposed Future Module Map",
  "## 7. Test Plan",
  "## 8. Implementation Phases",
  "## 9. Risk Register",
  "## 10. Approval Gates",
  "## 11. Doc / Artifact Parity Improvement",
]) {
  assert.ok(plan.includes(section), `Missing required section: ${section}`);
}

for (const phrase of [
  "No implementation",
  "no runtime activation",
  "no `src` changes",
  "v1 remains the default active path",
  "v2 remains draft/not active",
  "questionnaire answers -> normalized v2 input -> eligibility evaluation -> evidence matching -> scoring -> category assignment -> explanation -> advisor handoff",
  "Do not create these files in this planning slice.",
  "source doc hashes",
]) {
  assert.ok(plan.includes(phrase), `Missing required phrase: ${phrase}`);
}

for (const phase of [
  "### Phase 1: Types / Contracts Only, No Runtime Import",
  "### Phase 2: Normalization + Fixtures",
  "### Phase 3: Eligibility Engine",
  "### Phase 4: Scoring Engine Pure Functions",
  "### Phase 5: Category / Explanation Pure Functions",
  "### Phase 6: Inactive Integration Behind Explicit Flag",
  "### Phase 7: Comparison With v1 Outputs",
  "### Phase 8: Activation Readiness Review",
]) {
  assert.ok(plan.includes(phase), `Missing implementation phase: ${phase}`);
}

for (const futureFile of [
  "src/lib/evaluation-v2/contracts.ts",
  "src/lib/evaluation-v2/normalize.ts",
  "src/lib/evaluation-v2/eligibility.ts",
  "src/lib/evaluation-v2/scoring.ts",
  "src/lib/evaluation-v2/categories.ts",
  "src/lib/evaluation-v2/explanations.ts",
  "src/lib/evaluation-v2/adapters.ts",
  "src/lib/evaluation-v2/index.ts",
  "scripts/assert-evaluation-v2-scoring.mjs",
]) {
  assert.ok(plan.includes(futureFile), `Missing future module/test reference: ${futureFile}`);
}

for (const risk of [
  "Accidental v2 activation",
  "Product evidence gaps",
  "Overclaiming",
  "Ranking drift",
  "Session incompatibility",
  "Lead handoff mismatch",
  "Stale docs/artifact drift",
  "Supabase contract mismatch",
  "UI confusion",
]) {
  assert.ok(plan.includes(risk), `Missing risk: ${risk}`);
}

assert.doesNotMatch(
  normalized,
  /\b(?:v2 is active|v2 active|implemented engine|runtime is activated|production scoring changed)\b/u,
  "Plan must not claim active or implemented v2 runtime.",
);

console.log("Insurance evaluation v2 implementation plan assertions passed.");
