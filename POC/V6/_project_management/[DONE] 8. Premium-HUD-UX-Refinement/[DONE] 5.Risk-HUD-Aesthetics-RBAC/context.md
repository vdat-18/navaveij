# Context - UI Improvements and RBAC for Trend Timeline

**Date:** 2026-03-23

## Background
The dashboard page previously showed `BiomarkerCharts` unconditionally. Additionally, the standalone `/trend-timeline` route was accessible to all roles. We needed to polish the visual experience of `RecommendationPanel` and restrict direct access to the trend timeline for certain clinical roles to ensure they use the intended flow (via `ClinicalDrawer`).

## Objective
1. Refine the UX/UI of the `RecommendationPanel` (animations, package seals, hide/show charts).
2. Enforce Role-Based Access Control (RBAC) on the `/trend-timeline` page to redirect `physician` and `nurse` roles to the main dashboard.
