# Solution — Add-ons UX Enhancement

**Date:** 2026-03-24

---

## Changes Implemented

### 1. Sort by Risk Descending
- Before rendering, `data.add_ons` is sorted using a priority map:
  ```ts
  const pMap = { red: 0, critical: 0, high: 0, orange: 1, yellow: 2, medium: 2, green: 3, low: 3 };
  ```
- Items with undeclared priority are sorted to the bottom.
- Displayed in a **single vertical column** (not a grid) for top-to-bottom scanning.

### 2. Collapsible Section
- Added `isAddOnsExpanded` boolean state (default `true`).
- Section header button toggles expand/collapse with a `ChevronDown`/`ChevronUp` icon.
- Body wrapped in `AnimatePresence` + `motion.div` for smooth height animation.
- Count badge always visible: `{data.add_ons?.length || 0} Recommended`.

### 3. Per-item Click-to-Reveal Rationale (initial)
- Each card tracked by index in `revealedAddOns: Record<number, boolean>`.
- Click toggles `revealedAddOns[idx]`, expanding the rationale block.
- Hint text: "Click to reveal AI reasoning" shown with a hover color transition.

### 4. Hover-reveal Migration (Enhancement 14 follow-up)
- Replaced click-to-reveal with CSS-only `group-hover` pattern:
  - Default: name + price only, compact row.
  - On hover: `max-h-0 → max-h-48`, `opacity-0 → opacity-100` on rationale block.
  - Rationale styled: `text-[11px] italic`, left-border `border-navavej-teal/20`.
  - Card: `scale-[1.01] hover:shadow-lg` for interactive feedback.

### 5. Priority Dot
- Colored dot rendered left of the add-on name:
  - Red → `bg-navavej-red`
  - Orange → `bg-orange-500`
  - Yellow → `bg-yellow-500`
  - Green/Low → `bg-green-600`
  - Default → `bg-navavej-teal`

## Files Changed
- `frontend/src/components/dashboard/RecommendationPanel.tsx`
