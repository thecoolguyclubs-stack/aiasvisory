# Milestone 3D: Insurance-First v2 Evaluation Rules Specification

Status: draft specification only. This document is not a runtime contract, not a scoring implementation, and not an activation plan.

Business approval cross-reference: `docs/insurance-evaluation-v2-decision-matrix.md` records business approval of the 3E decision matrix. That approval is not runtime activation. v2 remains draft and not active. The approved initial v2 weighting direction is: all questionnaire inputs are considered, with stronger initial emphasis on Step 4 evaluation goal, Step 5 main priorities, Step 6 deductible/copayment preference, and Step 8 additional needs. Step 7 cost/protection approach remains considered and category-shaping, but is not part of the approved main-emphasis group unless later approved.

Generated blueprint cross-reference: `generated/insurance-evaluation-v2-rules.generated.ts` is a deterministic machine-readable draft artifact for future implementation only. It is not active runtime behavior and must not be imported by production `src` before an explicit activation milestone.

Activation boundaries:
- v1 remains the active runtime questionnaire and evaluation path.
- questionnaire v2 remains draft and not active.
- No v2 scoring, ranking, eligibility, category assignment, explanation generation, product filtering, or database migration is activated by this slice.
- Product facts remain unchanged. Any rule below is a draft rule for later implementation review.

## 1. Insurance Evaluation Principles

An insurance-material criterion is a user answer or product fact that can change underwriting feasibility, eligibility, risk of unsuitable recommendation, expected out-of-pocket cost, ability to use the cover, or need for advisor confirmation. It is not marketing preference. It must connect to at least one insurance consequence: acceptance, exclusion, waiting period, deductible/copayment, limit, network access, territorial scope, or service process.

The evaluation must separate four concepts:
- Eligibility: whether a product can be offered or should be excluded for the profile.
- Scoring: how well an eligible product fits the stated needs.
- Comparison: how a proposed product differs from an existing policy or offer.
- Explanation: what can be safely said to the customer or advisor.

Evidence boundaries:
- A product can be described as a good indication only when available facts suggest a fit but do not prove exact coverage.
- A product can be described as confirmed coverage only when product evidence explicitly supports the coverage, limit, deductible, network, territory, waiting period, or exclusion status.
- Missing evidence must never be treated as positive evidence.
- Unknown product data must become an advisor-confirmation item or a scoring penalty, not a positive claim.
- Existing policy comparison must not say "better" when material product facts are unknown.

Overclaiming guardrails:
- Do not claim coverage exists unless product evidence names the coverage or an equivalent insured benefit.
- Do not claim low deductible unless the amount, band, or explicit no/low participation term is present.
- Do not claim high limit unless the limit amount or an approved high-limit band is present.
- Do not claim no waiting period unless waiting-period evidence explicitly supports immediate or short-use terms.
- Do not claim network freedom unless evidence supports open network, broad partner network, or reimbursement outside a narrow network.
- Do not infer maternity, pediatric, rehabilitation, international, emergency, or outpatient coverage from generic hospitalization wording.
- Do not convert "not excluded" into "covered" without an affirmative benefit.

## 2. Questionnaire v2 Input Classification

### Step 1: Insured People

Insurance meaning: identifies insured composition: individual, couple, family, or children-only profile.

Classification:
- Eligibility input: yes, for family/child/couple product restrictions and member count handling.
- Scoring input: low weight, only when product evidence has family, pediatric, or couple-relevant fit.
- Explanation input: yes, to explain family or child-specific considerations.
- Advisor-confirmation input: yes, when product data does not clarify dependants, child-only eligibility, or family plan rules.
- Context-only: no.

Signals:
- individual_profile
- couple_profile
- family_profile
- child_or_pediatric_profile

Must not affect:
- It must not imply pediatric coverage exists.
- It must not override age eligibility or product member limits.
- It must not raise score for family copy unless product evidence supports family or child suitability.

### Step 2: Ages

Insurance meaning: age is a direct eligibility and underwriting constraint and may affect waiting periods, underwriting review, and price bands.

