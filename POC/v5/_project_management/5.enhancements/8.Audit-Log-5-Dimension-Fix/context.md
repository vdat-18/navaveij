# Context — Audit Log 5-Dimension Schema Fix

**Date:** 2026-03-23

---

## Background

The system records every AI inference and physician decision in an immutable audit log stored at `logs/audit.jsonl`. This log must satisfy **PDPA** and **HIPAA** requirements for clinical AI systems.

The official specification (Section 6.3 of the TOR) defines a **5-Dimension log structure**:

| Dimension | Fields |
|-----------|--------|
| **Who** | `user_id`, `user_role` |
| **When** | `timestamp` (ISO 8601, UTC) |
| **Where** | `service_id`, `client_ip`, `request_id` |
| **What** | `masked_ai_prompt`, `masked_ai_response`, `model_id`, `latency_ms`, `safety_conflict_events` |
| **Why** | `patient_id`, `action_type`, `request_id` (flat, not nested) |

The implementation lived in `backend/src/services/audit.py` — specifically in two methods: `log_recommendation()` and `log_decision()`.

## What Triggered This Fix

During a compliance review of Section 6.3, four gaps were found between the spec and the actual code. None of the gaps were business logic errors — all were naming, nesting, or missing-field issues. But they mattered for two reasons:

1. **Automated compliance tools** scan log entries by field name. Wrong field names = invisible data.
2. **Consistency between the two log entry types** (`GenerateRecommendation` vs `PhysicianDecision`) was broken — they used different field names for the same concept.
