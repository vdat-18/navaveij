"use client";

import React from "react";
import { ScreeningGapRow } from "@/types/timeline";
import { cn } from "@/shared/utils";

interface ScreeningGapStatusProps {
  screeningGaps: ScreeningGapRow[];
  title?: string;
}

const priorityStyles = (priority?: string) => {
  const p = (priority || "").toLowerCase();
  if (p === "red" || p === "critical") return "border-navavej-red bg-red-50/50 border-2";
  if (p === "orange" || p === "high") return "border-orange-500 bg-orange-50/50 border-2";
  if (p === "yellow" || p === "medium") return "border-yellow-500 bg-yellow-50/50 border-2";
  if (p === "green" || p === "low") return "border-green-500 bg-green-50/50 border-2";
  return "border-navavej-border bg-white border";
};

const PRIORITY_ORDER: Record<string, number> = {
  red: 0,
  critical: 0,
  orange: 1,
  high: 1,
  yellow: 2,
  medium: 2,
  green: 3,
  low: 3,
};

export function ScreeningGapStatus({ screeningGaps, title = "Screening Gap Status" }: ScreeningGapStatusProps) {
  const sorted = [...screeningGaps].sort((a, b) => {
    const pa = PRIORITY_ORDER[(a.priority_color || "").toLowerCase()] ?? 99;
    const pb = PRIORITY_ORDER[(b.priority_color || "").toLowerCase()] ?? 99;
    return pa - pb;
  });

  return (
    <div className="navavej-card bg-white p-5 border border-navavej-border/60">
      <h4 className="text-[11px] font-black text-navavej-gray-dark uppercase tracking-widest mb-4 flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-navavej-teal" />
        {title}
      </h4>
      <div className="space-y-3">
        {sorted.map((gap, idx) => (
          <div 
            key={`${gap.label}-${idx}`} 
            className={cn(
              "group rounded-2xl p-3 px-4 transition-all duration-300 hover:shadow-lg cursor-help",
              priorityStyles(gap.priority_color)
            )}
          >
            <div className="flex justify-between items-center">
              <p className="text-sm font-black text-navavej-gray-dark tracking-tight">{gap.label}</p>
              <div className={cn(
                "w-1.5 h-1.5 rounded-full shadow-sm shrink-0",
                gap.priority_color?.toLowerCase() === "red" ? "bg-navavej-red animate-pulse" : 
                gap.priority_color?.toLowerCase() === "orange" ? "bg-orange-500" :
                gap.priority_color?.toLowerCase() === "yellow" ? "bg-yellow-500" :
                "bg-green-500"
              )} />
            </div>

            {/* Reveal-on-hover details */}
            <div className="max-h-0 opacity-0 overflow-hidden group-hover:max-h-48 group-hover:opacity-100 group-hover:mt-4 transition-all duration-500 ease-in-out">
              <div className="grid grid-cols-2 gap-4 text-[11px] font-bold text-navavej-gray-dark/70 pt-3 border-t border-black/5">
                <div className="flex flex-col">
                  <span className="text-[8px] uppercase tracking-widest opacity-60">Status</span>
                  <span>Overdue: {gap.overdue_days ?? "0"} days</span>
                </div>
                <div className="flex flex-col text-right">
                  <span className="text-[8px] uppercase tracking-widest opacity-60">History</span>
                  <span>Last: {gap.last_performed_date || gap.last_administered_date || "Never"}</span>
                </div>
              </div>
              {gap.note && (
                <div className="mt-3 pt-3 border-t border-black/5">
                  <p className="text-[11px] text-navavej-gray-med font-medium leading-relaxed italic border-l-2 border-navavej-teal/20 pl-3">
                    {gap.note}
                  </p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
