# Milestone 3G: v2 Evaluation Implementation Plan

Status: planning artifact only. No implementation, no runtime activation, no `src` changes, no production scoring/ranking changes, no product database changes, no migration apply, no Supabase write, and no provider call are included in this milestone.

Source artifacts:
- `generated/insurance-evaluation-v2-rules.generated.ts`
- `docs/insurance-evaluation-v2-decision-matrix.md`
- `docs/insurance-evaluation-v2-rules.md`
- `generated/questionnaire-v2-contract.generated.ts`

Activation boundary:
- v1 remains the default active path.
- v2 remains draft/not active.
- The v2 rule artifact must not be imported by production `src` until explicit activation approval.
- This plan proposes future files and tests only; it does not create the v2 engine.

## 1. Architecture

The future v2 engine should live under a new isolated namespace, for example `src/lib/evaluation-v2/`, and must not reuse v1 engine internals by mutation. v1 remains in `src/lib/recommendations/*` and continues to own the current production recommendation path.

Pure deterministic modules:
- contracts: TypeScript types for v2 inputs, product evidence, eligibility results, scoring results, categories, explanations, and advisor handoff.
- normalize: deterministic conversion from questionnaire v2 answers to normalized v2 input.
- eligibility: pure eligibility evaluation from normalized input and product evidence.
- evidence matching: pure mapping of product facts to rule signals.
- scoring: pure scoring bands, caps, penalties, and tie-break inputs.
- categories: pure category assignment and no-category decisions.
- explanations: pure generation of bounded explanation facts, not customer copy that claims coverage.

Adapters:
- questionnaire adapter: future conversion from approved v2 questionnaire submissions into normalized v2 input.
- product evidence adapter: future conversion from current product facts/database rows into the approved v2 evidence shape.
- v1 comparison adapter: optional future characterization-only adapter for comparing v1 and v2 outputs, not a runtime bridge.
- lead/advisor adapter: future conversion from v2 explanation/advisor output to lead handoff shape, gated and inactive until approval.

Presentation/explanation modules:
- customer explanation boundary formatter.
- advisor confirmation formatter.
- current policy comparison formatter.
- category label formatter.

## 2. Runtime Isolation Strategy

v2 artifact isolation:
- `generated/insurance-evaluation-v2-rules.generated.ts` remains a blueprint artifact.
- Production `src` must not import it before an explicit activation milestone.
- Assertion scripts must continue to scan `src` for forbidden imports.

Activation gates:
- v2 runtime must require both rule artifact status approval and an explicit runtimeActive or feature flag decision.
- `runtimeActive=false` in draft artifacts is not sufficient for future activation; activation requires separate release approval.
- No dual-write and no hidden activation are allowed.
- v1 remains the default active path until activation review explicitly changes routing.

Forbidden before activation:
- No public endpoint using v2.
- No hidden v2 ranking in customer flow.
- No lead submission changes based on v2.
- No product database mutation for v2 evidence.

## 3. Data Flow

Planned flow:

questionnaire answers -> normalized v2 input -> eligibility evaluation -> evidence matching -> scoring -> category assignment -> explanation -> advisor handoff

Pure calculation:
- normalize questionnaire answers.
- classify input roles and emitted signals.
- evaluate eligibility using approved rules.
- match evidence to signals.
- compute scoring bands and overlap caps.
- assign category or no-category.
- produce explanation facts and advisor confirmation items.
- apply deterministic tie-breaks.

I/O boundary:
- reading questionnaire/session data.
- reading product evidence.
- reading existing policy comparison output.
- writing lead handoff/session data.
- serving API responses or UI.

I/O modules must call pure v2 functions; pure modules must not read storage, environment, Supabase, network, time, or provider APIs.

## 4. Backward Compatibility

v1 sessions:
- Existing v1 session snapshots remain valid and must not be reinterpreted by v2 until approval.
- v1 session versioning and validation remain unchanged during planning and early implementation phases.

v1 to v2 adapter:
- A v1 -> v2 adapter may be designed only after normalization fixtures exist.
- It must be characterization-only until business approval allows runtime use.
- It must preserve existing lead/session validation behavior.

Lead compatibility:
- Existing lead submission validation remains the source of truth for active flow.
- v2 advisor handoff shape must not replace lead handoff until compatibility tests prove no data loss.

Characterization baseline:
- v1 recommendation, assessment mapping, policy analysis, presentation, and lead submission assertions must remain passing before and after every v2 implementation phase.

## 5. Product Evidence Requirements

Product evidence needed before activation:
- age/member limits.
- hospitalization/private network facts.
- surgery evidence.
- emergency evidence.
- serious illness/major hospitalization facts.
- annual/lifetime/high-limit facts.
- deductible/copayment bands.
- outpatient doctor visits.
- diagnostics/check-up.
- international territory and treatment scope.
- maternity terms and waiting periods.
- physiotherapy/rehabilitation limits.
- pediatric eligibility and benefits.
- waiting-period/immediate-use terms.
- provider/hospital network freedom.
- current-policy comparison evidence classification.

