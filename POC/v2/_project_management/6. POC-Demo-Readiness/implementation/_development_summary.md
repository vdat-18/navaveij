# Development Summary — POC Demo-Readiness

**Exercise:** 6. POC-Demo-Readiness
**Last updated:** 2026-03-23

---

## Overall Status: 🟡 In Progress

---

## Task Status

| Task | Status | Evidence |
|------|--------|---------|
| C3-1 Patient persistence | ✅ Done | `patient-context.tsx` created; `Providers.tsx`, `page.tsx`, `trend-timeline/page.tsx` updated |
| C2-1 + C2-2 BAML + config | ✅ Done | Named clients in `clients.baml`; `ActiveModel` chain includes `OpenRouterClient` as final fallback; `baml_client/` regenerated; `ai_active_client` in `settings.py` |
| C4-1 SMART OAuth | ✅ Done | Full mock OIDC flow + role-based access guard working across all personas |
| C2-3 System Config tab | ✅ Done | `SystemConfigTab.tsx` created; `AccessMonitoringScreen.tsx`, `api.ts`, `contracts.py` updated |
| C3-2 Screening Gap panel | ✅ Done | `page.tsx` updated; `ScreeningGapStatus` + `clinicalService.getScreeningGaps()` wired in |
| C3-5 Rejection modal | ✅ Done | `RecommendationPanel.tsx` updated; modal + 5-reason radio + `handleReject` + discriminated `decisionOutcome` state |
| C2-4 Mapping Tool UI | ✅ Done | `MappingToolTab.tsx` rewritten; search + 2 filters + slide-over panel + Add Mapping modal |
| C3-3 Master Data tab | ✅ Done | `MasterDataTab.tsx` rewritten; `GET /api/master-add-ons` added; 4 sub-tabs: Programs (tier badge), Add-On Library (live ruleset, row expand), Tier Rules (static cards), Clinical Thresholds (static) |
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

**Files created/modified:**
- `frontend/src/shared/auth-context.tsx` ← NEW: `AuthProvider` + `useAuth()` + `signIn()` + `logout()`; sessionStorage key `navavej.smartToken.v1`; route guard via `usePathname()` + `router.replace("/login")`; `undefined` initial state prevents flash redirect; `clearAuthCache()` called on logout
- `frontend/src/app/login/page.tsx` ← NEW: Keycloak-style full-screen overlay (z-index 9999); 4 persona selector; FHIR scope checklist; `signIn()` sets React state + sessionStorage atomically before navigation (prevents auth guard race)
- `frontend/src/app/Providers.tsx` ← `AuthProvider` added as outermost wrapper
- `frontend/src/app/page.tsx` ← navbar: dynamic `user.name` / `user.role` / `fhir_scopes.length` + `LogOut` button
- `frontend/src/app/api/auth/context/route.ts` ← decodes `Authorization: Bearer <token>`; derives scopes from role; falls back to env vars
- `backend/src/api/security.py` ← `smart_on_fhir_demo` mode: `_decode_smart_token()` → `AuthContext`; falls through to `poc_claims` X-Auth-* if no token (existing tests unchanged)
- `frontend/src/services/api.ts` ← `buildAuthHeaders()` reads token from sessionStorage; sends `Authorization: Bearer` + X-Auth-* headers; `clearAuthCache()` exported; cache cleared on logout

**Bugs fixed during implementation:**
1. **Race condition on login redirect** — `sessionStorage.setItem` + `router.replace("/")` left `AuthProvider.token` as `null`; auth guard fired and bounced back to `/login`. Fixed by adding `signIn(token)` which sets both React state and sessionStorage atomically.
2. **Stale `cachedAuthContext` across login sessions** — `access-monitoring/page.tsx` used `getAuthContext()` (module-level cache), which persisted stale role across logout/login cycles. Fixed by replacing with `useAuth()` (always reads from live React state) + calling `clearAuthCache()` in `logout()`.

