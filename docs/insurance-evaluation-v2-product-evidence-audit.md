# Milestone 3I: v2 Product Evidence Audit

Status: read-only audit only. No product database change, no Supabase write, no migration apply, no provider call, no runtime activation, and no scoring or eligibility implementation are included in this milestone. v2 remains draft/not active.

## 1. Audit Scope And Boundaries

Reviewed inputs:
- `generated/insurance-evaluation-v2-rules.generated.ts`
- `src/lib/evaluation-v2/contracts.ts`
- `docs/insurance-evaluation-v2-decision-matrix.md`
- `docs/insurance-evaluation-v2-rules.md`
- `src/lib/recommendations/contracts.ts`
- `src/lib/recommendations/programs.ts`
- `src/lib/recommendations/product-facts.ts`
- `src/lib/recommendations/database-normalization.ts`
- `src/lib/policy-analysis/comparison.ts`
- `scripts/assert-product-facts.mjs`
- `src/lib/policy-analysis/fixtures.ts`

Read-only limitations:
- No Supabase remote query was used in this audit.
- No product database write was attempted.
- No migration apply was attempted.
- No OpenAI/provider call was used.
- The current product inventory below is based on local schemas, deterministic fixtures, and demo catalog metadata only.

Audit conclusion in one line:
- The current local product-detail contract is strong enough for deductible, hospitalization-limit, waiting-period, network, and some surgery-adjacent evidence normalization, but too incomplete for safe broad v2 scoring across all approved signals without a data expansion backlog.

## 2. Local Evidence Sources Reviewed

- Structured product-detail schema:
  `coverageFacts`, `deductibleRules`, `monetaryFacts`, `waitingPeriods`, `exclusions`, `providerNetworks`, `procedureFees`, `supplementaryBenefits`, `claimRules`.
- Canonical local topic normalization:
  `hospitalization`, `outpatient`, `emergency`, `diagnostics`, `surgery`, `serious_illness`, `international`, `physiotherapy`, `prevention`, `maternity`, `pediatric`, `network`.
- Deterministic local product-detail fixture:
  one normalized fixture with hospitalization coverage, annual limit, deductible, waiting period, exclusion, provider network, and surgery fee evidence.
- Demo catalog:
  six mock products with `priorityFit` and `additionalNeedsFit`, useful for UI/demo behavior only, not structured product evidence.
- Existing policy comparison:
  current policy evidence can compare existing-policy facts against proposed structured facts, but it must not be treated as proposed-product evidence.

## 3. Signal-By-Signal Evidence Matrix

### private_hospitalization

- Required product evidence: private hospital access, inpatient hospitalization benefit, partner/private network.
- Current available evidence source: `coverageFacts.topic`, `coverageFacts.coverageStatus`, `coverageFacts.termAnalysis`, `coverageFacts.network`, `providerNetworks`.
- Current confidence: partial
- Safe scoring status: scoreable_with_penalty
- Overclaiming risk: generic hospitalization wording may not prove private-network access or direct private hospitalization terms.
- Missing fields: structured hospital-access flag, direct/private network scope, partner-hospital network type, preauthorization dependency.
- Recommended data additions: structured inpatient/private hospital access field, direct vs reimbursement access mode, hospital-network breadth classification.

### surgery

- Required product evidence: surgery benefit, operation coverage, surgical fees, operating room, major procedure benefit.
- Current available evidence source: `coverageFacts` with surgery topic text, `procedureFees`, `supplementaryBenefits`, `exclusions`.
- Current confidence: partial
- Safe scoring status: scoreable_with_penalty
- Overclaiming risk: `procedureFees` prove fee records exist but do not alone prove full surgery benefit scope.
- Missing fields: structured surgery benefit flag, inpatient vs outpatient surgery scope, operating room inclusion, pre/post-surgery conditions.
- Recommended data additions: explicit surgery coverage fields, surgery limit fields, operating-room and surgeon-fee evidence classification.

### emergency

