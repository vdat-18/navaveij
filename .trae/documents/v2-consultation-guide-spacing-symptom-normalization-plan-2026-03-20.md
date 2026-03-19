# V2 Plan: Consultation Guide Spacing + Symptom Normalization

## Summary

* Investigate and fix formatting defects in the v2 Recommendation panel’s “Patient Consultation Guide” block:

  1. abnormal word spacing in **Clinical Conclusion**
  2. raw clinical signal tokens showing in **Core Health Insights**
  3. broken bullet segmentation in **Core Health Insights** (decimals/percentages split into separate bullets, markdown artifacts like stray `**`)

* Scope is limited to v2 frontend rendering and formatting (no API contract change required).

## Current State Analysis

* The affected UI is rendered in `POC/v2/frontend/src/components/dashboard/RecommendationPanel.tsx` under:

  * **Clinical Conclusion** at around line 550

  * **Core Health Insights** at around lines 556–565

* Root cause for weird spacing:

  * Clinical Conclusion paragraph uses `text-justify` with a narrow content column and heavy styling (`font-black italic`), which creates visibly stretched inter-word spacing.

* Root cause for raw symptom text:

  * `renderBoldText` relies on exact key replacement from `CLINICAL_DICTIONARY`.

  * Several incoming identifiers in screenshot-like output (e.g. `bp_stage2_htn`, `family_hx_premature_cad`, `lung_ct_threshold_met`) are not fully covered by dictionary mappings, so raw snake\_case tokens pass through.

  * `health_summary` sentence segmentation currently uses `split('.')`, which is brittle and can preserve awkward fragments.

* Root cause for poor Core Health Insights formatting (new screenshot evidence):

  * Decimal/percentage values (`115.8`, `6.3`, `8.9`) are split by naive period-based segmentation into orphan bullets (`8 mg/dL`, `3%)`, etc.).

  * Existing markdown cleanup does not fully protect against malformed bold markers around numeric ranges, causing stray `**` in displayed text.

* Supporting files identified:

  * `POC/v2/frontend/src/shared/clinical-dictionary.ts`

  * `POC/v2/frontend/src/components/dashboard/RecommendationPanel.test.tsx`

  * (reference pattern) `POC/v3/frontend/src/components/dashboard/RecommendationPanel.tsx` already uses improved sentence splitting.

## Proposed Changes

### 1) Fix Clinical Conclusion spacing behavior

* **File:** `POC/v2/frontend/src/components/dashboard/RecommendationPanel.tsx`

* **What:** Replace `text-justify` with left-aligned flow for the Clinical Conclusion paragraph.

* **Why:** Prevent forced spacing expansion between words in constrained width blocks.

* **How:**

  * Update class list on Clinical Conclusion `<p>` to use `text-left` (or omit justify class entirely).

  * Keep typography hierarchy (color/weight/italic) unchanged unless needed for readability parity.

### 2) Normalize raw symptom identifiers in consultation text

* **Files:**

  * `POC/v2/frontend/src/shared/clinical-dictionary.ts`

  * `POC/v2/frontend/src/components/dashboard/RecommendationPanel.tsx`

* **What:** Ensure snake\_case clinical identifiers render as clinician-friendly labels.

* **Why:** Prevent raw backend identifiers from leaking into physician-facing copy.

* **How:**

  * Add missing high-frequency mappings observed in current content (including stage2 HTN and notable risk terms).

  * Strengthen text normalization in `renderBoldText` by handling unknown snake\_case identifiers with a safe fallback transformation (humanized title-case) when dictionary misses occur.

  * Keep existing bold-markup parsing behavior intact.

### 3) Harden sentence parsing in Core Health Insights

* **File:** `POC/v2/frontend/src/components/dashboard/RecommendationPanel.tsx`

* **What:** Replace naive `split('.')` with robust split logic similar to v3 pattern.

* **Why:** Avoid malformed bullets and preserve sentence integrity when content contains list markers or non-trivial punctuation.

* **How:**

  * Introduce regex-based segmentation that avoids splitting decimal-like/percentage content and supports hyphen/bullet source formats.

  * Trim leading list artifacts (`-`, `*`, `1.`, `2)`) before rendering.

  * Preserve terminal punctuation consistently.

  * Drop tiny orphan fragments produced by malformed model output (e.g., one-token numeric remnants).

### 4) Harden markdown artifact cleanup for consultation text

* **File:** `POC/v2/frontend/src/components/dashboard/RecommendationPanel.tsx`

* **What:** Improve normalization around malformed emphasis tokens in `renderBoldText`.

* **Why:** Prevent visible stray `**` and mid-sentence formatting breaks in clinician-facing bullets.

* **How:**

  * Normalize unmatched or fragmented asterisk pairs before final split-render pass.

  * Preserve intended bolded phrases without exposing raw markdown tokens.

### 5) Add focused regression coverage

* **File:** `POC/v2/frontend/src/components/dashboard/RecommendationPanel.test.tsx`

* **What:** Extend tests for consultation-guide text quality.

* **Why:** Lock fixes and prevent regression in spacing/normalization behavior.

* **How:**

  * Add a case where `health_summary` includes raw identifiers and assert rendered output uses human-readable labels.

  * Add a case where decimal and percentage values remain in the same bullet sentence.

  * Add a case that malformed markdown emphasis does not render literal `**`.

  * Add class-level assertion that Clinical Conclusion no longer uses justified text.

## Assumptions & Decisions

* Decision: fix is frontend-only; backend response schema remains unchanged.

* Decision: reuse the v3 splitting approach as the nearest proven implementation pattern.

* Assumption: preserving current visual style is preferred; only problematic spacing/formatting behavior is corrected.

* Assumption: dictionary-plus-fallback transformation is acceptable for physician-facing readability.

## Verification Steps

* Run targeted frontend tests:

  * `npm run test -- src/components/dashboard/RecommendationPanel.test.tsx`

* Perform diagnostics check for TypeScript/test issues in modified files.

* Manual UI validation against screenshot symptom:

  * Clinical Conclusion text should read naturally without stretched inter-word gaps.

  * Core Health Insights should not display raw snake\_case symptom tokens.

  * Bullet segmentation should remain coherent for multi-sentence health summaries.

  * Decimal and percentage values should stay intact inside their parent sentence bullets.

  * No literal markdown artifacts (`**`) should appear in rendered consultation text.

