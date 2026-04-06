"use client";

import React from "react";
import { MonitoringSnapshot } from "@/types/access-monitoring";

interface LiveMetricsBarProps {
  snapshot: MonitoringSnapshot | null;
}

export function LiveMetricsBar({ snapshot }: LiveMetricsBarProps) {
  if (!snapshot) {
    return (
      <div className="navavej-card p-6 space-y-4">
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="rounded-xl border border-navavej-border bg-white p-4 space-y-2">
              <div className="h-3 w-24 bg-navavej-gray-light rounded animate-pulse" />
              <div className="h-8 w-16 bg-navavej-gray-light rounded animate-pulse" />
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-4">
          <div className="h-3 w-44 bg-navavej-gray-light rounded animate-pulse" />
          <div className="h-3 w-44 bg-navavej-gray-light rounded animate-pulse" />
          <div className="h-3 w-44 bg-navavej-gray-light rounded animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="navavej-card p-6 space-y-4">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <MetricCard label="Active Users" value={snapshot.active_users_now} />
        <MetricCard label="Sessions Today" value={snapshot.sessions_today} />
        <MetricCard label="Records Today" value={snapshot.patient_records_accessed_today} />
        <MetricCard
          label="Alerts"
          value={
            <div className="flex flex-wrap gap-1">
              <SeverityBadge label="Critical" count={snapshot.alert_counts.critical} className="text-navavej-red border-navavej-red/20 bg-navavej-red/5" />
              <SeverityBadge label="High" count={snapshot.alert_counts.high} className="text-orange-500 border-orange-200 bg-orange-50" />
              <SeverityBadge label="Medium" count={snapshot.alert_counts.medium} className="text-yellow-500 border-yellow-200 bg-yellow-50" />
              <SeverityBadge label="Low" count={snapshot.alert_counts.low} className="text-green-600 border-green-200 bg-green-50" />
            </div>
          }
        />
      </div>
      <div className="flex flex-wrap gap-4 text-[11px] font-bold text-navavej-gray-med">
        <span>AI Recommendations Today: {snapshot.ai_recommendations_generated_today}</span>
        <span>Safety Validator Failures: {snapshot.safety_validator_failures_today}</span>
        <span>Snapshot: {new Date(snapshot.snapshot_at).toLocaleString()}</span>
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-navavej-border bg-white p-4">
      <p className="text-[10px] uppercase tracking-widest font-black text-navavej-gray-med">{label}</p>
      <div className="text-2xl font-black text-navavej-gray-dark mt-2">{value}</div>
    </div>
  );
}

function SeverityBadge({ label, count, className }: { label: string; count: number; className: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[9px] font-black uppercase ${className}`}>
      <span>{count}</span>
      <span>{label}</span>
    </span>
  );
}