Evidence completeness check:
- Each product must be audited against the rule artifact signals.
- Missing hard-priority evidence must be recorded as missing, not false.
- Unknown product data must become advisor confirmation or scoring penalty.
- Product evidence audit must produce deterministic reports before activation.

Overclaiming prevention:
- Never claim coverage from missing evidence.
- Never use existing policy evidence as proposed-product evidence.
- Never infer maternity, international, immediate use, surgery, serious illness, emergency, outpatient visits, diagnostics/check-up, or low deductible from generic text.

## 6. Proposed Future Module Map

Do not create these files in this planning slice. Proposed future files:

- `src/lib/evaluation-v2/contracts.ts`
- `src/lib/evaluation-v2/rules-artifact.ts`
- `src/lib/evaluation-v2/normalize.ts`
- `src/lib/evaluation-v2/eligibility.ts`
- `src/lib/evaluation-v2/evidence.ts`
- `src/lib/evaluation-v2/scoring.ts`
- `src/lib/evaluation-v2/categories.ts`
- `src/lib/evaluation-v2/explanations.ts`
- `src/lib/evaluation-v2/tie-breaks.ts`
- `src/lib/evaluation-v2/adapters.ts`
- `src/lib/evaluation-v2/advisor-handoff.ts`
- `src/lib/evaluation-v2/index.ts`

Proposed future tests:
- `scripts/assert-evaluation-v2-rules-artifact.mjs`
- `scripts/assert-evaluation-v2-normalization.mjs`
- `scripts/assert-evaluation-v2-eligibility.mjs`
- `scripts/assert-evaluation-v2-missing-evidence.mjs`
- `scripts/assert-evaluation-v2-scoring.mjs`
- `scripts/assert-evaluation-v2-categories.mjs`
- `scripts/assert-evaluation-v2-tie-breaks.mjs`
- `scripts/assert-evaluation-v2-explanations.mjs`
- `scripts/assert-evaluation-v2-no-runtime-activation.mjs`
- `scripts/assert-evaluation-v2-product-evidence-audit.mjs`
- `scripts/assert-evaluation-v2-session-lead-compatibility.mjs`

## 7. Test Plan

Pre-implementation tests:
- rule artifact invariant tests: status draft, runtimeActive false, approved groups, Step 4/5/6/8 emphasis, Step 7 non-emphasis.
- normalization tests: v2 questionnaire answer shapes, unknown inputs, duplicate values, missing values, and deterministic normalized output.
- eligibility tests: explicit product conflict exclusion, degrade, advisor confirmation, pass, age/member/maternity/pediatric/serious illness cases.
- missing evidence tests: missing evidence never gives positive score; missing hard-priority evidence creates penalty and advisor confirmation.
- scoring tests: weight bands, Step 4/5/6/8 emphasis, Step 7 category shaping, overlap caps, outpatient visits distinct from diagnostics/check-up.
- category assignment tests: Best Match, Premium Choice, Smart Budget Choice, and no-category conditions.
- tie-break tests: eligibility certainty, evidence completeness, hard priorities, deductible/cost fit, coverage breadth, fewer unresolved confirmations, deterministic product_id fallback.
- explanation wording tests: no unsupported "covered", "unlimited", "no waiting period", or "no participation"; separate customer and advisor wording.
- v1 non-regression tests: existing v1 assertions keep passing.
- no-runtime-activation tests: no v2 production import, no endpoint, no active route, no hidden feature flag.
- product evidence audit tests: every signal has evidence completeness status.
- session/lead compatibility tests: v1 session and lead validation unchanged; v2 handoff cannot replace active handoff before approval.

## 8. Implementation Phases

### Phase 1: Types / Contracts Only, No Runtime Import

Allowed files:
- Future `src/lib/evaluation-v2/contracts.ts`
- Future type-only fixtures under scripts or tests

Forbidden changes:
- No runtime imports from app routes or current v1 recommendation code.
- No scoring, eligibility, category, or explanation implementation.

Required tests:
- type shape assertions.
- no-runtime-activation assertions.
- v1 characterization assertions.

Exit criteria:
- Types compile.
- No production path imports v2.

### Phase 2: Normalization + Fixtures

Allowed files:
- `normalize.ts`
- normalization fixtures and assertions

Forbidden changes:
- No scoring or eligibility.
- No session migration.
- No v1 adapter in runtime.

Required tests:
- normalization deterministic output.
- invalid/missing/duplicate answer handling.
- questionnaire v2 contract parity.

Exit criteria:
- Normalized input is deterministic and documented.

### Phase 3: Eligibility Engine

Allowed files:
- `eligibility.ts`
- eligibility fixtures and assertions

Forbidden changes:
- No ranking changes.
- No UI filtering.
- No product database mutation.

