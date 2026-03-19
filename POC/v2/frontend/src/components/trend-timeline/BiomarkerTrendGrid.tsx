"use client";

import React from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ChartTooltip } from "@/components/charts/ChartTooltip";
import { defaultCartesianGrid, defaultXAxisProps, defaultYAxisProps } from "@/components/charts/chartConfig";
import { BiomarkerSeries } from "@/types/timeline";

interface BiomarkerTrendGridProps {
  series: BiomarkerSeries[];
}

export function BiomarkerTrendGrid({ series }: BiomarkerTrendGridProps) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
      {series.map((item) => (
        <div key={`${item.label}-${item.loinc_code}`} className="navavej-card bg-white p-5">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h4 className="text-[11px] font-black text-navavej-gray-dark uppercase tracking-widest">{item.label}</h4>
              <p className="text-[10px] font-bold text-navavej-gray-med mt-1">LOINC {item.loinc_code}</p>
            </div>
            <span className="text-[9px] font-black text-navavej-teal uppercase">{item.trend_direction}</span>
          </div>
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={item.history}>
                <CartesianGrid {...defaultCartesianGrid} />
                <XAxis dataKey="date" {...defaultXAxisProps} />
                <YAxis {...defaultYAxisProps} />
                <Tooltip content={<ChartTooltip showAll={false} />} />
                {typeof item.reference === "number" && (
                  <ReferenceLine y={item.reference} stroke="var(--color-navavej-red)" strokeDasharray="4 4" />
                )}
                <Line
                  name={item.label}
                  type="monotone"
                  dataKey="value"
                  stroke="var(--color-navavej-teal)"
                  strokeWidth={3}
                  dot={{ r: 3.5, fill: "var(--color-navavej-teal)", strokeWidth: 2, stroke: "var(--background)" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] font-bold text-navavej-gray-med">
            <span>Now: {item.current} {item.unit}</span>
            <span>Ref: {typeof item.reference === "number" ? item.reference : "N/A"}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