Classification:
- Eligibility input: yes, primary.
- Scoring input: no, except as a penalty/confirmation when product age evidence is incomplete.
- Explanation input: yes, to state age-related confirmation needs.
- Advisor-confirmation input: yes, when age limits, child age definitions, senior acceptance, or renewal rules are missing.
- Context-only: no.

Signals:
- adult_age_band
- child_age_band
- senior_age_band
- age_limit_confirmation_required

Must not affect:
- It must not create a positive product fit by itself.
- It must not be used to rank products by assumed premium unless actual product/premium evidence exists.

### Step 3: Existing Insurance

Insurance meaning: indicates whether comparison, continuity, duplicate cover, group-to-individual transition, or existing policy evidence matters.

Classification:
- Eligibility input: usually no, except where product evidence or underwriting states restrictions for already-insured customers.
- Scoring input: low weight for continuity and comparison use cases.
- Explanation input: yes.
- Advisor-confirmation input: yes, especially for group insurance gaps, portability, waiting-period continuity, and duplicate cover.
- Context-only: partly, when no policy evidence is uploaded.

Signals:
- no_existing_cover
- individual_existing_policy
- group_existing_policy
- combined_existing_cover
- continuity_independent

Must not affect:
- Existing insurance must not automatically make a product better.
- Group insurance must not be treated as equivalent to individual lifetime coverage.

### Step 4: Evaluation Goal

Insurance meaning: describes the customer's evaluation intent: first-time guidance, independence from employer, existing policy comparison, or value improvement.

Classification:
- Eligibility input: no.
- Scoring input: low to medium, only as a prioritization of evidence emphasis.
- Explanation input: yes.
- Advisor-confirmation input: yes for existing-policy comparison and employer independence.
- Context-only: no.

Signals:
- first_time_guidance
- continuity_independent
- existing_policy_comparison
- balanced_value

Must not affect:
- It must not change whether a coverage exists.
- It must not override hard eligibility or product exclusions.

### Step 5: Main Priorities

Insurance meaning: these are hard or near-hard insurance needs for hospital and major medical protection. Step 5 priorities should carry more scoring weight than Step 8 additional needs.

Classification:
- Eligibility input: sometimes, when a priority is hard and the product clearly lacks it.
- Scoring input: yes, primary.
- Explanation input: yes.
- Advisor-confirmation input: yes when evidence is incomplete.
- Context-only: no.

Signals:
- private_hospitalization for hospital-network.
- surgery for surgery.
- emergency for emergency.
- serious_illness for serious-illness.
- high_long_term_hospitalization_limit for high-limit.
- low_deductible_or_low_copayment for low-deductible.

Must not affect:
- surgery and serious illness must not be collapsed in explanation, even if both may map to major hospitalization evidence for legacy compatibility.
- emergency must not imply ambulance, ER, or immediate admission coverage unless evidence supports it.
- high limit must not imply unlimited cover unless evidence states unlimited or an approved equivalent.

### Step 6: Deductible / Copayment Preference

Insurance meaning: expresses acceptable out-of-pocket participation in hospitalization.

Classification:
- Eligibility input: no, unless a customer explicitly requires zero/low participation and product has only high deductible bands.
- Scoring input: yes.
- Explanation input: yes.
- Advisor-confirmation input: yes where deductible amounts are missing or conditional.
- Context-only: no.

Signals:
- low_deductible_preference for 0 EUR to 500 EUR.
- moderate_deductible_tolerance for 500 EUR to 1,500 EUR.
- high_deductible_budget_tolerance for 1,500 EUR and above.

Must not affect:
- It must not claim final premium savings.
- It must not infer deductible amounts from product category or price tier.

### Step 7: Protection / Cost Approach

Insurance meaning: states the preferred trade-off between breadth of coverage and affordability.

Classification:
- Eligibility input: no.
- Scoring input: yes, category-shaping.
- Explanation input: yes.
- Advisor-confirmation input: yes when breadth/cost evidence is incomplete.
- Context-only: no.

Signals:
- premium_breadth_preference for complete / Premium Choice.
- balanced_value_preference for balanced / Best Match.
- essential_budget_preference for basic / Smart Budget Choice.

