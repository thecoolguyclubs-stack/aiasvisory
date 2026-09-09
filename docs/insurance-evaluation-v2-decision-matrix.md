# Milestone 3E: v2 Insurance Evaluation Business Decision Matrix

Status: business-approved documentation artifact only. These decisions are approved for future implementation planning, not active runtime behavior.

Source: `docs/insurance-evaluation-v2-rules.md`.

Generated blueprint cross-reference: `generated/insurance-evaluation-v2-rules.generated.ts` is a deterministic draft artifact for future implementation planning only. It is not imported by production `src` and does not activate v2.

Activation boundaries:
- No runtime activation.
- v2 is not active.
- v1 remains the active runtime.
- No scoring/ranking implementation changes are made by this matrix.
- No product database changes are made by this matrix.
- Business approval does not create production constants, runtime scoring, eligibility filters, category assignment, or product database changes.

## Business Approval Record

Approval type: business approval only, not runtime activation.

Approved approval groups:
- Eligibility: approved.
- Scoring weights: approved.
- Missing evidence: approved.
- Overlap caps: approved.
- Categories: approved.
- Existing policy: approved.
- Tie-breaks: approved.
- Activation gates: approved.

Approved weighting direction:
- All questionnaire inputs must be considered.
- Initial v2 scoring direction gives stronger emphasis to Step 4 evaluation goal, Step 5 main priorities, Step 6 deductible/copayment preference, and Step 8 additional needs.
- Step 7 cost/protection approach remains considered and category-shaping, but it is not part of the approved main-emphasis group.
- This direction is approved for future implementation design only; it is not implemented, active, or a runtime scoring constant.

## Decisions Ready For Approval

These decisions have business approval for future implementation planning: DEC-001, DEC-002, DEC-003, DEC-004, DEC-005, DEC-006, DEC-007, DEC-008, DEC-009, DEC-010, DEC-011, DEC-012, DEC-013, DEC-014, DEC-015, DEC-016, DEC-017, DEC-018, DEC-019, DEC-020, DEC-021, DEC-022, DEC-023, DEC-024, DEC-025, DEC-026, DEC-027, DEC-028, DEC-029, DEC-030, DEC-031, DEC-032, DEC-033, DEC-034, DEC-035.

## Decisions Blocked By Missing Product Data

DEC-032 is approved as an activation gate, but implementation remains blocked until product evidence fields are approved and populated. DEC-001, DEC-004, DEC-009, DEC-012, DEC-015, DEC-016, and DEC-017 may be partially blocked in implementation if product data lacks age limits, maternity terms, deductible bands, international scope, waiting periods, missing-evidence markers, or unknown-data markers.

## Decisions That Must Remain Advisor-Confirmation Only

Before implementation approval, these must remain advisor-confirmation only: maternity waiting periods, child-only eligibility when product evidence is missing, serious illness support when evidence is unclear, immediate-use claims, international scope, current policy advantages, replacement suitability, and all product facts marked unknown or missing.

## Decisions That Must Not Affect Ranking Yet

These must not affect ranking until the approved implementation milestone: existing policy comparison influence, current policy advantages, advisor-facing notes, customer-facing wording templates, no-category conditions, and product evidence completeness thresholds.

## Implementation Forbidden In This Slice

Do not implement, activate, import, migrate, write, or backfill any v2 scoring, eligibility, category assignment, explanation generation, product evidence schema, product database value, runtime route, UI behavior, or Supabase state in this slice.

## Decision Matrix

### DEC-001: Age Bands And Eligibility Hard Stops

