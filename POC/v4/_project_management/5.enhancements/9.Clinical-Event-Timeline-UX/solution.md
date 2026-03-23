# Solution — Clinical Event Timeline UX

**Date:** 2026-03-23

---

## Technical Solution

### The `groupByDate` Logic
A new grouping function transforms the flat array of event rows into a structured dictionary. This step allows the UI to iterate over "dates" rather than "events".

```tsx
// 1. Map data to rows
const allRows: TimelineRow[] = [
  // ... map diagnoses, labs, screenings, medications
];

// 2. Sort all rows first (descending by date string)
allRows.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

// 3. Group by date
const groupedByDate: Record<string, TimelineRow[]> = {};
allRows.forEach(row => {
  if (!groupedByDate[row.date]) {
    groupedByDate[row.date] = [];
  }
  groupedByDate[row.date].push(row);
});
```

### The Render Loop
The render layout was refactored. The outermost iteration is over `Object.keys(groupedByDate)`.

```tsx
<div className="space-y-6"> {/* Increased spacing between dates */}
  {Object.keys(groupedByDate).map(dateString => (
    <div key={dateString} className="mb-6">
      {/* 1. Prominent Date Header */}
      <div className="font-bold text-lg mb-2 text-slate-800 border-b pb-1">
        {formatDate(dateString)}
      </div>

      {/* 2. Grouped Events Container */}
      <div className="space-y-3 pl-4 border-l-2 border-slate-200">
        {groupedByDate[dateString].map((row, idx) => (
          <div key={idx} className="bg-white p-3 rounded shadow-sm border">
            {/* Event content, Type Icon, Title, Detail */}
            <div className="flex justify-between items-start">
              <div>
                <span className="font-medium text-slate-700">{row.title}</span>
                <span className="text-sm text-slate-500 ml-2">{row.type}</span>
              </div>
              {/* 3. Visual Badge */}
              <Badge severity={row.badgeSeverity}>{row.badgeLabel}</Badge>
            </div>
            <p className="text-sm mt-1">{row.detail}</p>
          </div>
        ))}
      </div>
    </div>
  ))}
</div>
```

### Severity Inference
The mapping logic was updated to calculate a `badgeLabel` and `badgeSeverity` for each row based on its underlying source data.

*   **Lab:** Evaluated `row.source.interpretation` ("Normal", "High", "Low", "Abnormal"). Assigned a red/orange badge for non-normal values.
*   **Diagnosis:** Displayed `clinical_status` ("active" = yellow/red, "resolved" = green/gray).
*   **Medication:** Displayed `action` ("started", "stopped").