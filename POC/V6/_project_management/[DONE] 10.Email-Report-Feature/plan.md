# Plan — Email this Report

**Date:** 2026-03-27
**Input:** `problem.md`
**Approach:** Frontend-only MVP. Report data passed via `sessionStorage`. Email via `mailto:`. No backend changes.

---

## Approach

A new `/report` route is added to the Next.js app. When the physician clicks "Email this Report" in the `RecommendationPanel`, the current recommendation data and patient info are written to `sessionStorage`, then the app navigates to `/report`. The report page reads that data and renders a flat, single-column, print-friendly layout.

On the report page:
- **Print / Save as PDF** triggers `window.print()` — browser renders the page with `@media print` CSS that hides the action bar and cleans up the layout.
- **Email to Patient** computes a `mailto:` href using the patient's email (already in the `Patient` type) with a pre-filled subject and summary body. Clicking opens the system mail client.

**No backend changes** are needed for this MVP. The recommendation is already in memory from the SSE stream result.

**Phase 2 (out of scope here):** Backend `POST /api/report/email` endpoint that sends an HTML email with the full report via SMTP. Requires `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `SMTP_FROM` env vars and a new `backend/src/services/email.py`.

---

## Tasks

### Task 1 — Add "Email this Report" button to `RecommendationPanel`

**File:** `frontend/src/components/dashboard/RecommendationPanel.tsx`

- Import `useRouter` from `next/navigation`, `Mail` from `lucide-react`
- Import `usePatient` from `@/shared/patient-context`
- Add handler `handleEmailReport`:
  ```ts
  const handleEmailReport = () => {
    if (!recommendation || !patient) return;
    sessionStorage.setItem('navaveij_report_export', JSON.stringify({
      patient,
      recommendation,
      generatedAt: new Date().toISOString(),
    }));
    router.push('/report');
  };
  ```
- Add button below Approve/Reject section:
  ```tsx
  <button onClick={handleEmailReport} className="navavej-button-secondary flex items-center gap-2">
    <Mail size={16} />
    Email this Report
  </button>
  ```
- Button should only be rendered (not just disabled) when `recommendation` is available

### Task 2 — Create `/report` Next.js page

**New file:** `frontend/src/app/report/page.tsx`

```tsx
'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ReportPage from '@/components/report/ReportPage';

export default function ReportRoute() {
  const router = useRouter();
  const [data, setData] = useState(null);

  useEffect(() => {
    const raw = sessionStorage.getItem('navaveij_report_export');
    if (!raw) { router.replace('/'); return; }
    sessionStorage.removeItem('navaveij_report_export');
    setData(JSON.parse(raw));
  }, []);

  if (!data) return null; // brief flash before redirect or render
  return <ReportPage data={data} />;
}
```

- No `Sidebar`, no `PatientDirectoryColumn` — standalone page with its own layout
- `sessionStorage` entry is consumed (deleted) on first read to prevent stale renders

### Task 3 — Create `ReportPage` component

**New file:** `frontend/src/components/report/ReportPage.tsx`

Flat single-column layout. Sections in order:

| # | Section | Data Source |
|---|---|---|
| 1 | Report header | Navavej wordmark, "Clinical Recommendation Report", `generatedAt` (formatted), truncated `recommendation_hash` |
| 2 | Action bar (`report-action-bar`) | Print button (`window.print()`), Email to Patient (`mailto:` link). **Hidden in print.** |
| 3 | Patient info | `patient_name`, `age`, `gender`, `mrn`, `email`, `phone` |
| 4 | Risk summary | `overall_risk_level` badge (colour-coded), description text |
| 5 | Recommended package | `ai_recommended_tier`, `package_name`, `price_thb`, `recommendation_source` |
| 6 | Critical alerts | Add-ons where `priority === "Red"` — bullet list |
| 7 | Recommended add-ons | Full table: Item \| Category \| Priority \| Price (THB) \| Rationale |
| 8 | Communication script | `summary_headline`, `top_findings[]`, `program_justification`, `next_actions[]` |
| 9 | AI reasoning trace | `reasoning_trace` (rendered in `<pre>`) |
| 10 | Supporting signals | `supporting_signals[]` list |
| 11 | Confidence metrics | `confidence_score` (if present) |
| 12 | Disclaimer | "This report is AI-assisted and should not replace professional clinical judgment." |
| 13 | Report footer | Full `recommendation_hash`, generated timestamp, "Powered by Navaveij" |

Styling: Navavej teal (`#00ABC7`) section headings, clean borders, white background. No card box-shadows (clean for print).

### Task 4 — `mailto:` email link

Inside `ReportPage`, compute the `mailto:` href:

```ts
const subject = encodeURIComponent(
  `Your Health Checkup Recommendation — ${new Date(data.generatedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`
);
const body = encodeURIComponent(
  `Dear ${data.patient.patient_name},\n\n` +
  `Please find your health recommendation summary below.\n\n` +
  `Recommended Package: ${data.recommendation.ai_recommended_tier}\n` +
  `Overall Risk Level: ${data.recommendation.overall_risk_level}\n\n` +
  `This report was generated by the Navaveij Clinical Guidance System.\n` +
  `For your full detailed report, please contact your physician.`
);
const mailtoHref = `mailto:${data.patient.email}?subject=${subject}&body=${body}`;
```

Patient email is available from the `Patient` type (`patient.email`).

No new packages needed — uses `Date.toLocaleDateString()` rather than `date-fns`.

### Task 5 — Print CSS

**File:** `frontend/src/app/globals.css`

Append `@media print` block:

```css
@media print {
  .report-action-bar { display: none !important; }
  .navavej-sidebar, nav, header { display: none !important; }
  body { background: white !important; color: black !important; }
  .report-section { page-break-inside: avoid; }
  .report-page { box-shadow: none !important; padding: 0 !important; }
}
```

---

## Files Changed

| File | Change |
|---|---|
| `frontend/src/components/dashboard/RecommendationPanel.tsx` | Add "Email this Report" button; write `sessionStorage` + navigate |
| `frontend/src/app/report/page.tsx` | **New** — standalone `/report` Next.js page |
| `frontend/src/components/report/ReportPage.tsx` | **New** — flat report layout component |
| `frontend/src/app/globals.css` | Append `@media print` rules |

No backend changes. No new npm packages.

---

## Verification

1. In physician dashboard with a loaded recommendation → click "Email this Report" → navigates to `/report`
2. `/report` shows all sections with correct patient and recommendation data
3. "Print / Save as PDF" opens browser print dialog; action bar is hidden in print preview; body is white
4. "Email to Patient" opens system mail client with correct `to:`, `subject:`, and pre-filled body
5. Hard refresh `/report` (no `sessionStorage`) → redirects back to `/` without errors
6. Privacy mode: report page should respect the `PrivacyModeContext` for masked values (future — not required for MVP)

---

## Out of Scope

- **Backend email sending** — Phase 2: `POST /api/report/email` endpoint, `backend/src/services/email.py`, SMTP env vars, HTML email template with full report
- **Direct URL access** to `/report` without sessionStorage (requires backend report storage / report ID)
- **PDF attachment** generation (requires `playwright` or `wkhtmltopdf` on the backend)
- **Multi-patient** or bulk report generation
- **Privacy mode** inheritance on the report page
