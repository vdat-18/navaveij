# Problem — Recommendation Panel HUD Transformation

**Date:** 2026-03-24

---

## Current State

The `RecommendationPanel` was a vertically-stacked, soft-interaction interface:
- Package information was blurred/hidden until a "Reveal" button was clicked.
- Clinical reasoning was displayed as a long single-column scrollable list.
- Strategic Add-ons were in an accordion that had to be expanded before any add-on could be clicked to reveal its rationale.
- The Risk Gauge was prominent but the surrounding sections were spaced loosely.
- The HUD overall had a polished, soft aesthetic.

## Pain Points

1. **"Too soft" for sales**: Client feedback: the interface felt more like a clinical reference tool than a sales instrument. Physicians needed to see the full picture — package, add-ons, pricing — instantly to support real-time consultation decisions.
2. **Hidden data requires too many clicks**: Blurring the package name/price and requiring a button click wasted consultation time and broke the flow of presenting to patients.
3. **Vertical sprawl**: Large paddings (p-6), generous margins, and min-height of 220px made the HUD section consume excessive vertical space, pushing the clinical reasoning content far down the page.
4. **Clinical reasoning hard to scan**: Single-column layout with small (11px) font made it difficult to quickly identify which signals were positive vs. negative.
5. **Bold text inconsistency**: The `renderBoldText` function applied the same chip-style formatting to both clinical labels ("Hypertension:") and values ("139/88mmHg"), making text uneven and jumpy.