- Decision ID: DEC-001
- Topic: Age bands and eligibility hard stops.
- Status: approved
- Recommended decision: Use age as eligibility-first. Exclude only when product evidence explicitly conflicts with a person's entry-age rule; otherwise require advisor confirmation for senior, child-only, and multi-member profiles with missing age evidence.
- Alternatives: Exclude any profile with missing age evidence; treat age as scoring-only; always pass missing age evidence to ranking.
- Insurance rationale: Age can determine acceptance and underwriting feasibility, but missing product data is not proof of ineligibility.
- Impact area: eligibility; product evidence; advisor handoff; explanation
- Risk if wrong: Eligible customers may be excluded, or ineligible profiles may receive unsafe recommendations.
- Required approval: Business approval of age bands, senior threshold, child age definition, and hard-stop rules.
- Implementation notes / not implementation: Document only; no age eligibility code is introduced here.

### DEC-002: Child-Only / Pediatric Eligibility Handling

- Decision ID: DEC-002
- Topic: Child-only and pediatric eligibility.
- Status: approved
- Recommended decision: Exclude child-only profiles only when evidence states children cannot be insured alone; otherwise route to advisor confirmation and score pediatric support only from evidence.
- Alternatives: Always exclude child-only profiles without explicit support; always pass child-only profiles; treat pediatric need as explanation-only.
- Insurance rationale: Child-only eligibility is product-specific and cannot be inferred from family-oriented wording.
- Impact area: eligibility; scoring; product evidence; advisor handoff
- Risk if wrong: Child-only requests may be incorrectly recommended or unnecessarily blocked.
- Required approval: Approval of child-only hard-stop policy and pediatric evidence minimum.
- Implementation notes / not implementation: No pediatric eligibility implementation is made here.

### DEC-003: Family / Couple / Individual Member Handling

- Decision ID: DEC-003
- Topic: Family, couple, and individual member handling.
- Status: approved
- Recommended decision: Treat insured composition as eligibility context and low-weight scoring context. Exclude only on explicit product member-count conflict; confirm unknown family/couple packaging with advisor.
- Alternatives: Score family/couple heavily; ignore member composition; exclude all multi-member profiles without explicit family plan evidence.
- Insurance rationale: Composition affects eligibility and suitability, but does not prove coverage breadth.
- Impact area: eligibility; scoring; explanation; advisor handoff
- Risk if wrong: Recommendations may overstate family suitability or miss member-count restrictions.
- Required approval: Approval of member-count thresholds and packaging confirmation rules.
- Implementation notes / not implementation: No member matching implementation is made here.

### DEC-004: Maternity Handling And Waiting-Period Confirmation

- Decision ID: DEC-004
- Topic: Maternity and waiting-period handling.
- Status: approved
- Recommended decision: Treat maternity as advisor-confirmation plus scoring signal. Degrade if maternity evidence is missing; exclude only when maternity is explicitly unavailable and the need is approved as hard.
- Alternatives: Always exclude products without maternity evidence; never let maternity affect score; treat maternity as confirmed from generic hospitalization.
- Insurance rationale: Maternity coverage usually has special waiting periods, limits, delivery terms, and exclusions.
- Impact area: eligibility; scoring; product evidence; advisor handoff; explanation
- Risk if wrong: The system may imply maternity coverage or immediate use without evidence.
- Required approval: Approval of maternity hard-need status, waiting-period wording, and evidence threshold.
- Implementation notes / not implementation: No maternity scoring or eligibility code is introduced here.

### DEC-005: Serious Illness Handling

- Decision ID: DEC-005
- Topic: Serious illness signal handling.
- Status: approved
- Recommended decision: Keep serious illness as a separate signal. Allow shared evidence with major hospitalization but cap overlap with surgery and high-limit signals.
- Alternatives: Collapse serious illness into high-limit; require critical illness evidence only; make it explanation-only.
- Insurance rationale: Serious illness is related to major hospitalization but has distinct customer meaning and evidence needs.
- Impact area: scoring; explanation; product evidence; advisor handoff
- Risk if wrong: The system may triple-count one hospital fact or hide an important serious-condition concern.
- Required approval: Approval of serious illness evidence set and overlap cap.
- Implementation notes / not implementation: No scoring formula is changed here.

### DEC-006: Surgery Handling

