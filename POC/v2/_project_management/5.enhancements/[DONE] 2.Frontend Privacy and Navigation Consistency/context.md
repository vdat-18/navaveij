# Context — Frontend Privacy and Navigation Consistency

**Date:** 2026-03-19  
**Scope:** `POC/v2/frontend`

## Background

The v2 clinical dashboard includes:
- A left navigation sidebar for route switching.
- A privacy mode toggle that should demonstrate masked/tokenized PII handling.
- Recommendation summary cards that should remain privacy-safe while still showing meaningful masked output.

## Trigger

User feedback identified three UX/data-behavior gaps:
- Duplicate navigation intent between `Access Monitoring` and `Governance`.
- Duplicate route surface (`/access-monitoring` and `/audit`) showing equivalent content.
- Privacy mode displaying placeholder strings (`tok_*_entity`, `Masked`) instead of backend-driven tokenized values.

## Objective

Make v2 behavior consistent and demonstrable:
- One canonical monitoring navigation path.
- No duplicate monitoring surface behavior.
- Privacy mode shows backend tokenized values/fallback tokens, not placeholder literals.
