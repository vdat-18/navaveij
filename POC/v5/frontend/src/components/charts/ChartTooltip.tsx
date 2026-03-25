"use client";

import React from "react";
import { ChartTooltipProps } from "@/types/chart";

interface SharedChartTooltipProps extends ChartTooltipProps {
  showAll?: boolean;
}

export function ChartTooltip({ active, payload, label, showAll = true }: SharedChartTooltipProps) {
  if (!active || !payload?.length) return null;

  const entries = showAll ? payload : [payload[0]];

  return (
    <div className="bg-white border border-navavej-border rounded-xl px-3 py-2 shadow-lg">
      <p className="text-[10px] font-black text-navavej-gray-med uppercase tracking-wider">{label}</p>
      <div className="mt-1 space-y-1">
        {entries.map((entry, index) => (
          <div key={index} className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <p className="text-xs font-black text-navavej-gray-dark">
              {entry.name ? `${entry.name}: ` : ""}
              {entry.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

