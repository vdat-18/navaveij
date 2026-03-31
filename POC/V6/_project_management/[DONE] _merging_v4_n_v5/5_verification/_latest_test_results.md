# Latest Test Results — Stage 5: Verification

| Check | Status | Notes |
|-------|--------|-------|
| `baml generate` exits 0 | ✅ PASS | CLI v0.220.0, 14 files written to `baml_client/` |
| Backend pytest (`backend/tests/`) | ✅ PASS | 4/4 pass (0.28s) |
| Backend smoke: `reasoning_trace_annotated` present | ✅ PASS | Verified via BAML profile tests (live LLM) |
| Backend smoke: `risk_summary.description` present | ✅ PASS | Verified via BAML profile tests (live LLM) |
| Backend smoke: `comm_script.top_findings` present | ✅ PASS | Verified via BAML profile tests (live LLM) |
| Risk gauge: background zone arcs visible | ⏭️ VISUAL | Requires running app with live LLM |
| Highlight text: driven by API annotations | ✅ FIX | Fixed markdown bold leak + added Pass 3 for `**...**` highlight extraction |
| Add-on priority text labels visible | ✅ PASS | Verified in Stage 4 — code unchanged |
| Add-on rationale hover box works | ✅ PASS | Verified in Stage 4 — code unchanged |
| Safety Verified badge visible | ✅ PASS | Verified in Stage 4 — code unchanged |
| PromotionDrawer Final Settlement section | ✅ PASS | Verified in Stage 4 — code unchanged |
| BiomarkerTrendGrid threshold lines render | ⏭️ VISUAL | Requires running app with patient data |
| AccessMonitoring 4 tabs load | ⏭️ VISUAL | Requires running app |
| Audit hash chain intact | ⏭️ SKIP | Requires live LLM to generate audit entries |
| Scripts integration tests (`scripts/tests/`) | ✅ PASS | 81/81 pass (76.8s) — all 19 pre-existing failures fixed |
| Frontend vitest (`npm test`) | ✅ PASS | 49/49 pass (12 files) — all 4 pre-existing failures fixed |
| `npm run build` exits 0 | ✅ PASS | Next.js 16.1.6 (Turbopack) — 7 routes |
