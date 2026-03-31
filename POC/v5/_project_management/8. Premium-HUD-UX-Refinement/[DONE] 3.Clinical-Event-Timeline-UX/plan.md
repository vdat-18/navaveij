# Plan — Clinical Event Timeline UX

**Date:** 2026-03-23

---

## Strategy

1. **Transform Data Structure:**
    - Parse the incoming payload and map the events to a consistent interface (e.g., `TimelineRow`).
    - *Crucial Step:* Group the unified array of `TimelineRow` objects by the date string (e.g., `YYYY-MM-DD`).
    - The output data structure should be an object (or Map) like:
      ```ts
      {
        "2023-10-15": [ event1, event2, event3 ],
        "2023-01-05": [ event4 ],
        "2022-09-20": [ event5, event6 ]
      }
      ```
    - Sort the keys (dates) in descending order (newest first).

2. **Refine UI Layout:**
    - Iterate over the grouped object keys (the dates).
    - For each date group, render a **prominent date header**.
    - Underneath the date header, render the list of events that occurred on that day as individual cards or list items. This creates a nested structure that implies a single "visit" or "check-up".

3. **Incorporate Visual Badges:**
    - Examine the metadata available in each event type.
    - **Labs:** If `interpretation` is not "Normal" or `threshold_crossed` exists, render a distinct warning badge (e.g., "High", "Low") in red or orange.
    - **Diagnoses:** Render `clinical_status` (e.g., "active", "resolved") and `severity`.
    - **Medications:** Render `action` (e.g., "started", "stopped").
    - Use clear, consistent colors for badges across event types.

## Implementation Steps

1.  Update `POC/v4/frontend/src/components/trend-timeline/ClinicalEventTimeline.tsx`.
2.  Refactor the component's internal state mapping to group by `row.date`.
3.  Rewrite the render loop to iterate over groups (`Object.entries(groupedData)`).
4.  Implement a `renderSeverityBadge` helper function to generate the visual cues based on row properties.
5.  Apply Tailwind CSS styling for the new layout (date headers, grouping borders, badge colors).