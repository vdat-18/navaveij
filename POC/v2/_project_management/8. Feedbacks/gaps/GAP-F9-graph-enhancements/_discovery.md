# Discovery — GAP-F9

**Status:** Complete (pre-implementation analysis)

## Current State

- `BiomarkerTrendGrid.tsx` renders a 2-column grid of biomarker trend charts using Recharts `LineChart`.
- `BiomarkerCharts.tsx` renders Blood Pressure (SBP + DBP) and BMI charts using `LineChart`
  and `AreaChart`.
- A `ReferenceLine` component is used for threshold lines — but it appears thin and
  without a visible value label.
- Data points use the default Recharts dot (small, same color as line).
- Annotation text (e.g., "All good: Current (109 mg/dL) < Reference") appears to be plain
  gray text below or beside the chart.
- `clinicalConstants.ts` has `BMI_TARGET`, `BP_SYSTOLIC_NORMAL` — confirmed usable for
  threshold reference.
- `chartConfig.ts` has default chart styling — check if it centralizes dot config.

## What Needs to Change

1. **Custom dot renderer:** Use Recharts `dot` prop on `<Line>` as a render function.
   Compare each data point value against its threshold. If outside range: render a larger
   red dot (radius 6) with a stroke ring. If within range: default small dot.

2. **Current value highlight:** Identify `index === data.length - 1`. Render a distinct
   custom dot (larger filled circle) with a label showing "Now: X unit".

3. **Reference line:** Increase `strokeWidth` on `<ReferenceLine>`. Add a `<Label>` child
   inside `<ReferenceLine>` showing the threshold value and unit. Use dashed amber/red stroke.

4. **Annotation chip:** Locate the annotation text rendering in both files.
   Replace with a `<span className="rounded-full px-3 py-1 text-xs font-bold ...">` chip
   with green background for "good" and red background for "concern".

## Recharts API Notes

- `<Line dot={(props) => <CustomDot {...props} />}` — supports full custom dot rendering.
- `<ReferenceLine strokeDasharray="4 2"><Label value="..." /></ReferenceLine>` — label
  support confirmed in Recharts docs.
- Last data point detection: `props.index === props.points.length - 1` inside dot renderer.

## Risk Flags

- The custom dot renderer must handle cases where `data` is empty or has a single point.
- `BiomarkerTrendGrid` may render many charts simultaneously — the custom dot renderer
  should be lightweight (no async operations inside it).
