# Context — Integrity and Logic Status Derivation

**Date:** 2026-03-20  
**Scope:** `POC/v2/frontend/src/components/dashboard/RecommendationPanel.tsx` · `POC/v2/frontend/src/types/recommendation.ts` · `POC/v2/backend/src/api/contracts.py`

## Background

The recommendation dashboard currently shows two status chips under the clinical reasoning panel:
- `Integrity: Valid`
- `Logic: Verified`

These labels appear as static UI strings and are not mapped to response fields from the recommendation API payload.

## Trigger

Product review feedback highlighted that users only ever see:
- Integrity = `Valid`
- Logic = `Verified`

This creates ambiguity:
- Are these statuses true runtime evaluations?
- Or only static visual labels intended as decorative UX?

## Objective

Define and implement a single clear product behavior for these two status chips:
- Either keep them intentionally static as non-dynamic trust cues,
- Or drive them from explicit backend-evaluated fields with deterministic status rules.

The decision must be made before implementation to avoid introducing accidental pseudo-dynamic behavior.
