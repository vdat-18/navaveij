# Discover — Stage 1: Scaffolding

## Findings

1. **Backend entrypoint is `backend/src/api/main.py`** (not `backend/src/main.py` as noted in README). Run command should be:
   ```bash
   PYTHONPATH=/path/to/V6 .venv/bin/fastapi dev backend/src/api/main.py --port <port>
   ```

2. **`VIRTUAL_ENV` env var conflict**: `fastapi[standard]` IS in `pyproject.toml` and in V6's `.venv`. But when a workspace-root `.venv` path was set in `VIRTUAL_ENV`, uv/fastapi-cli tried to use it instead. Fix: always unset `VIRTUAL_ENV` before running, or use `.venv/bin/fastapi` directly.

3. **`PYTHONPATH` required**: The `shared/` package sits at the project root alongside `backend/`. FastAPI's dev runner only adds `backend/` to sys.path. Must set `PYTHONPATH=<project_root>` at startup.

4. **`overall_risk_level` is not a top-level API field in V5**: It lives at `response.clinical_signals.overall_risk_level`. The FE risk gauge must read from there. No issue — this is intentional V5 design (clinical_signals object is returned in full for FE use). Noted for Stage 3 FE work.

5. **`risk_summary` is absent from the V5 response**: Not hoisted to top level. This was a V2→V5 migration decision. Will assess in Stage 2 whether to restore it or leave FE to derive from `clinical_signals`.