- Decision ID: DEC-006
- Topic: Surgery signal handling.
- Status: approved
- Recommended decision: Keep surgery as a separate signal requiring surgery, operation, surgical fee, operating room, or major procedure evidence for full credit.
- Alternatives: Collapse surgery into hospitalization; require only named surgical benefit evidence; make surgery a hard eligibility rule.
- Insurance rationale: Surgery is a specific insured event and should not be inferred from all hospitalization wording.
- Impact area: scoring; explanation; product evidence
- Risk if wrong: Recommendations may claim surgical fit without evidence or undercount products that clearly include surgery.
- Required approval: Approval of surgery evidence threshold and overlap with major hospitalization.
- Implementation notes / not implementation: No surgery mapping or scoring implementation is changed here.

### DEC-007: Emergency Handling

- Decision ID: DEC-007
- Topic: Emergency signal handling.
- Status: approved
- Recommended decision: Score emergency only from emergency hospitalization, urgent admission, emergency support, or comparable evidence; do not infer ambulance or ER cover unless named.
- Alternatives: Treat all hospitalization as emergency fit; require ambulance evidence; make emergency hard exclusion.
- Insurance rationale: Emergency support terms vary and should remain evidence-bound.
- Impact area: scoring; product evidence; explanation; advisor handoff
- Risk if wrong: The system may overstate immediate emergency access.
- Required approval: Approval of emergency evidence list and wording boundaries.
- Implementation notes / not implementation: No emergency scoring implementation is introduced here.

### DEC-008: High Long-Term Hospitalization Limit Handling

- Decision ID: DEC-008
- Topic: High long-term hospitalization limit.
- Status: approved
- Recommended decision: Award full high-limit fit only when evidence includes limit amount, unlimited wording, ICU/long-stay support, or approved high-limit band.
- Alternatives: Infer high limit from premium category; require numeric limit only; treat high limit as explanation-only.
- Insurance rationale: High-limit claims are material and need explicit evidence.
- Impact area: scoring; category assignment; product evidence; explanation
- Risk if wrong: A product may be presented as strong for long hospitalization without limit evidence.
- Required approval: Approval of high-limit bands and evidence hierarchy.
- Implementation notes / not implementation: No limit calculation is implemented here.

### DEC-009: Low Deductible / Low Copayment Evidence Threshold

- Decision ID: DEC-009
- Topic: Low deductible and low copayment evidence.
- Status: approved
- Recommended decision: Treat 0 EUR to 500 EUR as low participation only when product evidence states amount, band, waiver, or explicit low/zero participation terms.
- Alternatives: Infer low deductible from product tier; use 0 EUR only; accept vague affordability wording.
- Insurance rationale: Deductible and copayment materially affect out-of-pocket cost and cannot be inferred.
- Impact area: scoring; product evidence; explanation; advisor handoff
- Risk if wrong: Customers may be misled about expected out-of-pocket cost.
- Required approval: Approval of low-deductible threshold and acceptable evidence forms.
- Implementation notes / not implementation: No deductible scoring is implemented here.

### DEC-010: Outpatient Visits Handling

- Decision ID: DEC-010
- Topic: Outpatient visits.
- Status: approved
- Recommended decision: Keep outpatient visits separate from diagnostics/check-up and score only from doctor visit, outpatient consultation, specialist visit, visit network, or visit reimbursement evidence.
- Alternatives: Collapse outpatient visits into diagnostics/check-up; treat as generic outpatient; make it advisor-confirmation only.
- Insurance rationale: Doctor visits and diagnostic tests are different benefits and may have different limits and networks.
- Impact area: scoring; explanation; product evidence; advisor handoff
- Risk if wrong: User-selected outpatient visits may be lost or overstated as diagnostic/check-up coverage.
- Required approval: Approval of outpatient visit evidence requirements and wording.
- Implementation notes / not implementation: This matrix does not change runtime mapping or scoring.

### DEC-011: Diagnostics / Check-Up Handling

