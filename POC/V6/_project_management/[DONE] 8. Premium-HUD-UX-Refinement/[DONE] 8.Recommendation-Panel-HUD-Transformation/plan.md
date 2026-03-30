# Plan — Recommendation Panel HUD Transformation

**Date:** 2026-03-24

---

## Strategy

### Phase 1 — Remove Soft Interactions, Show All Data
- Remove all blur-to-reveal and click-to-reveal for the package section.
- Show `resolved_package.name`, `price_thb`, and Safety OK badge immediately.

### Phase 2 — HUD Grid Compaction
- Reduce padding across all HUD columns: `p-6` → `p-4`.
- Reduce `min-h-[220px]` → `min-h-[160px]` on the outer container.
- Scale down Risk Gauge: `scale-75` → `scale-[0.6]`.
- Reduce Strategic Add-ons overflow area: `max-h-[300px]` → `max-h-[220px]`.
- Reduce `space-y-10` → `space-y-6` between sections.

### Phase 3 — Clinical Reasoning Layout
- Switch from single-column to 2-column `grid-cols-2` layout for clinical reasoning items.
- Increase base font from `text-[11px]` to `text-[13px] font-bold`.
- Add sentiment-based row styling: light tinted background card per sentiment.

### Phase 4 — Smart Bold Rendering
- In `renderBoldText(line, sentiment)`:
  - If bolded text ends with `:` → render as plain uppercase colored label (no chip).
  - Otherwise → render as chip with border + background.
- Add `<span key={i} className="align-baseline">` wrapper for non-bold segments so text alignment is consistent.

### Phase 5 — Add-ons Hover-reveal
- Replace click-to-reveal state-based approach with CSS `group-hover`:
  - Compact row (name + price dot) by default.
  - `max-h-0 opacity-0 → max-h-48 opacity-100` on hover via `transition-all duration-500`.
  - Rationale block with teal border-left accent.

## Files to Change
- `frontend/src/components/dashboard/RecommendationPanel.tsx`
