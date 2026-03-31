"use client";

import React, { useMemo, useState } from "react";
import { AnomalyAlert } from "@/types/access-monitoring";

interface AnomalyAlertsPanelProps {
  alerts: AnomalyAlert[];
}

import { cn } from "@/shared/utils";

const severityStyles = (severity?: string) => {
  const s = severity?.toLowerCase();
  if (s === "red" || s === "critical") return "border-red-500/40 bg-red-50/30";
  if (s === "orange" || s === "high") return "border-orange-500/40 bg-orange-50/30";
  if (s === "yellow" || s === "medium") return "border-yellow-500/40 bg-yellow-50/30";
  if (s === "green" || s === "low") return "border-green-500/40 bg-green-50/30";
  return "border-navavej-border bg-white";
};

export function AnomalyAlertsPanel({ alerts }: AnomalyAlertsPanelProps) {
  const [statusMap, setStatusMap] = useState<Record<string, AnomalyAlert["status"]>>({});

  const normalized = useMemo(
    () =>
      alerts.map((alert) => ({
        ...alert,
        status: statusMap[alert.alert_id] || alert.status,
      })),
    [alerts, statusMap]
  );

  return (
    <div className="navavej-card p-4 space-y-3">
      <div className="flex items-center justify-between pb-1">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-navavej-gray-dark flex items-center gap-2">
           <div className="w-1.5 h-1.5 rounded-full bg-navavej-red animate-pulse" />
           Anomaly Alerts
        </h3>
        <span className="text-[9px] font-black text-navavej-gray-med uppercase bg-navavej-gray-light px-1.5 py-0.2 rounded border border-navavej-border">
          {alerts.length} Active
        </span>
      </div>
      
      <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1.5 custom-scrollbar">
        {normalized.map((alert) => (
          <div 
            key={alert.alert_id} 
            className={cn(
                "rounded-lg border-2 p-2.5 transition-all hover:shadow-sm relative overflow-hidden group",
                severityStyles(alert.severity)
            )}
          >
            {/* Status indicator line on the left */}
            <div className={cn(
                "absolute left-0 top-0 bottom-0 w-1",
                alert.severity?.toLowerCase() === 'critical' || alert.severity?.toLowerCase() === 'red' ? "bg-red-500" :
                alert.severity?.toLowerCase() === 'high' || alert.severity?.toLowerCase() === 'orange' ? "bg-orange-500" :
                alert.severity?.toLowerCase() === 'medium' || alert.severity?.toLowerCase() === 'yellow' ? "bg-yellow-500" :
                "bg-green-500"
            )} />

            <div className="flex items-start justify-between gap-2 mb-1">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-[12px] font-black text-navavej-gray-dark group-hover:text-navavej-teal transition-colors truncate">
                      {alert.user_display_name}
                  </p>
                  <span className="text-[8px] font-black text-navavej-teal uppercase bg-navavej-teal/5 px-1 py-0.2 rounded border border-navavej-teal/10">
                    {alert.alert_type}
                  </span>
                </div>
                <p className="text-[9px] text-navavej-gray-med font-bold mt-0.5 opacity-80">
                  {alert.department} • <span className="italic font-medium">{new Date(alert.triggered_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                </p>
              </div>
            </div>

            <div className="mt-2.5 flex items-center justify-between border-t border-black/5 pt-2">
              <div className="flex items-center gap-1.5">
                <button
                    type="button"
                    disabled
                    className="px-2 py-0.5 rounded-md border border-navavej-border text-[8px] font-black uppercase opacity-40 cursor-not-allowed hover:bg-white"
                >
                    Ack
                </button>
                <button
                    type="button"
                    disabled
                    className="px-2 py-0.5 rounded-md bg-navavej-teal text-white text-[8px] font-black uppercase opacity-40 cursor-not-allowed"
                >
                    Resolve
                </button>
              </div>
              <span className="text-[8px] font-black uppercase tracking-tighter text-navavej-gray-med bg-white/40 px-1.5 py-0.2 rounded border border-navavej-border/40">
                {alert.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
