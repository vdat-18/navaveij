# Gap Closure Plan — POC Demo-Readiness

**Date:** 2026-03-20
**Input context:** `context.md`
**Goal:** Close identified gaps between POC v2 and the client's POC evaluation criteria across Criteria 2, 3, and 4.

---

## 1. Planning Principles

1. **Additive, not destructive**
   - No existing routes, CORS config, or 3-screen frontend structure is removed.
   - Core recommendation engine, audit trail, and test suite are untouched.

2. **Scoring-weighted execution**
   - C3-1 (patient persistence) first — unblocks cross-screen testing for all subsequent tasks.
   - C2-1/C2-2 (BAML + config) second — architectural correctness before UI work.
   - C4-1 (SMART OAuth) third — security criterion is prominent and visual.

3. **Demo-safe mock data**
   - All placeholder/executive dashboard content is clearly labelled as demo data.
   - No hardcoded prices or clinical values that contradict the ruleset.

4. **Pattern-first**
   - New context files follow the existing `privacy-mode.tsx` pattern exactly.
   - New backend endpoints follow the existing `contracts.py` handler pattern exactly.

---

## 2. Target End State

At completion, the POC v2 must demonstrate:

- BAML client names (GPT4o, Claude35Sonnet, LocalLlama, ActiveModel) visible in `clients.baml` and generated client.
- `AI_ACTIVE_CLIENT` config key in `.env.example` and `settings.py`.
- System Config tab showing active model, all BAML clients, and MCP tool status.
- Functional Mapping Tool UI with search, filter, detail panel, and mock Add Mapping.
- Selected patient persists when navigating between Dashboard and Trend Timeline.
- Screening Gap panel visible in Clinical Dashboard.
- Master Data tab with 4 sub-tabs (Programs, Add-On Library, Tier Rules, Clinical Thresholds).
- Executive Dashboard tab with KPI cards and charts (mock data, clearly labelled).
- Reject action opens structured Rejection Reason modal; reason code captured in audit note.
- Opening the app redirects to `/login` (Keycloak-style consent screen with FHIR scopes).
- Navbar shows authenticated user role and active FHIR scope count.
- Logout clears session and returns to `/login`.
- Backend supports `smart_on_fhir_demo` auth mode decoding mock Bearer tokens.

---

## 3. Task Inventory

| ID | Task | Criterion | Priority |
|----|------|-----------|----------|
| C3-1 | Patient selection persistence (patient-context.tsx) | UX 20% | P0 |
| C2-1 | BAML client rename (GPT4o, Claude35Sonnet, LocalLlama, ActiveModel) | Pluggable 25% | P0 |
| C2-2 | Config key rename to AI_ACTIVE_CLIENT | Pluggable 25% | P0 |
| C4-1 | SMART on FHIR simulated OAuth | Security 20% | P0 |
| C2-3 | System Config tab + /api/system-config endpoint | Pluggable 25% | P1 |
| C3-2 | Screening Gap panel in Clinical Dashboard | UX 20% | P1 |
| C3-5 | Rejection Reason modal | UX 20% | P1 |
| C2-4 | Mapping Tool UI enhancements | Pluggable 25% | P1 |
| C3-3 | Master Data tab (4 sub-tabs + /api/master-add-ons) | UX 20% | P2 |
| C3-4 | Executive Dashboard placeholder tab | UX 20% | P2 |
| C4-2 | Audit log retention banner | Security 20% | P2 |
| C2-5 | SNOMED CT audit in event timeline tool | Pluggable 25% | P3 |
| C2-6 | Docker (Dockerfiles + docker-compose.yml) | Pluggable 25% | P3 |

---

## 4. Execution Sequence

### Step 1 — Patient Selection Persistence (C3-1)

**Files:**
- `frontend/src/shared/patient-context.tsx` (NEW — mirror `privacy-mode.tsx`)
- `frontend/src/app/Providers.tsx`
- `frontend/src/app/page.tsx`
- `frontend/src/app/trend-timeline/page.tsx`
- `frontend/src/components/dashboard/PatientDirectoryColumn.tsx`

