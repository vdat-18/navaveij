# README — Lead Flow UI Overhaul

**Workstream:** 13.4
**Date:** 2026-04-03
**Status:** Implementation in progress (checkpoint-driven)
**Scope:** Overhaul the lead assignment UI (executive + sales screens), fix pre-run recommendation content voice, and improve the read-only recommendation display component

---

## Context

Workstream 13.3 delivered the lead assignment feature: an executive assigns pre-run patients to sales, who then track and update lead status. The feature is **functionally complete** (backend, frontend, tests all pass), but the UI falls short of what the two personas actually need.

The executive screen mixes assignment and tracking into a single flat view. The sales screen is a plain vertical list with no pipeline visualization. The pre-run recommendation text refers to sales in third person ("This helps sales position..."), which is awkward when sales are the audience. The `ReadOnlyRecommendationView` also omits data that exists in the payload (`top_findings`, `next_actions`, `confidence_score`).

This workstream addresses all three concerns as a cohesive overhaul.

---

## Progress (Checkpoint 3)

**Completed**
- Updated lead fixtures (`assets/pre_runned_recommendations.json`): patient_name de-duplication, direct voice, clinical-only risk summaries
- Updated UI labels “Pre-runned” → “Pre-run” (UI text only; API/type names unchanged)
- Added shared status/risk styling helpers + reusable badges
- Upgraded `ReadOnlyRecommendationView` (confidence, key findings, next steps, sentiment borders)
- Refactored executive screen into Assignment + Tracker sections with unassigned-only selection rules
- Refactored sales “My Leads” into a Kanban board + detail panel workflow
- Added “My Leads” count badge wiring (callback-based; no extra fetch)
- Updated tests and verified builds
- Added “Focus mode” full-screen toggle for recommendation reading (Sales detail panel + Executive preview panel)
- Added additional pre-run patients so the Executive unassigned pool is more lively
- Added executive “Unassign” action (returns a lead back to the unassigned pool)

**Next**
- Awaiting any additional QA requests

---

## Three Workstreams

### 1. Content Voice Fix

The `pre_runned_recommendations.json` communication scripts use third-person references to sales users. Sales are the ones reading this — the voice should be direct, second-person.

| Before | After |
|---|---|
| "Sales should position this as..." | "Position this as..." |
| "This package gives sales a clear..." | "Your continuity message:..." |
| "This recommendation helps sales position..." | "Position the visit around..." |

Also fix:
- Remove scenario from `patient_name` (redundant with `scenario_label`)
- Remove sales language from `risk_summary.description` (risk should be clinical)
- "Pre-runned" → "pre-run" in all UI labels

### 2. Executive Screen — Split into Assignment + Tracker

Replace the single `ExecutiveLeadAssignmentScreen` with two distinct sections designed for a sales manager:

**Lead Assignment** — Assign unassigned patients to sales reps:
- Left: unassigned patient pool with risk-colored borders
- Right: recommendation preview + inline assign form

**Lead Tracker** — Pipeline visibility:
- Pipeline summary bar (count per stage with color)
- Per-sales-rep workload breakdown
- All-leads table with expandable rows

### 3. Sales Screen — Kanban Board

Replace the vertical lead list with a Kanban board:
- 5 columns: Assigned | Contacted | Scheduled | Converted | Declined
- Compact cards with risk dot + tier
- Click card to expand detail panel with recommendation + "Move to" dropdown + notes
- No drag-and-drop (POC simplicity — click + dropdown)

---

## Related Documents

- [`problem.md`](./problem.md) — detailed UI problems identified from review
- [`_discover.md`](./_discover.md) — investigation findings from 13.3 review
- [`plan.md`](./plan.md) — updated implementation plan with tracked tasks + progress checkmarks
- [`_development_summary.md`](./_development_summary.md) — post-implementation decisions and file inventory
- [`_latest_test_results.md`](./_latest_test_results.md) — test run results

---

## Files to Modify

### Data Fixtures
| File | Change |
|---|---|
| `assets/pre_runned_recommendations.json` | Fix patient_name, rewrite voice to direct/second-person, fix risk_summary |

### Frontend — Components
| File | Change |
|---|---|
| `frontend/src/components/leads/ReadOnlyRecommendationView.tsx` | Risk color coding, confidence score, render top_findings + next_actions, sentiment borders |
| `frontend/src/components/leads/ExecutiveLeadAssignmentScreen.tsx` | Split into Assignment + Tracker sections, compact cards, pipeline summary, per-rep view |
| `frontend/src/components/leads/SalesLeadDevelopmentPanel.tsx` | Kanban board layout, column-based pipeline, detail panel, "Move to" dropdown |

### Frontend — Pages & Navigation
| File | Change |
|---|---|
| `frontend/src/app/page.tsx` | Tab toggle with lead count badge |
| `frontend/src/app/lead-assignment/page.tsx` | Layout adjustments for split sections |

---

## Out of Scope

- Drag-and-drop Kanban (click + dropdown is sufficient for POC)
- Persistent storage or real-time sync (in-memory, same as 13.3)
- Backend API changes (existing 7 endpoints are sufficient)
- New test files (update existing tests to match UI changes)
- Walk-in flow changes (untouched)
