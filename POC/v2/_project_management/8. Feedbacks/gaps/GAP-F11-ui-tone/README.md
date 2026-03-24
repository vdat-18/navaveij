# GAP-F11 — UI Tone: Urgent Clinical Alert Style

**Title:** Shift overall visual tone from soft/pastel to high-contrast, purposeful, clinically assertive
**Status:** Not started
**Phase:** 3 (architecture + tone)

---

## Objective

Increase the visual urgency and clinical authority of the dashboard. The client described
the current UI as "too nice and soft, not sale-aggressive enough." The target is an
"urgent clinical alert" aesthetic: high-contrast risk indicators, bolder typography on
key metrics, tighter spacing, solid primary CTAs, and saturated risk colors.

## Scope

Cross-cutting changes across multiple files:

1. **Risk colors:** Saturate red, amber, and orange palette values (+20%). Replace pastel
   risk badges with solid-fill chips.
2. **Typography:** Key metric values (confidence %, risk level label, package tier) use
   `font-black` or `font-bold` rather than `font-medium`. Section headers use uppercase
   + letter-spacing.
3. **Card spacing:** Reduce `p-6` → `p-4` on recommendation/alert cards. Less whitespace
   padding conveys density and urgency.
4. **CTA buttons:** Primary actions (Approve, Recommend, Proceed) use solid-fill with
   strong `box-shadow`. Ghost/outline buttons demoted to secondary actions.
5. **Border radius:** Alert cards and risk indicator cards: `rounded-2xl` → `rounded-lg`.
   Functional, not decorative.
6. **Active risk state:** When patient risk is High/Critical, add `ring-2 ring-red-500`
   border on the recommendation card.

## Primary Files

- `POC/v2/frontend/src/app/globals.css` — base color variables and typography defaults
- `POC/v2/frontend/src/components/dashboard/RecommendationPanel.tsx` — primary CTA buttons, risk badges
- `POC/v2/frontend/src/components/dashboard/BiomarkerCharts.tsx` — chart color adjustments
- `POC/v2/frontend/tailwind.config.ts` or `tailwind.config.js` — if custom color tokens need update

## Design Decisions

- **Phase 3 (last):** Applied after all functional gaps are closed to avoid rework during
  feature development. Style changes affect many files — do this in one focused pass.
- **Incremental application:** Start with `globals.css` and Tailwind config (global tokens),
  then verify each screen before merging. Reduces risk of unexpected visual regressions.
- **No functional logic changes:** This gap is purely visual/stylistic. No business logic,
  no API changes, no type changes.
- **Reference tone:** Urgent clinical monitoring interfaces — purposeful density, every
  visual element earns its space, risk is immediately legible.

## Checkpoint Files

- `_discovery.md`
- `_development_summary.md`
- `_latest_test_results.md`

## Feedback Reference

`feedbacks.md` — "Client says UI too nice and soft, not sale-aggressive enough"
