import React from "react";
import { render } from "@testing-library/react";

const yAxisSpy = vi.fn();

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  LineChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CartesianGrid: () => null,
  XAxis: () => null,
  YAxis: (props: unknown) => {
    yAxisSpy(props);
    return null;
  },
  Tooltip: () => null,
  ReferenceLine: () => null,
  Line: () => null,
}));

import { BiomarkerTrendGrid } from "./BiomarkerTrendGrid";
import { BiomarkerSeries } from "@/types/timeline";

describe("BiomarkerTrendGrid", () => {
  beforeEach(() => {
    yAxisSpy.mockClear();
  });

  it("uses y-axis domain around min/max values with margin", () => {
    const series: BiomarkerSeries[] = [
      {
        label: "FBS",
        loinc_code: "1558-6",
        unit: "mg/dL",
        trend_direction: "increasing",
        slope_per_year: 2.1,
        reference: 99,
        current: 108.4,
        history: [
          { date: "2024-08-15", value: 101.2 },
          { date: "2025-09-20", value: 104.8 },
          { date: "2026-03-15", value: 108.4 },
        ],
      },
    ];

    render(<BiomarkerTrendGrid series={series} />);

    const yAxisProps = yAxisSpy.mock.calls.at(-1)?.[0] as { domain?: [number, number] } | undefined;
    expect(yAxisProps?.domain).toEqual([98, 109.4]);
  });
});
