# Context — Clinical Event Timeline UX Improvements

**Date:** 2026-03-23

---

## Background

The "Trend & Timeline" dashboard features a `ClinicalEventTimeline` component which displays a chronological list of a patient's historical medical events (diagnoses, lab results, screenings, and medications).

This component aggregates data from four different arrays in the `TimelinePayload` schema from the backend:
- `diagnoses`
- `significant_lab_events`
- `screening_procedure_history`
- `medication_changes`

## The UX Issue

Previously, the timeline was a simple, flat list of cards. Each card represented a single event.

The design had three main user experience issues for physicians trying to quickly review a patient's history:
1. **Hidden Dates:** The date of the event was rendered in small text on the far right side of each card, making it difficult to scan the timeline chronologically.
2. **Scattered Check-ups:** When a patient had a single check-up visit that resulted in 5 lab tests and 1 screening, those 6 events were rendered as 6 separate cards. There was no visual grouping to indicate they occurred on the same day.
3. **No Visual Severity Indicators:** A doctor had to read the text of every lab result (e.g., "12.5 g/dL") and mentally compare it to reference ranges to know if it was a good or bad sign. There were no visual cues (colors, icons) to draw the eye to abnormal results.

## Objective

Redesign the `ClinicalEventTimeline` component to:
1. Make datetimes more prominent.
2. Group related test results by check-up event (date).
3. Add visual severity annotations (good sign vs bad sign) to each result.