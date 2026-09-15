# Assessment upload integration — 2026-09-15

## Scope and decisions

Integrated the supplied `AssessmentFlow.tsx`, `assessment.module(1).css`, and route into the existing application on `astra-implementation`. The supplied route already matched the application route. The latest CSS supplies the assessment card layouts; shared header, PDF controls, typography, and mobile overrides remain in place.

The supplied standalone component kept answers only in local state, accepted impossible dates, did not upload policy files to the analysis API, and ended in a contact confirmation without submitting an assessment. Its goal and priority IDs also differed from the Decision OS contract. Therefore its reusable SVG artwork is extracted into `AssessmentIllustrations.tsx`, and the existing API-connected controller and accessible choice components render the updated UI. Canonical questions and IDs remain authoritative. No unsupported promises of immediate cover, zero participation, or VIP service were introduced.

Both `src/app/assessment/AssessmentFlow.tsx` and the route's component import now resolve to the same persisted controller. This removes the duplicate standalone implementation, its five `any` casts, and the relative CSS import problem when moving it between directories. No backup components should be copied into `src`.

The new-assessment URL flag is consumed with one native history update, preventing refresh from starting a second new assessment. A browser regression checks invalid dates, all seven visible steps, refresh persistence, implicit cost-approach derivation, and profile handoff.

Two stale policy-comparison assertion strings were aligned with existing application wording; comparison scoring and safeguards were not altered.

## Verification

- `npm run lint`
- `npm run build` (includes Next.js TypeScript check)
- `npx tsc --noEmit`
- `scripts/assert-assessment-seven-steps.mjs`
- `scripts/assert-assessment-mapping.mjs`
- `scripts/assert-policy-analysis.mjs`
- `scripts/runtime-advisory-ui.mjs`: 12 route visits, 12 additional step views, desktop/mobile overflow checks, 8 PDF downloads. Recommendation APIs use isolated fixtures; expected explanation-unavailable responses exercise fallback rendering.
- `scripts/runtime-assessment-integration.mjs`: real questionnaire interactions against the production server, without seeded assessment answers.

## Deployment handoff

Deploy the `astra-implementation` branch, which includes both the previous advisory/profile/PDF changes and the latest assessment integration. Building `main` alone does not include these changes. Framework: Next.js; install with `npm ci`; build with `npm run build`; keep the default Next.js output configuration. Preserve the project's existing Vercel environment variables and server credentials.

No production deployment or database writes are performed by this integration. A successful build and fixture-backed browser check do not validate live Supabase data, OpenAI credentials, or Vercel project settings; those require a configured preview environment.
