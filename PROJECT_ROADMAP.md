# Project Roadmap

- [x] 1. Complete customer flow and landing page — COMPLETED
- [x] 2. Performance and PDF upload optimization — COMPLETED
  - Initial uncompressed JS: `/assessment` 1,001,164 → 689,597 bytes
    (-31.1%); `/results` 1,016,645 → 733,455 bytes (-27.9%).
  - PDF transport: removed one full byte-for-byte server copy (up to 15 MiB),
    with a 5-byte client signature precheck and one runtime analysis request.
  - Verified with lint, production build, all deterministic assertions, live
    no-PDF/PDF customer flows, timeout/retry coverage, canonical filename and
    storage safety, API health, and desktop/mobile overflow checks on 2026-07-15.
- [ ] 3. Final questionnaire and evaluation-rule restructuring — IN PROGRESS — draft v2 contract infrastructure; Milestone 3D rules spec drafted; Milestone 3E decision matrix business-approved; Milestone 3F deterministic rule artifact drafted; Milestone 3G implementation plan drafted; Milestone 3H Phase 1 contracts-only drafted; Milestone 3I product evidence audit drafted; Milestone 3J Phase 2 normalization fixtures drafted, not active
- [ ] 4. Full UI/UX redesign — PLANNED
- [ ] 5. Product database expansion — PLANNED
- [ ] 6. Legal and compliance framework — LATER
