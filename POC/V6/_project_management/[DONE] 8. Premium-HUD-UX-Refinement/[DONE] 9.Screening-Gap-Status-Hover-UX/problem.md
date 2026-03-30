# Problem — Screening & Vaccination Gap Status: Hover-reveal UX

**Date:** 2026-03-24

---

## Current State

The `ScreeningGapStatus` component always rendered all fields for every gap item — title, status (overdue days), history (last performed date), and clinical notes — stacked vertically inside a card.

## Pain Points

1. **Excessive vertical space**: Each item occupied 4–5 lines of content by default. With 4–6 gap items, the section dominated the layout.
2. **Low information density**: The always-visible layout prioritized completeness over scannability. Physicians reviewing multiple patients need to quickly identify *which* gaps exist, not read every note line-by-line for each item.
3. **Inconsistent UX pattern**: The Strategic Add-ons section (Enhancement 12/14) already adopted a compact-by-default, detail-on-hover pattern. The Screening & Vaccination panel was the only major card list that hadn't been updated to match.
4. **Status column and note always shown**: The "Overdue: 14 days" and "Last: 2024-03-01" metadata is only needed when the physician decides to investigate a specific gap — not while scanning the full list.
