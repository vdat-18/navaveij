# Problem — Audit Log Detail PII Reveal

**Date:** 2026-03-24

---

## Current State

The Audit Log panel in `AuditLogSearchPanel.tsx` (access-monitoring) displayed all fields — including PII such as `user_id` and `patient_id` — in plain-text at all times in both the search result list and the detail panel.

## Pain Points

1. **PII always exposed**: Even when privacy mode is active, the audit log showed identifying data (`user_id`, `patient_id`) without masking, creating a compliance risk.
2. **No "eyes-on" control**: Admins and DPOs sometimes need to audit who accessed which patient — but the access to that information itself must be logged and deliberate. There was no mechanism to require an explicit "reveal" action.
3. **No privacy mode integration**: The audit view was not connected to the global `usePrivacyMode` context, so toggling privacy mode had no effect on the audit panels.
4. **Inconsistent UX**: Other parts of the application masked sensitive data behind eye-icons, but the audit log treated all data as non-sensitive.