- Decision ID: DEC-011
- Topic: Diagnostics and check-up.
- Status: approved
- Recommended decision: Keep diagnostics/check-up separate from outpatient visits and score from diagnostic exams, labs, imaging, annual check-up, screening, or diagnostic network evidence.
- Alternatives: Collapse into outpatient visits; treat check-up only as wellness copy; require annual check-up evidence only.
- Insurance rationale: Diagnostics and preventive screening are separate from doctor consultation benefits.
- Impact area: scoring; explanation; product evidence
- Risk if wrong: The system may imply doctor visits when only diagnostic evidence exists.
- Required approval: Approval of diagnostics/check-up evidence threshold.
- Implementation notes / not implementation: No diagnostics scoring implementation is introduced here.

### DEC-012: International Coverage Standard

- Decision ID: DEC-012
- Topic: International coverage standard.
- Status: approved
- Recommended decision: Give partial fit for emergency-abroad evidence and full fit only when territory, planned/emergency scope, reimbursement terms, and limits are clear.
- Alternatives: Treat any abroad wording as full international coverage; require worldwide planned treatment; make international advisor-confirmation only.
- Insurance rationale: International scope varies by territory, treatment type, reimbursement, and emergency status.
- Impact area: scoring; product evidence; explanation; advisor handoff
- Risk if wrong: Recommendations may overstate geographic coverage.
- Required approval: Approval of partial/full international evidence levels.
- Implementation notes / not implementation: No international scoring implementation is made here.

### DEC-013: Physiotherapy / Rehabilitation Handling

- Decision ID: DEC-013
- Topic: Physiotherapy and rehabilitation.
- Status: approved
- Recommended decision: Score only from physiotherapy sessions, rehabilitation, post-accident/post-surgery therapy, session limits, provider rules, or reimbursement evidence.
- Alternatives: Infer from outpatient coverage; require rehabilitation center wording only; advisor-confirmation only.
- Insurance rationale: Rehabilitation benefits often have limits, session caps, and trigger conditions.
- Impact area: scoring; product evidence; explanation; advisor handoff
- Risk if wrong: The system may imply rehabilitation availability without session or trigger evidence.
- Required approval: Approval of physiotherapy evidence minimum.
- Implementation notes / not implementation: No rehabilitation scoring implementation is introduced here.

### DEC-014: Provider / Hospital Network Freedom Handling

- Decision ID: DEC-014
- Topic: Provider and hospital network freedom.
- Status: approved
- Recommended decision: Score network freedom from free-choice evidence, broad network evidence, out-of-network reimbursement, or direct settlement options, with capped overlap against private hospitalization.
- Alternatives: Treat any network as freedom; require open network only; ignore network freedom in scoring.
- Insurance rationale: Access model affects actual use of insurance and customer control.
- Impact area: scoring; product evidence; explanation; advisor handoff
- Risk if wrong: The system may overstate choice of provider or hospital.
- Required approval: Approval of broad-network and free-choice criteria.
- Implementation notes / not implementation: No network scoring implementation is made here.

### DEC-015: Waiting Period / Immediate-Use Handling

- Decision ID: DEC-015
- Topic: Waiting period and immediate-use handling.
- Status: approved
- Recommended decision: Treat immediate-use as advisor-confirmation unless product evidence explicitly states no, reduced, or short waiting periods for the relevant benefit.
- Alternatives: Score immediate use from generic start-date wording; exclude products with any waiting period; ignore immediate-use need.
- Insurance rationale: Waiting periods are benefit-specific and material to safe recommendation wording.
- Impact area: scoring; product evidence; advisor handoff; explanation
- Risk if wrong: Customers may expect immediate cover where waiting periods apply.
- Required approval: Approval of short-waiting-period threshold and benefit-specific wording.
- Implementation notes / not implementation: No waiting-period implementation is introduced here.

### DEC-016: Missing Evidence Policy

