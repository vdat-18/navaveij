"use client";

import React, { useMemo } from "react";
import { TimelinePayload } from "@/types/timeline";
import { CheckCircle2, AlertTriangle, XCircle, Info } from "lucide-react";

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
      if (item.threshold_crossed === "normal" || item.interpretation === "Normal") severity = "normal";
      else if (item.interpretation === "Borderline") severity = "borderline";
      else if (item.threshold_crossed === "above_high" || item.threshold_crossed === "below_low" || item.interpretation === "High" || item.interpretation === "Low") severity = "abnormal";

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
    <div className="navavej-card bg-white p-5 flex flex-col h-full">
      <h4 className="text-[11px] font-black text-navavej-gray-dark uppercase tracking-widest mb-4 shrink-0">
        Clinical Event Timeline
      </h4>
      <div className="space-y-6 overflow-y-auto pr-2 flex-1">
        {groupedEvents.map((group, groupIdx) => (
          <div key={`group-${group.date}-${groupIdx}`} className="relative pl-4 border-l-2 border-navavej-teal/30">
            {/* Date Header - Prominent */}
            <div className="absolute -left-[5px] top-0 w-2 h-2 rounded-full bg-navavej-teal ring-4 ring-white" />
            <h5 className="text-sm font-black text-navavej-gray-dark tracking-wider mb-3 flex items-center gap-2">
              <span className="bg-navavej-teal text-white px-2 py-0.5 rounded-md">
                {formatDate(group.date)}
              </span>
              <span className="text-[10px] text-navavej-gray-med">
                {group.events.length} Event{group.events.length > 1 ? 's' : ''}
              </span>
            </h5>

            {/* Event Cards for this date */}
            <div className="space-y-2">
              {group.events.map((row, idx) => (
                <div
                  key={`${row.date}-${row.type}-${idx}`}
                  className={`border rounded-lg p-3 transition-colors ${getSeverityBg(row.severity)}`}
                >
                  <div className="flex justify-between items-start gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      {getSeverityIcon(row.severity)}
                      <span className="text-[10px] font-black text-navavej-gray-dark uppercase bg-white/60 px-1.5 py-0.5 rounded">
                        {row.type}
                      </span>
                    </div>
                    {row.severity && row.severity !== "info" && (
                      <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full ${row.severity === 'normal' ? 'bg-green-100 text-green-700' :
                          row.severity === 'abnormal' ? 'bg-red-100 text-red-700' :
                            'bg-amber-100 text-amber-700'
                        }`}>
                        {row.severity}
                      </span>
                    )}
                  </div>

                  <div className="pl-5.5">
                    <p className="text-xs font-black text-navavej-gray-dark leading-tight">{row.title}</p>
                    <p className="text-[11px] font-bold text-navavej-gray-dark/80 mt-0.5">{row.detail}</p>
                    <p className="text-[9px] font-bold text-navavej-gray-med mt-1.5 font-mono">{row.terminology}</p>
                  </div>
                </div>
              ))}
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
