# Problem — Demo Role Rename & Navigation Restructure

**Date:** 2026-03-31
**Source:** TOR alignment review — demo persona mismatch with target audience

---

## Problem Statement

The V6 demo uses clinical staff names (Nurse, DPO) to label roles that actually represent business stakeholders in the sales pitch scenario. This creates a narrative gap when demoing to hospital executives and sales leadership.

Additionally, the `/access-monitoring` screen is a monolith that conflates operational monitoring with system configuration. Both Admin and DPO see the same screen, making neither role feel purpose-built for their actual job.

---

## Specific Gaps

### Gap 1 — "Nurse" should be "Sales"

The second demo persona (`Nurse Somying Srisuk`) represents a frontline hospital staff member who engages with patients to promote the AI-recommended checkup plan. In the TOR this role is framed as a **Sales** function, not a nursing function. The current label misleads demo audiences into thinking the system is a clinical nursing tool rather than a revenue-driving recommendation engine.

Affected: login persona label, role string throughout all layers (`auth-context.tsx`, backend `security.py`, `settings.py`, `.env`, RBAC matrix in `monitoring.json`), sidebar hidden-role sets, any UI text referencing "Nurse".

### Gap 2 — "DPO" should be "Executive"

The third demo persona (`Wanchai Thongchai`) represents a hospital executive who cares about revenue uplift, conversion rates, and adoption metrics. "DPO" (Data Protection Officer) is a compliance/privacy title that actively misleads demo audiences — they expect a compliance-heavy view, not the Executive Dashboard with revenue KPIs.

Affected: same file set as Gap 1, plus the management page access guard which should restrict to `executive` only.

### Gap 3 — "Admin" should be "SysAdmin"

The fourth persona is a system administrator responsible for role configuration, mapping tools, master data, and AI/MCP settings. "Admin" is ambiguous. "SysAdmin" is more precise and clearly separates this persona from the business-facing Executive.

### Gap 4 — Access Monitoring is a monolith visible to both admin and DPO

The current `/access-monitoring` page contains:
- Monitoring content: Live Metrics Bar, Anomaly Alerts Panel, Audit Log Search
- Configuration tabs: Role Management, Mapping Tool, Master Data, MCP Configs, AI Configs

Both roles see everything. The DPO/Executive role needs only the monitoring content (oversight). The Admin/SysAdmin role needs both monitoring (for awareness) and configuration (to operate the system). Showing configuration tabs to an Executive is confusing; hiding monitoring from SysAdmin is wrong.

### Gap 5 — Executive sidebar is too broad

The current DPO user sees: Clinical Dashboard + Trend & Timeline + Access Monitoring + Management Metrics.

An Executive stakeholder does not need to see clinical patient data (Clinical Dashboard, Trend & Timeline). Their view should be revenue-focused: Executive Dashboard (Management Metrics) + Access Monitoring (for governance oversight). Showing clinical navigation to an Executive muddies the demo story.

### Gap 6 — No dedicated Configuration screen for SysAdmin

There is no `/configuration` route. Configuration functionality lives inside `/access-monitoring` as tabs, inaccessible to sysadmins without also exposing them to the monitoring content designed for Executive oversight. A dedicated Configuration page (Role Management, Mapping Tool, Master Data, MCP Configs, AI Configs) would give SysAdmin a clean, purposeful landing screen.

---

## Impact

- Demo audiences receive confusing role labels that contradict the TOR narrative
- The "Executive" demo story (revenue uplift, conversion rates) is undermined by clinical navigation items and a role called "DPO"
- The "SysAdmin" story is buried inside a screen named "Access Monitoring"
- Both non-clinical roles see a superset of each other's content, making neither view feel tailored
