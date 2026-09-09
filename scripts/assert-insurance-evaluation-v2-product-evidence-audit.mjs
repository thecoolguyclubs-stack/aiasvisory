import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const projectRoot = process.cwd();
const auditPath = join(
  projectRoot,
  "docs",
  "insurance-evaluation-v2-product-evidence-audit.md",
);
const artifactPath = join(
  projectRoot,
  "generated",
  "insurance-evaluation-v2-rules.generated.ts",
);

const audit = await readFile(auditPath, "utf8");
const normalized = audit.toLocaleLowerCase("en-US");
const { insuranceEvaluationV2Rules } = await import(pathToFileURL(artifactPath).href);

for (const section of [
  "# Milestone 3I: v2 Product Evidence Audit",
  "## 1. Audit Scope And Boundaries",
  "## 2. Local Evidence Sources Reviewed",
  "## 3. Signal-By-Signal Evidence Matrix",
  "## 4. Product Fact Field Audit",
  "## 5. Current Product Coverage Inventory",
  "## 6. Activation Blocking Assessment",
  "## 7. Existing Policy Boundary",
  "## 8. Data Expansion Recommendations",
  "## 9. Risk Register",
  "## 10. Next-Step Recommendation",
]) {
  assert.ok(audit.includes(section), `Missing required section: ${section}`);
}

for (const phrase of [
  "No product database change",
  "no Supabase write",
  "no migration apply",
  "no provider call",
  "no runtime activation",
  "outpatient_visits and diagnostics_checkup remain separate.",
  "surgery and serious_illness remain separate.",
]) {
  assert.ok(audit.includes(phrase), `Missing required phrase: ${phrase}`);
}

for (const signalId of Object.keys(insuranceEvaluationV2Rules.signals)) {
  const heading = `### ${signalId}`;
  assert.ok(audit.includes(heading), `Missing signal section: ${signalId}`);

  const signalSectionPattern = new RegExp(
    `### ${signalId}[\\s\\S]*?- Current confidence: (sufficient|partial|missing|not_product_evidence)[\\s\\S]*?- Safe scoring status: (scoreable_now|scoreable_with_penalty|advisor_confirmation_only|not_rankable)`,
    "u",
  );
  assert.match(audit, signalSectionPattern, `Signal section missing confidence/status: ${signalId}`);
}

assert.match(
  audit,
  /### existing_policy_context[\s\S]*?- Current confidence: not_product_evidence[\s\S]*?- Safe scoring status: not_rankable/u,
  "existing_policy_context must remain non-product-evidence and not rankable.",
);
assert.match(
  audit,
  /### evaluation_goal[\s\S]*?- Current confidence: not_product_evidence[\s\S]*?- Safe scoring status: not_rankable/u,
  "evaluation_goal must remain non-product-evidence and not rankable.",
);

assert.doesNotMatch(
  normalized,
  /\b(?:supabase write executed|migration applied|provider call executed|v2 active runtime|scoring implemented)\b/u,
  "Audit must not claim writes, migration, provider calls, or runtime activation.",
);

console.log("Insurance evaluation v2 product evidence audit assertions passed.");