**Implementation:**
- Create `PatientContext` with `selectedPatient: Patient | null` and `setSelectedPatient`.
- Persist to localStorage at key `"navavej.selectedPatient.v1"`.
- On init: hydrate from localStorage. On change: write to localStorage.
- Wrap app in `PatientProvider` via `Providers.tsx`.
- Replace `useState<Patient | null>` in `page.tsx` and `trend-timeline/page.tsx` with `usePatient()` hook.
- `PatientDirectoryColumn` reads current selection from context to show highlight on load.

Gate: Navigate to Trend Timeline after selecting a patient on Dashboard — patient remains selected.

---

### Step 2 — BAML Client Rename (C2-1 + C2-2)

**Files:**
- `baml_src/clients.baml`
- `baml_src/clinical/recommendation_output.baml`
- `shared/settings.py`
- `.env.example`

**BAML changes:**
```
# Keep NavaveijClient as working implementation client (reads LLM_* env vars)
# Add named architecture-spec clients:
client<llm> GPT4o { provider openai-generic, model "gpt-4o", api_key env.OPENAI_API_KEY, base_url "https://api.openai.com/v1" }
client<llm> Claude35Sonnet { provider openai-generic, model "claude-3-5-sonnet-20241022", api_key env.ANTHROPIC_API_KEY, base_url "https://api.anthropic.com/v1" }
client<llm> LocalLlama { provider openai-generic, model "llama3.1:70b", api_key "ollama", base_url "http://localhost:11434/v1" }
client<llm> ActiveModel { provider fallback, strategy [NavaveijClient, GPT4o, Claude35Sonnet, LocalLlama] }
```
- Update `AnalyzeClinicalRisks` and `MatchAndCompose` functions: change `client NavaveijWithFallback` → `client ActiveModel`.
- Run: `cd POC/v2 && uv run baml-cli generate`

**Settings changes:**
- Add `ai_active_client: str = "GPT4o"` to `LLMSettings` or `ProjectSettings`.

**Env changes:**
- Add `AI_ACTIVE_CLIENT=GPT4o` with commented alternatives to `.env.example`.

Gate: `uv run baml-cli generate` exits 0. GPT4o, Claude35Sonnet, LocalLlama, ActiveModel visible in generated `baml_client/`.

---

### Step 3 — SMART on FHIR Simulated OAuth (C4-1)

**Frontend files:**
- `frontend/src/app/login/page.tsx` (NEW)
- `frontend/src/shared/auth-context.tsx` (NEW)
- `frontend/src/app/layout.tsx` (route protection)
- `frontend/src/app/page.tsx` (navbar update)

**Backend files:**
- `shared/settings.py` (add `smart_on_fhir_demo` auth mode)
- `backend/src/api/routes/contracts.py` (Bearer token decoding)
- `.env.example`

