# Discovery — GAP-F5

**Status:** Complete (pre-implementation analysis)

## Current State

- The recommended package is displayed once in `RecommendationPanel.tsx` with the tier name
  (Standard / Advanced / Premium) and some description text.
- No visual tier identity (no seal, badge, or medal imagery).
- The `ai_recommended_tier` field is present in the API response.
- No click-to-reveal detail mechanism exists — package detail is either shown fully or
  not shown at all.
- The package recommendation does not repeat at the bottom of the panel.

## What Needs to Change

- **Seal badge:** A new `PackageSealBadge` component renders a SVG medal/badge styled
  per tier (Gold, Platinum, Diamond). No image assets needed — pure CSS/SVG.
- **Click-to-reveal detail:** Package card is collapsed by default, showing seal + name.
  Clicking expands to show inclusions, price range, and AI rationale.
- **Repeat at bottom:** After all add-ons are listed, render a "Consultation Summary" block
  with the same package seal + a "Proceed with Recommendation" CTA button.
  This supports the medical consultant's workflow (orientation at top, closing CTA at bottom).

## Tier Mapping Confirmed by Client

| Tier in API | Seal |
|-------------|------|
| `Standard` | Gold Seal |
| `Advanced` | Platinum Seal |
| `Premium` | Diamond Seal |

## Risk Flags

- The package detail content (inclusions, price) must come from data already in the
  API response or from the master data configuration. Confirm what detail fields are
  available before building the expand UI.
