# Feedbacks Gap-Closure Plan

**Date:** 2026-03-24
**Input:** `feedbacks.md` (client & clinical feedback post-POC demo)
**Goal:** Close all identified product quality gaps from client feedback, covering UX flow,
visual design, clinical data annotation, and admin features.

---

## Closure Status

| Gap | Title | Status |
|-----|-------|--------|
| GAP-F1 | UX Navigation Restructure (nurse/doctor single-entry + modals) | Not started |
| GAP-F2 | Loading States (colorful step-by-step model thinking) | Not started |
| GAP-F3 | Risk-o-Meter Prominence | Not started |
| GAP-F4 | Confidence Score as Numeric % | Not started |
| GAP-F5 | Package Seal Avatars + Click-to-Reveal + Repeat at Bottom | Not started |
| GAP-F6 | Add-ons Restructure (single column, sorted, collapsible, rationale) | Not started |
| GAP-F7 | Cross-screen Toast / Popup linking to Trend & Timeline | Not started |
| GAP-F8 | Clinical Timeline Enhancements (datetime, grouping, good/bad sign) | Not started |
| GAP-F9 | Graph Enhancements (abnormal highlight, threshold, current value) | Not started |
| GAP-F10 | Audit Log Eye Icons (patient reveal + user reveal) | Not started |
| GAP-F11 | UI Tone — Urgent Clinical Alert Style | Not started |
| GAP-F12 | Clinical Evidence Trace Good/Bad Sign + Datasource | Not started |
| GAP-F13 | Admin Panel (rename AI Gateway + remove Auth Config) | Not started |

---

## 1. Planning Principles

1. **Feedback-traceable changes only**
   Every change is traceable to a specific item in `feedbacks.md`. No speculative improvements.

2. **Reuse before build**
   Where data already exists in the API response (e.g., `rationale` on `RecommendationAddOn`,
   `severity` on `CriticalSignal`), surface it in the UI before adding new data sources.

3. **Static datasource before AI inference**
   For good/bad sign annotation (GAP-F8, GAP-F12): use a deterministic static map as the
   primary source. AI inference is a fallback only, and must be cached in sessionStorage to
   avoid latency impact.

4. **In-memory demo for de-anonymization**
   Audit log eye icons (GAP-F10) use in-memory mock patient data. No backend endpoint
   is required for POC.

5. **Role-gated UX changes**
   Navigation restructure (GAP-F1) applies only to `nurse` and `doctor` roles.
   Admin/DPO roles retain the existing 3-screen navigation.

---

## 2. Target End State

At completion, the POC must demonstrate:

- Nurses/doctors see a single dashboard entry; clicking timeline/graphs opens full-screen modal.
- AI loading shows step-by-step colorful progress (6 named steps).
- Risk gauge is visually dominant with clear red/yellow/green zones.
- Confidence score shows as numeric percentage (e.g., "87% Confidence").
- Package recommendation displayed with tier-appropriate seal (Gold/Platinum/Diamond),
  shown at top and repeated at bottom for consultation flow.
- Add-ons appear in a single column, sorted by risk descending, each collapsible with rationale.
- Critical signal detection triggers a toast that links to the trend & timeline modal.
- Clinical timeline events show bold datetime, are grouped by check-up visit, and each
  result has a good/bad sign annotation from the clinical sign datasource.
- Biomarker graphs highlight out-of-range data points, annotate the current value,
  and show a prominent labeled threshold line.
- Audit log rows show eye icons (admin/DPO only) that reveal patient name and user display name.
- Overall UI tone is high-contrast, purposeful, clinically assertive — not soft/pastel.
- AI reasoning evidence trace annotates each item as positive finding or concern.
- Admin panel shows "AI Gateway" (not "BAML Client Registry"), with provider logos, and no
  Auth Configuration section.

---

## 3. Workstream Overview

### WS-A — Visual & Display Quick Wins

**Covers:** GAP-F2, GAP-F3, GAP-F4, GAP-F13
**Priority:** P0 — no dependencies, immediate visual impact

Deliverables:
- `LoadingSteps.tsx` component with 6 named steps and step-specific colors.
- Enlarged risk gauge with clear color zones and pulsing ring on Critical.
- Numeric confidence % replacing qualitative label in `RecommendationPanel.tsx`.
- "AI Gateway" label and provider logo field in `SystemConfigTab.tsx`; Auth Config section removed.

