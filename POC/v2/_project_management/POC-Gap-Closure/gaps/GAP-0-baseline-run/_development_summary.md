# GAP-0 Development Summary

## Baseline Outcome

Baseline execution completed with reproducible setup and test evidence. Core API shell is operational, but recommendation-path reliability is blocked by configuration and contract/data mismatches.

## What Works Reliably

- Dependency provisioning and BAML client generation (`uv sync`, `uv run baml-cli generate`).
- API startup for `POC/v2` when isolated to a free port (`:8010`).
- `GET /health` returns 200.
- `GET /api/v1/patients/` returns registry records.
- `POST /api/v1/clinical/approve` returns success and writes audit entries.
- `GET /api/v1/clinical/audit` returns hash-chained audit records.
- Core unit/infrastructure tests mostly run when `PYTHONPATH=.:./backend` is provided.

## What Fails and Why

- Recommendation by README sample ID (`P001`) fails with 404 because registry uses generated IDs (`id_*` format).
- Recommendation with a valid registry ID reaches orchestration but fails with 500 due missing LLM env vars (`LLM_BASE_URL`, `LLM_MODEL`, `LLM_API_KEY`).
- Rule/config sample files required by program ruleset tool are missing at expected v3 sample paths.
- v3 contract endpoints (`/api/recommend`, `/api/timeline/*`, `/api/monitoring-snapshot`, `/api/audit-logs`) are absent in `POC/v2` and return 404.
- README test command for pytest (without PYTHONPATH) fails import collection.
- E2E tests still fail even with PYTHONPATH due async test execution/setup issue and test data mismatch (`pt-001`, `pt-002` not found in Signal Store).
- `scripts/test_api.py` is not validating local API behavior; it is an external LLM call script.

## Surprises vs Expected Gap Discovery

- Additional environment-level obstacle discovered: local port-8000 collision with another running Navaveij service under `/POC`, which can mask baseline observations if not isolated.
- Audit chain behavior is healthier than expected at baseline (approve + audit endpoints are functionally wired).
- Data fixture drift is larger than expected (`P001` assumptions are stale versus current registry IDs).

## Gap Mapping

- GAP-1 API Contract: v3 endpoint absence confirmed (all 404).
- GAP-2 Stage-2 Schema: recommendation path blocked before reliable schema validation due missing env/config.
- GAP-3 MCP Token Alignment: request model still `patient_id`; v3-style `patient_token` endpoint not available.
- GAP-4 / GAP-5 Screens 2/3 contracts: no timeline/monitoring snapshot API support in backend.
- GAP-6 Security/RBAC: not baseline-validated yet; discovered adjacent risk in non-baseline script that contains hardcoded API key.
- GAP-7 Terminology Evidence: not validated in this run.
- GAP-8 Frontend Reliability: not executed in this baseline run.
- GAP-9 Verification Pack: baseline evidence now established in checkpoint artifacts.

## Readiness for Next Execution Order

1. Stabilize baseline runtime prerequisites:
   - provision `.env` with required LLM vars
   - make ruleset sample config paths resolvable
2. Resolve API contract foundation (GAP-1/GAP-3) so v3-compatible endpoints exist.
3. Re-run GAP-0 tests after contract/env fixes to produce a clean comparison baseline.
4. Proceed to Stage-2 schema closure (GAP-2), then Screen 2/3 delivery (GAP-4/GAP-5).
