import React from "react";
import { render, screen } from "@testing-library/react";

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  LineChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CartesianGrid: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
  ReferenceLine: () => null,
  Line: () => null,
}));

import { BiomarkerTrendGrid } from "./BiomarkerTrendGrid";
import { BiomarkerSeries } from "@/types/timeline";

describe("BiomarkerTrendGrid severity rules", () => {
  it("renders Optimal when backend severity is normal", () => {
    const series: BiomarkerSeries[] = [
      {
        metric_id: "egfr",
        label: "eGFR",
        loinc_code: "62238-1",
        unit: "mL/min/1.73m2",
        trend_direction: "stable",
        slope_per_year: -0.5,
        reference: 60,
        current: 97,
        current_severity: "normal",
        history: [
          { date: "2024-08-01", value: 99 },
          { date: "2026-02-20", value: 97 },
        ],
      },
    ];

    render(<BiomarkerTrendGrid series={series} />);

    expect(screen.getByText(/Status: Optimal/i)).toBeInTheDocument();
  });
});
