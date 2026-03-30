# Development Summary — Stage 2: Backend Merges

## What was done

### 2a — Clinical Terms Merge
Added 8 new phrases to `backend/src/services/text_annotations.py` CLINICAL_PHRASES:

**Hypertension section** (2 new):
- `"Stage 2 HTN"` — abbreviated form, matches "Stage 2 HTN" in LLM output
- `"HTN Crisis"` — abbreviated form, matches "HTN Crisis"

**BMI section** (2 new):
- `"Overweight"` — standalone; complements existing "Overweight (Asian)"
- `"Obese"` — standalone; complements existing "Obese (Asian)"

**Biomarker states section** (3 new, new section added):
- `"Near-optimal"` — e.g. near-optimal LDL
- `"Protective"` — e.g. HDL at protective level
- `"Optimal"` — e.g. optimal glucose control

**Package tiers section** (1 new):
- `"Standard"` — completes the Premium / Advanced / Standard tier set

The `sorted(..., key=len, reverse=True)` call handles insertion order automatically.

### 2b — Promotion Data Merge
Added 2 V4-origin entries to `assets/synthesis/rulesets/sample_promotions.json`, converted to V6 schema:

- **`CORPORATE_PARTNER`** (`type: institutional`, 15% percentage, stackable, applies to all packages + add-ons)
- **`NAVAVEJ_APP_LOYALTY`** (`type: loyalty`, 5% percentage, stackable, applies to all packages + add-ons)

Total promotions in `sample_promotions.json`: 7 → **9**.

### 2c — BAML Compilation
Re-ran `uv run baml-cli generate --from baml_src` → 14 files written cleanly (no changes to BAML source needed).

## Deviations from plan

- **`consultant` role rejected**: Stage 1 smoke test used `consultant` role, but `RECOMMENDATION_ALLOWED_ROLES` in `shared/settings.py` only allows `physician,nurse,pharmacist,admin,dpo`. Switched to `physician` for smoke test. No code change needed — this was a test invocation issue, not a configuration bug.
- **New terms not triggered in sample patient trace**: The 8 new CLINICAL_PHRASES didn't appear in `id_d4f2b7e6`'s trace — the LLM used full forms ("Stage 2 Hypertension" not "Stage 2 HTN"). This is expected; the new phrases are available for future LLM output that uses abbreviated forms.
