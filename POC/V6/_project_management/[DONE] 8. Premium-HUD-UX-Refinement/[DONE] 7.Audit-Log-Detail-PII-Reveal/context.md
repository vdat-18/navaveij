# Context — Audit Log Detail PII Reveal

**Date:** 2026-03-24

## Problem Statement
The Admin and DPO users need a way to selectively reveal sensitive information (Who and Patient ID) in the audit log search panel without exposing it by default in the list view, especially when Privacy Mode is active.

## Objectives
1.  Integrate the Audit Log Search Panel with the global `Privacy Mode`.
2.  Mask sensitive identifiers (User ID, Patient ID) in the audit log table when Privacy Mode is ON.
3.  Provide "eye" icons in the detail view to allow authorized users to selectively reveal the actual identities.
4.  Ensure reveal state is reset when switching between entries to maintain a high level of privacy guardrails by default.

## Stakeholders
-   Admin Users (System auditing)
-   DPO (Privacy compliance review)
-   Security Auditors (Forensic investigations)
