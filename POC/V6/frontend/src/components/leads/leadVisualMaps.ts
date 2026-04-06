"use client";

import type { LeadStatus } from "@/types/leads";

export const LEAD_STATUS_ORDER = ["assigned", "contacted", "scheduled", "converted", "declined"] as const satisfies readonly LeadStatus[];

export const STATUS_STYLES: Record<LeadStatus, { badge: string; header: string; dot: string }> = {
  assigned: {
    badge: "bg-blue-50 text-blue-700 border-blue-200",
    header: "bg-blue-50 text-blue-700 border-blue-200",
    dot: "bg-blue-500",
  },
  contacted: {
    badge: "bg-amber-50 text-amber-700 border-amber-200",
    header: "bg-amber-50 text-amber-700 border-amber-200",
    dot: "bg-amber-500",
  },
  scheduled: {
    badge: "bg-green-50 text-green-700 border-green-200",
    header: "bg-green-50 text-green-700 border-green-200",
    dot: "bg-green-500",
  },
  converted: {
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    header: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
  },
  declined: {
    badge: "bg-gray-100 text-gray-600 border-gray-200",
    header: "bg-gray-100 text-gray-600 border-gray-200",
    dot: "bg-gray-400",
  },
};

export const RISK_STYLES: Record<string, { badge: string; borderLeft: string; dot: string }> = {
  High: {
    badge: "bg-red-50 text-red-700 border-red-200",
    borderLeft: "border-l-red-400",
    dot: "bg-red-500",
  },
  Medium: {
    badge: "bg-amber-50 text-amber-700 border-amber-200",
    borderLeft: "border-l-amber-400",
    dot: "bg-amber-500",
  },
  Low: {
    badge: "bg-green-50 text-green-700 border-green-200",
    borderLeft: "border-l-green-400",
    dot: "bg-green-500",
  },
  Unknown: {
    badge: "bg-gray-100 text-gray-600 border-gray-200",
    borderLeft: "border-l-gray-300",
    dot: "bg-gray-400",
  },
};

export const getRiskStyles = (riskLevel?: string | null) => RISK_STYLES[riskLevel ?? ""] ?? RISK_STYLES.Unknown;

export const getNextLeadStatus = (status: LeadStatus): LeadStatus => {
  if (status === "assigned") return "contacted";
  if (status === "contacted") return "scheduled";
  if (status === "scheduled") return "converted";
  return status;
};

