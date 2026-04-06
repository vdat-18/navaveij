# Plan — 13.3 Lead Assignment Flow

## Scope verified

Target implementation repo is `POC/V6`, not the repository root. The current 13.3 workstream documents are directionally correct, but they need a tighter execution plan aligned to the actual V6 codebase, current 13.2A/13.2B outcomes, and realistic verification constraints.

## Verification of current plan and sub-task

### What is already correct in the existing 13.3 plan
- The feature is net-new and requires new backend endpoints, new frontend UI, and new fixture data.
- The sales experience should stay inside the existing no-sidebar `/` flow.
- The executive experience should be a new sidebar-accessible screen.
- A read-only recommendation renderer is preferable to trying to reuse the full `RecommendationPanel` behavior.
- In-memory storage is appropriate for this POC.

### What needs adjustment before implementation
1. The current plan assumes captured real AI payloads for pre-runned patients. That is ideal, but it is risky as a hard dependency because plan-mode investigation cannot verify runtime AI availability. Implementation should support fixture-backed pre-runned payloads, using real captured payloads if available and schema-valid curated payloads otherwise.
2. The current plan says 7 backend endpoints and 6 frontend service methods. That is reasonable, but the response shapes should be designed to minimize frontend joins. Sales lead responses should include enough patient/recommendation summary metadata to render cards without extra list lookups.
3. The current plan should explicitly include backend authorization checks using the existing header-based auth pattern and scope conventions already used in V6.
4. The current plan should explicitly include frontend and backend tests as first-class deliverables, not only end-state verification bullets.
5. The current plan should explicitly include checkpoint/doc updates in the existing workstream folder after implementation, because the user requested that.
6. The config-screen request should not be bundled into 13.3 implementation. Based on 13.2A and 13.2B, prompt editing is already implemented and model switching is intentionally constrained to configured clients. Any true free-form model-name editing remains a separate follow-up, likely backend-major if made real.

## Recommended implementation plan

### Phase 1 — Finalize 13.3 contract and fixture strategy
1. Re-read the 13.3 workstream docs and align them to `POC/V6` paths.
2. Define fixture-backed entities:
   - sales users
   - pre-runned patient records
   - seeded lead assignments
3. Keep pre-runned recommendation payloads schema-compatible with `RecommendationResponse`.
4. Prefer storing enough denormalized summary fields with each lead or pre-runned patient so the frontend can render efficiently.

### Phase 2 — Backend lead-assignment API
1. Add a new `leads.py` route module under `POC/V6/backend/src/api/routes/`.
2. Follow the existing `patients.py` and `contracts.py` patterns for:
   - JSON fixture loading
   - FastAPI router structure
   - `HTTPException` handling
   - auth header enforcement
3. Implement endpoints for:
   - list leads
   - get one lead
   - create assignment
   - update lead status/notes
   - list pre-runned patients
   - get pre-runned recommendation by patient token
   - list sales users
4. Register the router in `POC/V6/backend/src/api/main.py`.
5. Ensure executive-only and sales-only access rules are enforced consistently.
6. Keep storage in-memory and seeded from JSON fixtures on startup/import.

### Phase 3 — Frontend types and API client
1. Add lead-specific TypeScript types under `POC/V6/frontend/src/types/`.
2. Extend `POC/V6/frontend/src/services/api.ts` with a dedicated `leadService` following existing typed service conventions.
3. Reuse the existing auth-header builder and contract-route base URL.

### Phase 4 — Read-only recommendation rendering
1. Inspect `RecommendationPanel.tsx` and extract only the rendering patterns needed for precomputed display.
2. Create a separate read-only component instead of adding mode flags into the existing panel.
3. Exclude streaming, cache mutation, approval/reject actions, email/report actions, and other live-flow controls.
4. Keep styling aligned with the current Navavej UI language.

### Phase 5 — Executive lead assignment UI
1. Add a new executive route/page for lead assignment.
2. Add a new executive sidebar item.
3. Build a two-panel screen:
   - pre-runned patient pool
   - assignment tracker
4. Support assignment creation with sales-user selection and optional notes.
5. Refresh local state after assignment creation.

### Phase 6 — Sales lead development UI
1. Keep physician flow unchanged.
2. Add a sales-only tab switch on the existing `/` page:
   - Walk-in
   - My Leads
3. Build a dedicated lead-development component for sales.
4. Show assigned leads only for the logged-in sales user.
5. Support status updates and note updates without any AI rerun.
6. Use a demo-friendly voice-note mock only if it can be added with low complexity and without destabilizing the page.

### Phase 7 — Tests and verification
Implementation must include tests, not just manual checks.

#### Backend tests
Add focused tests under `POC/V6/scripts/tests/` for:
- executive can list/create assignments
- sales only sees own leads
- sales can update allowed leads
- unauthorized role/scope combinations are rejected
- pre-runned recommendation endpoint returns stored payload without orchestration

#### Frontend tests
Add focused Vitest coverage for:
- sidebar shows Lead Assignment for executive only
- sales login persona list includes second sales user
- sales tab toggle behavior on `/`
- lead-development rendering from fixture/service mocks
- read-only recommendation view renders key sections without live fetch behavior

#### Required verification commands during implementation
When implementation starts, run and fix failures for the relevant commands in `POC/V6`:
- frontend tests
- frontend lint
- frontend build
- backend targeted pytest
If additional lint/type commands are discovered during implementation, include them too.

### Phase 8 — Checkpoint and workstream documentation updates
After code and tests pass:
1. Update the relevant 13.3 workstream docs in `POC/V6/_project_management/13. Additional Enhancements/13.3-Lead-Assignment-Flow/`:
   - `README.md`
   - `_discover.md` if findings changed materially
   - `plan.md`
   - `_development_summary.md`
   - `_latest_test_results.md`
2. Keep the documentation aligned with what was actually implemented and verified.
3. Prepare a checkpoint summary for the user.

## Recommendation on the config-screen request
This should remain separate from 13.3.

- Prompt version selection/editing is already materially addressed by 13.2B.
- Client health validation before activation is already addressed by 13.2A.
- True free-form model-name editing is not a minor cosmetic tweak in the current architecture because model identity is tied to configured clients and backend runtime initialization.
- If the client only needs demo cosmetics later, that can be scoped as a separate UI-only enhancement. If they need real runtime model editing, that should be treated as a backend-major follow-up.

## Approval gate
Once you approve this plan, implementation should proceed in `POC/V6` for workstream `13.3-Lead-Assignment-Flow`, with tests executed and the workstream docs updated at the end.