Acceptance checks:
- Loading: trigger a recommendation fetch; 6 named steps animate; panel renders on completion.
- Risk gauge: High-risk patient shows dominant red zone; Low-risk shows green.
- Confidence: recommendation panel shows "XX% Confidence" as a number.
- Admin: "AI Gateway" label visible; Auth Configuration section absent.

### WS-B — Package & Add-on Presentation

**Covers:** GAP-F5, GAP-F6, GAP-F7
**Priority:** P0 — core consultation flow, no backend dependencies

Deliverables:
- `PackageSealBadge.tsx` with Gold/Platinum/Diamond visual treatment.
- Package shown at top and bottom of `RecommendationPanel.tsx` (click-to-reveal detail).
- Add-ons sorted by risk descending, single column, collapsible accordion, rationale on expand.
- Toast notification on critical signal detection with link to timeline modal.

Acceptance checks:
- Standard patient → Gold badge. Premium patient → Diamond badge.
- Scroll to bottom: package repeats as consultation summary.
- Add-on with priority Red appears first; each row expands to show rationale.
- High-risk patient → toast appears; clicking link opens timeline modal.

### WS-C — Clinical Data Annotation

**Covers:** GAP-F8, GAP-F9, GAP-F12
**Priority:** P1 — requires clinical sign datasource creation

Deliverables:
- `clinical-sign-definitions.ts`: static LOINC/signal-code → good/bad criteria map (seeded
  with common panels: CBC, HbA1c, eGFR, lipid, BP).
- `ClinicalEventTimeline.tsx`: bold datetime, visit grouping, good/bad badge per result.
- `BiomarkerTrendGrid.tsx` + `BiomarkerCharts.tsx`: custom abnormal dot renderer, labeled
  threshold line, current-value highlight, prominent annotation chip.
- AI inference fallback endpoint + sessionStorage cache for sign items with no static definition.

Acceptance checks:
- Timeline: events grouped by same-day visit; datetime is bold/large; each result shows a
  colored sign badge derived from reference range comparison.
- Graph: out-of-range data points render as larger red dots; last data point is highlighted;
  threshold line has a value label.
- Evidence trace: each item in reasoning trace shows "✓ Positive Finding" or "⚠ Concern" badge.

### WS-D — UX Architecture + UI Tone

**Covers:** GAP-F1, GAP-F11
**Priority:** P1 — larger scope, cross-cutting

Deliverables:
- `TrendTimelineModal.tsx`: full-screen modal wrapping existing `TrendTimelineScreen`.
- Role-gated navigation: nurse/doctor roles hide sidebar timeline link; show "View Trend &
  Timeline" button that opens the modal.
- Admin/DPO role: sidebar unchanged.
- Cross-cutting UI tone changes: saturated risk colors, bolder metric typography, tighter
  card padding, solid primary CTAs, reduced border-radius on alert cards.

Acceptance checks:
- Nurse login → sidebar has no Timeline link → "View Trend & Timeline" button visible →
  click opens full-screen modal → close returns to dashboard.
- Admin login → sidebar retains all 3 navigation links.
- Risk indicators are visibly higher-contrast than before.
- CTA buttons (Approve, Recommend) are solid-fill, larger.

### WS-E — Audit Log De-anonymization

**Covers:** GAP-F10
**Priority:** P1 — admin-only feature, in-memory demo

Deliverables:
- Eye icon in WHO column of audit log → popover reveals `user_display_name`, `user_role`,
  `department` (already in `AuditLogEntry.who`).
- Eye icon in WHAT column → popover resolves `patient_id` against mock patient list →
  reveals patient name + HN.
- Both icons gated to `role === 'admin' || 'dpo'`.
- Popovers show "CONFIDENTIAL" badge.

Acceptance checks:
- Nurse login → no eye icons in audit log (access denied page shown anyway).
- Admin login → eye icons visible → clicking WHO eye shows user details → clicking WHAT eye
  shows resolved patient name.

---

## 4. Execution Sequence

### Phase 1 — Quick Wins (WS-A + WS-B)

Execute WS-A and WS-B in parallel. No architecture changes. Pure frontend.

