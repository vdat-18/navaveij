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

### Promotion Engine Smoke Test (Phase 4)
- **Command:** Loaded all 7 promotions, resolved for Diamond Men with 3 add-ons
- **Result:** PASS
- Test input: package `DIAM_M` @ ฿15,000 + echocardiogram (฿2,900) + colonoscopy (฿9,500) + DEXA (฿1,450)
- Output:
  - Total savings: ฿13,635
  - Echocardiogram: orig ฿3,770 → adj ฿2,465 (Expo 2026 + Heart Pack)
  - Colonoscopy: orig ฿12,350 → adj ฿7,600 (Expo 2026 + Cancer Pack)
  - DEXA: orig ฿1,885 → adj ฿1,305 (Expo 2026 + Imaging Deal)
- Stacking confirmed: Expo pre_applied markup + category percentage discount apply correctly

### TypeScript Type-Check (Phase 5 — `npx tsc --noEmit`)
- **Result:** PASS
- `RecommendationPanel.tsx` — zero errors (confirmed with targeted grep)
- Removed `Package` import: no unused-import error after removal
- `PackageSeal` tier badge removal: no TS impact (JSX-only change)
- Pre-existing test file errors (`*.test.tsx` — missing vitest types) remain unrelated to our changes

## Integration Testing

### Checklist for full verification:
1. [ ] Start backend → call `/recommend` → response includes `promotion_summary` with Expo campaign + 3 add-on deals
2. [ ] Response includes `resolved_package.original_price_thb` = 22000 for Diamond Men
3. [ ] Response includes `resolved_package.savings_thb` = 7000
4. [ ] Each add-on has `original_price_thb` (30% markup), `promo_price_thb`, `promotions_applied`
5. [ ] Cardiac add-ons show Expo + Heart Pack promotions stacked
6. [ ] `npm run dev` → select patient → HUD shows merged Tier+Plan card with gradient
7. [ ] Confidence score appears in Risk-o-meter card (not Tier card)
8. [ ] Total Investment shows full price (package + selected add-ons)
9. [ ] Add-on checkboxes work — unchecking reduces Total Investment
10. [ ] "Plan + X of Y add-ons" subtitle updates when toggling checkboxes
11. [ ] Urgency badge shows "Expo pricing ends March 31 — 6 days left"
12. [ ] "฿ Deals" button visible → click → drawer slides in
13. [ ] Drawer shows: Active Campaigns, Membership Cards, Bundle Deals, **Add-on Deals**
14. [ ] Add-on Deals section shows per-item breakdown with prices and savings
15. [ ] Strategy Summary shows "was ฿XX,XXX" crossed out + "Total Savings" line
16. [ ] `logs/audit.jsonl` → audit entry contains `promotion_summary` data
17. [ ] Plan card seal has no text badge — gradient SVG only
18. [ ] Add-on list renders as compact rows with divide-y separators (no card borders/shadows)
19. [ ] Unchecked add-ons appear dimmed (`opacity-40`), checked items full opacity
20. [ ] Hover on any add-on row reveals slim italic rationale below the name

## Known Limitations

1. **Card toggles not interactive yet** — drawer shows cards as read-only info; toggling ON/OFF and
   live recalculation is Phase 3 remaining work
2. **Estimated original prices** — strikethrough values are estimates (~30% above Expo rates),
   not confirmed standard prices from Navavej
3. **No formal unit tests written** — engine logic verified via smoke test only; recommend adding
   pytest tests for `PromotionEngine.resolve()` before production
4. **Add-on selection is frontend-only** — unselected add-ons are still in the backend response;
   selection only affects the displayed totals and what's passed to PromotionDrawer
