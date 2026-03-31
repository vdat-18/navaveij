# Stage 4 — Frontend Cherry-picks (V4 UI Elements)

## Goal
Restore four V4 UI details that V5 dropped, while keeping V5's cleaner architecture. These are purely presentational changes — no API or BE changes required.

## Steps

### 4a — Add-on priority text labels
**File:** `frontend/src/components/dashboard/RecommendationPanel.tsx`

In the add-on list, each item has a colour dot for priority. Add a text label alongside it:
- Red priority → "High Priority" (with AlertTriangle icon)
- Amber priority → "Moderate Risk" (with Info icon)
- Green priority → "Routine" (with CheckCircle icon)

Reference: V4 `RecommendationPanel.tsx`, priority badge section.

### 4b — Bordered "CLINICAL RATIONALE" hover-reveal box
**File:** `frontend/src/components/dashboard/RecommendationPanel.tsx`

Restore V4's `group-hover` rationale reveal as a bordered box with:
- Header: "CLINICAL RATIONALE" (uppercase, small font, with Fingerprint icon)
- Body: full rationale text, left-aligned
- Styling: border, background, padding matching V4's dark card aesthetic

V5's plain italic reveal is replaced by this richer box.

### 4c — "Safety Verified" badge
**File:** `frontend/src/components/dashboard/PackageSealBadge.tsx`

Add a `ShieldCheck` icon + "Safety Verified" label as a small badge below or adjacent to the seal graphic. Match V4's styling (emerald/teal accent).

### 4d — Final Settlement line-items inside PromotionDrawer
**File:** `frontend/src/components/dashboard/PromotionDrawer.tsx`

Add a "Final Settlement" section at the bottom of the drawer showing:
- Base package price (line item)
- Each selected add-on with price (line items)
- Each applied discount with amount (line items, amber)
- Divider
- Total savings in emerald
- Large final price (font-black, 4xl–5xl)
- "INCLUSIVE OF VAT 7%" note

Data: derive from `promotion_context` / `final_price_thb` / `original_price_thb` / `total_savings_thb` fields in the recommendation response.

### 4e — BiomarkerTrendGrid abnormality TODO
**File:** `frontend/src/components/trend-timeline/BiomarkerTrendGrid.tsx`

At line ~104 where HDL abnormality direction is hardcoded, add:
```tsx
// TODO V6: move abnormality_direction ("high" | "low" | "range") to BiomarkerSeries BE response
// so the FE does not need per-biomarker hardcodes. HDL is currently the only exception.
```

## Acceptance Criteria
- [ ] Add-on items show text priority labels ("High Priority", "Moderate Risk", "Routine")
- [ ] Hovering add-on reveals bordered "CLINICAL RATIONALE" box with Fingerprint icon
- [ ] "Safety Verified" ShieldCheck badge visible on PackageSealBadge
- [ ] PromotionDrawer shows Final Settlement section with base, add-ons, discounts, VAT, final price
- [ ] BiomarkerTrendGrid has TODO comment at HDL hardcode
- [ ] `npm run build` exits 0
