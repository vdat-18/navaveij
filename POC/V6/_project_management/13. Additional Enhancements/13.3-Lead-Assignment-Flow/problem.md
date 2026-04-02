# Problem — Lead Assignment Flow

**Date:** 2026-04-02
**Source:** Client change request — executive assigns pre-runned patients to sales as leads; reach-out vs walk-in patient distinction

---

## Problem Statement

The current system operates a single patient flow: any physician or sales user searches a patient, triggers a live AI recommendation, and views results. There is **no concept of pre-analyzed patients, lead assignment, or outbound reach-out workflows**.

The client wants a second patient flow where an executive assigns pre-analyzed ("pre-runned") patients to sales users as leads. Sales receives the assigned leads and takes action on them — viewing the AI recommendation that was already generated, adding notes, and updating the lead status — without re-running the AI.

---

## Specific Gaps

### Gap 1 — No reach-out / lead concept

The system is entirely walk-in: patients exist in a flat registry (`assets/patient_registry.json`), anyone with `recommendation:read` scope can search and process any patient. There is no assignment, ownership, or lifecycle tracking. No `lead`, `assignment`, `assigned_to`, or status fields exist anywhere in the codebase.

Affected: conceptual gap — no existing code to modify, new data model and flow needed

### Gap 2 — No pre-computed recommendation storage

All recommendations are generated live via the clinical workflow (`POST /recommend`). There is no mechanism to store a recommendation result and serve it later without re-running the AI pipeline. The contract-layer cache exists but is time-limited (TTL-based) and not designed for long-term pre-computed result storage.

Affected: need new fixture data for pre-runned recommendation payloads

### Gap 3 — No executive screen for lead management

The executive role has two screens: Executive Dashboard (`/management`) with revenue KPI metrics, and Access Monitoring (`/access-monitoring`) for audit/governance oversight. Neither screen has any lead assignment functionality.

Affected: `frontend/src/components/Sidebar.tsx` (executive menu), need new `/lead-assignment` route and component

### Gap 4 — No sales lead view

Sales shares the physician's patient search flow on `/` (`page.tsx`). The `RecommendationPanel` component is tightly coupled to live AI fetching — it auto-fetches on `patientToken`, maintains a client-side cache, includes approval/reject workflows, email report, and deals drawer. None of this is appropriate for a read-only pre-computed lead view.

Affected: `frontend/src/app/page.tsx`, `frontend/src/components/dashboard/RecommendationPanel.tsx`

### Gap 5 — No sales user registry

The system has only one sales persona (`usr-sales-00001`, "Somying Srisuk") in the login page. There is no canonical list of sales users that the executive assignment screen could use as an assignee dropdown. The `manage_stats.json` lists 5 staff under "Sales Adoption Rates" but these are display-only names, not linked to auth identities.

Affected: `frontend/src/app/login/page.tsx`, need new `assets/sales_users.json`

### Gap 6 — RecommendationPanel is not reusable for read-only display

`RecommendationPanel` (`frontend/src/components/dashboard/RecommendationPanel.tsx`, ~110KB) has data fetching, streaming, caching, and interactive workflows deeply interleaved with its rendering logic. Making it work with pre-loaded data would require gating the fetch `useEffect` (line 447), disabling the client-side `recommendationCache`, hiding approval/reject buttons, email report, deals drawer, stage progress UI, and rule-based toggle. This is not a 10-line tweak — it's fragile and couples two distinct UX modes.

Affected: need a separate `RecommendationReadOnlyView` component extracted from the rendering portions

---

## Impact

- The demo cannot show the executive → sales lead pipeline that the client described
- Sales has no way to receive and act on pre-analyzed patient recommendations
- The single-flow architecture limits the business narrative to walk-in scenarios only
- Without a read-only recommendation view, pre-computed results cannot be displayed without triggering live AI calls
