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
- `pre_applied` — current prices ARE the promo; computes delta from `original_prices` for packages, uses `add_on_original_price_markup_pct` for add-ons
- `percentage` — applies % discount on package and/or add-ons (supports specific item codes or `["*"]`)
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
- Added computed vars: `packageOriginalPrice`, `packageCurrentPrice`, `promoSummary`, `urgencyMessages`
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

### Step 9: Expo Promotion Extended to Add-ons
Modified `assets/synthesis/rulesets/sample_promotions.json`:
- Changed Expo's `scope.add_on_item_codes` from `[]` to `["*"]`
- Added `add_on_original_price_markup_pct: 0.30` to Expo's discount mechanic

Modified `backend/src/services/promotions.py`:
- Added `pre_applied` handling for add-ons: when `add_on_original_price_markup_pct` exists, computes estimated original price as `price × (1 + markup_pct)` for each add-on
- Populates `add_on_promotions` entries with Expo savings data

Modified `frontend/src/components/dashboard/RecommendationPanel.tsx`:
- Added computed vars: `addOnCurrentTotal`, `addOnOriginalTotal`, `fullCurrentPrice`, `fullOriginalPrice`, `hasFullDiscount`
- Total Investment now shows full price (package + add-ons) with strikethrough
- Strategy Summary uses `promo_price_thb` instead of `price_thb` for add-on totals (bug fix)

### Step 10: Add-on Selection (Checkboxes)
Modified `frontend/src/components/dashboard/RecommendationPanel.tsx`:
- Added state: `selectedAddOns: Set<string>` — initialized with all add-on item_codes via useEffect
- Added checkbox input to each add-on card (before the priority color dot)
- Recomputed totals (`addOnCurrentTotal`, `addOnOriginalTotal`, `selectedTotalSavings`) based on selected add-ons only
- Updated "Plan + N add-ons" subtitle to show "Plan + X of Y add-ons"
- PromotionDrawer receives `selectedAddOnsList` instead of all add-ons

### Step 11: Add-on-Specific Promotions
Modified `assets/synthesis/rulesets/sample_promotions.json`:
- Added 3 new `item_markdown` type promotions targeting specific add-on categories:
  - `CARDIAC_SCREENING_BUNDLE` — 15% off 5 cardiac add-ons
  - `CANCER_PREVENTION_PACK` — 20% off 5 cancer screening add-ons
  - `IMAGING_ESSENTIALS_DEAL` — 10% off 3 imaging add-ons
- All use `applies_to: "all"`, `discount_mechanic.type: "percentage"`, `stacking_allowed: true`
- No engine changes needed — existing `percentage` mechanic + specific item code scope handles them

Modified `frontend/src/components/dashboard/PromotionDrawer.tsx`:
- Added `Stethoscope` import from lucide-react
- Added `addonDeals` filter for `type === "item_markdown"` promotions
- Added "Add-on Deals" section after Bundle Deals with per-item breakdown (name, strikethrough original, promo price, savings)

### Step 12: UI Declutter — Merge Tier + Plan Cards, Move Confidence
Modified `frontend/src/components/dashboard/RecommendationPanel.tsx`:

**Confidence score relocation:**
- Removed confidence percentage + label from Strategic Tier card
- Added to Risk-o-meter card (below "Active Monitoring" label): `{confidencePercent}%` + `{confidence_tier} Confidence`
- Adapted colors for white background (uses `confidenceColorClass` + gray label)

**Tier + Plan card merge:**
- Deleted the standalone Plan Type card (was `md:col-span-2`, white background)
- Expanded Strategic Tier card from `md:col-span-2` to `md:col-span-4`
- Added Plan Type content into the Tier card with horizontal layout:
  - Left: PackageSeal + tier name + "Trace Verified"
  - Right: Plan Type label + plan name, Total Investment with strikethrough/savings, urgency badge, Safety Reviewed + Deals button
- All text adapted for white-on-gradient (was dark text on white)
- HUD grid: 2 + 4 + 6 columns (was 2 + 2 + 2 + 6)

## Technical Notes

- The promotion engine runs synchronously (no async) — promotions are a pure data lookup + calculation
- `frozen_for_demo: true` bypasses all date validation — safe to demo any time
- Stacking order: Expo (pre_applied) runs first, then category deals (percentage), then membership cards (percentage)
- Add-on category deals (`item_markdown`) apply to specific item codes; Expo applies to all add-ons via `["*"]`
- The PromotionDrawer currently displays promo info read-only — interactive card toggles are Phase 3 remaining work
- Add-on selection is client-side only — unchecking an add-on does not trigger a backend re-call
- `selectedTotalSavings` recalculates by subtracting all add-on savings then adding back only selected add-on savings
