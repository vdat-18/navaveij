# Discovery — GAP-F6

**Status:** Complete (pre-implementation analysis)

## Current State

- Add-ons are displayed as pills/badges, likely in a multi-column grid layout.
- The `rationale` field exists on `RecommendationAddOn` (confirmed in types and BAML schema)
  but is **not currently displayed** in the UI.
- `trigger_signals_matched[]`, `category`, `product_code`, `price_thb` are also in the type
  but not all are surfaced.
- Add-ons are not sorted by priority — the order is as returned by the API.
- No collapsible/accordion structure exists.

## What Needs to Change

- **Sort:** Sort `add_ons[]` by `priority_level` descending: Red → Orange → Yellow → Green.
  Priority mapping: Red = 1, Orange = 2, Yellow = 3, Green = 4.
- **Single column:** Replace multi-column pill grid with a vertical list.
- **Collapsible by category:** Group by `category` field using an accordion. Each group
  header shows category name + item count + highest priority badge in the group.
- **Detail expand per row:** Each row collapses by default (shows priority badge + label +
  price). Clicking expands an inline detail card showing `rationale`, `trigger_signals_matched`,
  `category`, `product_code`.

## No Backend Changes Needed

All required fields (`rationale`, `priority_level`, `category`, `trigger_signals_matched`,
`price_thb`) are already present in the `RecommendationAddOn` type and the API response.
This is a pure UI restructuring change.

## Risk Flags

- If some add-ons have a null/undefined `category`, the grouping must handle ungrouped
  items gracefully (e.g., an "Other" catch-all group).
- Sorting by priority requires a consistent string → number mapping. Define this as a
  const in the component to avoid magic strings.