- Required product evidence: emergency hospitalization, urgent admission, emergency support.
- Current available evidence source: canonical topic support exists in `product-facts.ts` and demo catalog strings exist in `programs.ts`; no strong structured local product-detail sample was found.
- Current confidence: missing
- Safe scoring status: advisor_confirmation_only
- Overclaiming risk: emergency may be falsely inferred from generic hospitalization or assistance wording.
- Missing fields: explicit emergency admission flag, ER/urgent-care scope, ambulance/transport distinction, emergency-abroad distinction.
- Recommended data additions: structured emergency coverage field set with named emergency triggers and limitations.

### serious_illness

- Required product evidence: major hospitalization, high-cost illness, serious condition, ICU/critical care, critical illness evidence.
- Current available evidence source: canonical topic mapping exists in `product-facts.ts`; local structured fixture does not include a serious-illness-specific product record.
- Current confidence: missing
- Safe scoring status: advisor_confirmation_only
- Overclaiming risk: serious illness could be overstated from generic hospitalization or oncology wording without explicit benefit scope.
- Missing fields: structured severe-condition coverage, oncology/ICU fields, named serious-illness evidence, overlap markers vs hospitalization.
- Recommended data additions: explicit serious-illness/major-condition coverage fields and ICU/critical-care structured limits.

### high_long_term_hospitalization_limit

- Required product evidence: annual/lifetime limit amount, unlimited cover statement, approved high-limit band, ICU/long-stay evidence.
- Current available evidence source: `coverageFacts.limitFrequency`, `coverageFacts.termAnalysis`, `monetaryFacts`, some waiting/exclusion context.
- Current confidence: partial
- Safe scoring status: scoreable_with_penalty
- Overclaiming risk: annual limit evidence may exist without proving long-stay, ICU, or lifetime adequacy.
- Missing fields: separate annual vs lifetime limit field, ICU/long-stay sublimit, unlimited indicator, currency-normalized limit band.
- Recommended data additions: structured annual/lifetime limits, ICU sublimit, long-stay support indicator, approved limit-band metadata.

### low_deductible_or_copayment

- Required product evidence: amount, 0-500 EUR band, zero deductible, low copayment, deductible waiver.
- Current available evidence source: `deductibleRules.exactRule`, `coverageFacts.deductibleParticipation`, `monetaryFacts`, parsed amount/percentage normalization.
- Current confidence: sufficient
- Safe scoring status: scoreable_now
- Overclaiming risk: moderate if products mix deductible and copayment in free text or use conditional waivers.
- Missing fields: explicit deductible vs copayment split, per-coverage applicability, per-incident vs annual participation scope.
- Recommended data additions: structured deductible and copayment numeric fields by coverage, waiver flag, exact scope per benefit.

### outpatient_visits

- Required product evidence: doctor visits, outpatient consultation, specialist visits, visit network, visit reimbursement.
- Current available evidence source: canonical `outpatient` topic exists in normalization and demo catalog tags mention `outpatient_visits`; no strong structured local product-detail sample was found.
- Current confidence: missing
- Safe scoring status: advisor_confirmation_only
- Overclaiming risk: outpatient visits may be collapsed into generic outpatient copy or diagnostics/check-up wording.
- Missing fields: structured doctor-visit coverage, specialist visit count/limit, outpatient reimbursement mode, visit network type.
- Recommended data additions: explicit outpatient doctor-visit benefit fields separate from diagnostics/check-up.

### diagnostics_checkup

- Required product evidence: diagnostic exams, laboratory tests, imaging, annual check-up, preventive screening.
- Current available evidence source: canonical `diagnostics` and `prevention` topics exist in normalization and demo catalog tags mention `prevention_checkup`; no strong structured local product-detail sample was found.
- Current confidence: missing
- Safe scoring status: advisor_confirmation_only
- Overclaiming risk: diagnostic or check-up coverage may be overstated from generic outpatient or prevention wording.
- Missing fields: structured diagnostic exam coverage, imaging/lab scope, preventive screening package, annual check-up fields.
- Recommended data additions: explicit diagnostics and check-up fields distinct from outpatient doctor visits.

### international_coverage

