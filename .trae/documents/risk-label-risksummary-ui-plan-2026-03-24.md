# Plan — Replace “Active Monitoring” with Dynamic Risk Label + Risk Summary Hover

## Summary

Refine the risk gauge header area so the label is no longer generic (“Active Monitoring”), and instead shows a **dynamic risk-level label** (Low/Medium/High/Critical Risk Level) with matching color treatment.  
Keep the question/help icon, but explicitly tie its hover text to `risk_summary` so the new backend field is visibly used in the UI.

## Current State Analysis

- In [RecommendationPanel.tsx](file:///Users/nguyen.tran/Documents/GitHub/navavej/navaveij/POC/v2/frontend/src/components/dashboard/RecommendationPanel.tsx#L392-L406):
  - The header line still shows static text: `Active Monitoring`.
  - The help icon already exists and currently uses `riskTooltipText` sourced from `risk_summary.description` fallback text.
  - `isRiskFallback` is used to render a “Fallback Risk Data” badge.
- `overall_risk_level` is already used to render the gauge itself:
  - [RecommendationPanel.tsx](file:///Users/nguyen.tran/Documents/GitHub/navavej/navaveij/POC/v2/frontend/src/components/dashboard/RecommendationPanel.tsx#L390-L390)
- Tests currently validate fallback badge and tooltip metadata, but not the specific dynamic risk label wording/color behavior:
  - [RecommendationPanel.test.tsx](file:///Users/nguyen.tran/Documents/GitHub/navavej/navaveij/POC/v2/frontend/src/components/dashboard/RecommendationPanel.test.tsx)

## Proposed Changes

### 1) Replace static header text with dynamic risk label

**File**
- `POC/v2/frontend/src/components/dashboard/RecommendationPanel.tsx`

**What**
- Replace `Active Monitoring` with dynamic text based on `data.overall_risk_level`:
  - `Low Risk Level`
  - `Medium Risk Level`
  - `High Risk Level`
  - `Critical Risk Level`
- Apply label color by level (green/yellow/orange/red) instead of fixed teal.

**How**
- Add small local mapping helpers in `RecommendationPanel` render scope:
  - `riskLevelLabel`
  - `riskLevelClassName`
- Use these mapped values in the current header line (where “Active Monitoring” is rendered).

**Why**
- Matches your intent for at-a-glance readability and makes the label consistent with actual gauge data.

### 2) Make risk summary usage explicit on hover icon

**File**
- `POC/v2/frontend/src/components/dashboard/RecommendationPanel.tsx`

**What**
- Keep the question/help icon.
- Ensure hover title text prioritizes `risk_summary.description` and can include concise provenance context when available (e.g., source/fallback).

**How**
- Expand `riskTooltipText` construction using:
  - `data.risk_summary?.description`
  - optional source/fallback suffix when `is_fallback` is true
- Keep it lightweight via existing `title` attribute to avoid adding new UI dependencies.

**Why**
- This directly makes `risk_summary` visible/usable in the interaction you called out.

### 3) Update tests for new label behavior

**File**
- `POC/v2/frontend/src/components/dashboard/RecommendationPanel.test.tsx`

**What**
- Add/adjust assertions to verify:
  - dynamic risk-level label text renders (not “Active Monitoring”)
  - hover anchor title still reflects risk summary text
  - fallback badge behavior remains intact

**How**
- Extend the existing risk/fallback test blocks with text assertions for one or more levels.

**Why**
- Locks behavior so this doesn’t regress in future UI edits.

## Assumptions & Decisions

- Confirmed decision: dynamic label (not fixed “High Risk Level”).
- Scope is frontend-only for this follow-up; backend `risk_summary` and `overall_risk_level` contract fields are already present from the prior pass.
- No new component libraries required; existing icon + title tooltip pattern is sufficient.

## Verification Steps

1. Run targeted dashboard tests:
   - `npm run test -- src/components/dashboard/RecommendationPanel.test.tsx`
2. Run targeted lint on touched file(s):
   - `npx eslint src/components/dashboard/RecommendationPanel.tsx src/components/dashboard/RecommendationPanel.test.tsx`
3. Manual smoke check in dashboard:
   - Confirm label changes by risk level and color.
   - Confirm help icon hover text includes risk summary description.
   - Confirm fallback badge still appears only when `risk_summary.is_fallback === true`.
