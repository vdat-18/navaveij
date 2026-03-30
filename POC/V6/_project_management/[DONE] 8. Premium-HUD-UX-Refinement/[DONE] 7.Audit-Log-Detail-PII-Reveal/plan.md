# Plan — Audit Log Detail PII Reveal

**Date:** 2026-03-24

## Approach
Implement the Privacy Mode integration and "eye" reveal mechanism in the Audit Log Search component. The UI will mask identifying fields in the table result rows when Privacy Mode is active, and provide an explicit "Reveal" action in the entry detail panel.

## Tasks

### Task 1 — Integrate Privacy Mode Context
-   File: `AuditLogSearchPanel.tsx`
-   Action: Import `usePrivacyMode` and retrieve `privacyMode` state.

### Task 2 — Table Row Masking
-   File: `AuditLogSearchPanel.tsx`
-   Action: Wrap the `user_id` and `patient_id` in the table rendering with a conditional check on `privacyMode`. Show `*******` if masked.

### Task 3 — Dynamic Reveal State Initialization
-   File: `AuditLogSearchPanel.tsx`
-   Action: Update `handleEntrySelect` (or equivalent click handler) to initialize `revealWho` and `revealPatient` based on the current `privacyMode`. If Privacy Mode is OFF, reveal immediately; if ON, hide by default.

### Task 4 — UI Polish
-   File: `AuditLogSearchPanel.tsx`
-   Action: Ensure the clickable "eye" SVG icons (EyeIcon / EyeSlashIcon) provide clear visual affordance for the reveal/hide state.

## Risk
-   **Low**: Purely cosmetic and UI state changes. No changes to the audit data fetching or storage logic.
