# Development Summary — Round 1: Additional UI Requests

## What was done

### 6a — Removed "Analysis Synced" TrendToast
Deleted the `TrendToast` component (floating bottom-right notification), its `showTrendToast` state variable, and all setter calls from `RecommendationPanel.tsx`. Removed ~30 lines of dead code.

### 6b — Summary HUD restructured to V4 layout
Changed grid from 4-column (3+2+2+5) to 3-column (3+3+6):
- **Tier card** widened from `col-span-2` to `col-span-3`. Added V4's "Strategic Trace" subtitle, horizontal separator, decorative blurs, and "Safety Verified" frosted pill badge with `ShieldCheck` icon. Removed `+ X/Y select add-ons` count text.
- **Pricing card removed entirely**. The Total Investment, savings badge, deals button, and urgency messages previously shown here now live in the Strategy Execution section.
- **Add-ons** widened from `col-span-5` to `col-span-6`. Switched from V6's compact checkbox+price list to V4's card-style layout: bordered rounded cards, color dot + label on left, priority pill badge on right. Removed checkboxes, price columns, and promotion labels. Kept hover-reveal "Clinical Rationale" box.

### 6c — Transparency Metric & Confidence Indicator
**Backend:** Added `signal_coverage`, `data_completeness`, `rule_agreement` (all `float`, default `0.0`) to `RecommendResponse` Pydantic model and the return dict in `contracts.py`. These were already computed (lines 614–636) but never exposed.

**Frontend types:** Added 3 optional `number` fields to `RecommendationResponse` in `recommendation.ts`.

**Frontend UI:** Replaced the plain "Physician Evidence Stream" subtitle with V4's rich header:
- "AI Verified" (emerald, High confidence) or "Discretion Advised" (amber, Medium confidence) badge next to title
- "Confidence Indicator: XX.X%" with large teal number and `Binary` icon
- Hover tooltip showing "Transparency Metric" table: Signal Coverage (40%), Data Completeness (40%), Rule Agreement (20%), with "Determined by XAI Pipeline Integrity" footer

Added `Binary`, `AlertCircle`, `Tag` to lucide-react imports.

### 6d — Signal section migrated to V4 layout
Replaced the "Execution Notes" textarea + Reject/Close buttons block with V4's inline "Analysis Synced" card:
- Centered `BarChart3` icon + "Analysis Synced" title with `Sparkles` icon
- "Historical trends are now available" subtitle
- "View Clinical Timeline" button linking to `/trend-timeline`

The execution controls (textarea, reject, approve) moved to Strategy Execution section (6f).

### 6e — Strategy Summary removed from Patient Consultation
Deleted the "Strategy Summary" dark card (pricing info + "Confirm Strategic Selection" CTA) from the right column of Patient Consultation. Also removed the now-unused `scrollToHUD` function.

### 6f — Strategy Execution section added
Ported V4's full "Strategy Execution — Finalize & Approve" section as a new card after Patient Consultation:

**Left column (7/12) — Billing Resolution** (dark card):
- Base plan line item with `Package` icon, name, price
- Add-on items with checkboxes for selection/deselection, showing `promo_price_thb ?? price_thb`
- Applied discounts from `promotion_summary.active_promotions` with amber styling
- "Privileges" button (`Tag` icon) opening the `PromotionDrawer`
- Final Settlement: strikethrough original price, emerald savings, large 5xl final price, "Inclusive of VAT 7%"

**Right column (5/12) — Final Review**:
- "Medical Resolved" badge with pulse dot
- Validation Checklist: Medical Justification + Financial Compliance
- Clinical Justification textarea (moved from signal section)
- Reject (red) + Confirm Strategy (teal) buttons using existing `handleApprove`/`handleReject` handlers
- Post-decision locked state with "Strategy Approved" / "Rejected" display

## Files modified

| File | Lines changed |
|------|---------------|
| `backend/src/api/routes/contracts.py` | +6 (3 model fields + 3 dict entries) |
| `frontend/src/types/recommendation.ts` | +3 (optional fields) |
| `frontend/src/components/dashboard/RecommendationPanel.tsx` | ~300 net (removed ~200 old, added ~500 new) |

## Deviations from plan
- **"View Clinical Timeline" uses `Link` instead of callback**: The `RecommendationPanel` doesn't receive an `onOpenTimeline` prop. Rather than adding a new prop just for this, we used a `Link` to `/trend-timeline` (same destination the deleted TrendToast used). This is simpler and doesn't require changes to `page.tsx`.
