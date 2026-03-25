# Solution: Post-AI Pricing Overlay

## Architecture Principle

Promotions are applied **after** the AI pipeline completes. BAML agents remain purely clinical —
they never see or factor in discounts. This preserves clinical safety while adding business value.

```
MCP Tools → BAML Agents (clinical) → _normalize_stage2() → Promotion Engine → Response → Frontend
```

## Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| AI awareness of promos | None — agents stay clinical-only | Clinical safety; prevent price-driven medical decisions |
| Standard prices source | Estimated markups (~30-40% above Expo) | Real standard prices undocumented; sufficient for POC demo |
| Promotion scope | Expo + Membership Cards + Couple Bundle | Best demo impact; corporate programs deferred |
| Expo expiry behavior | Frozen for demo (always "6 days left") | Safe for any demo date |
| UI layout | Slide-out drawer from right edge | Clean default view; lots of room for detail when opened |
| Savings recalculation | Client-side (no backend re-call) | Avoids re-running AI pipeline just for price toggle |
| Stacking | Expo + membership cards can stack | Matches real-world hospital pricing behavior |
| Audit integration | Automatic via existing pipeline | `promotion_summary` flows into SHA-256 chain naturally |

## Components Built

### 1. Promotion Data Store
**File:** `assets/synthesis/rulesets/sample_promotions.json`

JSON store with 4 promotions:
- **EXPO_2026_5TH_ANNIVERSARY** — `pre_applied` type with estimated original prices for strikethrough
- **SMART_LIFE_10K** — `percentage` 10% on packages + all add-ons, toggled by consultant
- **SMART_KID_3K** — `percentage` 5% on Gold package + add-ons, toggled by consultant
- **DIAMOND_COUPLE_BUNDLE** — `bundle_fixed_price` ฿26K for two Diamond packages

Schema supports: `seasonal_campaign`, `membership_card`, `bundle`, `corporate`, `item_markdown` types.

### 2. Promotion Engine
**File:** `backend/src/services/promotions.py`

`PromotionEngine.resolve()` takes package_code, price, add-ons, active_cards, couple_mode and returns:
- `original_package_price` / `package_savings` / `package_promotions`
- `add_on_promotions` per item
- `applicable_promotions` list
- `total_savings`
- `urgency_messages` (countdown strings)
- `consultant_prompts` (talk-track suggestions)

Supports `frozen_for_demo` flag — ignores date validation, uses fixed `frozen_days_remaining`.

### 3. Backend Integration
**File:** `backend/src/api/routes/contracts.py`

- `RecommendRequest` now accepts `promotion_context: dict`
- `RecommendResponse` now includes `promotion_summary: dict | None`
- `_normalize_stage2()` calls PromotionEngine after package resolution, enriches:
  - `resolved_package` with `original_price_thb`, `savings_thb`, `promotions_applied`
  - Each add-on with `original_price_thb`, `promo_price_thb`, `promotions_applied`
- Both sync and SSE streaming endpoints pass `promo_context` through

### 4. Data Loader
**File:** `backend/src/mcp_server/utils.py`

`load_promotions()` follows exact same pattern as existing `load_ruleset_add_on_items()`:
- `PROMOTIONS_PATH` with `_resolve_existing_path` candidates
- Cache-aware via `cache_service`
- Returns `list[dict]`

### 5. Frontend Types
**File:** `frontend/src/types/recommendation.ts`

New interfaces: `PromotionApplied`, `PromotionSummary`
Extended: `ResolvedPackage` (+original_price_thb, savings_thb, promotions_applied),
`RecommendationAddOn` (+original_price_thb, promo_price_thb, promotions_applied),
`RecommendationResponse` (+promotion_summary)

### 6. Strikethrough Pricing in HUD
**File:** `frontend/src/components/dashboard/RecommendationPanel.tsx`

- **Plan column**: Shows ~~฿22,000~~ / ฿15,000 / "Save ฿7,000" green badge
- **Urgency badge**: "Expo pricing ends March 31 — 6 days left" in pink, animated pulse
- **"฿ Deals" button**: Opens the promotion drawer
- **Add-on prices**: Strikethrough original + promo label when membership card applied
- **Strategy Summary**: Total with strikethrough "was" price + "Total Savings: ฿X,XXX" in green

### 7. Promotion Drawer
**File:** `frontend/src/components/dashboard/PromotionDrawer.tsx`

Right-edge slide-out drawer with Framer Motion animation:
- **Active Campaigns** section with urgency countdown
- **Membership Cards** section with consultant notes
- **Bundle Deals** section
- **Savings Summary** (sticky bottom) with line-by-line breakdown
- **Consultant Script** — ready-made talk track for discussing price

### 8. API Service
**File:** `frontend/src/services/api.ts`

Both `getRecommendation()` and `streamRecommendation()` accept optional `promotionContext` param,
passed as `promotion_context` in the request body.
