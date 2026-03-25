# Solution — Audit Log Detail PII Reveal

**Date:** 2026-03-24

## Summary of Changes
Focused edits were made to `src/components/access-monitoring/AuditLogSearchPanel.tsx` to integrate Privacy Mode and implement the selectively revealable admin feature for PII.

---

## Fix 1 — `PrivacyMode` Integration
`usePrivacyMode` from `@/shared/privacy-mode` was imported and used to check if PII should be masked in the UI.

## Fix 2 — Table Row Result Masking
Sensitive identity fields (`user_id` and `patient_id`) are now masked in the audit log table rows with `*******` when `privacyMode` is ON. This ensures identifying information is not leaked in search results unless the Admin explicitly selects an entry for inspection.

## Fix 3 — "Reveal" Action Logic
Selectively revealable sections for `Who` (identity and role) and `Patient` (Patient ID) are implemented in the audit detail panel.
-   By default, identifying info is **masked** to prevent "eyes-on" PII exposure.
-   Authorized Admin/DPO users can click the "eye" icon to reveal the specific information for that entry.
-   The "Reveal" state is **reset** to masked whenever a new entry is selected, providing consistent privacy guardrails.

## Resulting UI Behavior
1.  **Search List View (Masked):**
    `[Time] [Who: *******] [What: View] [Patient: *******]`
2.  **Detail View (Initially Masked):**
    `Who: ******* [EyeIcon]`
    `Patient: ******* [EyeIcon]`
3.  **Detail View (After Reveal):**
    `Who: Dr. Smith (Administrator) [EyeSlashIcon]`
    `Patient: PAT-90031 [EyeSlashIcon]`

---

## Implementation Details
-   `revealWho` and `revealPatient` component state variables added.
-   Clickable SVG Heroicons for `EyeIcon` and `EyeSlashIcon` added to the detail UI.
-   State reset logic added to the row click handler.
