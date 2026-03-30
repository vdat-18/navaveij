# Discovery Notes — POC Demo-Readiness

**Exercise:** 6. POC-Demo-Readiness
**Started:** 2026-03-20

---

## Key Findings

### Existing Patterns to Reuse
- `privacy-mode.tsx` → exact pattern for `patient-context.tsx` (React context + localStorage)
- `ScreeningGapStatus.tsx` → reuse unchanged in dashboard
- `Providers.tsx` → already wraps PrivacyModeProvider, add PatientProvider here
- `MappingToolTab.tsx` → has table structure; enhance in-place
- `MasterDataTab.tsx` → has program table; add sub-tabs in-place
- `AccessMonitoringScreen.tsx` → tab array pattern; append new tabs

### BAML Current State
- `clients.baml`: NavaveijClient (primary, reads LLM_* env vars) + OpenRouterClient + NavaveijWithFallback
- BAML functions use `NavaveijWithFallback` → change to `ActiveModel` after adding named clients
- `baml-cli generate` command: `cd POC/v2 && uv run baml-cli generate`

### Auth Current State
- `shared/settings.py`: `api_auth_mode` field, valid values currently: `poc_claims`, `disabled`
- `backend/src/api/routes/contracts.py`: auth context built from X-Auth-* headers in poc_claims mode
- Adding `smart_on_fhir_demo` mode: extract `Authorization: Bearer <token>`, base64-decode JSON payload

### Screening Gaps API
- `GET /api/screening-gaps/{patient_token}` already implemented in `contracts.py`
- `ScreeningGapStatus.tsx` expects: `{ screening_gaps: ScreeningGapRow[], vaccination_gaps: ScreeningGapRow[] }`
- Frontend type: `ScreeningGapRow` in `types/timeline.ts`

### Add-Ons Data
- `load_ruleset_add_on_items()` in `backend/src/mcp_server/utils.py` — returns add-on items from JSON
- No existing REST endpoint for add-on items → need `GET /api/master-add-ons`

### System Config Data
- `settings.py` has all needed values: `llm_model`, `llm_base_url`, `api_auth_mode`
- Need to add `ai_active_client` field
- No existing `/api/system-config` endpoint → need to add

### Decisions Made
- Mock JWT: base64-encoded JSON (no crypto), stored in `sessionStorage` not `localStorage` (session scoped)
- Route protection: client-side check in layout.tsx (not middleware, avoids Next.js middleware complexity)
- ExecutiveDashboardTab: all mock data; live figure = Recommendations Today from monitoring snapshot
- Rejection reason encoded in notes field as `[REASON: code] free text` — parseable without schema change
