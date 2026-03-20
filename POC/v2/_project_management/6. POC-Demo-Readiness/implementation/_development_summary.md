# Development Summary — POC Demo-Readiness

**Exercise:** 6. POC-Demo-Readiness
**Last updated:** 2026-03-20

---

## Overall Status: 🟡 In Progress

---

## Task Status

| Task | Status | Evidence |
|------|--------|---------|
| C3-1 Patient persistence | ✅ Done | `patient-context.tsx` created; `Providers.tsx`, `page.tsx`, `trend-timeline/page.tsx` updated |
| C2-1 + C2-2 BAML + config | ✅ Done | Named clients in `clients.baml`; `ActiveModel` chain includes `OpenRouterClient` as final fallback; `baml_client/` regenerated; `ai_active_client` in `settings.py` |
| C4-1 SMART OAuth | ✅ Done | Full mock OIDC flow implemented — see closed items below |
| C2-3 System Config tab | ⬜ Pending | |
| C3-2 Screening Gap panel | ⬜ Pending | |
| C3-5 Rejection modal | ⬜ Pending | |
| C2-4 Mapping Tool UI | ⬜ Pending | |
| C3-3 Master Data tab | ⬜ Pending | |
| C3-4 Executive Dashboard | ⬜ Pending | |
| C4-2 Audit retention banner | ⬜ Pending | |
| C2-5 SNOMED CT audit | ⬜ Pending | |
| C2-6 Docker | ⬜ Pending | |

---

## Closed Items

### C3-1 — Patient Selection Persistent Across Screens

**Files:**
- `frontend/src/shared/patient-context.tsx` ← NEW
- `frontend/src/app/Providers.tsx` ← `PatientProvider` added
- `frontend/src/app/page.tsx` ← uses `usePatient()`
- `frontend/src/app/trend-timeline/page.tsx` ← uses `usePatient()`

**Gate:** Select patient on Dashboard → navigate to Trend Timeline → patient still selected ✓

---

### C2-1 + C2-2 — BAML Named Clients + AI_ACTIVE_CLIENT Config Key

**Files:**
- `baml_src/clients.baml` ← named clients `GPT4o`, `Claude35Sonnet`, `LocalLlama`; `ActiveModel` fallback chain ends with `OpenRouterClient`
- `baml_src/clinical/recommendation_output.baml` ← all 3 functions use `client ActiveModel`
- `baml_client/` ← regenerated (exit 0, 14 files)
- `shared/settings.py` ← `ai_active_client: str = "GPT4o"` in `LLMSettings`
- `.env.example` ← `AI_ACTIVE_CLIENT`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY` placeholders

**Gate:** `GPT4o`, `Claude35Sonnet`, `LocalLlama`, `OpenRouterClient` visible in `baml_client/inlinedbaml.py` ✓

---

### C4-1 — SMART on FHIR Simulated OAuth

**Files:**
- `frontend/src/shared/auth-context.tsx` ← NEW: `AuthProvider` + `useAuth()` hook; sessionStorage key `navavej.smartToken.v1`; route protection via `usePathname()` + `useRouter.replace("/login")`; initial state `undefined` prevents flash redirect
- `frontend/src/app/login/page.tsx` ← NEW: Keycloak-style full-screen overlay (z-index 9999); persona selector (4 roles); FHIR scope display; Authorize generates base64 mock JWT → sessionStorage → redirect `/`; Deny stays on login
- `frontend/src/app/Providers.tsx` ← `AuthProvider` added as outermost wrapper (wraps `PrivacyModeProvider` + `PatientProvider`)
- `frontend/src/app/page.tsx` ← navbar user button replaced with dynamic `user.name` / `user.role` / `fhir_scopes.length` + `LogOut` button
- `frontend/src/app/api/auth/context/route.ts` ← reads `Authorization: Bearer <token>` from request; base64-decodes payload; derives backend scopes from role; falls back to env vars if no token
- `backend/src/api/security.py` ← `smart_on_fhir_demo` mode: `_decode_smart_token()` base64-decodes Bearer payload → `AuthContext`; falls through to `poc_claims` X-Auth-* headers if no token (existing tests unchanged)
- `frontend/src/services/api.ts` ← `buildAuthHeaders()` reads sessionStorage token first; if present, decodes payload and sends `Authorization: Bearer <token>` + X-Auth-* headers derived from role; caches bypass when token is present

**Gate checklist:**
- [ ] Open app → redirected to `/login`
- [ ] Select "Dr. Ananya Sharma (Physician)" → click Authorize → redirected to `/`
- [ ] Navbar shows `physician · 3 scopes` + `Dr. Ananya Sharma`
- [ ] API calls include `Authorization: Bearer <token>` (check Network tab)
- [ ] Click logout → redirected back to `/login`
- [ ] Re-open → still redirected to `/login` (session cleared)
- [ ] Backend `API_AUTH_MODE=smart_on_fhir_demo` accepts Bearer token for recommendation calls

---

## Open Risks
- None identified beyond those documented in `gap-closure-plan.md §7`