Must not affect:
- It must not assign a recommendation category by itself.
- It must not override hard mismatches in Step 5 priorities.

### Step 8: Additional Needs

Insurance meaning: optional insurance needs that refine the fit. They should not outweigh main priorities unless a need is explicitly marked as hard by a later advisor workflow.

Classification:
- Eligibility input: sometimes, for maternity, pediatric, international, or immediate-use needs when a product explicitly excludes or lacks required evidence.
- Scoring input: yes, secondary.
- Explanation input: yes.
- Advisor-confirmation input: yes when product facts are incomplete.
- Context-only: no.

Signals:
- outpatient_visits for outpatient doctor visits without hospitalization.
- international_coverage for frequent_travel.
- maternity for maternity.
- physiotherapy_rehabilitation for physiotherapy.
- pediatric_coverage for young_children.
- short_waiting_period_or_immediate_use for immediate_use.
- provider_network_freedom for provider_freedom.
- diagnostics_checkup for prevention_checkup.

Important separation:
- outpatient visits are visits to doctors without hospitalization.
- diagnostics/check-up are diagnostic tests, imaging, laboratory tests, and preventive health checks.
- outpatient visits and diagnostics/check-up are separate signals and separate database-facing canonical values.

Must not affect:
- outpatient_visits must not be collapsed into diagnostics_checkup.
- diagnostics_checkup must not imply doctor visits.
- maternity must not imply pregnancy is immediately covered.
- international coverage must not imply worldwide cover unless evidence states it.

### Optional PDF Evidence Workflow

Insurance meaning: an uploaded existing policy or offer can provide comparison evidence, current-policy advantages, exclusions, gaps, and advisor-confirmation items.

Classification:
- Eligibility input: no for proposed-product eligibility unless extracted evidence reveals constraints that must be considered by an advisor.
- Scoring input: limited. It can influence comparison emphasis, continuity risk, and unresolved-confirmation penalties, but must not become product evidence for the proposed product.
- Explanation input: yes.
- Advisor-confirmation input: yes.
- Context-only: no.

Signals:
- existing_policy_evidence_available
- existing_policy_advantage
- existing_policy_gap
- comparison_unknown

Must not affect:
- Existing policy evidence must not be used as proposed-product evidence.
- Upload absence must not penalize a first-time customer.

## 3. Eligibility Rules

Eligibility is separate from scoring. A product can score well on preferences but still be excluded or routed to advisor confirmation.

Draft eligibility outcomes:
- Exclude: the product is clearly incompatible with a hard eligibility requirement or explicit product restriction.
- Degrade: the product remains eligible but receives a fit penalty because evidence suggests weak fit or material missing data.
- Advisor confirmation: the product may be eligible but needs human verification before recommendation wording can be strong.
- Pass: no known eligibility blocker and enough evidence exists for the relevant profile.

Age limits:
- Exclude when product evidence explicitly states a maximum or minimum entry age that conflicts with any insured person.
- Advisor confirmation when age limits are missing for a senior, child-only, or multi-member profile.
- Degrade when renewal age or age-band evidence is incomplete but entry age appears plausible.

Child / family / couple / individual:
- Exclude child-only submissions only if product evidence says children cannot be insured alone.
- Advisor confirmation if child-only rules are unknown.
- Degrade if family/couple member structure is unsupported by evidence but not explicitly excluded.
- Pass if evidence supports the insured composition and member count.

Number of insured people:
- Exclude if member count exceeds product maximum.
- Advisor confirmation if maximum member count is unknown and the profile has more than one insured.
- Degrade if family packaging is unclear.

Existing insurance:
- Existing insurance does not exclude by default.
- Group insurance creates advisor confirmation for portability, continuity, and conversion to personal cover.
- Existing individual cover creates comparison context and duplicate-coverage confirmation.

Serious illness needs:
- Do not exclude solely because the user selected serious illness.
- Degrade if product evidence lacks major hospitalization, serious-condition, or high-limit facts.
- Advisor confirmation when serious illness support is unclear.
- Exclude only if product evidence explicitly excludes the relevant serious-condition category.

