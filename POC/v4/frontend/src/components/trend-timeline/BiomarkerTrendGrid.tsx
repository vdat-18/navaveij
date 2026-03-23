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

function getNumericYAxisDomain(item: BiomarkerSeries): [number, number] | undefined {
  const values = item.history
    .map((entry) => entry.value)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));

  if (typeof item.reference === "number" && Number.isFinite(item.reference)) {
    values.push(item.reference);
  }

  if (values.length === 0) {
    return undefined;
  }

  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const span = maxValue - minValue;
  const margin = span > 0 ? Math.max(span * 0.1, 1) : Math.max(Math.abs(maxValue) * 0.1, 1);
  const domainMin = Number((minValue - margin).toFixed(2));
  const domainMax = Number((maxValue + margin).toFixed(2));

  return domainMin < domainMax ? [domainMin, domainMax] : [domainMin - 1, domainMax + 1];
}

export function BiomarkerTrendGrid({ series }: BiomarkerTrendGridProps) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
      {series.map((item) => {
        const domain = getNumericYAxisDomain(item);

        return (
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
                  <YAxis {...defaultYAxisProps} domain={domain} />
                  <Tooltip content={<ChartTooltip showAll={false} />} />
                  {typeof item.reference === "number" && (
                    <ReferenceLine
                      y={item.reference}
                      stroke="var(--color-navavej-red)"
                      strokeDasharray="4 4"
                      strokeWidth={2}
                      label={{
                        value: `Ref: ${item.reference}`,
                        position: "insideTopRight",
                        fill: "var(--color-navavej-red)",
                        fontSize: 10,
                        fontWeight: "bold"
                      }}
                    />
                  )}
                  <Line
                    name={item.label}
                    type="monotone"
                    dataKey="value"
                    stroke="var(--color-navavej-teal)"
                    strokeWidth={3}
                    dot={(props: any) => {
                      const { cx, cy, payload, index } = props;
                      const isLast = index === item.history.length - 1;
                      const hasRef = typeof item.reference === "number";
                      
                      // For this logic, assuming higher is worse for simplicity, or just highlighting if it crossed
                      // We can check if trend_direction implies what's bad, but simple threshold check:
                      let isAbnormal = false;
                      if (hasRef && payload.value !== undefined) {
                        // Very simple fallback: if it's > reference, flag it (could be enhanced based on biomarker rules)
                        // Actually, let's highlight if value is significantly different. We don't have > or < rules per metric here.
                        // For demonstration, let's say value > reference is abnormal if trend is upward, etc.
                        // Let's just highlight if it's > reference for now as a default "alert" demo.
                        if (item.label.toLowerCase().includes('hdl')) {
                            isAbnormal = payload.value < item.reference!; // HDL lower is bad
                        } else {
                            isAbnormal = payload.value > item.reference!;
                        }
                      }

                      if (isLast) {
                        return (
                          <circle
                            key={`dot-${index}`}
                            cx={cx}
                            cy={cy}
                            r={6}
                            fill={isAbnormal ? "var(--color-navavej-red)" : "var(--color-navavej-teal)"}
                            stroke="white"
                            strokeWidth={2}
                          />
                        );
                      }
                      
                      if (isAbnormal) {
                        return (
                          <circle
                            key={`dot-${index}`}
                            cx={cx}
                            cy={cy}
                            r={5}
                            fill="var(--color-navavej-red)"
                            stroke="white"
                            strokeWidth={1}
                          />
                        );
                      }

                      return (
                        <circle
                          key={`dot-${index}`}
                          cx={cx}
                          cy={cy}
                          r={3.5}
                          fill="var(--color-navavej-teal)"
                          stroke="var(--background)"
                          strokeWidth={2}
                        />
                      );
                    }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            
            {/* Status Banner instead of basic footer */}
            <div className="mt-3">
              {typeof item.reference === "number" && item.current !== undefined ? (() => {
                let isGood = true;
                if (item.label.toLowerCase().includes('hdl')) {
                    isGood = item.current >= item.reference;
                } else {
                    isGood = item.current <= item.reference;
                }

                if (isGood) {
                  return (
                    <div className="bg-emerald-50 text-emerald-700 p-2 rounded-md text-xs font-medium flex items-center gap-2">
                      <span>✅</span>
                      <span>All good: Current ({item.current} {item.unit}) {item.label.toLowerCase().includes('hdl') ? '≥' : '<'} Reference ({item.reference})</span>
                    </div>
                  );
                } else {
                  return (
                    <div className="bg-rose-50 text-red-700 p-2 rounded-md text-xs font-medium flex items-center gap-2">
                      <span>⚠️</span>
                      <span>Alert: Current ({item.current} {item.unit}) {item.label.toLowerCase().includes('hdl') ? '<' : '>'} Reference ({item.reference})</span>
                    </div>
                  );
                }
              })() : (
                 <div className="grid grid-cols-2 gap-2 text-[10px] font-bold text-navavej-gray-med">
                  <span>Now: {item.current} {item.unit}</span>
                  <span>Ref: N/A</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
