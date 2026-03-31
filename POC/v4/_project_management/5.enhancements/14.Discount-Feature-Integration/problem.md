# Problem — Discount Feature & Strategy Execution Layout

**Date:** 2026-03-25

---

## Current State

The `RecommendationPanel` previously utilized a vertically stacked layout where the billing details (packages, add-ons) and the final execution actions (Approve/Reject) were separated by long lists of clinical reasoning.
- Add-ons and Discounts (Privileges) were scattered or loosely integrated.
- Price calculation was not always reflecting real-time updates when toggling add-ons or applying percentage-based discounts.
- The execution buttons were positioned at the very bottom, requiring physicians to scroll past clinical context to make a final decision.
- Text elements and UI components (like chips for clinical values) looked cluttered or lacked contrast on dark backgrounds.

## Pain Points

1. **Poor Use of Horizontal Space**: On wide screens (desktop/tablet), stacking elements vertically created unnecessary white space and forced scrolling, breaking the consultation flow.
2. **Disconnected Workflow**: Physicians had to review clinical data at the top, scroll down to see the price, and then scroll further to find the confirmation buttons.
3. **Discount Logic Incomplete**: The UI did not clearly demonstrate how base price, add-ons, and percentage discounts aggregated into the "Final Settlement," leading to potential confusion over "Saved" amounts.
4. **Legibility Issues**: Secondary labels (like "Clinical Justification", "Final Settlement") were rendered with low opacity on dark grey backgrounds, making them hard to read.
5. **Aesthetic Clutter**: Bolded clinical values were rendered inside "chip" containers (with backgrounds and borders) inside paragraphs, making paragraphs bulky and jumpy.