**Gate checklist:**
- [x] Open app → redirected to `/login`
- [x] Authorize as Physician → dashboard; navbar shows name/role/3 scopes
- [x] Authorize as Admin or DPO → Access Monitoring screen accessible
- [x] Authorize as Physician or Nurse → Access Monitoring shows "Access Denied"
- [x] Logout → redirected to `/login`; re-login as different role works correctly

---

---

### C2-3 — System Config Tab

**Files:**
- `frontend/src/components/access-monitoring/SystemConfigTab.tsx` ← NEW
- `frontend/src/components/access-monitoring/AccessMonitoringScreen.tsx` ← `SystemConfigTab` import + `sysconfig` tab + `getSystemConfig()` in Promise.all
- `frontend/src/services/api.ts` ← `SystemConfig` interface exported + `getSystemConfig()` added to `clinicalService`
- `backend/src/api/routes/contracts.py` ← `BamlClientInfo`, `McpToolInfo`, `SystemConfigResponse` models + `GET /system-config` endpoint

**Gate checklist:**
- [x] Login as admin → Access Monitoring → "System Config" tab visible
- [x] Active AI Model card shows `GPT4o` pill (from `.env`)
- [x] BAML Client Registry: 6 rows; `NavaveijClient` has "active" badge + ✓ accent
- [x] MCP Tool Inventory: 5 rows all with `READ-ONLY` amber badge
- [x] Auth Configuration card shows `poc_claims` mode description
- [x] Login as physician → Access Monitoring → "Access Denied" (no regression)

---

---

### C3-2 — Screening Gap Panel in Clinical Dashboard

**Files:**
- `frontend/src/app/page.tsx` ← new imports (`ScreeningGapStatus`, `clinicalService`, `ScreeningGapRow`, `ChevronDown`); `useEffect` keyed on `patient_token` fetches `screening_gaps` + `vaccination_gaps`; collapsible panel rendered below `RecommendationPanel`; `SummaryBadges` helper shows priority-colour counts (🔴/🟠/🟡/🟢)

**Existing assets reused (no changes):**
- `frontend/src/components/trend-timeline/ScreeningGapStatus.tsx` — card list renderer
- `clinicalService.getScreeningGaps(patientToken)` in `api.ts` — already existed
- `ScreeningGapRow` type from `@/types/timeline` — already existed

**Gate checklist:**
- [x] Select patient with gaps → panel header appears below RecommendationPanel with badge counts
- [x] Click header → expands into two-column grid (screening left, vaccination right)
- [x] Click again → collapses
- [x] Switch patient → counts update correctly
- [x] Select patient with no gaps → panel not shown

---

---

### C3-5 — Rejection Reason Modal in RecommendationPanel

**Files:**
- `frontend/src/components/dashboard/RecommendationPanel.tsx` ← `XCircle` added to lucide imports; `decided/isApproving/approvalError` replaced with `decisionOutcome: "approved"|"rejected"|null`, `isSubmitting`, `submissionError`; `showRejectModal` + `rejectReason` state added; `handleReject()` encodes `[REASON: <code>] <notes>` before calling `recordDecision("Reject", ...)`; action area now shows `[Reject] [Confirm Strategy]` pair pre-decision and a single locked outcome button post-decision; `AnimatePresence` modal overlay with 5-radio reason selector rendered at root of component return

**Existing assets reused (no changes):**
- `clinicalService.recordDecision(patientId, hash, "Reject", notes)` in `api.ts` — already accepted `"Reject"`
- `POST /api/v1/clinical/approve` backend — `notes` field flows through `orchestrator → audit_logger → "why": { "decision": ..., "notes": ... }`
- `AnimatePresence` + `motion.div` from framer-motion — already imported

**Gate checklist:**
- [x] Post-analysis: button area shows `[Reject]` + `[Confirm Strategy]` side by side
- [x] Click Reject → modal opens; default = "Patient Refusal" radio selected
- [x] Select "Clinical Override" + add notes → Confirm Rejection → modal closes; red "Rejected" button shown; textarea disabled
- [x] Backend audit entry has `"why": { "decision": "Reject", "notes": "[REASON: clinical_override] ..." }`
- [x] Click "Confirm Strategy" → green "Approved" button; no Reject button visible
- [x] Switch patient → all state resets; fresh button pair shown

