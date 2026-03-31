# Context: Discount & Promotion Feature

## Business Problem

Clinical Consultants at Navavej International Hospital use the ROC (Recommendation & Orchestration
Center) to sit with patients and discuss which health checkup plan and add-ons to register for.

The AI recommends clinically-appropriate packages based on risk signals, but **price is the #1
factor in deal-closing** — more than recommendation quality. Consultants were asking if the platform
could incorporate a discount/promotion dimension to help them close deals.

## Current State

- Full promotion/discount infrastructure is now live (Phases 1–5 complete)
- All `price_thb` values in the system are already Expo promotional rates (5th Anniversary Wellbeing
  Expo 2026, valid through March 31, 2026) — the system now shows this with strikethrough pricing
- Estimated pre-Expo prices: ~30% markup for packages (specific values) and add-ons (percentage-based)
- Packages: Basic (฿2,871) → Gold (฿5,900) → Platinum M/F (฿8,700/฿13,500) → Diamond M/F (฿15,000/฿19,000)
- 72+ add-on programs priced ฿490–฿15,900, now with Expo + category-specific promotions
- Price flows: `sample_package_resolution.json` → MCP → BAML → `contracts.py:_normalize_stage2()` → PromotionEngine → frontend
- **7 promotions** active: Expo, 2 membership cards, 1 couple bundle, 3 add-on category deals
- Add-ons are now **selectable** via checkboxes — only selected add-ons count toward Total Investment
- HUD Plan card fully decluttered: tier-name badge removed from seal, add-on list redesigned as compact rows

## Navavej's Promotion Types (from website crawl)

1. **Seasonal campaigns** — 5th Anniversary Wellbeing Expo 2026 (time-limited)
2. **Membership cards** — Smart Life (฿10K, ~10% off) and Smart Kid (฿3K, ~5% off)
3. **Corporate/group rates** — per-company custom pricing
4. **Co-promotion partners** — retailer partnerships
5. **Bundle deals** — Diamond Couple ฿26K–34K vs 2× individual
6. **Procedure-specific markdowns** — e.g., 40% off specific procedures

## Data Sources Consulted

- `doc_outputs/architecture/AI/Recommendation Engine/v3/data/navavej-checkup-package-discovery.md`
- `doc_outputs/architecture/AI/Recommendation Engine/v3/data/client-open-questions.md`
- `doc_outputs/architecture/AI/Recommendation Engine/v3/samples/sample_add_on_items.json`
- `doc_outputs/architecture/AI/Recommendation Engine/v3/schema-contracts/ruleset-store-contract.md`
- Navavej hospital website (https://navavej.com) — crawled for current promotions
- `doc_inputs/ENG_TOR - Smart Health Checkup Recommendation Dashboard v7_Final.md`

## Scoring Rubric Alignment

| Rubric Area | How promotions help |
|------------|---------------------|
| 35% Hybrid Engine | Demonstrates hybrid: clinical logic (pure AI) + business logic (deterministic promo overlay) |
| 25% Data Standards | Promotion Store follows same JSON schema pattern as existing Ruleset Store |
| 20% UX/Explainability | Strikethrough pricing, urgency countdown, consultant scripts, add-on selection, decluttered HUD, compact add-on list — direct deal-closing tools |
| 20% Security/Audit | Promotions auto-captured in existing SHA-256 hash-chain audit trail |