- Required product evidence: territory scope, Europe/worldwide wording, emergency abroad, planned treatment abroad, reimbursement abroad terms.
- Current available evidence source: `coverageFacts.geography`, free-text normalization for `international`, demo catalog travel tags.
- Current confidence: partial
- Safe scoring status: advisor_confirmation_only
- Overclaiming risk: territory wording may mention abroad generally without proving planned treatment, reimbursement rules, or geographic exclusions.
- Missing fields: territory enum, emergency-abroad vs planned-treatment split, reimbursement mode, country restrictions, limit-by-territory.
- Recommended data additions: structured international territory/scope model with emergency/planned split and reimbursement conditions.

### maternity

- Required product evidence: delivery, caesarean, pregnancy complications, maternity allowance, waiting periods, pregnancy restrictions.
- Current available evidence source: canonical `maternity` topic exists in normalization, waiting periods are structured, demo catalog includes maternity hints.
- Current confidence: partial
- Safe scoring status: advisor_confirmation_only
- Overclaiming risk: maternity can be falsely inferred from generic hospitalization or family positioning.
- Missing fields: explicit maternity benefit, delivery types, pregnancy restriction flags, maternity-specific waiting periods, sublimits.
- Recommended data additions: structured maternity coverage fields and waiting periods by maternity sub-benefit.

### physiotherapy_rehabilitation

- Required product evidence: physiotherapy sessions, rehabilitation, post-accident therapy, post-surgery therapy, session limits.
- Current available evidence source: canonical `physiotherapy` topic exists in normalization and demo catalog tags mention physiotherapy; no strong structured local product-detail sample was found.
- Current confidence: missing
- Safe scoring status: advisor_confirmation_only
- Overclaiming risk: rehab could be falsely inferred from outpatient or surgery language.
- Missing fields: session count, reimbursement cap, trigger conditions, provider restrictions, post-accident vs routine physiotherapy distinction.
- Recommended data additions: structured physiotherapy and rehabilitation fields with visit/session limits and trigger rules.

### pediatric_coverage

- Required product evidence: child eligibility, pediatric doctors, pediatric hospitalization, dependant rules, pediatric network.
- Current available evidence source: canonical `pediatric` topic exists in normalization, demo catalog includes child-focused hints, existing product-detail schema has no dedicated pediatric structure.
- Current confidence: missing
- Safe scoring status: advisor_confirmation_only
- Overclaiming risk: family-friendly wording may be mistaken for pediatric benefit or child-only eligibility support.
- Missing fields: child eligibility rules, dependant age rules, pediatric network markers, pediatric outpatient/inpatient scope.
- Recommended data additions: structured pediatric eligibility and benefit fields, dependant rules, pediatric provider network markers.

### waiting_period_immediate_use

- Required product evidence: waiting periods by coverage, immediate-use wording, short waiting-period exceptions.
- Current available evidence source: `waitingPeriods`, `coverageFacts.waitingPeriodText`, `supplementaryBenefits.waitingText`, exclusions.
- Current confidence: partial
- Safe scoring status: scoreable_with_penalty
- Overclaiming risk: a single waiting-period record does not prove immediate use across all requested coverages.
- Missing fields: per-signal waiting-period mapping, explicit immediate-use flag, disease/accident split, exception cases.
- Recommended data additions: structured waiting-period fields by coverage and explicit immediate-use markers.

### provider_network_freedom

- Required product evidence: open network, broad partner network, reimbursement outside network, provider/hospital freedom terms.
- Current available evidence source: `providerNetworks`, `coverageFacts.network`, network text in product facts.
- Current confidence: partial
- Safe scoring status: scoreable_with_penalty
- Overclaiming risk: presence of a network record does not prove freedom outside network or breadth of choice.
- Missing fields: network breadth class, open-choice vs closed-network flag, reimbursement-outside-network field, hospital vs doctor network distinction.
- Recommended data additions: structured provider/hospital network model with openness/breadth indicators.

### existing_policy_context

