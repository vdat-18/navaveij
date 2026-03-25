# Problem — Add-ons UX Enhancement

**Date:** 2026-03-24

---

## Current State

The Add-ons section in `RecommendationPanel` listed all supplemental test recommendations in a flat, always-visible list. Each item showed the test name and price, with no indication that the AI's clinical reasoning could be accessed.

## Pain Points

1. **No discoverability of AI reasoning**: The AI generated a `rationale` field per add-on but it was not surfaced in the UI. Physicians had no way to understand *why* a specific test was recommended.
2. **Flat list with no priority order**: Add-ons were shown in the order returned by the backend, not sorted by clinical urgency. More critical tests were buried beneath lower-priority ones.
3. **No interaction affordance**: The list gave no visual hint that items could be clicked/expanded for more detail.
4. **No collapsibility**: When a patient had many add-ons (6–8+), the list dominated the panel and pushed other content down.