**Step 1 — Loading Steps Component (GAP-F2)**
- Create `LoadingSteps.tsx` with 6 hardcoded step names, colors, icons.
- Wire into `RecommendationPanel.tsx` as the loading state.
- Gate: 6-step animation plays during API call; disappears on response.

**Step 2 — Risk Gauge + Confidence Score (GAP-F3, GAP-F4)**
- Increase gauge size in `RecommendationPanel.tsx`.
- Replace qualitative label with `{(confidence_score * 100).toFixed(0)}% Confidence`.
- Gate: visual comparison before/after; numeric score rendered.

**Step 3 — Package Seals + Repeat (GAP-F5)**
- Create `PackageSealBadge.tsx` (Standard→Gold, Advanced→Platinum, Premium→Diamond).
- Add package hero at top, click-to-reveal detail, and consultation summary at bottom.
- Gate: all 3 tiers render correct seal; detail expand/collapse works.

**Step 4 — Add-ons Restructure + Toast (GAP-F6, GAP-F7)**
- Sort add-ons by risk, single column, collapsible accordion, rationale on expand.
- Add toast component; trigger on critical signals; link to timeline modal (placeholder for now).
- Gate: add-on list sorted Red→Green; toast appears; each row expands with rationale text.

**Step 5 — Admin Panel (GAP-F13)**
- Rename label in `SystemConfigTab.tsx`; add `provider_logo_url` to type; remove Auth Config.
- Gate: "AI Gateway" visible in admin panel; Auth Config section absent.

---

### Phase 2 — Clinical Annotation + Audit (WS-C + WS-E)

**Step 6 — Clinical Sign Datasource (GAP-F8, GAP-F12 foundation)**
- Create `clinical-sign-definitions.ts` with LOINC code → sign criteria map.
- Seed with: HbA1c, eGFR, LDL, HDL, Total Cholesterol, BMI, SBP, DBP, FBG, CBC differentials.
- Gate: map is importable; returns sign criteria for at least 10 common lab codes.

**Step 7 — Clinical Timeline Enhancements (GAP-F8)**
- Bold datetime in `ClinicalEventTimeline.tsx`.
- Group events by visit (same date = same group).
- Add good/bad badge using sign definitions map + reference range comparison.
- Gate: events grouped visually; datetime is large/bold; each event has a colored badge.

**Step 8 — Graph Enhancements (GAP-F9)**
- Custom dot renderer in `BiomarkerTrendGrid.tsx` and `BiomarkerCharts.tsx`.
- Labeled threshold reference line.
- Current-value highlight (last data point) with tooltip pin.
- Prominent annotation chip (green/red background).
- Gate: out-of-range dots are larger/red; threshold is labeled; last point highlighted.

**Step 9 — Evidence Trace Sign Annotation (GAP-F12)**
- In `RecommendationPanel.tsx`, annotate reasoning trace items using sign definitions map.
- AI inference fallback for unknown signals (sessionStorage cache).
- Gate: reasoning trace items show sign badges; no latency regression on repeated loads.

**Step 10 — Audit Log Eye Icons (GAP-F10)**
- Eye icons in `AuditLogSearchPanel.tsx` for WHO and WHAT columns.
- Role-gating and popovers.
- Gate: admin role sees icons; clicking reveals patient/user data; nurse role sees no icons.

---

### Phase 3 — Architecture + Tone (WS-D)

**Step 11 — Trend Timeline Modal (GAP-F1)**
- Create `TrendTimelineModal.tsx` wrapping `TrendTimelineScreen`.
- Add role-gated navigation change in `page.tsx` and `Sidebar.tsx`.
- Wire toast link from Phase 1 Step 4 to the modal.
- Gate: nurse/doctor flow verified; admin flow unchanged; modal opens/closes cleanly.

**Step 12 — UI Tone Overhaul (GAP-F11)**
- Saturate risk colors, increase metric font-weight, tighten card padding.
- Solid CTA buttons, reduced border-radius on alert cards, uppercase tracking on labels.
- Gate: visual review across all 3 screens; risk indicators are high-contrast; CTAs are bold.

---

## 5. Gap-to-Task Mapping

