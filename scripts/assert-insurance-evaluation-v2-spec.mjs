import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const projectRoot = process.cwd();
const specPath = join(projectRoot, "docs", "insurance-evaluation-v2-rules.md");
const spec = await readFile(specPath, "utf8");
const normalized = spec.toLocaleLowerCase("en-US");

const requiredSections = [
  "# Milestone 3D: Insurance-First v2 Evaluation Rules Specification",
  "## 1. Insurance Evaluation Principles",
  "## 2. Questionnaire v2 Input Classification",
  "### Step 1: Insured People",
  "### Step 2: Ages",
  "### Step 3: Existing Insurance",
  "### Step 4: Evaluation Goal",
  "### Step 5: Main Priorities",
  "### Step 6: Deductible / Copayment Preference",
  "### Step 7: Protection / Cost Approach",
  "### Step 8: Additional Needs",
  "### Optional PDF Evidence Workflow",
  "## 3. Eligibility Rules",
  "## 4. Scoring Rules",
  "## 5. Recommendation Category Semantics",
  "## 6. Tie-Break Policy",
  "## 7. Existing Policy Comparison Rules",
  "## 8. Explanation Rules",
  "## 9. Product Evidence Requirements",
  "## 10. Backward Compatibility / Activation Boundaries",
  "## 11. Open Business Decisions",
];

for (const section of requiredSections) {
  assert.ok(spec.includes(section), `Missing required section: ${section}`);
}

const requiredPhrases = [
  "v1 remains the active runtime",
  "questionnaire v2 remains draft and not active",
  "runtimeActive remains false",
  "Business approval cross-reference: `docs/insurance-evaluation-v2-decision-matrix.md` records business approval of the 3E decision matrix.",
  "all questionnaire inputs are considered, with stronger initial emphasis on Step 4 evaluation goal, Step 5 main priorities, Step 6 deductible/copayment preference, and Step 8 additional needs",
  "Step 7 cost/protection approach remains considered and category-shaping, but is not part of the approved main-emphasis group unless later approved.",
  "Evaluation goal from Step 4: approved as a main-emphasis input for initial v2 scoring design, without overriding eligibility or product evidence.",
  "No v2 scoring, ranking, eligibility, category assignment, explanation generation, product filtering, or database migration is activated by this slice.",
  "Missing evidence must never be treated as positive evidence.",
  "Overclaiming guardrails",
  "outpatient visits are visits to doctors without hospitalization",
  "diagnostics/check-up are diagnostic tests",
  "outpatient visits and diagnostics/check-up are separate signals and separate database-facing canonical values",
  "surgery for surgery",
  "serious_illness for serious-illness",
  "Best Match:",
  "Premium Choice:",
  "Smart Budget Choice:",
  "Open Business Decisions",
];

for (const phrase of requiredPhrases) {
  assert.ok(spec.includes(phrase), `Missing required phrase: ${phrase}`);
}

for (const term of [
  "private hospitalization",
  "surgery",
  "emergency",
  "serious illness",
  "high long-term hospitalization limit",
  "low deductible/copayment",
  "outpatient visits",
  "international coverage",
  "maternity",
  "physiotherapy/rehabilitation",
  "pediatric coverage",
  "waiting period/immediate use",
  "provider/hospital network freedom",
  "diagnostics/check-up",
]) {
  assert.ok(normalized.includes(term), `Missing product evidence term: ${term}`);
}

const openDecisionCount = [...spec.matchAll(/^\d+\. /gmu)].length;
assert.ok(openDecisionCount >= 10, "Expected at least 10 actionable open business decisions.");

assert.doesNotMatch(
  normalized,
  /v2\s+(?:is|becomes)\s+(?:active|activated)|runtimeactive\s+remains\s+true/u,
  "Spec must not activate v2.",
);

console.log("Insurance evaluation v2 rules spec assertions passed.");
