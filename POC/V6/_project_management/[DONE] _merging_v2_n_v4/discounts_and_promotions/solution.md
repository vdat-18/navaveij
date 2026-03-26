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
| Standard prices source | Estimated markups (~30% above Expo) | Real standard prices undocumented; sufficient for POC demo |
| Promotion scope | Expo + Membership Cards + Couple Bundle + 3 add-on category deals | Full demo coverage across packages and add-ons |
| Add-on original prices | 30% markup via `add_on_original_price_markup_pct` | Avoids maintaining 72+ individual prices |
| Add-on selection | Client-side checkboxes, all selected by default | Consultants can toggle add-ons to show price impact in real-time |
| Expo expiry behavior | Frozen for demo (always "6 days left") | Safe for any demo date |
| UI layout | Merged Tier+Plan card (gradient), risk card gains confidence score, tier badge removed, add-ons as compact rows | Decluttered from 4 HUD cards to 3; dense add-on list fits 9+ items without overflow |
| Savings recalculation | Client-side (no backend re-call) | Avoids re-running AI pipeline just for price toggle |
| Stacking | Expo + category deals + membership cards can all stack | Matches real-world hospital pricing behavior |
| Audit integration | Automatic via existing pipeline | `promotion_summary` flows into SHA-256 chain naturally |

## Components Built

### 1. Promotion Data Store
**File:** `assets/synthesis/rulesets/sample_promotions.json`

JSON store with 7 promotions:
- **EXPO_2026_5TH_ANNIVERSARY** — `pre_applied` type with estimated original prices for packages + 30% markup for add-ons
- **SMART_LIFE_10K** — `percentage` 10% on packages + all add-ons, toggled by consultant
- **SMART_KID_3K** — `percentage` 5% on Gold package + add-ons, toggled by consultant
- **DIAMOND_COUPLE_BUNDLE** — `bundle_fixed_price` ฿26K for two Diamond packages
- **CARDIAC_SCREENING_BUNDLE** — `item_markdown` 15% off cardiac add-ons (EST, ECHO, CAC, patch, arrhythmia)
- **CANCER_PREVENTION_PACK** — `item_markdown` 20% off cancer screening add-ons (colonoscopy, LDCT, mammogram, cervical, SPOT-MAS)
- **IMAGING_ESSENTIALS_DEAL** — `item_markdown` 10% off imaging add-ons (DEXA, abdominal US, carotid US)

Schema supports: `seasonal_campaign`, `membership_card`, `bundle`, `corporate`, `item_markdown` types.

### 2. Promotion Engine
**File:** `backend/src/services/promotions.py`

`PromotionEngine.resolve()` takes package_code, price, add-ons, active_cards, couple_mode and returns:
- `original_package_price` / `package_savings` / `package_promotions`
- `add_on_promotions` per item (with stacking support)
- `applicable_promotions` list
- `total_savings`
- `urgency_messages` (countdown strings)
- `consultant_prompts` (talk-track suggestions)

Supports `frozen_for_demo` flag — ignores date validation, uses fixed `frozen_days_remaining`.

**Add-on promotion flow:**
- `pre_applied` mechanic: uses `add_on_original_price_markup_pct` to estimate original add-on prices
- `percentage` mechanic: applies discount to specific item codes or `["*"]` (all add-ons)
- Promotions stack: Expo markup runs first, then category deals and membership cards layer on top

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

### 6. HUD — Plan Card Polish + Compact Add-on List
**File:** `frontend/src/components/dashboard/RecommendationPanel.tsx`

**Layout change (Phase 4):** Merged the Strategic Tier card and Plan Type card into a single 4-column
gradient card. Moved AI confidence score from Tier card to the Risk-o-meter card.

**Layout polish (Phase 5):**
- **Tier badge removed**: `PackageSeal` no longer renders the `{tier}` text pill at the seal's base — the gradient seal SVG itself is the visual identity
- `Package` lucide icon import removed (was used for now-deleted "Strategic Tier" header label)

- **Merged card** (gradient background): Seal on left, plan name below + add-on count subtitle, cost breakdown on right
- **Total Investment**: Shows full price (package + selected add-ons) with strikethrough original
- **Add-on checkboxes**: Each add-on has a checkbox; toggling recalculates Total Investment client-side
- **Savings badge**: Shows combined savings for selected add-ons only
- **Urgency badge**: "Expo pricing ends March 31 — 6 days left" in pink, animated pulse
- **"฿ Deals" button**: Opens the promotion drawer
- **Confidence score**: Now displayed in Risk-o-meter card with colored percentage

**Add-on list (Phase 5 compact redesign):**
- Replaced `p-3 rounded-2xl border-2 space-y-3` card-per-item layout with bare `py-1.5 px-2` rows separated by `divide-y divide-navavej-border/20`
- Each row: `border-l-2` priority accent (red/amber/green) + checkbox + 1px dot + truncated name + price column
- Unchecked items dim to `opacity-40` for clear visual contrast
- Hover reveals slim 2-line italic rationale (`max-h-10 line-clamp-2`) instead of the previous full-card expand
- Promo strikethrough (`text-[9px]`) + current price (`text-[12px] font-bold`) + promo label (`text-[7px]`) remain intact
- All 9 items fit in `max-h-[220px]` without forced scrolling

**Strategy Summary**: Total with strikethrough "was" price + "Total Savings" in emerald green

### 7. Promotion Drawer
**File:** `frontend/src/components/dashboard/PromotionDrawer.tsx`

Right-edge slide-out drawer with Framer Motion animation:
- **Active Campaigns** section with urgency countdown
- **Membership Cards** section with consultant notes
- **Bundle Deals** section
- **Add-on Deals** section — shows each `item_markdown` promo with per-item breakdown (name, original price, promo price, savings)
- **Savings Summary** (sticky bottom) with line-by-line breakdown (package + add-on)
- **Consultant Script** — ready-made talk track for discussing price

### 8. API Service
**File:** `frontend/src/services/api.ts`

Both `getRecommendation()` and `streamRecommendation()` accept optional `promotionContext` param,
passed as `promotion_context` in the request body.