- Required product evidence: not product evidence. This is customer context plus existing policy analysis input.
- Current available evidence source: assessment answers, policy-analysis snapshot/comparison fixtures, `src/lib/policy-analysis/comparison.ts`.
- Current confidence: not_product_evidence
- Safe scoring status: not_rankable
- Overclaiming risk: current policy advantages could be confused with proposed-product evidence.
- Missing fields: none on proposed product side; the boundary itself must be enforced.
- Recommended data additions: none for proposed-product scoring. Keep as comparison/advisor-confirmation only.

### evaluation_goal

- Required product evidence: not product evidence. This is questionnaire intent context.
- Current available evidence source: assessment answers and decision-matrix/rule-artifact policy.
- Current confidence: not_product_evidence
- Safe scoring status: not_rankable
- Overclaiming risk: evaluation goal could be misused as proof of coverage or as a product-evidence scoring signal.
- Missing fields: none on product side; this is an input-priority policy, not a product fact.
- Recommended data additions: none for product evidence. Keep as context only.

outpatient_visits and diagnostics_checkup remain separate.
surgery and serious_illness remain separate.

## 4. Product Fact Field Audit

- `coverageFacts`: strongest current general-purpose source. Good for hospitalization, some geography/network text, some deductible/waiting text, and limit text. Weak for explicit emergency, pediatric, maternity, outpatient-visit, diagnostics, and serious-illness certainty unless those are named in topic/text.
- `deductibleRules`: strongest structured source for deductible/copayment scoring. Still needs explicit deductible vs copayment split and coverage-level applicability.
- `monetaryFacts`: useful for numeric limits and free-text money extraction, but ambiguous excerpts remain text-only and cannot safely imply benefit scope.
- `waitingPeriods`: useful and structured, but currently too generic without a mandatory per-coverage signal binding.
- `exclusions`: useful for advisor confirmation and guardrails, but exclusion text alone must not create positive coverage.
- `providerNetworks`: useful for network existence, weak for proving provider freedom or network breadth.
- `procedureFees`: useful surgery-adjacent evidence, but fee records alone do not prove complete surgery coverage.
- `supplementaryBenefits`: potentially useful for maternity, physiotherapy, diagnostics, or preventive services when populated; local fixture shows this array can be empty.
- `claimRules`: process evidence only. Not a coverage-scoring source.
- `international scope`: currently only partial through free-text geography fields; lacks structured territory/scope model.
- `outpatient/diagnostics distinction`: canonical normalization distinguishes them, but local structured product-detail evidence is not yet strong enough to score both broadly.
- `maternity`: waiting-period support exists structurally, but maternity-specific structured evidence is not currently demonstrated locally.
- `pediatric`: no dedicated structured pediatric eligibility/benefit shape was found.
- `physiotherapy/rehabilitation`: no dedicated structured session-limit model was found.
- `emergency`: no dedicated structured emergency benefit fields were found.
- `serious illness`: no dedicated structured serious-illness evidence fields were found.
- `long-term hospitalization limits`: limit parsing exists, but long-stay/lifetime/ICU semantics are not structured enough yet.

## 5. Current Product Coverage Inventory

Local deterministic product-detail fixture inventory:
- Present in the local fixture:
  hospitalization coverage, annual limit, deductible amount, waiting period, exclusion, provider network, surgery fee.
- Missing in the local fixture:
  emergency-specific evidence, serious-illness-specific evidence, outpatient doctor visits, diagnostics/check-up, international scope, maternity details, pediatric scope, physiotherapy/rehabilitation scope.
- Ambiguous/text-derived cases:
  mixed numeric excerpts, duplicate monetary excerpts, and free-text geography/network wording still require confirmation or penalties.

Demo catalog inventory:
- Six mock products exist in `src/lib/recommendations/programs.ts`.
- They contain `priorityFit`, `additionalNeedsFit`, `goalFit`, and demo strengths/tradeoffs.
- They are not structured product evidence and must be treated as `not_product_evidence` for v2 scoring safety.

Local normalization coverage summary:
- Strong local normalization support:
  hospitalization, deductible/cost, waiting periods, network presence, surgery-adjacent procedure fees.
