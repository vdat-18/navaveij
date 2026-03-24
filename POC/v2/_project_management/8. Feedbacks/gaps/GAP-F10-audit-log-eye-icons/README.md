# GAP-F10 — Audit Log Eye Icons (Patient Reveal + User Reveal)

**Title:** Eye icons in audit log rows to reveal patient identity and user identity (in-memory demo)
**Status:** Not started
**Phase:** 2 (clinical annotation)

---

## Objective

Add eye icon buttons to each row in the audit log panel so that Admin and DPO users can
reveal the patient's real identity and the accessing user's display name. This is a
in-memory demo implementation — no backend endpoint required.

## Scope

1. **WHO eye icon:** In the WHO column, add a `👁` icon. On click, show a popover displaying
   `user_display_name`, `user_role`, and `department` (all already present in `AuditLogEntry.who`).
2. **WHAT/patient eye icon:** In the WHAT column (patient token cell), add a `👁` icon. On
   click, resolve `patient_id` from `AuditLogEntry.what` against the in-memory mock patient
   list → display patient name + HN in a popover.
3. **Role gate:** Eye icons rendered only when `currentUser.role === 'admin' || 'dpo'`.
4. **Confidential badge:** Both popovers show a red "CONFIDENTIAL" badge and a tooltip
   "Demo only — production de-anonymization requires DPO-signed access request."

## Primary Files

- `POC/v2/frontend/src/components/access-monitoring/AuditLogSearchPanel.tsx`
- `POC/v2/frontend/src/types/access-monitoring.ts` — `AuditLogEntry`: `who.user_display_name`,
  `who.user_role`, `who.department`, `what.patient_id` (all confirmed present)
- `POC/v2/frontend/src/shared/auth-context.tsx` — current user role for gate check
- Mock patient data source (likely `PatientList` mock data or patient context)

## Data Flow (In-memory Demo)

```
audit_log_entry.what.patient_id
       ↓
mock_patient_list.find(p => p.id === patient_id)
       ↓
{ patient_name, hn } displayed in popover
```

For the WHO eye, the data is already in `entry.who` — just toggling visibility.

## Design Decisions

- **In-memory demo:** Client confirmed no new backend work needed for POC. Mock patient
  list is already loaded in the frontend for the patient directory.
- **Popover, not modal:** A small popover inline with the row is less disruptive than a
  full modal for a quick reveal action.
- **CONFIDENTIAL badge required:** Even in demo, visually reinforcing PII sensitivity is
  important for client trust and to set correct expectations for production implementation.

## Checkpoint Files

- `_discovery.md`
- `_development_summary.md`
- `_latest_test_results.md`

## Feedback Reference

`feedbacks.md` — "Add admin feature: for audit log entry, add an eye that reveals patient information + eye that reveals Who's information"
