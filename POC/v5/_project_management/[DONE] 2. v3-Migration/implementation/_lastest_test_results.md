# Latest Test Results — v3 Migration

_Raw test outputs per step. Updated after each migration step._

---

## MIG-1 — BAML 3-Agent Pipeline

- BAML source migration: complete (static analysis verified)
- `uv run baml-cli generate`: confirmed via MIG-7 run — exit 0 (BAML CLI 0.213.0)
- Runtime test blocked in AI execution environment (`uv`/`python3` not available)

---

## MIG-2 — Workflow Update

- Static analysis: complete
- No runtime test available in AI execution environment

---

## MIG-3 — Orchestrator Update

- Static analysis: complete
- No runtime test available in AI execution environment

---

## MIG-4 — contracts.py Update

- Static analysis: complete
- No runtime test available in AI execution environment

---

## MIG-5 — Frontend: Hybrid AI/Rules Toggle

- VS Code diagnostics: no TypeScript/ESLint errors
- Runtime test blocked: `npm`/`uv` not available in AI execution environment

---

## MIG-6 — Frontend: PII Privacy Mode Toggle

- VS Code diagnostics: no TypeScript/ESLint errors
- Runtime test blocked: `npm`/`uv` not available in AI execution environment

---

## MIG-7 — Synthesis: enrichment.baml + scripts

- `uv run baml-cli generate` → exit 0 (BAML CLI 0.213.0)
- `uv run python -c "import scripts.enrich_healthy_scenarios"` → pass
- `uv run python -c "import scripts.enrich_hypertension_scenarios"` → pass
- `uv run python -c "import scripts.enrich_metabolic_scenarios"` → pass
- `uv run python -c "import scripts.enrich_senior_scenarios"` → pass

---

## Full Regression Suite

- Pending: `uv run pytest scripts/tests -v` — run from `POC/v2/` to confirm all existing tests still pass after all 7 MIG changes