| Gap | Closure Task | Phase | Depends On | Exit Evidence |
|-----|-------------|-------|------------|---------------|
| GAP-F1 | Trend timeline modal + role-gated navigation | 3 | GAP-F7 toast wiring | Nurse flow: modal opens; Admin flow: sidebar unchanged |
| GAP-F2 | LoadingSteps component | 1 | None | 6 steps animate during API fetch |
| GAP-F3 | Risk gauge size + color zones | 1 | None | Visual: dominant gauge on High-risk patient |
| GAP-F4 | Confidence score as numeric % | 1 | None | "XX% Confidence" renders in panel |
| GAP-F5 | PackageSealBadge + repeat at bottom | 1 | None | All 3 tiers show correct seal; bottom summary present |
| GAP-F6 | Add-ons: sort, single col, collapse, rationale | 1 | None | Sorted Red→Green; rationale on expand |
| GAP-F7 | Toast on critical signals → link to timeline | 1 | None (modal in Phase 3) | Toast appears; link placeholder resolves in Phase 3 |
| GAP-F8 | Timeline: datetime, visit grouping, sign badge | 2 | GAP-F12 datasource | Grouped events; bold datetime; sign badges |
| GAP-F9 | Graphs: abnormal dots, threshold label, current value | 2 | None | Red dots for out-of-range; threshold labeled |
| GAP-F10 | Audit log eye icons (in-memory reveal) | 2 | None | Admin sees icons; patient/user data revealed |
| GAP-F11 | UI tone: high-contrast, bold, tight | 3 | None | Visual review pass across all screens |
| GAP-F12 | Clinical sign datasource + evidence trace annotation | 2 | clinical-sign-definitions.ts | Reasoning trace items have sign badges |
| GAP-F13 | Admin: AI Gateway label, logo, remove Auth Config | 1 | None | Label changed; Auth Config absent |

---

## 6. Risks and Mitigations

1. **UX restructure breaks existing navigation tests (if any)**
   Mitigation: Role-gate all navigation changes; admin/DPO path must be smoke-tested before
   Phase 3 merge.

2. **Toast + modal wiring has a 2-phase dependency**
   Mitigation: In Phase 1, wire toast with a console.log or `alert()` placeholder for the
   modal link. Phase 3 replaces it with the real modal trigger.

3. **Clinical sign definitions may have edge cases or wrong reference ranges**
   Mitigation: Seed only well-established reference ranges from ADA, ACC/AHA, WHO that are
   already present in `clinicalConstants.ts`. Flag uncertain codes as "Unknown" sign rather
   than guess.

4. **AI inference fallback for sign classification adds latency**
   Mitigation: sessionStorage cache by signal ID. If cache miss rate is high, expand the
   static definitions map rather than relying on AI inference.

5. **UI tone overhaul affects many components; risk of regression**
   Mitigation: Phase 3 last. Apply changes incrementally starting with globals/Tailwind config,
   then verify each screen. No functional logic changes in this step.

6. **Audit log eye icon reveals PII in demo context**
   Mitigation: Popovers are role-gated; display "CONFIDENTIAL" badge; add tooltip "Demo only —
   de-anonymization in production requires DPO-signed access request."

---

## 7. Definition of Done

The feedbacks gap-closure effort is complete when:

- All Phase 1 gaps (GAP-F2, F3, F4, F5, F6, F7, F13) are closed with visual evidence.
- All Phase 2 gaps (GAP-F8, F9, F10, F12) are closed with functional evidence.
- Phase 3 gaps (GAP-F1, F11) are closed with end-to-end flow verification.
- The nurse/doctor single-entry flow is fully functional with modal sub-screens.
- Clinical sign definitions cover at least 10 common lab codes and produce correct badges
  for the reference patient (Somchai W. or equivalent demo patient).
- No regression in existing admin/DPO access monitoring functionality.

---

## 8. Closure Status (as of 2026-03-24)

| Gap | Status | Evidence |
|-----|--------|----------|
| GAP-F1 | Not started | — |
| GAP-F2 | Not started | — |
| GAP-F3 | Not started | — |
| GAP-F4 | Not started | — |
| GAP-F5 | Not started | — |
| GAP-F6 | Not started | — |
| GAP-F7 | Not started | — |
| GAP-F8 | Not started | — |
| GAP-F9 | Not started | — |
| GAP-F10 | Not started | — |
| GAP-F11 | Not started | — |
| GAP-F12 | Not started | — |
| GAP-F13 | Not started | — |
