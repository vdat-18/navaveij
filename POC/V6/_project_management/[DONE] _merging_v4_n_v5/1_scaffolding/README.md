# Stage 1 — Project Scaffolding

## Goal
Bootstrap `POC/V6` by copying V5 as the structural base and verifying the environment runs end-to-end.

## Steps
1. `cp -r POC/v5 POC/V6` (excluding `.venv`, `baml_client`, `logs`, `.env`, `.pytest_cache`)
2. `cd POC/V6 && uv sync` — Python virtual environment + dependencies
3. `cd frontend && npm install` — Node dependencies
4. `baml build` — compile BAML definitions to `baml_client/`
5. Copy `.env.example` → `.env` and confirm API keys configured
6. Start backend: `uv run fastapi dev backend/src/main.py` — `GET /health` returns 200
7. Start frontend: `npm run dev` — dashboard loads at `localhost:3000`

## Acceptance Criteria
- [ ] Backend starts without import errors
- [ ] Frontend compiles without TypeScript errors
- [ ] BAML compilation passes
- [ ] At least one patient visible in the patient list
- [ ] Recommendation request completes for a sample patient
