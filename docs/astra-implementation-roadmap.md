# Astra implementation — 2026-09-09

Branch: `astra-implementation`. Baseline: `f1f3881` (the remote contains one
commit, so earlier local history is not available here). Preserve the existing
Next.js application and SQL recommendation engine.

## Verified baseline

- Clean install and production build pass with the committed lockfile.
- Existing assessment, policy PDF extraction, deterministic database ranking,
  product details, bounded AI explanations, comparison and advisor summaries exist.
- v2 contracts, rules, matrix and evidence audit exist; v2 scoring is not active.
- The repository contains 384 insurance source files. Their presence is not
  equivalent to validated ingestion of all their contents.
- Supabase contains 17 products, 95 coverage facts, 128 product signals and 29
  documents (actual SQL counts, not cached table statistics).
- Two migrations are applied remotely; the draft questionnaire migration is local.

## Implementation sequence

1. Compatible assessment: seven visible steps; birthday entry; remove the
   deductible priority; ask about provider choice; derive the hidden cost approach
   from the new deductible answer. Use distinct IDs for new bands so old answers
   are never silently reinterpreted. Preserve old session and lead compatibility.
2. Results: retain evidence components; expose limitations alongside strengths;
   make current-policy advantages explicit; remove invented numeric price ranges
   from customer surfaces. Missing prices remain unknown.
3. Trust boundary: explanations must be reconstructed server-side from the
   assessment and database, not trusted client-supplied claims. Bound requests and
   handle unavailable providers without fabricated output.
4. Database: version the new questionnaire contract, preserve old contracts,
   derive signals without double counting provider choice, and record evidence
   gaps. Numeric deductible eligibility requires unambiguous product variant data.
5. Leads: persist through a server endpoint with validated consent, idempotency,
   server-derived recommendation and a durable receipt before showing success.
6. Verify targeted assertions, build at milestones and browser customer flows;
   commit bounded changes. Do not promote draft insurance evidence automatically.

## Release blockers identified during inspection

- `preview_demo_recommendations` explicitly permits draft signals. Several
  signals use text/count proxies. These are not approved suitability measurements.
- Surgery, serious illness and high-limit priorities collapse to one database
  signal. The documented v2 evidence gaps must be resolved before activation.
- Demo pricing derives amounts from a product-ID checksum and generic factors,
  not insurer quotes. No current price should be claimed from that calculation.
- Interest currently writes only browser session storage, while confirmation
  promises advisor follow-up. A durable lead delivery path is missing.
- Explanation input contains client-supplied insurance claims. Shape validation
  alone does not authenticate their database provenance.
- Source documents include historical products and duplicates. Product/variant,
  validity date and evidence review must precede recommendation-scope expansion.
- Application runtime secrets are not present in this checkout. Connector access
  to Supabase does not provision application credentials.

## Acceptance and remaining decisions

Demo readiness is distinct from production release. Record test outcomes and
remaining blockers honestly. Do not label unreviewed facts human-approved or
guess current pricing, underwriting eligibility or document validity.

New deductible bands use EUR 0–1,500, 1,500–5,000 and 5,000+. For numeric
classification, shared boundaries belong to the lower band: [0,1500],
(1500,5000], (5000,infinity). Exact source policy deductibles remain unchanged.

The provider-choice question distinguishes willingness to use the contracted
network from the need for provider freedom; "unsure" creates no positive signal.
Existing provider-freedom answers and this answer must emit that signal once.
