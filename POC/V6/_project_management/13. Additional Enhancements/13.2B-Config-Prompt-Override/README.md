# README — Prompt Override + Runtime Versioning + Reset

**Workstream:** 13.2B
**Date:** 2026-04-02
**Status:** Pending
**Scope:** Fix the risk-profile cache key, add runtime prompt overrides with auto-version stamping, and transform the inspect modal into an editable view with save/reset capabilities

---

## Context

The Config screen's AI Configs tab shows prompt templates in a read-only modal. The client wants sysadmins to be able to edit prompt templates per AI client at runtime and manage prompt versions — useful for experimenting with prompt wording during demos without server restarts.

This workstream also fixes a pre-existing bug: the workflow-level risk-profile cache keys on masked patient context only, ignoring which AI client/model/template produced the cached result. This means switching the active client or editing prompts could serve stale Agent 1 output.

---

## Approach

1. **Cache fix:** Extend `_risk_profile_cache_key()` in `clinical.py` to include `active_client`, `model_id`, `template_version`
2. **Prompt overrides:** In-memory override store in `prompt_selector.py`. Auto-stamps version as `{base}-v1+runtime-{timestamp}` on edit. `get_prompt_selector()` already creates fresh instances per call — overrides take effect immediately.
3. **API:** PATCH endpoint to update templates + POST endpoint to reset to YAML defaults
4. **Frontend:** Transform read-only inspect modal to an inspect/edit modal with textarea inputs and save/reset actions

---

## Related Documents

- [`problem.md`](./problem.md) — gap statement
- [`_discover.md`](./_discover.md) — codebase investigation findings
- [`plan.md`](./plan.md) — implementation plan with tracked tasks
- [`_development_summary.md`](./_development_summary.md) — filled after implementation
- [`_latest_test_results.md`](./_latest_test_results.md) — filled after implementation

---

## Files to Change

### Backend
| File | Change |
|---|---|
| `backend/src/services/workflows/clinical.py` | Fix `_risk_profile_cache_key()` to include AI identity |
| `backend/src/services/prompt_selector.py` | Runtime prompt override store + auto-version stamping + reset helper |
| `backend/src/api/routes/contracts.py` | 2 new endpoints: PATCH prompts + POST prompts/reset + 1 Pydantic model |

### Frontend
| File | Change |
|---|---|
| `frontend/src/services/api.ts` | 2 new methods: `updateClientPrompts()` + `resetClientPrompts()` |
| `frontend/src/components/access-monitoring/AIConfigsTab.tsx` | Edit mode toggle, textarea per template, version editing, save/reset actions |

---

## Out of Scope

- Writing overrides to YAML files on disk (runtime-only, resets on restart)
- Prompt version history or rollback UI
- Diff view between YAML original and runtime override
- Per-function prompt testing (run one prompt in isolation)
