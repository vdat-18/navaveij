"use client";

import React, { useMemo, useState } from "react";
import { TimelinePayload } from "@/types/timeline";
import { CheckCircle2, AlertTriangle, XCircle, Info, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/shared/utils";

interface ClinicalEventTimelineProps {
  timeline: TimelinePayload | null;
  startYear: number;
}

interface TimelineRow {
  date: string;
  type: string;
  title: string;
  detail: string;
  terminology: string;
  severity?: "normal" | "borderline" | "abnormal" | "info";
  changeType?: string;
}

const MED_CHANGE_MAP: Record<string, { label: string; colorClass: string }> = {
  started:          { label: "STARTED",   colorClass: "text-navavej-teal" },
  initiated:        { label: "STARTED",   colorClass: "text-navavej-teal" },
  increased:        { label: "ESCALATED", colorClass: "text-amber-600" },
  escalated:        { label: "ESCALATED", colorClass: "text-amber-600" },
  "dose increased": { label: "ESCALATED", colorClass: "text-amber-600" },
  decreased:        { label: "TAPERED",   colorClass: "text-blue-600" },
  tapered:          { label: "TAPERED",   colorClass: "text-blue-600" },
  "dose decreased": { label: "TAPERED",   colorClass: "text-blue-600" },
  discontinued:     { label: "STOPPED",   colorClass: "text-navavej-red" },
  stopped:          { label: "STOPPED",   colorClass: "text-navavej-red" },
  ended:            { label: "STOPPED",   colorClass: "text-navavej-red" },
  continued:        { label: "CONTINUED", colorClass: "text-navavej-gray-med" },
  maintained:       { label: "CONTINUED", colorClass: "text-navavej-gray-med" },
  changed:          { label: "MODIFIED",  colorClass: "text-amber-600" },
  modified:         { label: "MODIFIED",  colorClass: "text-amber-600" },
};

function getEventBadge(row: TimelineRow): { label: string; colorClass: string } {
  if (row.type === "Medication") {
    const key = (row.changeType ?? "").toLowerCase();
    return MED_CHANGE_MAP[key] ?? { label: "CHANGED", colorClass: "text-navavej-gray-med" };
  }
  if (row.type === "Diagnosis") {
    if (row.severity === "abnormal") return { label: "ACTIVE",   colorClass: "text-navavej-red" };
    if (row.severity === "normal")   return { label: "RESOLVED", colorClass: "text-emerald-700" };
    return { label: "NOTED", colorClass: "text-navavej-gray-med" };
  }
  if (row.type === "Screening") {
    if (row.severity === "abnormal") return { label: "ALERT",   colorClass: "text-navavej-red" };
    if (row.severity === "normal")   return { label: "CLEAR",   colorClass: "text-emerald-700" };
    return { label: "PENDING", colorClass: "text-navavej-gray-med" };
  }
  // Lab (default)
  if (row.severity === "abnormal")   return { label: "ALERT",   colorClass: "text-navavej-red" };
  if (row.severity === "borderline") return { label: "WATCH",   colorClass: "text-amber-700" };
  if (row.severity === "normal")     return { label: "OPTIMAL", colorClass: "text-emerald-700" };
  return { label: "—", colorClass: "text-navavej-gray-med" };
}

export function ClinicalEventTimeline({ timeline, startYear }: ClinicalEventTimelineProps) {
  const groupedEvents = useMemo(() => {
    if (!timeline) return [];
    const timelineRows: TimelineRow[] = [];

    for (const item of timeline.diagnoses) {
      const terminology = [item.icd10_code ? `ICD10 ${item.icd10_code}` : "", item.snomed_code ? `SNOMED ${item.snomed_code}` : ""]
        .filter(Boolean)
        .join(" • ");

      let severity: TimelineRow["severity"] = "info";
      if (item.clinical_status === "active" || item.clinical_status === "recurrence") severity = "abnormal";
      else if (item.clinical_status === "resolved" || item.clinical_status === "remission") severity = "normal";

      timelineRows.push({
        date: item.date,
        type: "Diagnosis",
        title: item.label,
        detail: item.clinical_status || "unknown",
        terminology: terminology || "N/A",
        severity,
      });
    }

    for (const item of timeline.significant_lab_events) {
      let severity: TimelineRow["severity"] = "info";
      const interp = item.interpretation?.toUpperCase() ?? "";
      if (interp === "N" || item.interpretation === "Normal" || item.threshold_crossed === "normal") severity = "normal";
      else if (interp === "H" || interp === "HH" || interp === "L" || interp === "LL" || item.interpretation === "High" || item.interpretation === "Low" || item.threshold_crossed === "above_high" || item.threshold_crossed === "below_low") severity = "abnormal";
      else if (interp === "A" || item.interpretation === "Borderline") severity = "borderline";

      timelineRows.push({
        date: item.date,
        type: "Lab",
        title: item.label,
        detail: `${item.value} ${item.unit} ${item.interpretation ? `(${item.interpretation})` : ""}`,
        terminology: item.loinc_code ? `LOINC ${item.loinc_code}` : "N/A",
        severity,
      });
    }

    for (const item of timeline.screening_procedure_history) {
      const terminology = [item.cpt_code ? `CPT ${item.cpt_code}` : "", item.snomed_code ? `SNOMED ${item.snomed_code}` : ""]
        .filter(Boolean)
        .join(" • ");

      let severity: TimelineRow["severity"] = "info";
      const resultLower = item.result_summary?.toLowerCase() || "";
      if (resultLower.includes("normal") || resultLower.includes("negative")) severity = "normal";
      else if (resultLower.includes("abnormal") || resultLower.includes("positive")) severity = "abnormal";

      timelineRows.push({
        date: item.date,
        type: "Screening",
        title: item.label,
        detail: item.result_summary,
        terminology: terminology || (item.procedure_code ? `Code ${item.procedure_code}` : "N/A"),
        severity,
      });
    }

    for (const item of timeline.medication_changes) {
      timelineRows.push({
        date: item.date,
        type: "Medication",
        title: item.drug_name,
        detail: item.change_type,
        terminology: "N/A",
        severity: "info",
        changeType: item.change_type,
      });
    }

    const filtered = timelineRows.filter((item) => Number(item.date.slice(0, 4)) >= startYear);

    // Group by date, sort dates descending (newest first)
    const grouped = filtered.reduce((acc, row) => {
      if (!acc[row.date]) acc[row.date] = [];
      acc[row.date].push(row);
      return acc;
    }, {} as Record<string, TimelineRow[]>);

    return Object.entries(grouped)
      .sort(([dateA], [dateB]) => (dateA < dateB ? 1 : -1))
      .map(([date, events]) => ({ date, events }));

  }, [timeline, startYear]);

  const [collapsedDates, setCollapsedDates] = useState<Set<string>>(new Set());
  const toggleDate = (date: string) => {
    setCollapsedDates(prev => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  };

  const getSeverityIcon = (severity?: string) => {
    switch (severity) {
      case "normal": return <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />;
      case "abnormal": return <XCircle className="w-3.5 h-3.5 text-navavej-red" />;
      case "borderline": return <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />;
      default: return <Info className="w-3.5 h-3.5 text-navavej-teal" />;
    }
  };

  const getSeverityBg = (severity?: string) => {
    switch (severity) {
      case "normal": return "bg-green-50 border-green-200";
      case "abnormal": return "bg-red-50 border-red-200";
      case "borderline": return "bg-amber-50 border-amber-200";
      default: return "bg-gray-50 border-gray-200";
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(d).toUpperCase();
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="navavej-card bg-white p-5 flex flex-col h-full border border-navavej-border/60">
      <h4 className="text-[11px] font-black text-navavej-gray-dark uppercase tracking-widest mb-4 shrink-0 flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-navavej-teal" />
        Clinical Event Timeline
      </h4>
      <div className="space-y-4 overflow-y-auto pr-3 flex-1 custom-scrollbar max-h-[500px]">
        {groupedEvents.map((group, groupIdx) => (
          <div key={`group-${group.date}-${groupIdx}`} className="relative pl-6">
            {/* Connection Line */}
            <div className="absolute left-[3px] top-2 bottom-0 w-[2px] bg-navavej-teal/10" />
            
            {/* Date Header Dot */}
            <div className="absolute left-0 top-1 w-2 h-2 rounded-full bg-navavej-teal ring-4 ring-white z-10" />
            
            <div className="mb-4">
                <div
                    onClick={() => toggleDate(group.date)}
                    className="flex items-center gap-3 mb-2 sticky top-0 bg-white z-20 py-1 cursor-pointer select-none hover:bg-navavej-gray-light/30 -mx-1 px-1 rounded-lg transition-colors"
                >
                    {collapsedDates.has(group.date)
                        ? <ChevronRight className="w-4 h-4 text-navavej-gray-med shrink-0" />
                        : <ChevronDown className="w-4 h-4 text-navavej-teal shrink-0" />
                    }
                    <h5 className="text-lg font-black text-navavej-gray-dark tracking-tighter">
                        {(() => {
                            try {
                                const d = new Date(group.date);
                                return d.getDate().toString().padStart(2, '0');
                            } catch { return group.date; }
                        })()}
                    </h5>
                    <div className="flex flex-col">
                        <span className="text-[9px] font-black text-navavej-teal uppercase tracking-widest leading-none">
                            {(() => {
                                try {
                                    const d = new Date(group.date);
                                    return new Intl.DateTimeFormat('en-GB', { month: 'short' }).format(d).toUpperCase();
                                } catch { return ""; }
                            })()}
                        </span>
                        <span className="text-[9px] font-bold text-navavej-gray-med leading-none mt-0.5">
                            {(() => {
                                try {
                                    const d = new Date(group.date);
                                    return d.getFullYear();
                                } catch { return ""; }
                            })()}
                        </span>
                    </div>
                    <div className="ml-auto bg-navavej-gray-light border border-navavej-border px-1.5 py-0.5 rounded text-[8px] font-black text-navavej-gray-med uppercase">
                        {group.events.length} Point{group.events.length > 1 ? 's' : ''}
                    </div>
                </div>

                {/* Event Cards for this date (collapsible) */}
                {!collapsedDates.has(group.date) && (
                <div className="space-y-2">
                {group.events.map((row, idx) => {
                    const isAbnormal = row.severity === 'abnormal';
                    const isNormal = row.severity === 'normal';
                    const isBorderline = row.severity === 'borderline';
                    
                    return (
                        <div
                        key={`${row.date}-${row.type}-${idx}`}
                        className={cn(
                            "border-2 rounded-xl p-2.5 transition-all shadow-sm bg-white relative overflow-hidden group hover:shadow-md",
                            isAbnormal ? "border-navavej-red/10 bg-red-50/5" : 
                            isNormal ? "border-emerald-100 bg-emerald-50/5" : 
                            isBorderline ? "border-amber-100 bg-amber-50/5" :
                            "border-navavej-border/30"
                        )}
                        >
                        <div className="flex items-start justify-between gap-3 mb-1">
                            <div className="flex items-center gap-2">
                                <span className="text-[8px] font-black text-navavej-teal uppercase bg-navavej-teal/5 px-1.5 py-0.2 rounded border border-navavej-teal/10">
                                    {row.type}
                                </span>
                                <p className="text-[13px] font-black text-navavej-gray-dark leading-tight group-hover:text-navavej-teal transition-colors truncate max-w-[200px] xl:max-w-[250px]">
                                    {row.title}
                                </p>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                                {getSeverityIcon(row.severity)}
                                {(() => {
                                    const { label: badgeLabel, colorClass: badgeColor } = getEventBadge(row);
                                    return (
                                        <span className={cn("text-[7px] font-black uppercase tracking-tighter", badgeColor)}>
                                            {badgeLabel}
                                        </span>
                                    );
                                })()}
                            </div>
                        </div>

                        <div className="flex flex-col gap-1 pl-1">
                            <p className="text-[11px] font-bold text-navavej-gray-dark/80 italic leading-snug">
                                {row.detail}
                            </p>
                            <div className="flex items-center justify-between text-[8px] font-bold text-navavej-gray-med font-mono mt-1 opacity-60">
                                <span>{row.terminology}</span>
                            </div>
                        </div>
                        </div>
                    );
                })}
                </div>
                )}
            </div>
          </div>
        ))}
        {groupedEvents.length === 0 && (
          <div className="text-center py-8 text-sm font-bold text-navavej-gray-med uppercase">
            No events found in selected timeframe
          </div>
        )}
      </div>
    </div>
  );
}
