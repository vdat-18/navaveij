# Development Summary — Stage 1: Scaffolding

## What was done

1. **Copied V5 → V6** via `rsync`, excluding `.venv`, `baml_client`, `logs`, `.env`, `.pytest_cache`, `.trae`, `.qoder`, `_project_management`. The existing V6 `_project_management/` was preserved.
2. **Python environment**: `uv sync` completed. Added `fastapi[standard]` (was missing from `pyproject.toml` — V5 relied on the project-root `.venv` which already had it).
3. **BAML compilation**: `uv run baml-cli generate --from baml_src` wrote 14 files to `baml_client/`. Passes cleanly.
4. **`.env`**: Copied from V5 (real API keys).
5. **Node dependencies**: `npm install` in `frontend/` — completed with expected audit warnings (POC-grade, not blocking).
6. **TypeScript build**: `npm run build` — clean. All 6 routes statically prerendered.
7. **Backend smoke**: Started with `PYTHONPATH=POC/V6 fastapi dev backend/src/api/main.py --port 8010`. Health check `GET /health` → `{"status":"healthy","version":"1.0.0"}`.
8. **Recommendation smoke**: `POST /api/v1/clinical/recommend` for hypertension patient `id_d4f2b7e6` → tier `Premium`, 11 annotated trace lines, `communication_script.top_findings` populated.

## Deviations from plan

- **Backend entrypoint**: README said `backend/src/main.py` but it's actually `backend/src/api/main.py`. Updated README would be step for Stage 5.
- **PYTHONPATH required**: Must set `PYTHONPATH=<project_root>` because `shared/` is a sibling of `backend/`. FastAPI's `fastapi dev` does not add the project root automatically.
- **`fastapi[standard]` missing**: Had to `uv add "fastapi[standard]"` — this should be added to `pyproject.toml` dependencies.
- **`overall_risk_level` nesting**: V5 nests `overall_risk_level` inside `clinical_signals` object in the API response (not hoisted to top level). FE accesses it from `data.clinical_signals.overall_risk_level`. Note for Stage 3 (FE wiring).