**Login page:**
- Styled as Keycloak-like IdP consent screen.
- Shows app name, FHIR scopes (patient/*.read, observation.read, condition.read), role dropdown.
- [Deny] → `/login?error=access_denied`. [Authorize] → generate mock token → sessionStorage → redirect `/`.
- Mock token: base64url-encoded JSON `{ sub, role, fhir_scopes, iat, exp, iss }`.

**Auth context (`auth-context.tsx`):**
- Provides: `token`, `user`, `role`, `fhirScopes`, `isAuthenticated`, `logout()`.
- Reads from sessionStorage key `"navavej.smartToken.v1"`.
- `logout()` clears key and calls `router.push("/login")`.

**Route protection in `layout.tsx`:**
- Client component checks sessionStorage on mount; redirects to `/login` if token missing/expired.

**Navbar:** Show 👤 {displayName} · {role} · 🔒 {N} scopes · [Logout].

**Backend `smart_on_fhir_demo` mode:**
- In auth context extraction: if `Authorization: Bearer <token>` present, base64-decode payload JSON, extract `role` and `fhir_scopes`. Falls back gracefully to `poc_claims` defaults if token absent (preserving existing test behavior).

Gate: Open app → redirected to /login → authorize as physician → redirected back → scopes in navbar. Logout → back to /login.

---

### Step 4 — System Config Tab (C2-3)

**Files:**
- `frontend/src/components/access-monitoring/SystemConfigTab.tsx` (NEW)
- `frontend/src/components/access-monitoring/AccessMonitoringScreen.tsx`
- `backend/src/api/routes/contracts.py`

**`GET /api/system-config` response:**
```json
{
  "active_client": "GPT4o",
  "ai_clients": [
    { "id": "GPT4o", "provider": "openai-generic", "model": "gpt-4o", "status": "active" },
    { "id": "Claude35Sonnet", "provider": "openai-generic", "model": "claude-3-5-sonnet-20241022", "status": "standby" },
    { "id": "LocalLlama", "provider": "openai-generic", "model": "llama3.1:70b", "status": "standby" },
    { "id": "ActiveModel", "provider": "fallback", "model": "← resolves to active client", "status": "active" }
  ],
  "mcp_tools": [
    { "name": "get_hard_constraints", "access": "READ_ONLY", "status": "operational" },
    { "name": "get_clinical_signals", "access": "READ_ONLY", "status": "operational" },
    { "name": "get_biomarker_trends", "access": "READ_ONLY", "status": "operational" },
    { "name": "get_program_ruleset", "access": "READ_ONLY", "status": "operational" },
    { "name": "get_patient_event_timeline", "access": "READ_ONLY", "status": "operational" }
  ],
  "template_version": "v3.2",
  "auth_mode": "smart_on_fhir_demo"
}
```

**SystemConfigTab sections:**
1. Active AI Model hero card (name, provider, model string, endpoint)
2. BAML Client Registry table (all 4 clients, status badges)
3. MCP Tool Status table (5 tools, READ-ONLY badge, operational status)
4. Prompt Template card (version, model-specific flag)
5. SMART on FHIR card (active scopes from auth context)

Gate: System Config tab renders all 4 BAML clients and 5 MCP tools with READ-ONLY badges.

---

### Step 5 — Screening Gap Panel in Dashboard (C3-2)

**Files:**
- `frontend/src/app/page.tsx`
- (Reuse `frontend/src/components/trend-timeline/ScreeningGapStatus.tsx` unchanged)

**Changes to `page.tsx`:**
- Add `const [screeningGaps, setScreeningGaps] = useState<ScreeningGapPayload | null>(null)`.
- In the `useEffect` triggered by `selectedPatient`: call `clinicalService.getScreeningGaps(selectedPatient.token)` and set state.
- After the `<RecommendationPanel>` block, render a collapsible "Screening & Vaccination Status" section using `<ScreeningGapStatus>`.
- Default collapsed; header shows summary count chips (🔴 N overdue · 🟡 N due soon · 🟢 N current).

Gate: Select a patient with gaps → Screening Gap panel appears in Dashboard below recommendation.

---

### Step 6 — Rejection Reason Modal (C3-5)

**File:** `frontend/src/components/dashboard/RecommendationPanel.tsx`

**Changes:**
- Add state: `const [showRejectModal, setShowRejectModal] = useState(false)`.
- Add state: `const [rejectReason, setRejectReason] = useState<string>("")` and `rejectNotes`.
- Change current reject handler to `setShowRejectModal(true)` instead of calling API directly.
- Add modal JSX (Framer Motion `AnimatePresence` for entry/exit, matching existing modal patterns in the file).

**Reason options (radio group):**
- `patient_refusal` — Patient declined
- `done_elsewhere` — Recently examined elsewhere
- `cost_concern` — Cost / budget constraint
- `clinical_override` — Clinical judgment override
- `other` — Other (please specify in notes)

**On confirm:** call `clinicalService.recordDecision(patientId, hash, "rejected", "[REASON: " + rejectReason + "] " + rejectNotes)`.

Gate: Click Reject → modal opens with reason options → select reason → Confirm → decision recorded; modal closes.

---

### Step 7 — Mapping Tool UI Enhancements (C2-4)

**File:** `frontend/src/components/access-monitoring/MappingToolTab.tsx`

**Enhancements:**
- Search box (debounced 300ms): filters rows where local_code or label contains query (case-insensitive).
- Target System filter: All / LOINC / SNOMED CT / ICD-10 / FHIR / Internal.
- Status filter: All / Active / Pending / Inactive.
- Row click → slide-over panel (right side, 380px): shows all fields, guideline ref, validation metadata, last updated.
- "Add Mapping" button → modal with fields (local_code, local_system, target_code, target_system, target_label, map_type) → on submit, prepend to local state with `status: "draft"`.
- Status badge colours: active=emerald, pending=amber, inactive=slate, draft=blue.

Gate: Search "LOINC" → rows filtered; click row → detail panel opens; Add Mapping → new row with Draft badge appears.

---

### Step 8 — Master Data Tab (C3-3)

**Files:**
- `frontend/src/components/access-monitoring/MasterDataTab.tsx`
- `backend/src/api/routes/contracts.py` (add `GET /api/master-add-ons`)

**New `/api/master-add-ons` endpoint:**
- Loads add-on items via existing `load_ruleset_add_on_items()` utility.
- Returns array of items with: item_id, label, category, status, price_thb, gender_constraint, age_min, age_max, trigger_signals count.

**4 sub-tabs in MasterDataTab:**

1. **Programs** — enhanced table from `/api/master-programs`: package code, name, tier badge, price, gender, age band, status.
2. **Add-On Library** — table from `/api/master-add-ons`: item_id, label, category badge, price (or "TBD"), gender constraint chip, age range, trigger count. Click row → trigger list.
3. **Tier Rules** — 4 card layout from static data: PREMIUM_SEVERE_SINGLE (P1), PREMIUM_MULTI_SIGNAL (P2), ADVANCED_METABOLIC_OR_CVD (P3), STANDARD_DEFAULT (P4). Each card shows: rule ID, priority badge, match logic, signal conditions (collapsed list).
4. **Clinical Thresholds** — static table: biomarker, normal range, alert threshold, guideline. Rows: BMI (Asian ≥23 overweight, ≥25 obese), BP (Normal <120/<80, Stage1 130-139/80-89, Stage2 ≥140/90), HbA1c (Normal <5.7%, Prediabetes 5.7–6.4%, Diabetes ≥6.5%), FBS (Normal 70–99 mg/dL), eGFR (G1 ≥90, G2 60–89, G3 30–59), LDL (<100 optimal, 130–159 borderline high, ≥160 high).

Gate: All 4 sub-tabs navigable; Add-On Library shows items from real ruleset data.

---

### Step 9 — Executive Dashboard Placeholder (C3-4)

**Files:**
- `frontend/src/components/access-monitoring/ExecutiveDashboardTab.tsx` (NEW)
- `frontend/src/components/access-monitoring/AccessMonitoringScreen.tsx`

**Content:**
- KPI row (4 cards): Uplift Revenue ฿2.4M (mock), Adoption Rate 73% (mock), Recommendations Today (live from monitoring snapshot), Approval Rate 68% (mock).
- Recommended vs. Ordered bar chart (Recharts BarChart): x-axis = tiers (Standard/Advanced/Premium), two bars per group (Recommended/Ordered). Mock data.
- Rejection Reason donut chart (Recharts PieChart): patient refusal 42%, done elsewhere 28%, cost 18%, clinical override 12%. Mock data.
- Top Add-Ons table: rank, add-on label, recommended, ordered, conversion %. Mock data.
- Footer banner: "Revenue and conversion data are illustrative for POC demonstration. Live HIS billing integration is pending."

Gate: Executive tab renders KPI cards and charts; demo data banner visible.

---

### Step 10 — Audit Log Retention Banner (C4-2)

**File:** `frontend/src/components/access-monitoring/AuditLogSearchPanel.tsx`

Add info banner at top of panel:
```
ℹ  Retention policy: 3 years (PDPA §40 compliant)  ·  Storage: append-only JSONL  ·  Chain integrity: SHA-256 verified
```

Gate: Banner visible in audit log search panel.

---

### Step 11 — SNOMED CT Audit (C2-5)

**File:** `backend/src/mcp_server/tools/patient_event_timeline.py`

- Verify that `snomed_code` is populated on all `diagnoses[]` events.
- Verify that `snomed_code` is populated on all `screening_procedure_history[]` events.
- Add `_snomed_coverage_note` field to timeline response: e.g., `"SNOMED CT: 100% diagnosis coverage, 100% procedure coverage (5/5 codes)"`.

Gate: Timeline response includes `_snomed_coverage_note` with coverage metrics.

---

### Step 12 — Docker (C2-6)

**New files:**
- `backend/Dockerfile`
- `backend/.dockerignore`
- `frontend/Dockerfile`
- `frontend/.dockerignore`
- `docker-compose.yml` (root of POC/v2)

**docker-compose.yml services:**
- `frontend`: Next.js, port 3000, depends on backend
- `backend`: FastAPI + MCP, port 8000, mounts `assets/` and `logs/` volumes

Gate: `docker-compose build` succeeds for both services.

---

## 5. Task-to-Gate Mapping

| Task | Depends On | Exit Gate |
|---|---|---|
| C3-1 | — | Patient persists across screen navigation |
| C2-1 + C2-2 | — | `baml-cli generate` exits 0; named clients visible |
| C4-1 | — | Login → authorize → app loads; navbar shows scopes |
| C2-3 | C2-1, C2-2 | System Config tab shows 4 clients + 5 tools |
| C3-2 | C3-1 | Screening gap panel visible in dashboard |
| C3-5 | — | Reject modal opens; reason captured in audit note |
| C2-4 | — | Search/filter functional; Add Mapping → Draft row |
| C3-3 | — | 4 sub-tabs navigable; Add-On Library populated |
| C3-4 | — | KPI cards + charts render; demo banner visible |
| C4-2 | — | Retention banner visible in audit panel |
| C2-5 | — | Timeline response includes `_snomed_coverage_note` |
| C2-6 | — | `docker-compose build` succeeds |

---

## 6. Deliverable Artifacts

During execution, maintain:

- `implementation/_discovery.md` — Findings and decisions during implementation.
- `implementation/_development_summary.md` — Interpreted status, closed items, open risks.

---

## 7. Risks and Mitigations

| Risk | Mitigation |
|---|---|
| BAML regeneration breaks existing imports | Run `uv run baml-cli generate` after every BAML edit; check that `AnalyzeClinicalRisks` and `MatchAndCompose` still import cleanly |
| Route protection on `/login` causes redirect loops | Check token presence before redirecting; ensure `/login` page itself is excluded from the guard |
| localStorage patient state causes stale patient on different browser sessions | Add session fingerprint check or simply document as expected POC behavior |
| Mock Bearer token decoded by backend breaks existing test suite | Fallback to `poc_claims` defaults when token is absent — existing tests send no Authorization header |
| `AccessMonitoringScreen` tab bar grows too wide | Consolidate or use scrollable tab strip if ≥ 7 tabs |

---

## 8. Definition of Done

The exercise is complete when:

- All 12 tasks have passing exit gates.
- Opening the app redirects to `/login`; SMART on FHIR consent screen is visible.
- BAML client names match architecture specification: GPT4o, Claude35Sonnet, LocalLlama, ActiveModel.
- Patient selection is preserved when navigating between Dashboard and Trend Timeline.
- Reject action captures a structured rejection reason.
- `implementation/_development_summary.md` is up to date.

---

## 9. Status (updated 2026-03-20)

| Task | Status | Notes |
|------|--------|-------|
| C3-1 Patient persistence | ⬜ Pending | |
| C2-1 + C2-2 BAML + config | ⬜ Pending | |
| C4-1 SMART OAuth | ⬜ Pending | |
| C2-3 System Config tab | ⬜ Pending | |
| C3-2 Screening Gap panel | ⬜ Pending | |
| C3-5 Rejection modal | ⬜ Pending | |
| C2-4 Mapping Tool UI | ⬜ Pending | |
| C3-3 Master Data tab | ⬜ Pending | |
| C3-4 Executive Dashboard | ⬜ Pending | |
| C4-2 Audit retention banner | ⬜ Pending | |
| C2-5 SNOMED CT audit | ⬜ Pending | |
| C2-6 Docker | ⬜ Pending | |
