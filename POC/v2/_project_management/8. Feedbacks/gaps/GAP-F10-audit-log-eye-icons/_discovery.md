# Discovery — GAP-F10

**Status:** Complete (pre-implementation analysis)

## Current State

- `AuditLogSearchPanel.tsx` renders audit log entries in a table with columns:
  WHO, WHEN, WHERE, WHAT, WHY, Hash.
- `AuditLogEntry.who` already contains: `user_id`, `user_display_name`, `user_role`,
  `department` — all the data needed for the WHO eye reveal.
- `AuditLogEntry.what` contains `patient_token` (pseudonymized UUID) and `patient_id`
  (the actual patient ID) — `patient_id` can be used for the patient lookup.
- **No eye icons exist** in the current audit log table.
- The admin/DPO role gate for the access monitoring page already exists — only
  `admin` or `dpo` roles can reach this page at all.
- Mock patient list is loaded in the frontend (patient directory column). `patient_id`
  matches the ID used in the patient list.

## What Needs to Change

1. **WHO column:** Add a Lucide `Eye` icon button. On click, toggle a popover showing
   `user_display_name`, `user_role`, `department`.

2. **WHAT column (patient cell):** Add a Lucide `Eye` icon button next to the masked
   patient token. On click, look up `patient_id` in the mock patient list.
   Render `patient_name` + `hn` (hospital number) in a popover.

3. **Role gate:** While the page itself is already admin/DPO-only, add an explicit check
   within the component as a defense-in-depth measure.

4. **Popovers:** Use a simple `useState` per-row open/close or a single shared state with
   the active row ID. Include a red "CONFIDENTIAL" badge and demo disclaimer.

## In-memory Lookup Approach

The mock patient list is loaded by the patient directory component. To avoid prop-drilling,
either:
- Import the mock data directly into `AuditLogSearchPanel.tsx` (simplest for POC), or
- Access it via a shared context if one exists.

## Risk Flags

- If `patient_id` in `AuditLogEntry.what` does not match the IDs in the mock patient list,
  the lookup will return undefined. Handle gracefully: "Patient record not found in demo data."
- Per-row popover state can become expensive if the audit log renders 100+ rows.
  Use a single shared `activePopover: { rowId, type }` state rather than per-row booleans.
