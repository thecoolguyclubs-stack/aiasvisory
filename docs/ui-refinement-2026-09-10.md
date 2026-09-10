# Advisory UI refinement — 10 September 2026

## Baseline and scope

Started from `bf710e6` (the latest main at inspection), fast-forwarded into
`astra-implementation`. Preserved the existing Next.js routes, assessment reducer,
storage formats, Decision OS integration, policy comparison, and lead flow.

The inspection identified a fixed-height profile with generic advice, inconsistent
page hierarchy, an unverified homepage rating, browser-dependent Greek fonts,
and a profile-only print button. The implementation sequence was shared in the
working conversation: shared visual system, personalized profile, results/detail
presentation, local PDF exports, then browser and PDF verification.

## Changes

- Consistent teal, muted rose, and light neutral surfaces across the homepage,
  assessment, profile, recommendations, program detail, and interest screens.
- Greek-capable Noto Sans, explicit light color scheme, shared focus states,
  responsive layouts, and corrected dark CTA contrast.
- Profile generated from the customer's goal, priorities, selected deductible
  band, insured people, network preference, and uploaded-file status. Provider
  freedom selected in step 5 also appears among the profile's additional needs.
- Shared navigation between answers, profile, and results; section links on
  individual program pages.
- Program identity and reasoning precede pricing. Scores explicitly describe
  needs matching; unavailable policy comparisons are not described as uploads
  that never occurred. Empty recommendation sets have a safe empty state.
- Waiting periods, deductibles, and exclusions cannot fill the positive-strength
  list merely to reach three items. They remain in the evidence/restriction flow.
- Removed the unsupported homepage 4.8/5 rating.
- A shared PDF button on every application header downloads the current view.
  Rendering happens locally, loads only when requested, expands details, preserves
  form values, and uses A4 pagination with page numbers. SVG illustrations are
  rasterized at explicit dimensions before capture. The original view remains
  interactive and retains its disclosure state.

## Verification

`npm run build`, `npm run lint`, the seven-step assessment checks, presentation
hardening, advisory trust-boundary checks, and lead-submission checks.

`scripts/runtime-advisory-ui.mjs` starts the production server and exercises the
home, profile, results, program detail, interest, and assessment pages at 1440px
and 390px. It also visits all seven assessment steps. Browser API responses are
explicit test fixtures, isolated from the production database. It downloads PDFs
for the homepage, profile, results, detail, additional-needs step, birthday step,
priorities step, and mobile profile. PDF pages are rendered with Poppler for
visual inspection, including Greek text and SVG illustrations.

Run after `npm run build` with Node's existing TypeScript registration hook:

```sh
node --import ./scripts/register-typescript-paths.mjs scripts/runtime-advisory-ui.mjs
```

Set `PLAYWRIGHT_MODULE` and `BROWSER_PATH` for externally installed Playwright and
Chromium; optionally set `SPARTICUZ_MODULE` for its packaged Chromium binary.
Test artifacts default to `/tmp/advisor-ui-review` and are not production data.

## Boundaries

PDFs preserve visual appearance as page images; they are not tagged, searchable
text documents. Native browser printing remains available. This change does not
validate draft insurance knowledge, provision runtime credentials, change database
scores, or make the existing local lead flow a delivered lead. Production API
availability needs its own environment verification. No migration or production
data change was performed.
