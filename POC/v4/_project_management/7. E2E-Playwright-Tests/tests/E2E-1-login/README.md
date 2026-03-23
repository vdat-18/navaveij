# E2E-1 — Login Screen

**Title:** E2E tests for the `/login` demo authorization page
**Status:** Not started
**Wave:** 2

---

## Objective

Verify the login screen renders correctly, all 4 demo personas are selectable, the Authorize and Deny flows behave as designed, and unauthenticated users are redirected to `/login` from protected routes.

## Spec File

`frontend/e2e/login.spec.ts`

## Test Cases

| # | Test Name | What It Checks |
|---|---|---|
| L-1 | Renders the authorization card | "Navavej Hospital" header, "Authorization" heading visible |
| L-2 | Shows all 4 personas in dropdown | Dropdown has 4 options: "Dr. Ananya Sharma (Physician)", "Nurse Somying Srisuk (Nurse)", "Wanchai Thongchai (DPO Officer)", "System Admin" |
| L-3 | Shows FHIR scopes | `patient/*.read`, `observation.read`, `condition.read` all visible |
| L-4 | Deny resets selection, stays on `/login` | Select index 3 (Admin), click Deny → dropdown resets to index 0, URL stays `/login` |
| L-5 | Authorize as physician redirects to `/` | Default selection (index 0), click Authorize → `page.url()` is `/` |
| L-6 | Unauthenticated navigation redirects to `/login` | No token set, `page.goto("/")` → redirected to `/login` |

## Key Selectors

| Element | Selector |
|---|---|
| Persona dropdown | `page.locator("select")` |
| Authorize button | `page.getByRole("button", { name: "Authorize" })` |
| Deny button | `page.getByRole("button", { name: "Deny" })` |
| "Navavej Hospital" text | `page.getByText("Navavej Hospital")` |
| FHIR scope texts | `page.getByText("patient/*.read")` etc. |

## Auth State for This Spec

**None** — login tests require a clean session. Use:
```typescript
test.use({ storageState: { cookies: [], origins: [] } });
```

## Notes

- The Deny handler calls `setSelectedPersona(0)` — not `router.push` — so URL stays at `/login`
- Authorize calls `signIn(encodeToken(payload))` then `router.replace("/")` — both happen synchronously before React re-renders; Playwright `waitForURL` catches the redirect

## Depends On

E2E-INFRA

## TOR Reference

Security, Privacy & Audit 20% (auth entry point)