Maternity needs:
- Degrade when maternity is missing or unclear.
- Advisor confirmation for waiting periods, pregnancy status restrictions, delivery type, complications, and limits.
- Exclude only if maternity is explicitly not available and maternity is marked as hard in a later workflow.

Pediatric needs:
- Degrade if pediatric evidence is absent for child/family profiles.
- Advisor confirmation for child age definitions, pediatric network, and dependant eligibility.
- Exclude only when child coverage is explicitly unavailable for the profile.

Unknown / missing product data:
- Missing eligibility-critical data cannot produce a pass with strong wording.
- Missing data for hard constraints becomes advisor confirmation.
- Missing data for soft preferences becomes scoring penalty and explanation limitation.

## 4. Scoring Rules

This is a draft scoring model only. It must not be implemented or activated in this slice.

Signal categories and draft weight bands:
- Evaluation goal from Step 4: approved as a main-emphasis input for initial v2 scoring design, without overriding eligibility or product evidence.
- Hard priorities from Step 5: 20 to 35 points total.
- Deductible/copayment fit from Step 6: 10 to 18 points.
- Protection/cost approach from Step 7: 10 to 18 points.
- Additional needs from Step 8: 8 to 20 points total.
- Existing policy / continuity context: 0 to 8 points, mostly for explanation and confirmation.
- Evidence completeness / certainty: 10 to 20 points or an equivalent penalty band.

Missing evidence policy:
- Missing evidence for a selected hard priority should reduce score and create advisor confirmation.
- Missing evidence for an additional need should reduce the contribution of that need to zero or near-zero.
- Missing evidence must never add score.
- Unknown eligibility evidence should cap the final recommendation confidence.

Overlap caps:
- surgery, serious illness, and high-limit may share major hospitalization evidence, but their combined contribution must be capped to avoid triple-counting the same product fact.
- emergency can overlap with hospitalization evidence but should require emergency-specific evidence for full credit.
- private hospitalization and provider freedom may overlap through network evidence; cap when supported by the same fact.
- outpatient visits and diagnostics/check-up must not overlap; they are separate signals.

Step 5 versus Step 8:
- Step 5 main priorities should dominate Step 8 additional needs.
- A product with poor Step 5 fit should not become Best Match only because it fits several Step 8 needs.
- Step 8 can break ties between products that are otherwise similar on eligibility and Step 5 fit.

Specific signal handling:
- surgery: requires surgery benefit, operation coverage, hospitalization surgery wording, or major medical procedure evidence.
- serious illness: requires serious-condition, major hospitalization, high-cost illness, critical illness, or comparable explicit evidence.
- emergency: requires emergency hospitalization, urgent admission, emergency support, or comparable evidence.
- high limit: requires limit amount, unlimited language, long-term hospitalization support, ICU/major care evidence, or approved high-limit band.
- outpatient visits: requires doctor visit evidence without hospitalization.
- diagnostics/check-up: requires diagnostic exams, lab/imaging, preventive check-up, or screening evidence.
- deductible preference: score only from explicit deductible/copayment evidence.
- cost/protection approach: complete favors breadth and high certainty; balanced favors broad fit with controlled trade-offs; basic favors essential coverage with acceptable hard-priority fit.
- existing policy impact: comparison evidence can influence advisor confirmations and tie-breaks, but it should not replace product evidence for the proposed product.

## 5. Recommendation Category Semantics

Best Match:
- Means the product has the strongest balanced fit to stated needs among eligible candidates.
- Requires acceptable eligibility certainty, meaningful Step 5 fit, and no unresolved hard-priority conflict.
- Does not mean the product is objectively best, cheapest, or fully confirmed.

Premium Choice:
- Means the product appears to provide broader protection or higher evidence-supported coverage breadth.
- Requires evidence of breadth, network, limits, or richer benefits.
- Does not mean luxury, guaranteed superior cover, or highest price.

