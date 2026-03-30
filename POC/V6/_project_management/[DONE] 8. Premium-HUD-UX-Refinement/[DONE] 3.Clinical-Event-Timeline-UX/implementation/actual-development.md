# Implementation Notes — Clinical Event Timeline UX

**Date:** 2026-03-23

---

## Technical Debt / Known Issues

*   **Date Parsing:** The backend currently sends ISO 8601 strings (e.g., `"2023-10-15T00:00:00"`). We are doing a simple `.substring(0, 10)` or naive date parsing to group. This may cause timezone-related drift if the patient data spans multiple timezones.
*   **Missing Severity Data:** The backend does not always populate `interpretation` for older, un-analyzed lab results. In these cases, the badge defaults to gray/neutral instead of actively analyzing the result on the frontend.
*   **Virtualization:** If a patient's history contains hundreds of events, this fully-rendered DOM list will cause a performance bottleneck. Consider adding a virtualized list library (like `react-window`) in a future enhancement.

## Future Enhancements

*   **Filter/Search Toolbar:** A toolbar above the timeline to let the physician filter by "Labs Only", "Medications Only", or text search for a specific diagnosis.
*   **Chart Integration:** If the user clicks on a lab result card (e.g., "Hemoglobin"), the UI should instantly expand a mini sparkline chart showing the historical trend of that specific biomarker over the previous 5 years.
*   **Expandable Details:** The "detail" string is currently truncated. Add an "Expand" button to show the full physician notes or laboratory comments for each event.