---

---

### C2-4 — Mapping Tool UI Enhancements

**Files:**
- `frontend/src/components/access-monitoring/MappingToolTab.tsx` ← full rewrite; `useEffect` debounce (300ms) for search; `localMappings` state synced from prop; filtering across `local_code`, `local_label`, `target_label` + `target_system` dropdown + `status` dropdown; sticky-header table with clickable rows; slide-over detail panel (380px, toggled by row click); `statusBadgeClass()` helper (emerald/amber/slate/blue); `DetailRow` sub-component; "Add Mapping" modal with 6 fields and `draft-${Date.now()}` ID; new draft prepended to `localMappings`

**Existing assets reused (no changes):**
- `MappingCode` type from `@/types/access-monitoring`
- `cn` from `@/shared/utils`
- `AccessMonitoringScreen.tsx` — already passes `mappings` prop, no changes needed

**Gate checklist:**
- [x] Search "LOINC" → only LOINC rows visible; clear → all rows restored
- [x] Target System = "SNOMED CT" → filters correctly
- [x] Status = "Active" → filters correctly
- [x] Click row → slide-over panel opens with all field details; click again → closes
- [x] "+ Add Mapping" → modal opens; fill required fields → "Add as Draft" → new row at top with blue Draft badge
- [x] Status badges: active=emerald, pending=amber, inactive=slate, draft=blue

---

### C3-3 — Master Data Tab with 4 Sub-Tabs

**Files:**
- `frontend/src/components/access-monitoring/MasterDataTab.tsx` ← full rewrite (37 → ~280 lines); 4 inner sub-tabs; `ProgramsTab`, `AddOnLibraryTab`, `TierRulesTab`, `ThresholdsTab` sub-components
- `frontend/src/types/access-monitoring.ts` ← `MasterAddOn` interface added
- `frontend/src/services/api.ts` ← `getMasterAddOns()` added to `clinicalService`; `MasterAddOn` imported
- `frontend/src/components/access-monitoring/AccessMonitoringScreen.tsx` ← `addOns` state + `getMasterAddOns` in `Promise.all`; `addOns` prop passed to `MasterDataTab`
- `backend/src/api/routes/contracts.py` ← `load_ruleset_add_on_items` imported; `MasterAddOnsResponse` model; `GET /master-add-ons` + `GET /admin/master-add-ons` endpoints

**Tests added:**
- `frontend/src/components/access-monitoring/MasterDataTab.test.tsx` ← 12 Vitest tests (sub-tab navigation, tier/status badges, row expand/collapse, show-more, empty states)
- `backend/tests/test_master_add_ons.py` ← 2 pytest-asyncio tests (item normalisation, empty ruleset)

**Existing assets reused (no changes):**
- `load_ruleset_add_on_items()` from `src/mcp_server/utils.py` — already cached and path-resolved
- `require_monitoring_access` guard — unchanged
- `buildAuthHeaders()` pattern in `api.ts` — follows identical pattern to `getMasterPrograms`

**Gate checklist:**
- [x] All 4 sub-tabs navigable; inner tab switching instant
- [x] Programs: tier badge (Premium=purple, Advanced=blue, Standard=slate) derived from code prefix
- [x] Add-On Library: 28 items from real ruleset data; category colour badges; row click expands trigger signals
- [x] Tier Rules: 4 cards in 2×2 grid; P1=red, P2=orange, P3=blue, P4=slate; show-more toggle on P2/P3
- [x] Clinical Thresholds: 6-row static table with green normal / red alert colouring
- [x] Frontend: 29/29 tests pass (`npm test`)
- [x] Backend: 2/2 tests pass (`pytest backend/tests/test_master_add_ons.py`)

---

## Open Risks
- None identified beyond those documented in `gap-closure-plan.md §7`
