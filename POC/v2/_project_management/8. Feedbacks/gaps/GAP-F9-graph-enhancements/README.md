# GAP-F9 — Graph Enhancements

**Title:** Highlight abnormal data points, prominent threshold line, current-value marker, and bold annotation chips
**Status:** Not started
**Phase:** 2 (clinical annotation)

---

## Objective

Improve the biomarker trend charts so that out-of-range data points are visually distinct,
the threshold reference line is clearly labeled, the current (most recent) value is highlighted,
and the existing annotation text (e.g., "All good: Current (109 mg/dL) < Reference") is rendered
as a prominent colored chip rather than plain gray text.

## Scope

1. **Abnormal data point highlight:** Custom Recharts dot renderer — out-of-range values
   render as a larger dot (radius 6) in red with a ring; normal values use default small dot.
2. **Threshold reference line:** Increase `strokeWidth` to 2, add a `label` on the line
   showing the threshold value and unit, use dashed amber or red styling.
3. **Current value highlight:** The last data point gets a special custom dot — larger filled
   circle with a label pin showing "Now: X [unit]".
4. **Annotation chip:** Replace plain gray annotation text with a colored chip:
   green background for "good" annotations, red background for "concern" annotations.

## Primary Files

- `POC/v2/frontend/src/components/trend-timeline/BiomarkerTrendGrid.tsx`
- `POC/v2/frontend/src/components/dashboard/BiomarkerCharts.tsx`
- `POC/v2/frontend/src/shared/clinicalConstants.ts` — threshold values (`BMI_TARGET`,
  `BP_SYSTOLIC_NORMAL`, etc.) already defined here — reuse these for out-of-range detection
- `POC/v2/frontend/src/components/charts/ChartTooltip.tsx` — custom tooltip (extend if needed)

## Design Decisions

- **Custom dot renderer in Recharts:** Use the `dot` prop on `<Line>` accepting a render
  function `(props) => <circle .../>`. Check value against reference range from
  `clinicalConstants.ts` — if outside range, increase radius and apply red fill.
- **Last data point identification:** `index === data.length - 1` in the dot renderer.
  Render a distinct pin shape (e.g., filled circle + short vertical line + label).
- **Reference line label:** Recharts `<ReferenceLine label={...}>` prop supports a custom
  label component — use it to render threshold value and unit inline on the line.
- **Annotation chip:** A `<div>` with `className="rounded-full px-3 py-1 text-xs font-bold
  bg-green-100 text-green-700"` (or red equivalent) replaces the current plain text annotation.

## Checkpoint Files

- `_discovery.md`
- `_development_summary.md`
- `_latest_test_results.md`

## Feedback Reference

`feedbacks.md` — "Graph: highlight datapoints that are abnormal or alarming"
`feedbacks.md` — "Graph: Highlight/annotate to make the threshold more prominent"
`feedbacks.md` — "Graph: Highlight the current value"
`feedbacks.md` — "Graph: Make more prominent the graph annotation"
