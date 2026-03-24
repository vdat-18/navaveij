# GAP-F6 — Add-ons Restructure

**Title:** Single-column add-on list, sorted by risk descending, collapsible per category, per-add-on rationale on expand
**Status:** Not started
**Phase:** 1 (quick wins)

---

## Objective

Restructure the add-on recommendations display in `RecommendationPanel.tsx` from a
multi-column pill/badge layout to a single-column accordion list. Add-ons are sorted by
priority (Red → Orange → Yellow → Green), grouped by category (collapsible), and each
row expands to show full detail including AI rationale.

## Scope

1. Sort `add_ons[]` by priority level: Red (1) → Orange (2) → Yellow (3) → Green (4).
2. Replace multi-column pills with a single-column list.
3. Group by `category` with a collapsible accordion per group (group header shows count and
   highest priority color in the group).
4. Each add-on row: priority color badge, label, price. Click expands an inline detail card
   showing `rationale`, `trigger_signals_matched[]`, `category`, `product_code`.
5. Entire add-ons section sits visually below the package recommendation section.

## Primary Files

- `POC/v2/frontend/src/components/dashboard/RecommendationPanel.tsx`
- `POC/v2/frontend/src/types/recommendation.ts` — `RecommendationAddOn` with `rationale`, `priority_level`,
  `category`, `trigger_signals_matched`, `price_thb` (all already present)

## Design Decisions

- **`rationale` field already in API response:** No backend change required. The field exists
  on `RecommendationAddOn` but is not currently surfaced in the UI.
- **Single column:** Client feedback specifically requested single column (vs. current multi-column).
  Easier to scan top-to-bottom during consultation.
- **Collapsible by category:** Prevents the list from becoming overwhelming when there are
  many add-ons. Category groups can be collapsed when not relevant.
- **Priority sort order:** Red first — highest urgency/risk add-ons appear at the top, making
  the risk context immediately visible.

## Checkpoint Files

- `_discovery.md`
- `_development_summary.md`
- `_latest_test_results.md`

## Feedback Reference

`feedbacks.md` — "Add-ons grouped (collapsible) with package recommendations. Also click to reveal detail per each add-on. Make sure AI provides reasoning for each add-on suggestion"
`feedbacks.md` — "Add-ons should top->bottom in descending in risk (single column rather than multiple)"
