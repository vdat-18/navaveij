# Plan: Combine v2 + v4 → POC/v5

## Context

Two colleagues developed the same base into diverging POC versions. The goal is a **combined POC/v5**
that takes the best of each before continuing development.

Initial analysis suggested the backends were identical — deeper inspection found they are **not**.
`contracts.py` diverged significantly: v4 is missing `overall_risk_level` in the response (meaning
v4's risk gauge always falls back to "Low" — a bug), plus the entire `risk_summary` feature.

---

## Complete Difference Map

| Area | v2 has | v4 has | v5 goal |
|------|--------|--------|---------|
| Backend `overall_risk_level` in response | ✅ | ❌ (bug) | Add from v2 |
| Backend `risk_summary` in response | ✅ | ❌ | Add from v2 |
| Backend `_build_risk_summary_description()` | ✅ | ❌ | Port from v2 |
| Frontend type: `RiskSummary` + `risk_summary?` | ✅ | ❌ | Port from v2 |
| Frontend: Confidence % + tier label display | ✅ | ❌ | Add to v4 HUD |
| Frontend: "Risk Summary" button + popover | ✅ | ❌ | Add to v4 HUD |
| Frontend: Role-based UX (ClinicalDrawer, PatientSearchEntry, RoleAwareMain) | ❌ | ✅ | Keep from v4 |
| Frontend: Enriched patient registry (age/gender/MRN) | ❌ | ✅ | Keep from v4 |
| Frontend: Refined BAML prompts | ❌ | ✅ | Keep from v4 |
| Frontend: `LoadingSteps.tsx` standalone | ✅ | ❌ | Copy from v2 |
| Frontend: `PackageSealBadge.tsx` standalone | ✅ | ❌ (inlined) | Copy from v2 |
| HUD layout | 2-panel tall | 4-column strip | Keep v4 compact + extend |

---

## Implementation Steps

### Step 0 — Create POC/v5 and save plan

```bash
cp -r POC/v4 POC/v5
```

Then write this plan document to:
`POC/v5/_project_management/_merging_v2_n_v4/plan.md`

---

### Step 1 — Backend: Port `overall_risk_level` + `risk_summary`

**File:** `POC/v5/backend/src/api/routes/contracts.py`

**1a. Add helper function** (copy from v2 `contracts.py` lines 372–398):
```python
def _build_risk_summary_description(
    *, overall_risk_level, critical_signals, signals_fired_count, is_risk_fallback
) -> str:
    ...  # identical to v2
```

**1b. In the response builder function** (after `critical_signals = _build_critical_signals(clinical_signals)` at line ~548), add:
```python
overall_risk_level = clinical_signals.get("overall_risk_level", "Low")
signal_store_pipeline_run_id = clinical_signals.get("pipeline_run_id", "")
is_risk_fallback = (
    overall_risk_level == "Low"
    and not signal_store_pipeline_run_id
    and len(clinical_signals.get("signals_fired", []) or []) == 0
)
signals_fired_count = len(clinical_signals.get("signals_fired", []) or [])
risk_summary_description = _build_risk_summary_description(
    overall_risk_level=overall_risk_level,
    critical_signals=critical_signals,
    signals_fired_count=signals_fired_count,
    is_risk_fallback=is_risk_fallback,
)
```

**1c. Add to the return dict** (lines ~561–591):
```python
"overall_risk_level": overall_risk_level,
"risk_summary": {
    "source": "signal_store_fallback" if is_risk_fallback else "signal_store",
    "is_fallback": is_risk_fallback,
    "description": risk_summary_description,
    "signal_store_pipeline_run_id": signal_store_pipeline_run_id,
    "signals_fired_count": signals_fired_count,
},
```

**1d. Update `RecommendResponse` Pydantic model** (near line 45) to add `risk_summary: dict[str, Any]`.

---

### Step 2 — Frontend Types: Add `RiskSummary`

**File:** `POC/v5/frontend/src/types/recommendation.ts`

Add `RiskSummary` interface and `risk_summary?` field (copy verbatim from v2):
```typescript
export interface RiskSummary {
  source: string;
  is_fallback: boolean;
  description?: string;
  signal_store_pipeline_run_id?: string;
  signals_fired_count?: number;
}
// and in RecommendationResponse:
risk_summary?: RiskSummary;
```

---

### Step 3 — Frontend RecommendationPanel: Add Confidence % + Risk Summary

**File:** `POC/v5/frontend/src/components/dashboard/RecommendationPanel.tsx`

Keep v4's 4-column compact HUD layout. Extend it:

**3a. Compute new variables** (copy from v2, add before the `return` statement):
```tsx
const confidenceScore = typeof data.confidence_score === "number" ? data.confidence_score : null;
const confidencePercent = confidenceScore === null ? null : Math.round(confidenceScore * 100);
const confidenceColorClass =
    confidenceScore === null ? "text-navavej-gray-med"
    : confidenceScore >= 0.75 ? "text-green-700"
    : confidenceScore >= 0.5 ? "text-amber-700"
    : "text-red-700";
const isRiskFallback = data.risk_summary?.is_fallback === true;
const riskSummaryText = data.risk_summary?.description
    || `Overall risk is ${data.overall_risk_level} based on currently available clinical context.`;
```

Also add state: `const [riskToast, setRiskToast] = useState<{ message: string; key: number } | null>(null);`

**3b. In the Gauge column** (col-span-2, ~line 783), add below the "Active Monitoring" label:
- Risk Summary button that toggles a popover showing `riskSummaryText`
- Fallback indicator badge (if `isRiskFallback`)

**3c. In the Strategic Tier column** (col-span-2, ~line 797), add below the tier name:
- Confidence % pill: `{confidencePercent}%` with `confidenceColorClass`
- Confidence tier label: `{data.confidence_tier} Confidence`

---

### Step 4 — Restore Standalone Components

**4a. Copy `LoadingSteps.tsx` from v2 → v5:**
- `POC/v2/frontend/src/components/dashboard/LoadingSteps.tsx`
  → `POC/v5/frontend/src/components/dashboard/LoadingSteps.tsx`
- No wiring change; keeps as utility component

**4b. Copy `PackageSealBadge.tsx` from v2 → v5:**
- `POC/v2/frontend/src/components/dashboard/PackageSealBadge.tsx`
  → `POC/v5/frontend/src/components/dashboard/PackageSealBadge.tsx`
- No wiring change needed (v4's inline `PackageSeal` in the panel is fine to keep as-is)

---

### Step 5 — Update README

**File:** `POC/v5/README.md`

Add section documenting that v5 merges v2+v4 and lists the key changes.

---

## Critical Files to Modify

| File | Action | Source |
|------|--------|--------|
| `POC/v5/` (dir) | Create from v4 | copy v4 |
| `backend/src/api/routes/contracts.py` | Add `overall_risk_level`, `risk_summary`, helper fn | v2 |
| `frontend/src/types/recommendation.ts` | Add `RiskSummary` + `risk_summary?` field | v2 |
| `frontend/src/components/dashboard/RecommendationPanel.tsx` | Add confidence %, risk summary popover to HUD | new code |
| `frontend/src/components/dashboard/LoadingSteps.tsx` | Add (copy) | v2 |
| `frontend/src/components/dashboard/PackageSealBadge.tsx` | Add (copy) | v2 |
| `README.md` | Update | new content |

**Files NOT changed** (identical or v4 is better):
- `backend/src/services/` (all services — identical)
- `backend/src/services/workflows/` (identical)
- `baml_src/` (use v4's refined prompts)
- `assets/patient_registry.json` (use v4's richer data)
- All other frontend components (role-based UX, ClinicalDrawer, PatientSearchEntry, etc.)

---

## Verification

1. `cd POC/v5 && uv sync` — Python deps install cleanly
2. Start backend — call `/api/v1/clinical/recommend` for a patient; confirm response JSON includes `overall_risk_level` (non-"Low") and `risk_summary.description`
3. `cd frontend && npm install && npm run build` — TypeScript compiles (no errors on new `RiskSummary` type)
4. Open dashboard → select a high-risk patient → confirm:
   - Risk gauge shows correct level (not always "Low")
   - Gauge column shows "Risk Summary" button → click → popover text appears
   - Tier column shows confidence % (e.g., "87%") + confidence tier label
5. Switch role to physician → confirm no sidebar, PatientSearchEntry shown, ClinicalDrawer works
6. Run backend tests: `pytest scripts/tests/test_api_contract_routes.py -k "recommend_contract_route_success"` — passes
