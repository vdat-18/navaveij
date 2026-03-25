# Development Summary

## Implementation Order

### Step 1: Promotion Data Store
Created `assets/synthesis/rulesets/sample_promotions.json` with 4 seed promotions.
Each promotion has: `promo_id`, `type`, `label`, `badge_color`, `valid_from/until`,
`frozen_for_demo`, `applies_to`, `scope`, `discount_mechanic`, `original_prices`,
`urgency_message`, `stacking_allowed`, `consultant_note`.

### Step 2: Backend Promotion Engine
Created `backend/src/services/promotions.py` — `PromotionEngine` class.

Key methods:
- `resolve()` — main entry point, returns full promotion result dict
- `_is_active()` — date/frozen check
- `_is_eligible()` — applies_to + card matching
- `_days_remaining()` — countdown calculation (frozen or real)
- `_build_promo_entry()` — standardized promo metadata

Supports 3 mechanic types:
- `pre_applied` — current prices ARE the promo; computes delta from `original_prices`
- `percentage` — applies % discount on package and/or add-ons
- `bundle_fixed_price` — couple bundle at fixed price

### Step 3: Data Loader
Added to `backend/src/mcp_server/utils.py`:
- `PROMOTIONS_PATH` constant with `_resolve_existing_path` (matches existing pattern)
- `load_promotions()` function with cache support (matches `load_ruleset_add_on_items()`)

### Step 4: Backend API Integration
Modified `backend/src/api/routes/contracts.py`:
- Added `promotion_context: dict[str, Any] = {}` to `RecommendRequest`
- Added `promotion_summary: dict[str, Any] | None = None` to `RecommendResponse`
- Added `promo_context` parameter to `_normalize_stage2()`
- After `resolved_package` block: calls `PromotionEngine.resolve()`, enriches package + add-ons
- Added `promotion_summary` to response dict (between `risk_summary` and `patient_high_alert`)
- Updated both sync (`/recommend`) and SSE (`/recommend/stream`) call sites

### Step 5: Frontend Types
Modified `frontend/src/types/recommendation.ts`:
- Added `PromotionApplied` interface (promo_id, label, badge_color, type, savings_thb, etc.)
- Added `PromotionSummary` interface (active_promotions, total_savings, urgency_messages, consultant_prompts)
- Extended `ResolvedPackage` with `original_price_thb?`, `promotions_applied?`, `savings_thb?`
- Extended `RecommendationAddOn` with `original_price_thb?`, `promo_price_thb?`, `promotions_applied?`
- Extended `RecommendationResponse` with `promotion_summary?: PromotionSummary`

### Step 6: Strikethrough Pricing in HUD
Modified `frontend/src/components/dashboard/RecommendationPanel.tsx`:
- Added state: `showDealsDrawer`
- Added computed vars: `packageOriginalPrice`, `hasPackageDiscount`, `packageSavings`, `promoSummary`, `urgencyMessages`, `totalSavings`
- **Plan column** ("Total Investment"): strikethrough original price + current price + green savings pill + pink urgency countdown + "฿ Deals" button
- **Add-on prices**: strikethrough original + promo label when `promotions_applied` exists
- **Strategy Summary**: strikethrough "was" total + "Total Savings" line in emerald green
- Added `<PromotionDrawer>` component integration

### Step 7: Promotion Drawer
Created `frontend/src/components/dashboard/PromotionDrawer.tsx`:
- Right-edge slide-out with Framer Motion spring animation
- Sections: Active Campaigns (with urgency countdown), Membership Cards (with consultant notes + card cost), Bundle Deals
- Sticky bottom: Savings Summary (package + addon breakdown + total) + Consultant Script
- Keyboard: Escape to close
- Reusable sub-components: `Section`, `PromoCard`

### Step 8: API Service
Modified `frontend/src/services/api.ts`:
- `getRecommendation()` — added `promotionContext: Record<string, unknown> = {}` param
- `streamRecommendation()` — added `promotionContext: Record<string, unknown> = {}` param
- Both pass `promotion_context` in the request body JSON

## Technical Notes

- The promotion engine runs synchronously (no async) — promotions are a pure data lookup + calculation
- `frozen_for_demo: true` bypasses all date validation — safe to demo any time
- Stacking: Expo (pre_applied) always runs first, then percentage cards stack on top
- Add-on discounts only apply when membership cards are active (Expo doesn't discount add-ons)
- The PromotionDrawer currently displays promo info read-only — interactive card toggles are Phase 3
