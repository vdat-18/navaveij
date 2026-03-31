# Implementation Plan: Discount & Promotion Feature

## Phased Delivery

| Phase | Scope | Status |
|-------|-------|--------|
| **Phase 1** | Data store + engine + strikethrough pricing + savings badge + urgency countdown | DONE |
| **Phase 2** | PromotionDrawer with card display + savings breakdown + consultant script | DONE |
| **Phase 3** | Per-add-on promo badges, Couple bundle toggle, animated savings counter | PARTIAL |
| **Phase 4** | Add-on selection, add-on-specific promotions, HUD declutter (Tier+Plan merge), confidence score relocation | DONE |
| **Phase 5** | Plan card polish (remove tier-name badge from seal), compact add-on list rows | DONE |

## Files Changed

### Created (3 new files)

| File | Purpose |
|------|---------|
| `assets/synthesis/rulesets/sample_promotions.json` | Promotion data store — 7 promotions (4 original + 3 add-on category deals) |
| `backend/src/services/promotions.py` | PromotionEngine class |
| `frontend/src/components/dashboard/PromotionDrawer.tsx` | Slide-out drawer component |

### Modified (5 existing files)

| File | Change |
|------|--------|
| `backend/src/mcp_server/utils.py` | Added `PROMOTIONS_PATH` + `load_promotions()` |
| `backend/src/api/routes/contracts.py` | Added `promotion_context` to request, `promotion_summary` to response, wired engine into `_normalize_stage2()` |
| `frontend/src/types/recommendation.ts` | Added `PromotionApplied`, `PromotionSummary` interfaces; extended `ResolvedPackage`, `RecommendationAddOn`, `RecommendationResponse` |
| `frontend/src/components/dashboard/RecommendationPanel.tsx` | Strikethrough pricing, savings badges, urgency countdown, "฿ Deals" button, PromotionDrawer integration, **add-on checkboxes**, **merged Tier+Plan card**, **confidence score moved to risk card**, **tier badge removed from seal**, **compact add-on rows** |
| `frontend/src/services/api.ts` | Added `promotionContext` param to `getRecommendation()` and `streamRecommendation()` |

## What Was NOT Changed

- **BAML agents** — remain purely clinical
- **MCP tools** — clinical data layer untouched
- **Audit trail** — auto-captures promotions via existing pipeline
- **Clinical recommendation logic** — promotions never influence tier/add-on selection

## Remaining Work (Phase 3 — partial)

1. Interactive card toggles in PromotionDrawer (Smart Life ON/OFF → live savings update)
   - Currently: drawer displays cards as info cards
   - Todo: add toggle switches that update promo state and recalculate client-side
2. Couple bundle toggle
3. Animated savings count-up in Strategy Summary
4. Client-side promotion recalculation without backend re-call

## Estimated Original Prices (for strikethrough)

### Packages (specific values)

| Package | Expo Price | Est. Original | Savings |
|---------|-----------|---------------|---------|
| Gold | ฿5,900 | ฿7,900 | ฿2,000 |
| Platinum — Men | ฿8,700 | ฿12,500 | ฿3,800 |
| Platinum — Women | ฿13,500 | ฿18,900 | ฿5,400 |
| Diamond — Men | ฿15,000 | ฿22,000 | ฿7,000 |
| Diamond — Women | ฿19,000 | ฿27,000 | ฿8,000 |

### Add-ons (percentage-based markup)

All add-ons use a 30% estimated markup (`add_on_original_price_markup_pct: 0.30`) for Expo strikethrough.
Example: Echocardiogram ฿2,900 → estimated original ฿3,770.

### Category-Specific Add-on Promotions

| Promo | Discount | Target Add-ons |
|-------|----------|---------------|
| Cardiac Screening Bundle | 15% off | exercise_stress_test, echocardiogram, ct_coronary_calcium, cardiac_patch_48h, arrhythmia_screening_program |
| Cancer Prevention Pack | 20% off | colonoscopy, ldct_lung, mammogram, cervical_cancer_hpv_screen, multi_cancer_spotmas |
| Imaging Essentials Deal | 10% off | dexa_bone_density, abdominal_ultrasound_full, carotid_ultrasound |

These stack with Expo, e.g., Echocardiogram: ฿3,770 (est. original) → ฿2,465 (Expo + 15% cardiac).

Replace all estimated prices with actual standard prices when obtained from Navavej.

## HUD Layout (Phase 4 → Phase 5)

### Before Phase 4 (4 cards)
```
┌──────────────┬──────────────┬──────────────┬──────────────────────────┐
│ Risk Gauge   │ Strategic    │ Plan Type /  │ Add-ons (6 cols)         │
│ (2 cols)     │ Tier (2 cols)│ Investment   │  card-per-item, p-3      │
│              │ + confidence │ (2 cols)     │                          │
└──────────────┴──────────────┴──────────────┴──────────────────────────┘
```

### After Phase 4 (3 cards — Tier+Plan merged)
```
┌──────────────┬─────────────────────────────┬─────────────────────────┐
│ Risk Gauge   │ Merged Tier + Plan          │ Add-ons (6 cols)        │
│ + Confidence │ (gradient bg, 4 cols)       │ with checkboxes         │
│ (2 cols)     │ Seal | PREMIUM | Plan Name  │  card-per-item, p-3     │
└──────────────┴─────────────────────────────┴─────────────────────────┘
```

### After Phase 5 (final — clean Plan card + compact add-on rows)
```
┌──────────────┬─────────────────────────────┬─────────────────────────┐
│ Risk Gauge   │ Plan Card (gradient, 4 cols)│ Add-ons (6 cols)        │
│ + Confidence │ [Seal]  │  Total Investment │ compact rows, divide-y  │
│ (2 cols)     │ Plan    │  ฿77K → ฿55,766  │ border-l accent + price │
│              │ Name    │  Save ฿21,583    │ hover reveals rationale  │
│              │ +9/9 ←  │  [Reviewed][฿ D] │                         │
└──────────────┴─────────────────────────────┴─────────────────────────┘
```

Changes in Phase 5:
- Removed `Package` import (unused after removing "Strategic Tier" header)
- `PackageSeal`: removed the `{tier}` text badge overlaid at the seal's bottom — visual identity preserved via SVG design + gradient background
- Add-on list: `p-3 rounded-2xl border-2 space-y-3` cards → bare `py-1.5 px-2 divide-y` rows with `border-l-2` priority accent, `text-[11px]` names, `text-[12px]` prices, `opacity-40` for unchecked items
