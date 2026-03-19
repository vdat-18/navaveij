# Plan — v2 Privacy Masking and Sidebar Consistency

## Summary

This plan addresses three user-reported issues in `POC/v2`:

1. Inconsistent/duplicated navigation behavior between Access Monitoring and Governance links.
2. Duplicate route surface for `/access-monitoring` and `/audit`.
3. Privacy mode showing placeholder fallback strings (`tok_name_entity`, `tok_id_entity`, etc. and `"Masked"`) instead of backend-generated token values that demonstrate masking/rehydration capability.

Additionally, this plan includes documentation deliverables under `POC/v2/_project_management/5.enhancements` with sections for context, problem, solution, plan, and actual development.

## Current State Analysis

- Sidebar entries are defined in [Sidebar.tsx](file:///Users/nguyen.tran/Documents/GitHub/navavej/navaveij/POC/v2/frontend/src/components/Sidebar.tsx#L16-L21) and render two links:
  - `/access-monitoring` labeled “Access Monitoring”
  - `/audit` labeled “Governance”
- Both links are rendered with the same link styles and active state logic in [Sidebar.tsx](file:///Users/nguyen.tran/Documents/GitHub/navavej/navaveij/POC/v2/frontend/src/components/Sidebar.tsx#L48-L63), so visual states are consistent at component level.
- `/audit` currently renders the same `AccessMonitoringScreen` as `/access-monitoring` in [audit/page.tsx](file:///Users/nguyen.tran/Documents/GitHub/navavej/navaveij/POC/v2/frontend/src/app/audit/page.tsx#L7-L17), creating functional duplication.
- `/access-monitoring` has role gate + privacy toggle, while `/audit` bypasses those checks by hardcoding `role="admin"` (behavior mismatch between duplicate surfaces).
- Privacy fallback tokens in dashboard header are hardcoded in [page.tsx](file:///Users/nguyen.tran/Documents/GitHub/navavej/navaveij/POC/v2/frontend/src/app/page.tsx#L178-L229).
- Privacy mode package/value labels use literal `"Masked"` in [RecommendationPanel.tsx](file:///Users/nguyen.tran/Documents/GitHub/navavej/navaveij/POC/v2/frontend/src/components/dashboard/RecommendationPanel.tsx#L317-L326).
- Backend already provides token map + masked output in `security_metadata` from [orchestrator.py](file:///Users/nguyen.tran/Documents/GitHub/navavej/navaveij/POC/v2/backend/src/services/orchestrator.py#L134-L138), but frontend fallback behavior does not consistently surface backend token values.

## Assumptions & Decisions

- Scope is **v2 only**.
- Navigation decision: keep a **single Access Monitoring route** and remove duplicate Governance link/route surface.
- Privacy masking display decision: show **backend token values** (not synthetic placeholders, not hash previews).
- Existing security model and backend rehydration flow stay intact; this is a UI behavior and route consistency fix, with minimal backend adjustments only if needed to expose missing token fields for display.

## Proposed Changes

### 1) Remove duplicate nav/route surface

#### File: `POC/v2/frontend/src/components/Sidebar.tsx`
- Remove the Governance `/audit` menu item from `menuItems`.
- Keep Access Monitoring as the single route entry.

#### File: `POC/v2/frontend/src/app/audit/page.tsx`
- Replace duplicated screen rendering with route-safe behavior:
  - Preferred: redirect to `/access-monitoring` to preserve old links/bookmarks.
  - Alternative if redirect pattern conflicts with app conventions: render a minimal route notice with canonical link.
- Align with existing app routing conventions after checking current route handling style.

### 2) Replace privacy placeholder fallbacks with backend token display

#### File: `POC/v2/frontend/src/app/page.tsx`
- Refactor `getDisplayValue` so privacy mode no longer returns static placeholders like `tok_name_entity`.
- Resolution order in privacy mode:
  1. If `securityMetadata.rehydration_map` contains a token mapped to the source value, render that token.
  2. Else, derive a deterministic token-style fallback from available backend token context (e.g., patient token + field discriminator) to avoid semantic placeholders.
  3. Never show `tok_*_entity` literals.
- Update patient card/header contact fields to use the revised resolver.

#### File: `POC/v2/frontend/src/components/dashboard/RecommendationPanel.tsx`
- Replace `"Masked"` literals for Recommended Package and Program Value with backend token-oriented masked representations sourced from `security_metadata.masked_ai_output` when available.
- Add safe fallback behavior that remains token-like and non-PII when masked field is absent, instead of generic `"Masked"`.

#### File: `POC/v2/frontend/src/types/recommendation.ts` (if needed)
- Extend `RecommendationSecurityMetadata.masked_ai_output` typing to include fields consumed by UI for package/value token display.

### 3) Update/extend tests for changed behavior

#### File: `POC/v2/frontend/src/components/dashboard/RecommendationPanel.test.tsx`
- Update privacy assertions to validate token-based masked output for package/value instead of exact `"Masked"` text.
- Keep alert masking assertions aligned with intended behavior.

#### File(s): `POC/v2/frontend/src/app/*` tests (create if missing)
- Add targeted tests for privacy token resolution in dashboard header fields to prevent regression to placeholder literals.
- Add route consistency test ensuring `/audit` behavior canonicalizes to `/access-monitoring` (or equivalent decided behavior).

### 4) Add enhancement documentation artifacts

Create a new enhancement folder under:
- `POC/v2/_project_management/5.enhancements/`

Planned artifacts:
- `context.md` — business and technical context.
- `problem.md` — observed defects and impact.
- `solution.md` — chosen fix strategy and rationale.
- `plan.md` — implementation steps and files.
- `implementation/actual-development.md` — actual code/test changes and results after execution.

Naming will follow existing enhancement folder conventions (numbered prefix + topic title).

## Verification Steps

1. Frontend test verification
- Run targeted tests for:
  - `RecommendationPanel` privacy masking behavior.
  - Dashboard privacy token display behavior.
  - Audit route canonicalization behavior.

2. UI behavior verification
- Open app and confirm:
  - Sidebar shows a single Access Monitoring entry.
  - Navigating to `/audit` lands on canonical Access Monitoring surface.
  - In privacy mode, patient PII fields show token-like backend values, not `tok_*_entity`.
  - Recommended Package and Program Value no longer render plain `"Masked"` when tokenized values are available.

3. Regression sanity
- Run relevant v2 frontend test subset to ensure no breakage in dashboard and monitoring navigation.

## Implementation Order

1. Sidebar + route canonicalization (`Sidebar.tsx`, `audit/page.tsx`).
2. Privacy token rendering refactor (`app/page.tsx`, `RecommendationPanel.tsx`, optional type updates).
3. Test updates/additions.
4. Enhancement documentation creation and final update with actual development evidence.