Smart Budget Choice:
- Means the product appears to satisfy essential needs with stronger cost-control alignment.
- Requires acceptable hard-priority fit and evidence of deductible/cost trade-off or narrower but coherent coverage.
- Does not mean cheapest, low quality, or sufficient for every stated need.

No category assignment:
- Do not assign a category when eligibility is uncertain for a material profile constraint.
- Do not assign a category when evidence is too incomplete to support the category meaning.
- Do not assign a category when a product has a high numeric score only from soft needs while failing hard priorities.
- Do not assign a category when unresolved exclusions or waiting periods undermine the core need.

## 6. Tie-Break Policy

Draft deterministic tie-break order:
1. Eligibility certainty.
2. Evidence completeness for selected hard priorities.
3. Fit to Step 5 hard priorities.
4. Fit to deductible/copayment preference.
5. Fit to protection/cost approach.
6. Breadth of relevant coverage supported by evidence.
7. Fit to Step 8 additional needs.
8. Fewer unresolved advisor confirmations.
9. Better handling of existing policy gaps without ignoring current policy advantages.
10. Deterministic product_id as the last fallback only.

## 7. Existing Policy Comparison Rules

What can affect ranking:
- Confirmed gaps in the existing policy that align with evidence-supported strengths of a proposed product.
- Continuity risks from group insurance when proposed product evidence supports personal continuity.
- Material current-policy deficiencies only when extracted evidence is reliable.

What must not affect ranking:
- Extracted policy facts must not be used as proposed-product facts.
- Unknown current policy terms must not penalize a proposed product.
- Uploaded PDF absence must not penalize first-time or no-existing-policy users.
- Current policy advantages must not be hidden to boost a proposed product.

Comparison-only items:
- Current policy advantages.
- Similar coverage areas.
- Unknown or unverified current policy terms.
- Trade-offs between current and proposed terms.

Advisor-confirmation items:
- Any material unknown in current policy comparison.
- Waiting-period continuity.
- Pre-existing condition handling.
- Duplicate coverage or overlap.
- Whether current policy advantages are worth preserving.

Avoiding "better" with unknowns:
- Use "may improve", "appears stronger on the available evidence", or "needs confirmation" when facts are incomplete.
- Do not say "better coverage" when current policy or proposed product evidence is missing.
- Do not say "replacement is recommended" from automated comparison alone.

Current policy advantages:
- Must be displayed as advantages or possible advantages when evidence supports them.
- Must reduce confidence in replacement wording.
- Must be routed to advisor review when material to the customer's selected priorities.

## 8. Explanation Rules

Strengths:
- A strength must cite an evidence-supported product fact.
- A strength must be tied to a selected user need or a material eligibility/context factor.
- A strength must use bounded wording: "supports", "is relevant to", "appears aligned with", not "guarantees".

Trade-offs:
- Trade-offs must include deductibles, waiting periods, exclusions, narrower networks, lower limits, missing evidence, or cost/protection compromises.
- Trade-offs must not be hidden when a product is otherwise high scoring.

Missing evidence:
- Missing evidence must appear as a limitation or advisor-confirmation item.
- Missing evidence must not be phrased as negative coverage unless evidence confirms absence.

Current policy advantages:
- Must be clearly separated from proposed-product strengths.
- Must not be overwritten by recommendation category.

Items to confirm:
- Include eligibility unknowns, age/member restrictions, deductible amounts, waiting periods, exclusions, maternity terms, pediatric terms, international scope, provider freedom, and outpatient/diagnostic limits when relevant.

Customer-facing wording boundaries:
- Use simple insurance language and avoid legal certainty unless evidence is exact.
- Do not state "covered", "excluded", "unlimited", "no waiting period", or "no participation" without exact evidence.
- Use "towards confirmation by an advisor" for uncertain facts.

Advisor-facing wording boundaries:
- Advisor notes may be more technical and should include the exact unresolved evidence requirement.
- Advisor notes should identify whether the issue affects eligibility, score, comparison, or explanation.

## 9. Product Evidence Requirements

Private hospitalization:
- Evidence needed: private hospital access, inpatient hospitalization benefit, partner/private network, reimbursement for private hospitals, or equivalent.

