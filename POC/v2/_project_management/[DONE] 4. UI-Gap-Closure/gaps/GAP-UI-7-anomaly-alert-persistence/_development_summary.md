# GAP-UI-7 Development Summary

## Status: Complete

### Implementation Details
- Checked the backend API schema and verified that no `PATCH` or `POST` endpoint exists for updating anomaly alert statuses in this POC version.
- Updated `AnomalyAlertsPanel.tsx` to explicitly disable the "Acknowledge" and "Resolve" buttons.
- Added a tooltip (`title`) to the disabled buttons explaining that "Persistence not yet supported in this POC version" to prevent user confusion.
- Removed the local React state updates that falsely implied the action was successful without making an API call.

### Files Modified
- `POC/v2/frontend/src/components/access-monitoring/AnomalyAlertsPanel.tsx`