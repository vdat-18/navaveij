# Implementation Plan: Discount & Promotion Feature

## Phased Delivery

| Phase | Scope | Status |
|-------|-------|--------|
| **Phase 1** | Data store + engine + strikethrough pricing + savings badge + urgency countdown | DONE |
| **Phase 2** | PromotionDrawer with card display + savings breakdown + consultant script | DONE |
| **Phase 3** | Per-add-on promo badges, Couple bundle toggle, animated savings counter | PARTIAL |

## Files Changed

### Created (3 new files)

| File | Purpose |
|------|---------|
| `assets/synthesis/rulesets/sample_promotions.json` | Promotion data store — 4 promotions |
| `backend/src/services/promotions.py` | PromotionEngine class |
| `frontend/src/components/dashboard/PromotionDrawer.tsx` | Slide-out drawer component |

### Modified (5 existing files)

| File | Change |
|------|--------|
| `backend/src/mcp_server/utils.py` | Added `PROMOTIONS_PATH` + `load_promotions()` |
| `backend/src/api/routes/contracts.py` | Added `promotion_context` to request, `promotion_summary` to response, wired engine into `_normalize_stage2()` |
| `frontend/src/types/recommendation.ts` | Added `PromotionApplied`, `PromotionSummary` interfaces; extended `ResolvedPackage`, `RecommendationAddOn`, `RecommendationResponse` |
| `frontend/src/components/dashboard/RecommendationPanel.tsx` | Strikethrough pricing, savings badges, urgency countdown, "฿ Deals" button, PromotionDrawer integration |
| `frontend/src/services/api.ts` | Added `promotionContext` param to `getRecommendation()` and `streamRecommendation()` |

## What Was NOT Changed

- **BAML agents** — remain purely clinical
- **MCP tools** — clinical data layer untouched
- **Audit trail** — auto-captures promotions via existing pipeline
- **Clinical recommendation logic** — promotions never influence tier/add-on selection

## Remaining Work (Phase 3)

1. Interactive card toggles in PromotionDrawer (Smart Life ON/OFF → live savings update)
   - Currently: drawer displays cards as info cards
   - Todo: add toggle switches that update promo state and recalculate client-side
2. Couple bundle toggle
3. Animated savings count-up in Strategy Summary
4. Client-side promotion recalculation without backend re-call

## Estimated Original Prices (for strikethrough)

| Package | Expo Price | Est. Original | Savings |
|---------|-----------|---------------|---------|
| Gold | ฿5,900 | ฿7,900 | ฿2,000 |
| Platinum — Men | ฿8,700 | ฿12,500 | ฿3,800 |
| Platinum — Women | ฿13,500 | ฿18,900 | ฿5,400 |
| Diamond — Men | ฿15,000 | ฿22,000 | ฿7,000 |
| Diamond — Women | ฿19,000 | ฿27,000 | ฿8,000 |

These are estimates (~30-40% markup). Replace with actual standard prices when obtained from Navavej.
