# Discovery — GAP-F3

**Status:** Complete (pre-implementation analysis)

## Current State

- A semi-circular animated gauge exists in `RecommendationPanel.tsx`.
- The gauge renders at a relatively small size and uses muted/pastel colors for the risk zones.
- The four risk levels are: Low, Moderate, High, Critical — mapped from `overall_risk_level`
  in the API response.
- The gauge is positioned within the panel but does not dominate the visual hierarchy.
- No pulsing or animated ring is present for Critical risk.

## What Needs to Change

- Increase gauge diameter to ~200–240px (from current size).
- Increase arc stroke thickness.
- Use saturated, high-contrast colors for the three zones:
  - Low: solid green (`#22c55e`)
  - Moderate: solid yellow (`#eab308`)
  - High / Critical: solid red (`#ef4444`)
- Add a bold centered label inside the gauge showing the risk level and (optionally) a
  numeric representation.
- Add a CSS keyframe pulse animation on the outer ring when `overall_risk_level === "Critical"`.

## Risk Flags

- Increasing gauge size may affect the card layout on smaller viewports — check
  responsive breakpoints after resizing.
- The gauge is likely implemented as SVG arcs or a CSS conic-gradient — confirm the
  approach before editing to avoid breaking the animation.
