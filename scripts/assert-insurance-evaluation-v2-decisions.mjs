import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const projectRoot = process.cwd();
const matrixPath = join(projectRoot, "docs", "insurance-evaluation-v2-decision-matrix.md");
const matrix = await readFile(matrixPath, "utf8");
const normalized = matrix.toLocaleLowerCase("en-US");

const requiredSections = [
  "## Business Approval Record",
  "## Decisions Ready For Approval",
  "## Decisions Blocked By Missing Product Data",
  "## Decisions That Must Remain Advisor-Confirmation Only",
  "## Decisions That Must Not Affect Ranking Yet",
  "## Implementation Forbidden In This Slice",
  "## Decision Matrix",
];

for (const section of requiredSections) {
  assert.ok(matrix.includes(section), `Missing required section: ${section}`);
}

for (const phrase of [
  "No runtime activation.",
  "v2 is not active.",
  "v1 remains the active runtime.",
  "No scoring/ranking implementation changes are made by this matrix.",
  "No product database changes are made by this matrix.",
  "Approval type: business approval only, not runtime activation.",
  "All questionnaire inputs must be considered.",
  "Initial v2 scoring direction gives stronger emphasis to Step 4 evaluation goal, Step 5 main priorities, Step 6 deductible/copayment preference, and Step 8 additional needs.",
  "Step 7 cost/protection approach remains considered and category-shaping, but it is not part of the approved main-emphasis group.",
]) {
  assert.ok(matrix.includes(phrase), `Missing activation boundary phrase: ${phrase}`);
}

for (const group of [
  "Eligibility",
  "Scoring weights",
  "Missing evidence",
  "Overlap caps",
  "Categories",
  "Existing policy",
  "Tie-breaks",
  "Activation gates",
]) {
  assert.ok(matrix.includes(`- ${group}: approved.`), `Missing approved group: ${group}`);
}

const decisionHeadingPattern = /^### (DEC-\d{3}): .+$/gmu;
const headings = [...matrix.matchAll(decisionHeadingPattern)];
assert.ok(headings.length >= 35, `Expected at least 35 decision IDs, found ${headings.length}.`);

const decisionIds = headings.map((match) => match[1]);
assert.equal(new Set(decisionIds).size, decisionIds.length, "Decision IDs must be unique.");

const requiredFields = [
  "Decision ID",
  "Topic",
  "Status",
  "Recommended decision",
  "Alternatives",
  "Insurance rationale",
  "Impact area",
  "Risk if wrong",
  "Required approval",
  "Implementation notes / not implementation",
];

const allowedStatuses = new Set(["proposed", "needs approval", "blocked", "approved"]);
const allowedImpactAreas = new Set([
  "eligibility",
  "scoring",
  "category assignment",
  "explanation",
  "product evidence",
  "advisor handoff",
  "comparison",
  "tie-break",
]);

for (const [index, heading] of headings.entries()) {
  const id = heading[1];
  const start = heading.index ?? 0;
  const end = index + 1 < headings.length ? headings[index + 1].index ?? matrix.length : matrix.length;
  const block = matrix.slice(start, end);

  for (const field of requiredFields) {
    assert.match(block, new RegExp(`^- ${field}: .+`, "mu"), `${id} missing field: ${field}`);
  }

  assert.match(block, new RegExp(`^- Decision ID: ${id}$`, "mu"), `${id} field must match heading.`);

  const status = block.match(/^- Status: (.+)$/mu)?.[1]?.trim();
  assert.ok(status && allowedStatuses.has(status), `${id} has invalid status: ${status}`);

  const impactValue = block.match(/^- Impact area: (.+)$/mu)?.[1] ?? "";
  const impacts = impactValue.split(";").map((item) => item.trim()).filter(Boolean);
  assert.ok(impacts.length > 0, `${id} must include impact areas.`);
  for (const impact of impacts) {
    assert.ok(allowedImpactAreas.has(impact), `${id} has invalid impact area: ${impact}`);
  }

  const recommended = block.match(/^- Recommended decision: (.+)$/mu)?.[1] ?? "";
  assert.doesNotMatch(
    recommended,
    /\b(?:decide later|tbd|to be decided|να αποφασιστεί)\b/iu,
    `${id} recommended decision is not specific enough.`,
  );
}

for (const expectedId of Array.from({ length: 34 }, (_, index) => `DEC-${String(index + 1).padStart(3, "0")}`)) {
  assert.ok(decisionIds.includes(expectedId), `Missing expected decision ID: ${expectedId}`);
}
assert.ok(decisionIds.includes("DEC-035"), "Missing expected decision ID: DEC-035");

assert.match(matrix, /DEC-032 is approved as an activation gate, but implementation remains blocked until product evidence fields are approved and populated/u);
assert.match(matrix, /must remain advisor-confirmation only/u);
assert.match(matrix, /must not affect ranking until the approved implementation milestone/u);
assert.match(matrix, /Step 4 evaluation goal in the approved main-emphasis group/u);
assert.match(matrix, /Step 5 in the approved main-emphasis group/u);
assert.match(matrix, /Step 6 in the approved main-emphasis group/u);
assert.match(matrix, /Step 8 in the approved main-emphasis group/u);
assert.match(matrix, /Step 7 as considered and category-shaping/u);

assert.doesNotMatch(
  normalized,
  /\b(?:already implemented|rules are active|v2 is active|runtime activation performed)\b/u,
  "Decision matrix must not claim implementation or activation.",
);

console.log("Insurance evaluation v2 decision matrix assertions passed.");