- Decision ID: DEC-016
- Topic: Missing evidence policy.
- Status: approved
- Recommended decision: Missing evidence must never add score. Missing hard-priority evidence creates penalty and advisor confirmation; missing additional-need evidence contributes zero or near-zero.
- Alternatives: Treat missing as neutral; treat missing as absence; exclude all missing evidence.
- Insurance rationale: Missing evidence is uncertainty, not proof of coverage or absence.
- Impact area: eligibility; scoring; product evidence; advisor handoff; explanation
- Risk if wrong: The system may overclaim or unfairly suppress products.
- Required approval: Approval of missing-evidence penalty bands and confirmation wording.
- Implementation notes / not implementation: No penalty code is implemented here.

### DEC-017: Unknown Product Data Policy

- Decision ID: DEC-017
- Topic: Unknown product data policy.
- Status: approved
- Recommended decision: Unknown product data caps recommendation confidence, prevents strong coverage wording, and routes material facts to advisor confirmation.
- Alternatives: Treat unknown as missing-only penalty; treat unknown as not covered; ignore unknown data.
- Insurance rationale: Unknown values represent unresolved insurance facts and require conservative handling.
- Impact area: eligibility; scoring; category assignment; explanation; advisor handoff
- Risk if wrong: High-score recommendations may be assigned despite unresolved material facts.
- Required approval: Approval of confidence caps and unknown-data severity rules.
- Implementation notes / not implementation: No confidence cap is implemented here.

### DEC-018: Step 5 Priority Weight Band

- Decision ID: DEC-018
- Topic: Step 5 priority weight band.
- Status: approved
- Recommended decision: Reserve 20 to 35 points for Step 5 hard priorities, require meaningful Step 5 fit for any category assignment, and include Step 5 in the approved main-emphasis group for initial v2 scoring design.
- Alternatives: Lower Step 5 below Step 8; make Step 5 hard eligibility only; use no numeric band.
- Insurance rationale: Main priorities describe core insurance needs and should dominate optional refinements.
- Impact area: scoring; category assignment
- Risk if wrong: Soft needs could outrank core hospital and major medical needs.
- Required approval: Business approved the Step 5 main-emphasis direction, point range, and minimum fit threshold for future implementation design.
- Implementation notes / not implementation: No scoring weights are implemented here.

### DEC-019: Step 8 Additional-Needs Weight Band

- Decision ID: DEC-019
- Topic: Step 8 additional-needs weight band.
- Status: approved
- Recommended decision: Reserve 8 to 20 points for Step 8, secondary to Step 5, include Step 8 in the approved main-emphasis group, and use it for refinement and tie-breaks without overpowering hard priorities.
- Alternatives: Equal weight with Step 5; explanation-only; no cap.
- Insurance rationale: Additional needs matter but should not override core coverage priorities.
- Impact area: scoring; tie-break; explanation
- Risk if wrong: Optional benefits may dominate core eligibility and priority fit.
- Required approval: Business approved the Step 8 main-emphasis direction, point range, and per-need caps for future implementation design.
- Implementation notes / not implementation: No additional-needs weighting is implemented here.

### DEC-020: Deductible Preference Weight Band

- Decision ID: DEC-020
- Topic: Deductible preference weight band.
- Status: approved
- Recommended decision: Reserve 10 to 18 points for deductible/copayment fit, based only on explicit deductible or participation evidence, and include Step 6 in the approved main-emphasis group for initial v2 scoring design.
- Alternatives: Use high weight; use explanation-only; infer from price tier.
- Insurance rationale: Deductible preference is material to out-of-pocket cost but must remain evidence-bound.
- Impact area: scoring; product evidence; explanation
- Risk if wrong: Ranking may overvalue or misstate cost sharing.
- Required approval: Business approved the Step 6 main-emphasis direction, weight band, and evidence threshold for future implementation design.
- Implementation notes / not implementation: No deductible weighting is implemented here.

### DEC-021: Cost / Protection Approach Weight Band

