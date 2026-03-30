# Stage 5 — Verification & Testing

## Goal
Confirm V6 is functionally complete, all acceptance criteria from Stages 1–4 are met, and the integration test suite passes.

## Steps

### 5a — BAML compilation
```bash
baml build
```
Must exit 0. All 4 functions present in `baml_client/`.

### 5b — Backend smoke test
Start backend: `uv run fastapi dev backend/src/main.py`

For a high-risk patient (e.g., from `UncontrolledHypertension/`):
- `POST /api/v1/clinical/recommend` → response includes `reasoning_trace_annotated` (non-empty list)
- `risk_summary.description` is a non-empty string
- `comm_script.top_findings` is a list with at least one entry
- `promotion_context` or equivalent promotion fields are present

### 5c — Frontend visual QA checklist
Start frontend: `npm run dev` → `localhost:3000`

| Item | Expected | Pass? |
|------|----------|-------|
| Risk gauge | Background zone arcs (green/yellow/red) visible | |
| Highlighted reasoning text | Colours driven by API `highlight_terms`, not regex | |
| Add-on items | Priority text labels ("High Priority" etc.) visible | |
| Add-on hover | Bordered "CLINICAL RATIONALE" box appears | |
| PackageSealBadge | "Safety Verified" ShieldCheck badge visible | |
| PromotionDrawer | Opens on "Deals" button; shows Final Settlement with VAT | |
| BiomarkerTrendGrid | Threshold lines and status banners render | |
| AccessMonitoring | All 4 tabs (Role, Mapping, Master Data, System Config) load | |

### 5d — Audit log hash chain
Trigger 3+ recommendations → inspect `logs/audit.jsonl` → verify each entry's `current_hash` chains correctly from `prev_entry_hash`.

### 5e — Integration test suite
```bash
uv run pytest scripts/ -v
```
All existing tests pass.

### 5f — TypeScript build
```bash
cd frontend && npm run build
```
Zero errors.

## Acceptance Criteria
- [ ] `baml build` exits 0
- [ ] Backend smoke test fields all present
- [ ] All visual QA items pass
- [ ] Audit hash chain intact
- [ ] `pytest scripts/` all pass
- [ ] `npm run build` exits 0