- Partial local normalization support:
  international free text, maternity topic detection, pediatric topic detection, physiotherapy topic detection, serious illness topic detection.
- Weak or missing local product-detail evidence coverage:
  emergency, outpatient visits, diagnostics/check-up, provider freedom, child-only eligibility, maternity sub-benefits, international scope quality.

## 6. Activation Blocking Assessment

Signals safe for initial scoring:
- `low_deductible_or_copayment`

Signals allowed only with penalty or confirmation:
- `private_hospitalization`
- `surgery`
- `high_long_term_hospitalization_limit`
- `waiting_period_immediate_use`
- `provider_network_freedom`

Signals blocked until product data expansion:
- `emergency`
- `serious_illness`
- `outpatient_visits`
- `diagnostics_checkup`
- `international_coverage`
- `maternity`
- `physiotherapy_rehabilitation`
- `pediatric_coverage`

Signals that must never be scored from existing policy evidence:
- `existing_policy_context`
- `evaluation_goal`

## 7. Existing Policy Boundary

`existing_policy_context` and policy-analysis outputs can support:
- comparison framing
- advisor confirmation
- continuity discussion
- current policy advantages / tradeoffs

They must not support:
- proposed-product evidence
- positive proposed-product scoring
- category elevation
- coverage claims about the proposed product

Current boundary assessment:
- `src/lib/policy-analysis/comparison.ts` is suitable for comparison/advisor-confirmation support.
- It is not suitable to stand in for structured proposed-product evidence.
- This boundary must remain explicit in future v2 scoring work.

## 8. Data Expansion Recommendations

Required product data additions before broad v2 activation:
- structured surgery coverage
- structured serious illness / severe condition coverage
- structured emergency coverage
- structured outpatient visit coverage
- structured diagnostics/check-up coverage
- structured maternity coverage and maternity waiting period
- structured physiotherapy/rehabilitation coverage
- structured pediatric coverage scope and dependant eligibility
- structured international territory/scope
- structured hospital/provider network type and breadth
- structured deductible/copayment exact ranges by coverage
- structured annual/lifetime/ICU/long-stay limits
- structured waiting periods by coverage
- structured exclusions by coverage
- explicit missing/unknown product-data markers

Recommended implementation order for data expansion:
1. deductible/copayment ranges
2. hospitalization limits and private-network access
3. waiting periods by coverage
4. surgery and emergency
5. outpatient visits vs diagnostics/check-up
6. international scope
7. maternity
8. pediatric
9. physiotherapy/rehabilitation
10. provider freedom breadth metadata
11. serious-illness-specific fields

## 9. Risk Register

- Overclaiming: free-text or generic hospitalization wording may be mistaken for named benefits.
- False positive scoring: products may receive points for emergency, maternity, international, or outpatient needs without explicit evidence.
- False negative scoring: products with real coverage may under-score until structured fields exist.
- Category misassignment: category labels may overreact to incomplete network, deductible, or limit evidence.
- Missing evidence penalties: products with sparse structured data may look weaker than they really are.
- Advisor handoff ambiguity: unresolved wording could leak into customer-facing explanations.
- Product data drift: future database expansions may diverge from current normalization rules unless asserted.

## 10. Next-Step Recommendation

Recommended next move:
- hybrid: Phase 2 normalization using only `scoreable_now` and `scoreable_with_penalty` signals plus a separate product data expansion backlog

Why this is the safest next move:
- Phase 2 normalization fixtures can proceed without customer-visible behavior changes.
- Broad Phase 3 scoring should wait for product data expansion on the blocked signals.
- The blocked signals are too important to fake from generic text, so data expansion must happen before broad activation planning.

Explicit activation recommendation:
- Do not activate v2 scoring from the current product evidence set.
- Keep `existing_policy_context` and `evaluation_goal` as non-product-evidence signals.
- Keep maternity, pediatric, emergency, outpatient, diagnostics, international, physiotherapy, and serious-illness edge cases behind advisor confirmation until structured product fields expand.
