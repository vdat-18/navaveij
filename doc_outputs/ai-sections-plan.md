# AI Sections — Writing Plan
**Technical Proposal: Smart Health Checkup Recommendation Dashboard**
**Owner: Nguyen (AI Lead)**
**Last updated: 2026-03-23**

---

## Scope

This document tracks the plan and key decisions for filling all AI-owned sections in the Technical Proposal.

---

## Sections

| Section | Status | Co-owner |
|---|---|---|
| 6.3 Comprehensive Audit Logging | ✅ Done (revised 2026-03-23) | Diep |
| 7.1 High-Level AI Workflow | ✅ Done | — |
| 7.2 Model Context Protocol (MCP) Middleware | ✅ Done | Data Platform |
| 7.3 Hybrid Recommendation Logic | ✅ Done | — |
| 7.4 Central AI Gateway | ✅ Done | — |
| 7.4.2 Pluggable LLM Configuration Management | ✅ Done | — |
| 7.4.1 Explainable AI (XAI) & Confidence Scoring | ✅ Done | — |
| 7.5 AI Tech Stack | ✅ Done | — |

---

## Key Decisions

### AI Workflow Design (§7.1 / §7.2)
Document the onboarding ReAct design as the primary architecture. Add a note that for low/medium complexity data, the system short-circuits to a fixed upfront fetch for latency and cost savings:
- **Optimization path**: All 4 MCP tools fetched in parallel upfront. If context is deemed sufficient, pipeline proceeds directly to AI agents (no ReAct).
- **Full ReAct path**: AI evaluates context sufficiency; issues additional targeted MCP tool calls (bounded iteration cap) when data is insufficient for high-quality output.

### Audit Logging Dimensions (§6.3)
Use the client's stated framework: **5 dimensions — Who, When, Where, What, Why**.
- "When" is an explicit named dimension (ISO 8601 UTC timestamp)
- AI context/response must be explicitly captured in "What" as `scrubbed_ai_context` / `ai_response` (PII scrubbed, not masked)
- Logs must be immutable (SHA-256 hash chaining)

### PII Approach (all sections)
PII is **scrubbed entirely** before AI inference — not masked/tokenised. AI receives de-identified clinical signals only. No PII rehydration in backend. Frontend resolves patient identity from `patient_id` at display time.

### Confidence Score (§7.4.1)
System-computed formula (not LLM self-reported):
```
confidence_score = 0.4 × signal_coverage + 0.4 × data_completeness + 0.2 × rule_agreement
```

### Model Switching (§7.4.2)
Config-driven via `AI_ACTIVE_CLIENT` env var. Named clients: GPT-4o, Claude 3.5 Sonnet, LocalLlama. No code deployment required to switch.

---

## Section Content Outlines

### 6.3 Comprehensive Audit Logging
- 5-dimension table (Who/When/Where/What/Why) with field-level detail
- "What" explicitly includes masked AI prompt/context + masked response, model_id, latency_ms, safety_conflict_events
- SHA-256 hash chaining mechanism description
- Append-only write; synchronous (before response delivery)
- PII enforcement: only masked data stored
- Physician decision entries linked to recommendation via hash reference
- 3-year retention policy (PDPA §40) — TODO: Diep on storage mechanism
- Access: DPO + System Admin only — TODO: Diep to confirm via SMART scopes

### 7.1 High-Level AI Workflow
- Two-path design: optimization (fixed fetch) vs. full ReAct loop
- Multi-agent pipeline: Agent 1 (risk analysis) → parallel Agent 2a (policy) + 2b (narrative)
- Graceful degradation chain at each agent boundary
- Mermaid flow diagram

### 7.2 MCP Middleware
- FastMCP server, read-only, stdio subprocess
- 5 tools table (name | returns | consumer)
- PII masking gate before any LLM call
- Singleton session warmed at startup

### 7.3 Hybrid Recommendation Logic
- 3-layer design: deterministic rule tier → AI override → post-AI safety filter
- Tier selection rules table (4 rules)
- Add-on priority levels table (Red/Orange/Yellow/Green)
- Full fallback chain

### 7.4 Central AI Gateway
- BAML ActiveModel fallback chain
- 20s timeout per LLM call
- Env-var model switching, no deploy needed

### 7.4.2 Pluggable LLM Configuration
- 4 named clients table
- Config-driven switching detail

### 7.4.1 XAI & Confidence Scoring
- Reasoning trace from Agent 1 bullets
- Confidence formula (system-computed)
- Confidence tier thresholds
- Communication script fields

### 7.5 AI Tech Stack
- Full tech stack table (component | technology | version | role)
