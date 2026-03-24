# Plan — Add-ons UX Enhancement

**Date:** 2026-03-24

---

## Strategy

1. **Sort by risk descending**: Before rendering, sort `data.add_ons` by `priority_level`/`priority` field using a priority map (`red=0`, `orange=1`, `yellow=2`, `green=3`). Display highest risk first in a single vertical column.

2. **Collapsible section header**: Wrap the add-ons list in a toggleable accordion. The section header shows the count of recommended items. On click, expand/collapse the list using `isAddOnsExpanded` state.

3. **Per-item click-to-reveal rationale**: Each add-on card shows name and price by default. Clicking reveals the AI's `rationale` field in an expanded section below. Track revealed state in `revealedAddOns: Record<number, boolean>`.

4. **Hover-reveal upgrade (Enhancement 14 successor)**: Replace click-to-reveal with a smoother CSS-only hover-reveal using `group`, `max-h-0 → max-h-48`, and `opacity-0 → opacity-100` transitions. Rationale displayed with italic text and a teal left-border accent.

5. **Priority dot indicator**: Show a colored dot (`red`/`orange`/`yellow`/`green`) beside the add-on name to give instant risk-level context without needing to hover.

## Implementation Steps

1. Edit `RecommendationPanel.tsx` — add sort logic before `data.add_ons.map(...)`.
2. Add `isAddOnsExpanded` / `revealedAddOns` state.
3. Wrap list in an accordion (`AnimatePresence` + `motion.div`).
4. Each item: default view (name + price + dot), expanded view (rationale block).
5. (Follow-up in Enhancement 14): migrate to CSS hover-reveal for zero-state overhead.
