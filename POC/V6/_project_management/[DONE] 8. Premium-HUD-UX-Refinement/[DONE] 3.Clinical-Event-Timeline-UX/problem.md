# Problem — Clinical Event Timeline UX

**Date:** 2026-03-23

---

## Current State

The `ClinicalEventTimeline` component iterates over the backend timeline payload and constructs a flat array of `timelineRows`.

```tsx
// Previous flat list structure
<div className="space-y-3">
  {rows.map((row) => (
    <div className="border p-3">
       <span className="text-[10px]">{row.type}</span>
       <span className="text-[10px] right-aligned">{row.date}</span>
       <p>{row.title}</p>
       <p>{row.detail}</p>
    </div>
  ))}
</div>
```

## Pain Points

1. **Information Hierarchy Failure:** The most critical piece of context for a historical event is *when* it happened. Rendering the date in `10px` font on the right side made it visually subordinate to the event type and title.
2. **Cognitive Load (Grouping):** A standard annual check-up generates many data points (CBC, Lipid Panel, Blood Pressure, Mammogram). In a flat list sorted by date, these items appear adjacent but disconnected. The doctor has to manually realize they all share the exact same date string to infer they represent a single "visit".
3. **Cognitive Load (Analysis):** The timeline data from the backend contains rich interpretive data (`interpretation: "High"`, `threshold_crossed: "above_high"`, `clinical_status: "active"`). However, the UI ignored this metadata and only rendered the raw string values (`detail: "12.5 g/dL"`). The doctor had to evaluate every row manually instead of being able to instantly scan for "red flags".