- Decision ID: DEC-021
- Topic: Cost/protection approach weight band.
- Status: approved
- Recommended decision: Reserve 10 to 18 points for cost/protection approach as category-shaping, not as a standalone category trigger and not as part of the approved main-emphasis group unless later approved.
- Alternatives: Use approach as primary category assignment; ignore approach; make approach explanation-only.
- Insurance rationale: Approach expresses trade-off preference but cannot override evidence or eligibility.
- Impact area: scoring; category assignment; explanation
- Risk if wrong: Categories may reflect stated preference rather than insurance fit.
- Required approval: Business approved Step 7 as considered and category-shaping, while keeping it outside the initial main-emphasis group.
- Implementation notes / not implementation: No category logic is implemented here.

### DEC-022: Overlap Caps For Related Signals

- Decision ID: DEC-022
- Topic: Overlap caps for related signals.
- Status: approved
- Recommended decision: Cap combined credit for surgery, serious illness, and high-limit when supported by the same major hospitalization evidence; also cap private hospitalization/provider freedom overlap.
- Alternatives: No caps; hard one-signal-only rule; manual advisor-only overlap.
- Insurance rationale: One product fact should not create multiple full credits for related needs.
- Impact area: scoring; product evidence; explanation
- Risk if wrong: Scores may be inflated by duplicated evidence.
- Required approval: Approval of cap percentages and affected signal groups.
- Implementation notes / not implementation: No overlap logic is implemented here.

### DEC-023: Best Match Category Threshold

- Decision ID: DEC-023
- Topic: Best Match category threshold.
- Status: approved
- Recommended decision: Assign Best Match only when eligibility certainty is acceptable, Step 5 fit is meaningful, evidence is sufficiently complete, and no hard-priority conflict remains unresolved.
- Alternatives: Highest score always gets Best Match; require all priorities to be confirmed; avoid Best Match category.
- Insurance rationale: Best Match must mean balanced evidence-supported fit, not merely highest numeric score.
- Impact area: category assignment; scoring; explanation; advisor handoff
- Risk if wrong: A high-scoring but uncertain product may be framed as the best fit.
- Required approval: Approval of minimum score, evidence completeness, and unresolved-conflict thresholds.
- Implementation notes / not implementation: No category threshold is implemented here.

### DEC-024: Premium Choice Category Threshold

- Decision ID: DEC-024
- Topic: Premium Choice category threshold.
- Status: approved
- Recommended decision: Assign Premium Choice only when evidence supports broader protection, richer benefits, higher relevant limits, or broader network access.
- Alternatives: Use highest price tier; use complete approach alone; avoid Premium Choice category.
- Insurance rationale: Premium Choice must describe evidence-supported breadth, not commercial premium positioning.
- Impact area: category assignment; product evidence; explanation
- Risk if wrong: Category may imply superior coverage without evidence.
- Required approval: Approval of breadth evidence and minimum certainty threshold.
- Implementation notes / not implementation: No Premium Choice logic is implemented here.

### DEC-025: Smart Budget Choice Category Threshold

- Decision ID: DEC-025
- Topic: Smart Budget Choice category threshold.
- Status: approved
- Recommended decision: Assign Smart Budget Choice only when essential hard-priority fit is acceptable and evidence supports cost-control alignment, deductible trade-off, or narrower coherent coverage.
- Alternatives: Use cheapest product; use basic approach alone; avoid budget category.
- Insurance rationale: Budget category must still preserve suitability for core needs.
- Impact area: category assignment; scoring; explanation
- Risk if wrong: A cheap but unsuitable product may appear recommended.
- Required approval: Approval of essential-fit and cost-control thresholds.
- Implementation notes / not implementation: No Smart Budget Choice logic is implemented here.

### DEC-026: No-Category / Advisor-Confirmation Condition