Required tests:
- explicit product conflict exclusion.
- degrade/advisor-confirmation/pass outcomes.
- missing/unknown product data handling.

Exit criteria:
- Eligibility outcomes match approved decision matrix.

### Phase 4: Scoring Engine Pure Functions

Allowed files:
- `scoring.ts`
- evidence scoring fixtures and assertions

Forbidden changes:
- No production ranking import.
- No final production constants beyond approved draft bands.
- No hidden customer flow usage.

Required tests:
- Step 4/5/6/8 emphasis.
- Step 7 category-shaping but non-main emphasis.
- missing evidence never positive.
- overlap caps.
- outpatient visits distinct from diagnostics/check-up.

Exit criteria:
- Pure scoring is deterministic and inactive.

### Phase 5: Category / Explanation Pure Functions

Allowed files:
- `categories.ts`
- `explanations.ts`
- `advisor-handoff.ts`
- category/explanation assertions

Forbidden changes:
- No customer-facing route usage.
- No lead handoff replacement.
- No unsupported coverage wording.

Required tests:
- evidence/certainty requirements.
- no-category conditions.
- customer/advisor wording boundaries.
- current policy advantages handling.

Exit criteria:
- Explanations are evidence-bounded and inactive.

### Phase 6: Inactive Integration Behind Explicit Flag

Allowed files:
- future inactive index/adapters.
- future internal-only assertions.

Forbidden changes:
- No default-on flag.
- No hidden dual-write.
- No production route activation.
- No Supabase write.

Required tests:
- feature flag defaults off.
- v1 remains default.
- no runtime output changes when flag is off.

Exit criteria:
- Inactive integration has zero customer-visible behavior.

### Phase 7: Comparison With v1 Outputs

Allowed files:
- comparison fixtures/scripts.
- non-runtime analysis scripts.

Forbidden changes:
- No replacement of v1 recommendations.
- No lead/session schema changes.

Required tests:
- v1 and v2 side-by-side fixture comparisons.
- drift reports.
- advisor review reports for mismatches.

Exit criteria:
- Business can review v2 behavior without customer exposure.

### Phase 8: Activation Readiness Review

Allowed files:
- activation checklist docs.
- release/rollback plan docs.
- final readiness assertions.

Forbidden changes:
- No activation in the review phase itself.
- No migration apply without explicit future approval.

Required tests:
- full deterministic suite.
- product evidence audit.
- v1 characterization.
- rollback readiness.
- explicit activation approval record.

Exit criteria:
- Activation package is ready for a separate approved runtime milestone.

## 9. Risk Register

- Accidental v2 activation: prevent through no-import assertions, feature flag default off, and explicit activation gate.
- Product evidence gaps: prevent through product evidence audit and missing/unknown behavior.
- Overclaiming: prevent through wording boundary tests and evidence-required assertions.
- Ranking drift: prevent through inactive implementation, fixture comparisons, and v1 characterization.
- Session incompatibility: prevent by leaving v1 sessions unchanged until approved adapter.
- Lead handoff mismatch: prevent by testing v2 advisor handoff against existing lead validation before integration.
- Stale docs/artifact drift: prevent with source doc hashes and artifact parity checks.
- Supabase contract mismatch: prevent with questionnaire v2 contract assertions and no migration apply.
- UI confusion: prevent by no UI changes before activation and clear inactive status.

## 10. Approval Gates

Before Phase 1:
- Approval to create inactive v2 type namespace.
- Agreement that no runtime imports are allowed.

Before Phase 2:
- Approval of normalized v2 input shape.
- Questionnaire v2 contract parity confirmed.

Before Phase 3:
- Eligibility outcomes approved against product evidence categories.

Before Phase 4:
- Scoring bands, Step 4/5/6/8 emphasis, Step 7 role, and overlap caps confirmed.

Before Phase 5:
- Category semantics and wording boundaries confirmed.

Before Phase 6:
- Feature flag design and no-dual-write rule approved.

Before Phase 7:
- v1/v2 comparison fixture set approved.

Before Phase 8:
- Product evidence audit completed.
- Activation checklist owner assigned.

Before activation:
- Business approval.
- Product evidence audit.
- Deterministic tests.
- v1 characterization protection.
- Release and rollback plan.
- Explicit activation approval.

## 11. Doc / Artifact Parity Improvement

Future improvement:
- Add SHA-256 hashes of `docs/insurance-evaluation-v2-decision-matrix.md` and `docs/insurance-evaluation-v2-rules.md` into `generated/insurance-evaluation-v2-rules.generated.ts` metadata.
- Extend `scripts/generate-insurance-evaluation-v2-rules.mjs --verify` to recompute source hashes and fail on drift.
- Add assertion that approved groups, weighting direction, activation boundaries, and signal names match between docs and artifact.
- Add an artifact changelog field with deterministic semantic version changes only, not timestamps.
- Keep source docs as human approval artifacts and generated artifact as the machine-readable blueprint.

