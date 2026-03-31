# E2E Playwright Tests — Context
> **Date:** 2026-03-20 · **Exercise:** 7 · **Audience:** AI Engineering Team (POC)

## Background

Exercises 1–4 closed backend and frontend gaps; exercises 5–6 address enhancements and demo readiness. The POC now has **9 Vitest unit/component tests** covering internal logic (PII masking, auth guards, risk gauge, patient search). However, **no end-to-end browser tests exist** that verify each screen works as a whole — including navigation, API data loading, role-based access, and key user interactions.

This exercise adds a **Playwright E2E test suite** targeting the four screens the POC evaluators will actually open during the demo.

## Why Playwright, Not More Vitest

Vitest + JSDOM tests render components in isolation with mocked context providers. They cannot detect:
- A page redirect failing because `sessionStorage` is not properly read on initial load
- A `page.route()` race where data arrives after the component unmounts
- Tab switching or multi-step interactions (select patient → wait for recommendation → click Confirm)
- Role-based routing failures (physician sees "Access Denied", admin sees the dashboard)
- Chart rendering regressions from recharts version bumps

Playwright drives a real Chromium browser, executing real Next.js routing, real React hydration, and real API calls (intercepted by `page.route()` for determinism).

## POC Scoring Impact

| TOR Criterion | Weight | Covered By |
|---|---|---|
| UX / Explainability (XAI) | 20% | E2E-2-dashboard, E2E-3-trend-timeline |
| Hybrid Engine + MCP Read-Only | 35% | E2E-2-dashboard (recommendation flow) |
| Security, Privacy & Audit | 20% | E2E-4-access-monitoring (RBAC, audit log) |
| Pluggable AI Architecture | 25% | E2E-2-dashboard (AI/Rules toggle) |

## Auth Architecture Note

The app stores demo JWTs in **`sessionStorage`** under key `navavej.smartToken.v1` using `btoa(JSON.stringify(payload))` encoding (see `src/shared/auth-context.tsx`). Playwright's `context.storageState()` only persists `localStorage`, not `sessionStorage`. Auth is therefore injected via `page.addInitScript()` before each navigation — this runs in the page context before React initialises, so the token is present when the `AuthProvider` reads storage on mount.

## Scope

| In Scope | Out of Scope |
|---|---|
| Frontend E2E browser tests (Playwright) | Backend integration tests (already in `scripts/tests/`) |
| 4 screens: Login, Dashboard, Trend & Timeline, Access Monitoring | New screens or features |
| Auth flow (login page UI) | Real LLM inference (all AI routes mocked with `page.route()`) |
| Role-based access (physician, admin) | Admin panel or backend-only flows |

## Key Reference Documents

| Document | Path |
|---|---|
| AI Team Onboarding | `doc_outputs/onboarding/ai-team-onboarding.md` |
| Auth Context | `POC/v2/frontend/src/shared/auth-context.tsx` |
| API Service Layer | `POC/v2/frontend/src/services/api.ts` |
| Login Page | `POC/v2/frontend/src/app/login/page.tsx` |
| Access Monitoring Page | `POC/v2/frontend/src/app/access-monitoring/page.tsx` |
| GAP-UI-15 (Vitest setup) | `_project_management/[DONE] 4. UI-Gap-Closure/gaps/GAP-UI-15-test-coverage/` |

## Test Waves

- **Wave 1 — Infrastructure** (E2E-INFRA): Install Playwright, config, auth helpers, mock handlers. ~0.5 days.
- **Wave 2 — Screen Tests** (E2E-1 through E2E-4): Write spec files for each screen. ~1–2 days.