- Decision ID: DEC-026
- Topic: No-category and advisor-confirmation condition.
- Status: approved
- Recommended decision: Show no category when eligibility is materially uncertain, hard-priority evidence is unresolved, exclusions/waiting periods undermine the core need, or category evidence is incomplete.
- Alternatives: Always assign three categories; assign provisional category; hide only excluded products.
- Insurance rationale: A category can imply recommendation confidence and should be withheld when material uncertainty exists.
- Impact area: category assignment; advisor handoff; explanation
- Risk if wrong: Customers may treat uncertain products as endorsed.
- Required approval: Approval of no-category triggers and customer wording.
- Implementation notes / not implementation: No category suppression is implemented here.

### DEC-027: Tie-Break Order

- Decision ID: DEC-027
- Topic: Tie-break order.
- Status: approved
- Recommended decision: Use eligibility certainty, evidence completeness, Step 5 fit, deductible fit, approach fit, breadth, Step 8 fit, fewer confirmations, existing-policy handling, then deterministic product_id.
- Alternatives: Use score only; use price first; use product_id early; use category first.
- Insurance rationale: Ties should be resolved by insurance certainty and need fit before deterministic fallback.
- Impact area: scoring; category assignment; product evidence
- Risk if wrong: Ordering may become commercially biased or unstable.
- Required approval: Approval of tie-break order and any additional tie-breaks.
- Implementation notes / not implementation: No ordering logic is implemented here.

### DEC-028: Existing Policy Comparison Influence On Ranking

- Decision ID: DEC-028
- Topic: Existing policy comparison influence on ranking.
- Status: approved
- Recommended decision: Allow ranking influence only from reliable confirmed gaps aligned with proposed-product evidence and continuity risks; keep unknown comparison facts out of ranking.
- Alternatives: Make comparison explanation-only; let all current-policy gaps affect score; use PDF absence as penalty.
- Insurance rationale: Existing policy evidence can reveal fit relevance but must not replace proposed-product evidence.
- Impact area: scoring; comparison; explanation; advisor handoff
- Risk if wrong: Ranking may be distorted by uncertain extraction or missing PDF.
- Required approval: Approval of comparison influence limits and reliability threshold.
- Implementation notes / not implementation: No comparison ranking logic is implemented here.

### DEC-029: Current Policy Advantages Handling

- Decision ID: DEC-029
- Topic: Current policy advantages.
- Status: approved
- Recommended decision: Display current policy advantages separately, reduce replacement confidence wording, and route material advantages to advisor review.
- Alternatives: Ignore current advantages; subtract score automatically; block recommendations when advantages exist.
- Insurance rationale: Current advantages may be material but do not automatically make a proposed product unsuitable.
- Impact area: comparison; explanation; advisor handoff
- Risk if wrong: The system may overstate replacement value or hide relevant trade-offs.
- Required approval: Approval of advantage display and confidence wording.
- Implementation notes / not implementation: No current-policy scoring implementation is made here.

### DEC-030: Customer-Facing Wording Boundaries

- Decision ID: DEC-030
- Topic: Customer-facing wording.
- Status: approved
- Recommended decision: Use bounded wording such as "supports", "appears aligned", and "needs confirmation"; do not use "covered", "excluded", "unlimited", "no waiting period", or "no participation" without exact evidence.
- Alternatives: Use stronger sales wording; use legalistic wording only; hide all uncertain facts.
- Insurance rationale: Customer wording must avoid overclaiming and preserve evidence boundaries.
- Impact area: explanation; advisor handoff
- Risk if wrong: Customers may misunderstand unconfirmed coverage as guaranteed.
- Required approval: Approval of customer wording templates and prohibited terms.
- Implementation notes / not implementation: No explanation templates are implemented here.

### DEC-031: Advisor-Facing Wording Boundaries

