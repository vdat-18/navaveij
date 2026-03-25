# Testing Results

## Frontend Build

### TypeScript Type-Check (`npx tsc --noEmit`)
- **Result:** PASS (no errors in any changed files)
- Pre-existing test file errors (`*.test.tsx` — missing vitest types) unrelated to our changes
- Grep for errors in our specific files returned zero matches:
  - `recommendation.ts` — clean
  - `RecommendationPanel.tsx` — clean
  - `PromotionDrawer.tsx` — clean
  - `api.ts` — clean

### Next.js Production Build (`npm run build`)
- **Result:** PASS
- Output: `Compiled successfully in 3.2s`
- All 9 pages generated successfully
- No TypeScript or compilation errors

## Backend

### Python Import Check
- **Command:** `PYTHONPATH=.:./backend python -c "from src.services.promotions import PromotionEngine"`
- **Result:** PASS — `PromotionEngine imported OK`

### Promotion Engine Unit Test (manual)
- **Status:** NOT YET RUN — user interrupted before execution
- **Planned test:**
  ```python
  engine = PromotionEngine(promotions)
  result = engine.resolve(
      package_code='DIAM_M',
      package_price_thb=15000,
      add_ons=[{'item_code': 'est', 'price_thb': 2900}],
      active_cards=[],
  )
  # Expected: original_package_price=22000, package_savings=7000
  ```

## Integration Testing (not yet performed)

### Checklist for full verification:
1. [ ] Start backend → call `/recommend` → response includes `promotion_summary` with Expo campaign
2. [ ] Response includes `resolved_package.original_price_thb` = 22000 for Diamond Men
3. [ ] Response includes `resolved_package.savings_thb` = 7000
4. [ ] `npm run dev` → select patient → HUD shows strikethrough + savings badge
5. [ ] Urgency badge shows "Expo pricing ends March 31 — 6 days left"
6. [ ] "฿ Deals" button visible → click → drawer slides in
7. [ ] Drawer shows Expo campaign, Smart Life, Smart Kid, Couple Bundle
8. [ ] Strategy Summary shows "was ฿XX,XXX" crossed out + "Total Savings" line
9. [ ] Add-on prices show strikethrough when membership card promo applies
10. [ ] `logs/audit.jsonl` → audit entry contains `promotion_summary` data

## Known Limitations

1. **Card toggles not interactive yet** — drawer shows cards as read-only info; toggling ON/OFF and
   live recalculation is Phase 3
2. **Estimated original prices** — strikethrough values are estimates (~30-40% above Expo rates),
   not confirmed standard prices from Navavej
3. **No formal unit tests written** — engine logic verified via import check only; recommend adding
   pytest tests for `PromotionEngine.resolve()` before production
