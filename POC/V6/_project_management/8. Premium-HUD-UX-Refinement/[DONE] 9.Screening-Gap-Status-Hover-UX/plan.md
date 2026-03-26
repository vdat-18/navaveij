# Plan — Screening & Vaccination Gap Status: Hover-reveal UX

**Date:** 2026-03-24

---

## Strategy

Apply the same CSS-only hover-reveal pattern used in the Strategic Add-ons section (Enhancement 14) to the Screening & Vaccination gap items.

### Default State (Compact)
- Show only: gap label (name) + priority dot.
- Reduce card padding: `p-4` → `p-3 px-4`.
- No status grid, no notes visible by default.

### Hover State (Expanded)
- Wrap status grid + notes in a `div` with:
  ```css
  max-h-0 opacity-0 overflow-hidden
  group-hover:max-h-48 group-hover:opacity-100 group-hover:mt-4
  transition-all duration-500 ease-in-out
  ```
- Status grid: two-column layout with `STATUS` and `HISTORY` labels.
- Notes: italic text with `border-l-2 border-navavej-teal/20 pl-3` accent.

### Priority Dot Enhancements
- Reduce dot size: `w-2 h-2` → `w-1.5 h-1.5` for a less dominant indicator.
- Add `animate-pulse` to the red priority dot to draw immediate attention.
- Add `shadow-sm` to all dots for depth.

### Interaction Signal
- Add `cursor-help` to the card to hint that more information is available.
- `hover:shadow-lg` for visual elevation feedback.

## Files to Change
- `frontend/src/components/trend-timeline/ScreeningGapStatus.tsx`
