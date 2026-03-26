# Plan — Discount Feature Integration & 7/5 Layout Transformation

**Date:** 2026-03-25

---

## Strategy

### Phase 1 — Grid Integration (The 7/5 Setup)
- Refactor the bottom half of `RecommendationPanel.tsx` from standard stacked divs to a 12-column Grid (`xl:grid-cols-12`).
- Allocate 7/12 to **Billing Resolution**: Subtotal calculation, line items for packages, add-ons, and privileges.
- Allocate 5/12 to **Final Review**: Clinical checklists, internal notes, and execution approval.

### Phase 2 — Real-Time Calculations
- Combine Base Price (`price_thb`), toggled Add-ons (`selectedAddOnIds`), and applied Privileges (`selectedDiscountIds`) in a reactive recalculation block.
- Adjust "Saved" metric to display the gap between standard listed price vs. the customized outcome.
- Build visual elements matching the dark layout (crossed-out standard rate, highly visible emerald discount metric).

### Phase 3 — Refine Typography (High Visibility)
- Remove CSS `bg-` and `border` properties mapped individually inside `renderBoldText()`. Use pure bold text matching clinical sentiment states.
- Push text values for secondary labels (e.g. "Final Settlement", "Clinical Justification") from recessed opacity values to high brightness (`text-white/80` or `text-white/90`).
- Improve contrast of "Internal Only" badge.

### Phase 4 — Execution Interaction
- Replace standard "Reject" border button styling with colored backdrops (`bg-navavej-red/20`) and high contrast text (`text-navavej-red-light`), along with warning icons (`XCircle`).
- Add shimmer/gradient interactions to "Confirm Strategy" element on `group-hover`.

## Files to Change
- `frontend/src/components/dashboard/RecommendationPanel.tsx`
