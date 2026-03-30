# Round 1 — Additional UI Requests (V4 → V6 Cherry-pick)

## Goal
Cherry-pick superior V4 UI elements into V6 while keeping V6's backend architecture. The user reviewed both UIs side-by-side and identified 6 targeted improvements.

## Steps

### 6a — Remove "Analysis Synced" TrendToast pop-up
**File:** `frontend/src/components/dashboard/RecommendationPanel.tsx`

Delete the floating bottom-right toast notification ("Analysis Synced — Historical trends are now available"). User finds it disruptive.

### 6b — Summary Cards: V4 layout (Tier + Add-ons, no pricing card)
**File:** `frontend/src/components/dashboard/RecommendationPanel.tsx`

Restructure the summary HUD from 4-column (3+2+2+5) to 3-column (3+3+6):
- Keep V6's risk-o-meter gauge
- Adopt V4's wider tier card with "Safety Verified" badge
- Remove separate pricing card (moves to Strategy Execution)
- Simplify add-ons display: no checkboxes or prices, just priority badge + label

Rename "Strategic Add-ons" → "Medical Screening Add-ons" (already done).

### 6c — Clinical Logic Card: Add Transparency Metric & Confidence Indicator
**Files:** `backend/src/api/routes/contracts.py`, `frontend/src/types/recommendation.ts`, `frontend/src/components/dashboard/RecommendationPanel.tsx`

Expose `signal_coverage`, `data_completeness`, `rule_agreement` from backend (already computed, just not in response). Add V4's "Confidence Indicator: XX.X%" display and hover tooltip showing 3 weighted transparency metrics.

### 6d — Signal Section: Migrate V4 layout
**File:** `frontend/src/components/dashboard/RecommendationPanel.tsx`

Replace Execution Notes + Reject/Close with V4's inline "Analysis Synced" card + "View Clinical Timeline" button. Move execution controls to Strategy Execution.

### 6e — Patient Consultation: Remove Strategy Summary
**File:** `frontend/src/components/dashboard/RecommendationPanel.tsx`

Remove the "Strategy Summary" pricing card from the right column. This moves to Strategy Execution.

### 6f — Add Strategy Execution Section (NEW)
**File:** `frontend/src/components/dashboard/RecommendationPanel.tsx`

Port V4's "Strategy Execution" section with:
- Billing Resolution (dark card): base plan, add-on checkboxes, discounts, final settlement
- Final Review: validation checklist, clinical justification, reject/confirm buttons

## Acceptance Criteria
- [ ] No "Analysis Synced" toast in bottom-right corner
- [ ] Summary HUD: 3-column layout (Risk gauge | Tier with Safety Verified | Add-ons without prices)
- [ ] Clinical Logic: "AI Verified" badge + "Confidence Indicator: XX.X%" + Transparency Metric tooltip
- [ ] Signal section: Critical Signals (left) + "View Clinical Timeline" CTA (right)
- [ ] Patient Consultation: NO Strategy Summary card
- [ ] New Strategy Execution section with Billing Resolution + Final Review
- [ ] PromotionDrawer opens from "Privileges" button in Strategy Execution
- [ ] `npm run build` exits 0
- [ ] Backend pytest passes
