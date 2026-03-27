# Latest Test Results — Round 3

| Check | Status | Notes |
|-------|--------|-------|
| No raw `**...**` in rendered text | ✅ PASS | Backend strips before sending; frontend has safety-net strip |
| AI-bolded terms get highlight chips (Pass 3) | ✅ PASS | `find_highlight_terms()` now extracts `**...**` inner text |
| `baml generate` exits 0 | ✅ PASS | CLI v0.220.0, 14 files written |
| Backend pytest (`backend/tests/`) | ✅ PASS | 4/4 pass (0.23s) |
| Scripts integration (`scripts/tests/`) | ✅ PASS | 82/82 pass (77.5s) — includes new token-overlap test |
| Frontend vitest (`npm test`) | ✅ PASS | 49/49 pass, 12 files |
| `npm run build` exits 0 | ✅ PASS | Next.js 16.1.6 (Turbopack) — 7 routes |
| Privacy mode renders token-masked reasoning | ✅ PASS | Monospaced plain text fallback when privacyMode=true |
| Rehydration sorts tokens longest-first | ✅ PASS | Verified by `test_rehydration_handles_overlapping_token_prefixes` |
| Audit entries include `schema_version: 2` | ✅ PASS | Nested `why.request_context` format documented |
| Medical ID visible in privacy mode | ✅ PASS | `patient_id` not wrapped with `getDisplayValue` |
| Pre-existing test failures resolved | ✅ PASS | 19→0 failures (scripts 66/81→82/82, vitest 45/49→49/49) |

## Known issue

| Issue | Status | Notes |
|-------|--------|-------|
| Test isolation: `backend/tests/` + `scripts/tests/` in same session | ⚠️ NOT FIXED | `test_master_add_ons.py` patches `baml_client` globally, leaking mock state. Run suites in separate pytest sessions. |
