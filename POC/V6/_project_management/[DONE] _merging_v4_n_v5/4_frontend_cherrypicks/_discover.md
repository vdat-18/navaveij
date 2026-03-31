# Discover — Stage 4: Frontend Cherry-picks

## V4 Code Snippets Ported

### 1. Priority text labels (V4 lines 872–886)
V4 renders pill badges with icon + text: `AlertTriangle` + "High Priority" (red), `Info` + "Moderate Risk" (amber), `CheckCircle` + "Routine" (green). Data driven by `priority_level` or `priority` field on add-on item. V6 had only a 5px colored dot — no text label.

### 2. Bordered rationale hover-reveal (V4 lines 862–873)
V4 uses `group-hover` expanding box with `Fingerprint` icon + "Clinical Rationale" header, bordered container, full rationale text. V6 had a minimal one-line italic reveal with no header or icon.

### 3. Safety Verified badge (V4 lines 803–808)
V4 renders `ShieldCheck` + "Safety Verified" inside the tier card as a frosted pill (`bg-white/10 backdrop-blur-md`). V6 had no equivalent. Adapted styling for V6's `PackageSealBadge.tsx` light theme (emerald-50 bg, emerald-700 text).

### 4. Final Settlement line-items (V4 lines 1280–1417)
V4 renders inline: base plan, per-add-on lines (with toggleable checkboxes), discount lines, "Final Settlement" label with strikethrough original + savings, large final price + "Inclusive of VAT 7%". V6 delegates pricing to `PromotionDrawer` which had savings summary but no line-item breakdown.

### 5. BiomarkerTrendGrid HDL hardcode (V6 line 104)
V6 checks `item.label.toLowerCase().includes('hdl')` to flip abnormality direction (lower = bad for HDL). This is the only per-biomarker hardcode. No V4 equivalent since V4 lacks BiomarkerTrendGrid.

## Type/Prop Gaps
- No prop changes needed for PromotionDrawer — it already receives `resolvedPackage`, `addOns`, and `promoSummary` with all required fields.
- `Info` and `Fingerprint` icons needed new imports in RecommendationPanel.tsx.
- `ShieldCheck` needed import in PackageSealBadge.tsx.
- `Package` icon needed import in PromotionDrawer.tsx.