- Decision ID: DEC-031
- Topic: Advisor-facing wording.
- Status: approved
- Recommended decision: Advisor notes should identify unresolved evidence, affected area, and whether it impacts eligibility, score, comparison, or explanation.
- Alternatives: Same wording as customer; free-form notes only; omit advisor notes.
- Insurance rationale: Advisors need actionable unresolved facts, not marketing summaries.
- Impact area: advisor handoff; explanation; product evidence
- Risk if wrong: Advisors may miss the specific fact requiring confirmation.
- Required approval: Approval of advisor-note structure and required fields.
- Implementation notes / not implementation: No advisor handoff schema is implemented here.

### DEC-032: Product Evidence Required Before v2 Activation

- Decision ID: DEC-032
- Topic: Product evidence required before v2 activation.
- Status: approved
- Recommended decision: Require approved evidence fields for all product evidence requirements in the 3D spec before runtime activation.
- Alternatives: Activate with partial evidence; activate with advisor-confirmation for all unknowns; postpone v2 until full product database expansion.
- Insurance rationale: v2 scoring and categories depend on evidence completeness and cannot safely activate without product facts.
- Impact area: product evidence; eligibility; scoring; category assignment; explanation
- Risk if wrong: v2 may rank or explain products from incomplete evidence.
- Required approval: Approval of evidence schema, minimum data completeness, and activation data audit.
- Implementation notes / not implementation: Blocked documentation decision; no product database change is made here.

### DEC-035: Step 4 Evaluation Goal Weighting Direction

- Decision ID: DEC-035
- Topic: Step 4 evaluation goal weighting direction.
- Status: approved
- Recommended decision: Consider all questionnaire inputs, but include Step 4 evaluation goal in the approved main-emphasis group for initial v2 scoring design because it determines whether the evaluation is first-time guidance, employer independence, existing-policy comparison, or value improvement.
- Alternatives: Treat Step 4 as context-only; give Step 4 equal weight with every other input; let Step 4 override eligibility and hard-priority evidence.
- Insurance rationale: Evaluation goal changes the insurance interpretation of the same product evidence, especially continuity, existing-policy comparison, and value-improvement contexts, but it must not create coverage claims or override eligibility.
- Impact area: scoring; explanation; advisor handoff; comparison
- Risk if wrong: The system may underweight the customer's evaluation intent or overuse it to rank products without evidence.
- Required approval: Business approved Step 4 as part of the initial main-emphasis group for future v2 scoring design.
- Implementation notes / not implementation: No Step 4 scoring implementation or production constant is introduced here.

### DEC-033: Backward Compatibility v1 To v2

- Decision ID: DEC-033
- Topic: Backward compatibility from v1 to v2.
- Status: approved
- Recommended decision: Keep v1 active until v2 has approved rules, product evidence, deterministic tests, migration plan, and explicit activation milestone.
- Alternatives: Replace v1 immediately; run v1 and v2 side by side without activation criteria; remove v1 characterization tests.
- Insurance rationale: v1 stability protects current customer flow while v2 rules remain unapproved.
- Impact area: eligibility; scoring; category assignment; explanation; advisor handoff
- Risk if wrong: Unapproved v2 behavior could affect live recommendations.
- Required approval: Approval of compatibility criteria and activation sequence.
- Implementation notes / not implementation: No v1 or v2 runtime path changes are made here.

### DEC-034: Activation Checklist Before Runtime Use

- Decision ID: DEC-034
- Topic: Activation checklist before runtime use.
- Status: approved
- Recommended decision: Require business approvals, product evidence audit, deterministic rule artifact, v1 characterization protection, v2 migration/release plan, rollback plan, and explicit runtime activation approval.
- Alternatives: Activate after documentation only; activate after tests only; activate manually without checklist.
- Insurance rationale: Insurance recommendation behavior needs auditable approval before customer impact.
- Impact area: eligibility; scoring; category assignment; explanation; product evidence; advisor handoff
- Risk if wrong: v2 could become customer-facing without approved governance.
- Required approval: Approval of complete activation checklist and accountable owners.
- Implementation notes / not implementation: Checklist only; no runtime activation is performed here.


