import assert from "node:assert/strict";
import { assessmentReducer, initialAssessmentState } from "../src/lib/assessment/state.ts";
import { assessmentConfig, VISIBLE_ASSESSMENT_STEPS } from "../src/lib/assessment/config.ts";
import { deductibleBandForAmount } from "../src/lib/assessment/preferences.ts";
import { mapAssessmentSubmissionToDatabase } from "../src/lib/recommendations/assessment-mapping.ts";
import { generateInsuranceProfile } from "../src/lib/assessment/profile.ts";
import { validateAssessmentSubmission } from "../src/lib/recommendations/request-validation.ts";
import { createAssessmentSessionSnapshot } from "../src/lib/assessment/storage.ts";

assert.equal(VISIBLE_ASSESSMENT_STEPS, 7);
assert.equal(assessmentConfig.additionalNeeds.displayStep, 7);
assert.ok(!assessmentConfig.priorities.options.some(({ id }) => id === "low-deductible"));
for (const [amount, expected] of [[0,"up-to-1500"],[1500,"up-to-1500"],[1500.01,"1500-to-5000"],[5000,"1500-to-5000"],[5000.01,"over-5000"],[-1,null],[NaN,null],[Infinity,null]]) {
  assert.equal(deductibleBandForAmount(amount), expected);
}
for (const [band, approach, databaseValue] of [["up-to-1500","complete","minimum"],["1500-to-5000","balanced","balanced"],["over-5000","basic","higher_for_lower_premium"]]) {
  let state = assessmentReducer(initialAssessmentState, { type:"set-single",key:"deductible",value:band });
  assert.equal(state.answers.costApproach, approach);
  state = { ...state, answers: { ...state.answers, insuredPeople:"self",currentInsurance:"none",evaluationGoal:"first_time",priorities:["surgery"],additionalNeeds:["provider_freedom"],careAccess:"freedom" },people:[{ id:"self",role:"self",label:"Εμένα",birthDate:"1998-04-19" }] };
  const submission = createAssessmentSessionSnapshot(state,new Date().toISOString()).submission;
  assert.equal(validateAssessmentSubmission(submission).ok,true);
  const mapped = mapAssessmentSubmissionToDatabase(submission);
  assert.equal(mapped.ok,true);
  assert.equal(mapped.data.deductible_preference,databaseValue);
  assert.equal(mapped.data.additional_needs.filter(value=>value==="provider_freedom").length,1);
  // Browser tampering cannot override the derived cost orientation in database scoring.
  const tampered = structuredClone(submission);
  tampered.answers.costApproach = "invalid";
  assert.deepEqual(mapAssessmentSubmissionToDatabase(tampered),mapped);
  assert.ok(generateInsuranceProfile(submission).deductiblePreference.includes("€"));
  const incomplete = structuredClone(submission);
  delete incomplete.answers.careAccess;
  assert.equal(validateAssessmentSubmission(incomplete).ok,false);
  const snapshot = createAssessmentSessionSnapshot({ ...state,view:"costApproach",history:["priorities","deductible","costApproach"] },null);
  const hydrated = assessmentReducer(initialAssessmentState,{type:"hydrate",snapshot});
  assert.equal(hydrated.view,"deductible");
  assert.ok(!hydrated.history.includes("costApproach"));
}
console.log("Seven-step assessment: boundaries, derivation, deduplication, validation and hidden-step hydration passed.");
