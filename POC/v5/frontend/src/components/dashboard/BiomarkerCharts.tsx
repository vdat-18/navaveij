"use client";

import React, { useId } from "react";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area,
} from "recharts";
import { ChartTooltip } from "@/components/charts/ChartTooltip";
import { defaultCartesianGrid, defaultXAxisProps, defaultYAxisProps } from "@/components/charts/chartConfig";
import { BMI_TARGET } from "@/shared/clinicalConstants";
import { cn } from "@/shared/utils";

interface HistoryEntry {
    date: string;
    value?: number;
    sbp?: number;
    dbp?: number;
}

interface BiomarkerChartsProps {
    bmiHistory: HistoryEntry[];
    bpHistory: HistoryEntry[];
}

export function BiomarkerCharts({ bmiHistory, bpHistory }: BiomarkerChartsProps) {
    const hasBP = bpHistory && bpHistory.length > 0;
    const hasBMI = bmiHistory && bmiHistory.length > 0;
    const bmiGradientId = useId();

    if (!hasBP && !hasBMI) return null;

    return (
        <div className={cn(
            "grid gap-6 mt-10",
            hasBP && hasBMI ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"
        )}>
            {/* Blood Pressure Trend */}
            {hasBP && (
                <div className="navavej-card p-6 bg-white">
                    <div className="flex items-center justify-between mb-6">
                        <h4 className="text-[11px] font-black text-navavej-gray-dark uppercase tracking-widest leading-none">Blood Pressure Trend</h4>
                        <div className="flex gap-3">
                            <div className="flex items-center gap-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-navavej-red" />
                                <span className="text-[8px] font-black text-navavej-gray-med uppercase">SBP</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-navavej-teal" />
                                <span className="text-[8px] font-black text-navavej-gray-med uppercase">DBP</span>
                            </div>
                        </div>
                    </div>
                    <div className="h-[160px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={bpHistory}>
                                <CartesianGrid {...defaultCartesianGrid} />
                                <XAxis
                                    dataKey="date"
                                    {...defaultXAxisProps}
                                />
                                <YAxis
                                    {...defaultYAxisProps}
                                    domain={['dataMin - 10', 'dataMax + 10']}
                                />
                                <Tooltip content={<ChartTooltip />} />
                                <Line
                                    name="Systolic"
                                    type="monotone"
                                    dataKey="sbp"
                                    stroke="var(--color-navavej-red)"
                                    strokeWidth={3}
                                    dot={{ r: 4, fill: "var(--color-navavej-red)", strokeWidth: 2, stroke: "var(--background)" }}
                                    activeDot={{ r: 6 }}
                                />
                                <Line
                                    name="Diastolic"
                                    type="monotone"
                                    dataKey="dbp"
                                    stroke="var(--color-navavej-teal)"
                                    strokeWidth={3}
                                    dot={{ r: 4, fill: "var(--color-navavej-teal)", strokeWidth: 2, stroke: "var(--background)" }}
                                    activeDot={{ r: 6 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* BMI Trend */}
            {hasBMI && (
                <div className="navavej-card p-6 bg-white">
                    <div className="flex items-center justify-between mb-6">
                        <h4 className="text-[11px] font-black text-navavej-gray-dark uppercase tracking-widest leading-none">BMI Progression</h4>
                        <span className="bg-navavej-teal/10 text-navavej-teal text-[8px] font-black px-2 py-0.5 rounded-full uppercase">Target: &lt; {BMI_TARGET.toFixed(1)}</span>
                    </div>
                    <div className="h-[160px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={bmiHistory}>
                                <defs>
                                    <linearGradient id={bmiGradientId} x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="var(--color-navavej-teal)" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="var(--color-navavej-teal)" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid {...defaultCartesianGrid} />
                                <XAxis
                                    dataKey="date"
                                    {...defaultXAxisProps}
                                />
                                <YAxis
                                    {...defaultYAxisProps}
                                    domain={['dataMin - 2', 'dataMax + 2']}
                                />
                                <Tooltip content={<ChartTooltip />} />
                                <Area
                                    name="BMI"
                                    type="monotone"
                                    dataKey="value"
                                    stroke="var(--color-navavej-teal)"
                                    fillOpacity={1}
                                    fill={`url(#${bmiGradientId})`}
                                    strokeWidth={3}
                                    dot={{ r: 4, fill: "var(--color-navavej-teal)", strokeWidth: 2, stroke: "var(--background)" }}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}
        </div>
    );
}
