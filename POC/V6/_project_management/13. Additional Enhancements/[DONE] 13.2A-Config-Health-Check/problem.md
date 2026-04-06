# Problem — Client Health Check + Improved Active Client Switching

**Date:** 2026-04-02
**Source:** Client change request — "add ability to change model name and test if they work"

---

## Problem Statement

The Config screen's AI Configs tab allows a sysadmin to switch the active LLM client via "Set Active," but provides **no validation that the target client's API credentials and model are actually functional** before switching. A blind switch to a misconfigured or down client silently breaks all downstream clinical recommendations until someone notices.

The client wants the ability to test whether a given AI provider works before committing to it as the active inference client.

---

## Specific Gaps

### Gap 1 — No pre-switch validation

The "Set Active" button (`AIConfigsTab.tsx` lines 115-121) calls `clinicalService.setActiveClient(clientName)` immediately. There is no health check, no connectivity test, no feedback about whether the target client can actually serve inference requests. If the target client's API key is expired or the model is invalid, the switch succeeds silently and all subsequent `/recommend` calls fail.

Affected: `frontend/src/components/access-monitoring/AIConfigsTab.tsx`, `backend/src/api/routes/contracts.py` (PATCH `/system-config/active-client`)

### Gap 2 — No visibility into client health status

The BAML Client Registry table shows Client, Provider, Model, Status (active/standby), and Actions. There is no column or indicator for whether a standby client is actually reachable. The sysadmin must switch to a client, run a recommendation, and observe the result to know if it works.

### Gap 3 — Model column is read-only but the client wants it editable

The client request says "change model name." However, BAML clients read `env.GEMINI_MODEL` etc. at initialization time. Changing `os.environ` after init has no effect on already-initialized clients — the repo validated this during the Per-Model Prompt Template Registry work (workstream 9) and moved to subprocess-based validation in `scripts/validate_clients.py`. Runtime model ID overrides are not feasible without reinitializing the BAML runtime.

**Resolution:** The model column stays read-only with a tooltip explaining it's configured via `.env`. The "test" functionality validates the client as-configured. The "change model" need is addressed by the existing 5-client architecture — switching between pre-configured clients effectively switches models.

---

## Impact

- Sysadmin risks breaking inference for all users by switching to an unhealthy client
- No way to verify client health without actually switching and running a recommendation
- Demo audiences see a "Set Active" button with no safety net — undermines the operational rigor story
