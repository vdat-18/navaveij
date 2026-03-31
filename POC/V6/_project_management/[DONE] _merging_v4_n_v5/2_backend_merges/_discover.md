# Discover — Stage 2: Backend Merges

## Clinical Terms (V4 `clinical-dictionary.ts` vs V6 `text_annotations.py`)

V4 maps 60+ internal identifiers → display labels. V6 uses a plain list of human-readable phrases.
Most V4 display labels were already present in V6. The following were absent and worth adding:

| Term | Category | Rationale |
|------|----------|-----------|
| `"Stage 2 HTN"` | Hypertension | Abbreviated form; V6 had "Stage 1 HTN" but not "Stage 2 HTN" |
| `"HTN Crisis"` | Hypertension | Abbreviated form of "Hypertensive Crisis" |
| `"Overweight"` | BMI | Standalone form; V6 only had "Overweight (Asian)" |
| `"Obese"` | BMI | Standalone form; V6 only had "Obese (Asian)" |
| `"Optimal"` | Biomarker state | e.g. optimal HDL; not present in V6 |
| `"Near-optimal"` | Biomarker state | e.g. near-optimal LDL; not present in V6 |
| `"Protective"` | Biomarker state | e.g. HDL at protective level; not present in V6 |
| `"Standard"` | Package tier | V6 had "Premium" + "Advanced" but not "Standard" |

**Not added** (too generic / already handled by BAD_KEYWORDS/GOOD_KEYWORDS):
- "Normal", "High", "Low", "Moderate", "Very High" — covered by existing keyword lists
- Underscored API keys (e.g. `bmi_obese_asian`) — internal identifiers, not text phrases

V4's BAD_KEYWORDS / GOOD_KEYWORDS: V4 has no equivalent lists. V6's lists are already comprehensive.

---

## Discount / Promotion Types (V4 `discount_programs.json` vs V6 `sample_promotions.json`)

V4 has 5 discount entries; V6 has 7. Two V4 types were absent from V6:

| V4 ID | Type | Discount | Status |
|-------|------|----------|--------|
| `CORPORATE` | institutional | 15% | **Missing from V6** → add as `CORPORATE_PARTNER` |
| `NAVAVEJ_APP` | loyalty | 5% | **Missing from V6** → add as `NAVAVEJ_APP_LOYALTY` |

V4 entries already represented in V6 (with schema upgrades):
- `SMART_LIFE` → `SMART_LIFE_10K` (membership_bundle → membership_card, exclusive → stackable)
- `SMART_KID` → `SMART_KID_3K` (simplified, 5%)
- `ANNIVERSARY_5` → `EXPO_2026_5TH_ANNIVERSARY` (updated to 2026, pre_applied mechanic)
