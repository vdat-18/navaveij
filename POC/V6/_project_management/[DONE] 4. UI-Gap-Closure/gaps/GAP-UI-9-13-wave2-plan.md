# Wave 2 Plan — GAP-UI-9 through GAP-UI-13

## Goals
Wave 2 focuses on maintainability and UX consistency:
- Restore TypeScript safety + centralize API error handling (UI-9)
- Consolidate design tokens and remove raw-hex styling drift (UI-10)
- Deduplicate chart tooling and clinical constants (UI-11)
- Remove small UX papercuts and dead code (UI-12)
- Improve layout responsiveness and monitoring KPI clarity (UI-13)

## Execution order (dependency-aware)
1. **GAP-UI-9** (types + API service): unlocks typed shared chart tooltip props.
2. **GAP-UI-11** (chart dedupe): depends on UI-9 typed tooltip props.
3. **GAP-UI-10** (token consolidation): safer after chart/UI refactors so token changes apply once.
4. **GAP-UI-13** (layout + LiveMetricsBar): touches globals/layout; best after token decisions.
5. **GAP-UI-12** (UX polish): can be done anytime, but easiest after structural work.

---

## GAP-UI-9 — Type Safety & API Service

### Scope
- Remove `any` from key screen state and helpers:
  - Dashboard selected patient and handler params: `src/app/page.tsx`
  - Recommendation response state and helpers: `src/components/dashboard/RecommendationPanel.tsx`
  - Biomarker/timeline typed state: `src/components/trend-timeline/TrendTimelineScreen.tsx`
- Strengthen service typing:
  - Add return types for all service functions in `src/services/api.ts`
  - Add Axios interceptors for centralized error handling and uniform error messages
  - Add `timeout: 30000` to all Axios instances
- Document `apiV1` vs `apiV3` routing rationale in `api.ts`

### Implementation approach
- Prefer reusing existing types under `src/types/*` where possible; only add new interfaces when contract coverage is missing.
- Define a `RecommendationResponse` type aligned to the existing backend contract payload consumed by `RecommendationPanel`.
- Replace `renderBoldText(text: any)` with `renderBoldText(text: string)`.
- Add a small error-normalization helper used by interceptors (e.g., convert Axios errors into consistent `Error` messages).

### Acceptance criteria
- No `any` for the specific items listed in the gap scope.
- `api.ts` exports are fully typed with explicit return types.
- Axios instances have `timeout` and interceptors; errors surface consistently in UI.

---

## GAP-UI-10 — Design Token Consolidation

### Scope
- Remove duplicate `.navavej-*` CSS utilities that replicate Tailwind/token utilities while keeping truly structural classes (e.g., `glass-sidebar`).
- Replace raw hex usage (`#00ABC7`, `#9D0A31`, `#E9ECEF`, etc.) with existing tokens (`text-navavej-teal`, `text-navavej-red`, `border-navavej-border`, etc.) across TSX/CSS.
- Standardize interpretation/priority colors in:
  - `ScreeningGapStatus.tsx`
  - `AnomalyAlertsPanel.tsx`
  - `RecommendationPanel.tsx`

### Design options
**Option A (Recommended): Token-first Tailwind utilities**
- Use the existing `navavej-*` Tailwind tokens everywhere in TSX (`text-navavej-teal`, `bg-navavej-gray-light`, etc.).
- Keep only a small set of structural CSS classes in `globals.css` (layout/effects, not colors).

**Option B: CSS-variable-first**
- Convert all component usage to CSS variables (`var(--color-navavej-teal)`) and keep component classnames minimal.
- Higher coordination cost; easier to drift without linting rules.

This plan proceeds with Option A.

### Acceptance criteria
- No raw hex occurrences remain in `src/` (or the remaining list is explicitly justified and documented).
- `globals.css` no longer contains a parallel “utility class design system” for colors.
- Priority/status colors are consistent across key screens.

---

## GAP-UI-11 — Chart Component Deduplication

### Scope
- Extract shared, typed Recharts tooltip component:
  - Create `src/components/charts/ChartTooltip.tsx`
  - Remove `CustomTooltip` from `BiomarkerCharts.tsx` and `TrendTooltip` from `BiomarkerTrendGrid.tsx`
- Extract shared chart config constants:
  - Create `src/components/charts/chartConfig.ts`
  - Update chart components to import these defaults
- Centralize clinical constants:
  - Move BMI/BP reference values into `src/shared/clinicalConstants.ts` (or extend an existing shared module)
- Prevent gradient id collisions:
  - Use `useId()` in `BiomarkerCharts.tsx`
- Fix layout mismatch:
  - `md:grid-cols-3` → `md:grid-cols-2` in `BiomarkerCharts.tsx`

### Acceptance criteria
- Only one tooltip implementation exists for these charts and is typed.
- Chart visuals remain unchanged (except grid fix) and compile with no diagnostics.
- No hardcoded BMI/BP reference values remain in chart/timeline components.

---

## GAP-UI-12 — UX Polish

### Scope
1. Remove dead/duplicate imports in `RecommendationPanel.tsx` (per README).
2. Replace static `useMemo(() => [...], [])` arrays with module-level constants in `AuditLogSearchPanel.tsx`.
3. Fix hover affordance mismatch in `LabResultsGrid.tsx`:
   - Either remove hover scale for non-interactive cards, or make cards clickable with a real action.
4. Reduce alarm fatigue:
   - Restrict pulsing/attention animations to clinically urgent states only (e.g., high/critical; “H” not “L”).
5. Replace clinically misleading unknown status fallback in `ClinicalEventTimeline.tsx`.

### Acceptance criteria
- No dead imports; fewer unnecessary hooks; hover states match interactivity.
- Animations communicate urgency, not noise.
- Unknown clinical statuses display as `"unknown"` rather than `"active"`.

---

## GAP-UI-13 — Layout Responsiveness

### Scope
- Decouple sidebar width from layout padding:
  - Introduce `--sidebar-width: 16rem` in `globals.css`
  - Use it in `layout.tsx` and `Sidebar.tsx` instead of `pl-64` / `w-64`
- Improve LiveMetricsBar alert count readability:
  - Replace `"critical/high/medium/low"` string with labeled severity badges
- Prevent layout shift:
  - Make loading skeleton match the loaded component structure

### Design options (alert badge UI)
**Option A (Recommended): Compact labeled pills**
- `Critical`, `High`, `Medium`, `Low` as small pills with counts.
- Uses existing token colors and minimal layout footprint.

**Option B: Icon + count strip**
- A row of colored dots/icons with counts (more compact, less explicit).

This plan proceeds with Option A.

### Acceptance criteria
- Sidebar width change requires updating only the CSS variable.
- LiveMetricsBar communicates severity clearly at a glance.
- No visible layout jump when monitoring snapshot loads.

---

## Verification (Wave 2 gate)
- TypeScript diagnostics are clean across modified files.
- Quick UI regressions:
  - Dashboard loads, patient selection works, privacy toggle still functions.
  - Trend & Timeline charts render with shared tooltip.
  - Access Monitoring metrics bar loads without layout shift; alert counts are readable.
- Update per-gap checkpoint files:
  - `README.md`, `_discovery.md`, `_development_summary.md`, `_lastest_test_results.md`
  - Rollups under `gaps/` updated once each gap is closed.

