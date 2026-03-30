# Latest Test Results — Recommendation Ruleset Reliability

**Date:** 2026-03-30
**State:** Investigation checkpoint before implementation

---

## Summary

No final verification run has been completed because implementation has not started.

The investigation did produce several focused checks that establish the current failure shape.

---

## Investigation Results

### 1. Direct MCP tool probe

**Command shape used:** direct Python invocation of `get_clinical_signals()` and `get_program_ruleset()`

**Observed:**
- registry-backed token `tok_hmac_33cc44dd` returned a populated package when local fallback files were available
- non-registry tokens degraded to empty package data

**Interpretation:**
- runtime behavior depends on available local fallback files
- this is consistent with production failure when those files are absent

---

### 2. Package resolver probe

**Command shape used:** direct Python invocation of `resolve_package()` against the current package map

**Observed outputs:**

```text
('Standard', 'male', 18) -> Basic
('Standard', 'male', 25) -> Basic
('Standard', 'male', 38) -> Basic
('Standard', 'female', 25) -> Basic
('Advanced', 'female', 50) -> Platinum - Women
('Premium', 'male', 60) -> Diamond - Men
```

**Interpretation:**
- standard-tier adult age-band mapping is wrong
- advanced and premium `age_any` mapping works

---

### 3. Ruleset asset inventory

**Observed V6-local ruleset files:**
- `sample_add_on_items.json`
- `sample_promotions.json`

**Missing from V6-local bundle:**
- `sample_ruleset_tier_config.json`
- `sample_package_resolution.json`

**Interpretation:**
- V6 asset bundle is incomplete relative to backend expectations

---

### 4. Existing test boundary gap

**Observed:**
- `test_ruleset_signal_pool_alignment_r8.py` reads from `POC/v3/assets/...`

**Interpretation:**
- current tests can pass while V6 packaging remains broken

---

### 5. Local environment blocker

**Observed on full route import:**

```text
Version of baml_client generator: 0.220.0
Current version of baml-py: 0.213.0
```

**Interpretation:**
- route-level import verification is currently blocked by local environment drift

---

## Effective Status

| Area | Status |
|---|---|
| Root cause identified | Yes |
| Scope of fix defined | Yes |
| Implementation started | No |
| Backend verification complete | No |
| Frontend verification complete | No |
| Environment clean for full route import | No |

---

## Planned Verification After Implementation

### Backend

```bash
python3 -m pytest \
  POC/V6/scripts/tests/test_ruleset_path_resolution.py \
  POC/V6/scripts/tests/test_ruleset_signal_pool_alignment_r8.py \
  POC/V6/scripts/tests/test_package_resolution_contract.py \
  POC/V6/scripts/tests/test_patient_resolution_contract.py \
  POC/V6/scripts/tests/test_api_contract_routes.py -q
```

### Frontend

```bash
cd POC/V6/frontend
npm test -- RecommendationPanel.test.tsx
```
