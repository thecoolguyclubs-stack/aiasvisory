import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { currentPolicyGuidance } from "../src/lib/policy-analysis/retention.ts";

assert.equal(currentPolicyGuidance({ currentPolicyAdvantages: [], improvements: [] }), null);
assert.match(currentPolicyGuidance({ currentPolicyAdvantages: [{}], improvements: [] }), /Δεν προκύπτει λόγος αντικατάστασης/u);
assert.match(currentPolicyGuidance({ currentPolicyAdvantages: [{}], improvements: [{}] }), /όσα μπορεί να χάσεις/u);
for (const name of ["RecommendationCard", "ProgramDetailView", "InterestView"]) {
  assert.ok(!readFileSync(new URL(`../src/components/advisory/${name}.tsx`, import.meta.url), "utf8").includes("estimateDemoPrice"));
}
console.log("Policy retention and absence of synthetic prices on customer surfaces verified.");
