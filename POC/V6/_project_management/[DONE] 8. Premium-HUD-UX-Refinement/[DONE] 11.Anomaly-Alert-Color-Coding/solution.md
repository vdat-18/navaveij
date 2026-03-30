# Solution — Anomaly Alert Color Coding

**Date:** 2026-03-24

---

## Changes Implemented

- **Frame-based Severity**: Cards now use dynamic border and background tint based on severity.
  - Critical/Red: `border-red-500/40 bg-red-50/30`
  - High/Orange: `border-orange-500/40 bg-orange-50/30`
  - Medium/Yellow: `border-yellow-500/40 bg-yellow-50/30`
  - Low/Green: `border-green-500/40 bg-green-50/30`
- **Left Accent Bar**: An absolute-positioned vertical bar on the left edge for maximum visual signal even without reading text.
- **Label Removal**: Completely removed the severity text string (HIGH/MEDIUM) from the UI.
- **Typography & Layout**:
  - Enhanced title to `text-[13px] font-black`.
  - Compressed summary line to `text-[10px]`.
  - Added a pulsing red dot to the panel header for a "LIVE" security feed feeling.
- **Status Badge**: Added `{alerts.length} Active` badge to the panel header.

## Files Changed
- `frontend/src/components/access-monitoring/AnomalyAlertsPanel.tsx`
