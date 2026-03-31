# Wave 1 Closure Plan — GAP-UI-5, GAP-UI-8, GAP-UI-16

## Why this plan exists
These three gaps are currently flagged as “not done / partially done” because the checkpoint artifacts are inconsistent with the shipped code (GAP-UI-5, GAP-UI-8) and because privacy mode behavior is not yet end-to-end and cross-route consistent (GAP-UI-16).

This plan closes both:
- Product behavior (what the UI actually does)
- Closure artifacts (README + per-gap checkpoint files + rollups)

---

## Current state (observed)

### GAP-UI-5 (Navigation & Placeholder Content)
- Code already reflects the intended behavior:
  - Sidebar labels are non-placeholder and correct.
  - “Support” is not routing to `/audit`.
  - Dashboard header/footer placeholders are removed.
  - Patient list empty state shows “No patients found”.
- Closure artifacts are inconsistent:
  - README says “Not started”.
  - `_discovery.md` still lists multiple items as open.

### GAP-UI-8 (Crypto Audit Guard)
- Code already includes:
  - `crypto?.subtle` availability check.
  - `try/catch` around hash verification.
  - Inline error messaging for insecure contexts and exceptions.
- Closure artifacts are inconsistent:
  - README says “Not started”.
  - `_discovery.md` is still a placeholder (“Not started”).

### GAP-UI-16 (Privacy Mode: Incomplete PII Masking)
- Some masking exists (demographics, package info, trend subtitle, reasoning trace).
- Remaining “partial” issues that prevent Wave 1 gate:
  - Privacy mode is not a shared cross-route state (dashboard/trend-timeline/access-monitoring each manage it separately or not at all).
  - Patient list still renders patient names (PII) regardless of privacy mode.
  - Critical signals still render the alert value even when privacy mode is enabled.
  - “Last Analysis Run” currently shows a non-data label (“De-Identified Trace”) rather than a masked value / placeholder, which can be interpreted as misleading.
  - Access Monitoring does not participate in the privacy mode state model (no shared indicator/toggle), so the “applies everywhere” requirement is not satisfied.

---

## Implementation plan

### 1) Close GAP-UI-5 (artifact reconciliation + quick regression scan)
1. Verify the following in the current UI source:
   - Sidebar labels are “Clinical Dashboard”, “Trend & Timeline”, “Access Monitoring”.
   - “Support” does not route to `/audit`.
   - No duplicate header nav links exist on the dashboard page.
   - No “Sample Link 1/2/3” placeholders exist.
   - Patient list empty state reads “No patients found”.
2. Update closure artifacts in `GAP-UI-5-navigation-placeholder-content/`:
   - `README.md`: Status → Complete; ensure scope item list reflects reality.
   - `_discovery.md`: Mark all items ✅ and remove stale “Open” entries.
   - `_development_summary.md` and `_lastest_test_results.md`: Keep as-is if accurate; otherwise align wording to the verified behavior.
3. Re-check Wave 1 rollups under `gaps/` to ensure GAP-UI-5 remains “Complete”.

**Acceptance criteria**
- README status is “Complete”.
- Discovery table shows no open items.
- No placeholder labels/links exist in the verified files.

### 2) Close GAP-UI-8 (artifact reconciliation + secure-context behavior verification)
1. Verify `AuditLogSearchPanel` behavior in code:
   - When `crypto?.subtle` is unavailable, user sees “Hash verification requires a secure (HTTPS) connection.”
   - Exceptions in digesting/encoding are caught and surfaced as inline error text.
2. Update closure artifacts in `GAP-UI-8-crypto-audit-guard/`:
   - `README.md`: Status → Complete.
   - `_discovery.md`: Replace placeholder with concrete “Verified” findings.
   - `_lastest_test_results.md`: Ensure verification items match the exact UI and error messaging.
3. Confirm no sensitive values are emitted to UI logs beyond generic error reporting.

**Acceptance criteria**
- README status is “Complete”.
- Discovery file documents the guard, failure mode, and user-visible message.
- Hash verification cannot throw a runtime `TypeError` in insecure contexts.

### 3) Finish GAP-UI-16 (end-to-end privacy mode model + consistent masking)

#### Design options for cross-route privacy mode
**Option A (Recommended): PrivacyModeProvider + local persistence**
- Add a small client-side provider mounted once in the root layout (via a client “Providers” wrapper).
- Store `privacyMode` in React state and persist to `localStorage` so it survives navigation and refresh.
- Expose `usePrivacyMode()` hook for pages/components to read/toggle consistently.

**Option B: URL-driven privacy mode**
- Encode privacy mode in the URL (`?privacy=1`) and read it via `useSearchParams`.
- Requires updating internal links/navigation to preserve the param, and is more invasive.

This plan proceeds with Option A.

#### Concrete implementation steps (Option A)
1. Add shared privacy mode state:
   - Create a client provider (e.g., `PrivacyModeProvider`) and a hook (e.g., `usePrivacyMode`).
   - Add a client `Providers` wrapper and mount it in `app/layout.tsx` (server layout stays server; provider is pushed down as a client wrapper).
2. Replace per-page privacy state with shared state:
   - `src/app/page.tsx`: use shared privacy mode; keep the existing UI toggle but wire it to the shared hook.
   - `src/app/trend-timeline/page.tsx`: remove local `useState(false)` privacy mode and use shared privacy mode instead.
   - `src/app/access-monitoring/page.tsx`: show the same “Data Visibility” indicator + toggle, wired to shared privacy mode (so “applies everywhere” is true).
3. Ensure patient list does not leak names in privacy mode:
   - Update `PatientList` to accept `privacyMode` and render token-based identifiers (or a masked placeholder) when enabled.
   - Update search behavior so users can still find patients in privacy mode (search token + ID, not name).
   - Pass `privacyMode` into `PatientList` from both dashboard and trend-timeline pages.
4. Tighten remaining privacy masking:
   - `RecommendationPanel`: when privacy mode is enabled, mask critical alert values in addition to label/subtitle.
   - Replace “Last Analysis Run” value with a clear placeholder (e.g., `"—"`) under privacy mode to avoid presenting non-data labels as if they were anonymized timestamps.
5. Define and document privacy mode scope:
   - Update GAP-UI-16 README to explicitly list which fields are masked on each screen and what remains intentionally visible (POC limitations).
   - Ensure the UI disclaimer text matches the README statement.

**Acceptance criteria**
- Toggling privacy mode in any screen immediately reflects on the other screens after navigation.
- Patient names are not rendered anywhere in privacy mode (including the left-side patient list).
- Recommendation package info and critical alert details (including values) are masked in privacy mode.
- Privacy mode scope is documented in GAP-UI-16 README and aligns with the UI copy.

---

## Verification plan (Wave 1 gate)
- Static checks:
  - TypeScript passes (`tsc --noEmit`) when Node tooling is available in the environment.
  - ESLint passes (`npm run lint`) when available.
- Manual UI checks:
  - Confirm privacy toggle persistence across route navigation.
  - Confirm patient list does not expose names in privacy mode.
  - Confirm audit hash verification shows the HTTPS warning on insecure contexts and never throws.
- Closure artifacts:
  - Update per-gap README + `_discovery.md` + rollups so “Wave 1 gate” status is unambiguous.

