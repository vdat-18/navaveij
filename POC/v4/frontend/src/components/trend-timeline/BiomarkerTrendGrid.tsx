"use client";

import React from "react";
import { CheckCircle2, AlertTriangle, Info } from "lucide-react";
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
                        value: `THRESHOLD: ${item.reference}`,
                        position: "insideBottomRight",
                        fill: "var(--color-navavej-red)",
                        fontSize: 12,
                        fontWeight: "900",
                        dy: -10
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
            
            {/* Status Banner - Ultra Prominent */}
            <div className="mt-5 relative z-10">
              {typeof item.reference === "number" && item.current !== undefined ? (() => {
                let isGood = true;
                if (item.label.toLowerCase().includes('hdl')) {
                    isGood = item.current >= item.reference;
                } else {
                    isGood = item.current <= item.reference;
                }

                if (isGood) {
                  return (
                    <div className="bg-emerald-500 text-white px-4 py-3 rounded-2xl flex items-center justify-between shadow-lg shadow-emerald-500/20 border border-emerald-400/30">
                      <div className="flex items-center gap-3">
                        <div className="bg-white/20 p-1.5 rounded-lg backdrop-blur-sm">
                            <CheckCircle2 className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <p className="text-[14px] font-black uppercase tracking-tight">Status: Optimal</p>
                            <p className="text-[10px] font-bold opacity-80 italic">Current ({item.current}) is within reference range</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-black opacity-60 uppercase">Reference</p>
                        <p className="text-[12px] font-black">{item.label.toLowerCase().includes('hdl') ? '≥' : '≤'} {item.reference}</p>
                      </div>
                    </div>
                  );
                } else {
                  return (
                    <div className="bg-navavej-red text-white px-4 py-3 rounded-2xl flex items-center justify-between shadow-lg shadow-navavej-red/20 border border-navavej-red/30 animate-in fade-in slide-in-from-bottom-2 duration-500">
                      <div className="flex items-center gap-3">
                        <div className="bg-white/20 p-1.5 rounded-lg backdrop-blur-sm">
                            <AlertTriangle className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <p className="text-[14px] font-black uppercase tracking-tight">Status: Alert</p>
                            <p className="text-[10px] font-bold opacity-80 italic">Out of range detection</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-black opacity-60 uppercase">Reference</p>
                        <p className="text-[12px] font-black">{item.label.toLowerCase().includes('hdl') ? '≥' : '≤'} {item.reference}</p>
                      </div>
                    </div>
                  );
                }
              })() : (
                 <div className="bg-navavej-gray-light p-4 rounded-2xl flex items-center justify-between border border-navavej-border">
                  <div className="flex items-center gap-3">
                    <div className="bg-navavej-gray-med/10 p-1.5 rounded-lg">
                        <Info className="w-4 h-4 text-navavej-gray-med" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-navavej-gray-dark uppercase tracking-widest">Baseline Tracking</p>
                        <p className="text-[10px] font-bold text-navavej-gray-med italic">No reference threshold established</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[18px] font-black text-navavej-teal tracking-tighter">{item.current || "???"}</p>
                    <p className="text-[8px] font-black text-navavej-gray-med uppercase">{item.unit}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