Surgery:
- Evidence needed: surgery/operation benefit, hospitalization surgery wording, surgical fees, operating room, major procedure benefit, or equivalent.

Emergency:
- Evidence needed: emergency hospitalization, urgent admission, emergency assistance, emergency department terms, ambulance/emergency transport only if explicitly relevant.

Serious illness:
- Evidence needed: major hospitalization, high-cost illness, serious condition, ICU/critical care, cancer/cardiac/neurosurgery evidence, or equivalent.

High long-term hospitalization limit:
- Evidence needed: annual/lifetime limit amount, unlimited cover statement, high-limit band, ICU/long-stay evidence, or long-term hospitalization rules.

Low deductible/copayment:
- Evidence needed: amount, band, zero deductible, low copayment, deductible waiver, or explicit participation terms.

Outpatient visits:
- Evidence needed: doctor visits, outpatient consultation, specialist visits, visit network, visit reimbursement, or outpatient doctor service evidence.

International coverage:
- Evidence needed: territory scope, Europe/worldwide wording, emergency abroad, planned treatment abroad, or reimbursement abroad terms.

Maternity:
- Evidence needed: delivery, caesarean, pregnancy complications, maternity allowance, waiting periods, pregnancy restrictions, or limits.

Physiotherapy/rehabilitation:
- Evidence needed: physiotherapy sessions, rehabilitation, post-accident/post-surgery therapy, session limits, provider rules, or reimbursement terms.

Pediatric coverage:
- Evidence needed: child eligibility, pediatric doctors, pediatric hospitalization, child-specific benefits, dependant rules, or pediatric network.

Waiting period/immediate use:
- Evidence needed: waiting-period table, immediate cover wording, reduced waiting period, accident exception, continuity rules, or start-date terms.

Provider/hospital network freedom:
- Evidence needed: free choice of doctor/hospital, broad network, out-of-network reimbursement, direct settlement options, or provider access terms.

Diagnostics/check-up:
- Evidence needed: diagnostic exams, laboratory tests, imaging, annual check-up, preventive screening, diagnostic network, or reimbursement terms.

## 10. Backward Compatibility / Activation Boundaries

v1 remains active runtime:
- Existing runtime questionnaire, validation, scoring, ranking, recommendation, PDF flow, lead flow, and UI remain the active application behavior.

v2 remains draft:
- questionnaire v2 contract stays draft.
- runtimeActive remains false.
- No runtime import of a v2 generated artifact is required or allowed by this spec slice.

Before implementation:
- Business owners must approve eligibility hard stops, scoring weights, category semantics, and advisor-confirmation rules.
- Product evidence schema must be reviewed for all required evidence fields.
- A deterministic rules artifact can be created only after business approval.
- Implementation must include characterization tests proving v1 behavior is unchanged until activation.
- Activation requires an explicit future milestone and migration/release plan.

## 11. Open Business Decisions

1. Define exact age eligibility bands and whether senior profiles should be excluded, degraded, or always advisor-confirmed when product age evidence is missing.
2. Decide whether maternity is a hard exclusion, scoring penalty, or advisor-confirmation-only need when product evidence lacks maternity facts.
3. Decide whether child-only submissions can be automatically excluded for products without explicit child-only evidence.
4. Approve numerical weight bands for Step 5, Step 6, Step 7, Step 8, and evidence completeness.
5. Approve overlap caps for surgery, serious illness, and high-limit evidence when supported by the same major hospitalization facts.
6. Approve the threshold for assigning Best Match, Premium Choice, and Smart Budget Choice.
7. Decide what evidence level is sufficient to call a deductible "low" for the 0 EUR to 500 EUR preference.
8. Decide whether international coverage requires emergency-abroad evidence only or planned-treatment-abroad evidence for full credit.
9. Decide how much existing policy comparison may influence ranking versus explanation only.
10. Approve customer-facing and advisor-facing wording templates for missing evidence, current policy advantages, and unresolved confirmations.
11. Decide whether no category should be shown for products with unresolved hard-priority evidence even if they are otherwise eligible.
12. Approve product evidence fields required before v2 activation.
