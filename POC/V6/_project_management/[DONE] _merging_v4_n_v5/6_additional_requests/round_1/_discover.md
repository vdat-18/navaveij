# Discover — Round 1: Additional UI Requests

## V4 vs V6 Side-by-Side Comparison

### 1. "Analysis Synced" Pop-up
- **V6:** Floating `TrendToast` component (bottom-right, z-100) with bounce animation, "View Timeline" link + "Dismiss" button. Renders via `showTrendToast` state.
- **V4:** No floating toast. Has an inline "Analysis Synced" card placed within the signal section layout next to Critical Signals.
- **Decision:** Delete V6's floating toast. Port V4's inline placement to signal section.

### 2. Summary Cards HUD
- **V6 layout:** 4-column grid (3+2+2+5 = 12 cols)
  - col-3: Risk gauge + confidence % + Risk Summary popover
  - col-2: Tier seal + plan name + add-on count
  - col-2: Total Investment pricing card (price, savings, deals button, urgency)
  - col-5: Medical Screening Add-ons (checkboxes, prices, priority badges, rationale hover)
- **V4 layout:** 3-column grid (3+3+6 = 12 cols)
  - col-3: Risk gauge only
  - col-3: Tier seal + plan name + "Strategic Trace" subtitle + "Safety Verified" badge
  - col-6: Strategic Add-ons (priority badge + label, rationale hover, no prices/checkboxes)
- **Decision:** Adopt V4's 3-column layout. Keep V6's risk gauge (which has confidence %). Move pricing to Strategy Execution. Already renamed to "Medical Screening Add-ons".

### 3. Clinical Logic & Rationale
- **V6:** Title + "Physician Evidence Stream" subtitle + "Trace Active" badge. No confidence indicator or transparency metrics.
- **V4:** Same title + subtitle, PLUS:
  - "AI Verified" / "Discretion Advised" confidence badge
  - "Confidence Indicator: XX.X%" with Binary icon, large teal number
  - Hover tooltip: "Transparency Metric" table with 3 weighted metrics (Signal Coverage 40%, Data Completeness 40%, Rule Agreement 20%)
- **Backend gap:** V6 backend computes `signal_coverage`, `data_completeness`, `rule_agreement` (contracts.py:614-636) but does NOT include them in the response dict. Simple fix: add 3 fields to `RecommendResponse` + return dict.
- **Decision:** Port V4's confidence indicator and transparency metric tooltip. Add 3 fields to backend response.

### 4. Signal Section
- **V6:** `lg:col-span-12` row with Critical Signals (left 1/3) + Execution Notes textarea + Reject/Close buttons (right 2/3)
- **V4:** Same row with Critical Signals (left 1/3) + inline "Analysis Synced" card + "View Clinical Timeline" button (right 2/3)
- **Decision:** Replace V6's execution controls with V4's clinical timeline CTA. Move execution controls to Strategy Execution.

### 5. Patient Consultation
- **V6:** Two-column layout. Right column ends with "Strategy Summary" dark card (pricing + "Confirm Strategic Selection" button)
- **V4:** Same two-column layout. Right column ends with empty spacer (strategy execution is its own section below)
- **Decision:** Remove Strategy Summary from consultation. Pricing/CTA moves to Strategy Execution.

### 6. Strategy Execution
- **V6:** Does not exist as a standalone section. Execution controls scattered in signal section; pricing in summary HUD and consultation.
- **V4:** Full standalone section with:
  - Left (7/12): "Billing Resolution" dark card — base plan, add-on toggles, discounts, "Privileges" button, final settlement with VAT
  - Right (5/12): "Final Review" — "Medical Resolved" badge, validation checklist, clinical justification textarea, reject/confirm buttons
- **Decision:** Port V4's Strategy Execution section to V6. Adapt to V6's data model (PromotionSummary instead of V4's DiscountBreakdown[]).

## Type/Prop Gaps
- `Binary` icon needed in `RecommendationPanel.tsx` (for confidence indicator)
- `signal_coverage`, `data_completeness`, `rule_agreement` needed in `RecommendationResponse` type
- `Tag` icon may be needed for Privileges button (check V4 usage)
- No new props needed for `RecommendationPanel` — all data (`selectedAddOns`, `handleApprove`, `handleReject`, etc.) already exists within the component
