"use client";

import type { LeadAssignment } from "@/types/leads";

import { CountBadge, RiskDot } from "@/components/leads/LeadBadges";
import { LEAD_STATUS_ORDER } from "@/components/leads/leadVisualMaps";

const titleCase = (value: string) => value.slice(0, 1).toUpperCase() + value.slice(1);

export function SalesKanbanBoard({
  leads,
  selectedLeadId,
  onSelectLead,
}: {
  leads: LeadAssignment[];
  selectedLeadId: string | null;
  onSelectLead: (assignmentId: string) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <div className="grid min-w-[1100px] grid-cols-5 gap-4">
        {LEAD_STATUS_ORDER.map((status) => {
          const columnLeads = leads.filter((lead) => lead.status === status);
          return (
            <div
              key={status}
              className="rounded-2xl border border-navavej-border bg-white shadow-sm min-h-[280px] flex flex-col"
            >
              <div className="flex items-center justify-between gap-3 border-b border-navavej-border px-4 py-3">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-navavej-gray-dark">
                  {titleCase(status)}
                </p>
                <CountBadge count={columnLeads.length} status={status} />
              </div>

              <div className="flex-1 space-y-2 p-3">
                {columnLeads.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-navavej-border bg-navavej-background p-3 text-xs font-semibold text-navavej-gray-dark">
                    No leads
                  </p>
                ) : (
                  columnLeads.map((lead) => {
                    const isSelected = lead.assignment_id === selectedLeadId;
                    return (
                      <button
                        key={lead.assignment_id}
                        type="button"
                        onClick={() => onSelectLead(lead.assignment_id)}
                        className={`w-full rounded-2xl border p-3 text-left transition-all ${
                          isSelected
                            ? "border-navavej-teal bg-navavej-teal/[0.04] shadow-sm"
                            : "border-navavej-border bg-white hover:border-navavej-teal/40"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-black text-navavej-navy">{lead.patient_name}</p>
                            <p className="mt-1 truncate text-[11px] font-semibold uppercase tracking-[0.14em] text-navavej-gray">
                              {lead.scenario_label}
                            </p>
                          </div>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-black uppercase tracking-[0.14em] text-navavej-gray">
                          <span className="inline-flex items-center gap-2 rounded-full bg-navavej-background px-3 py-1">
                            <RiskDot riskLevel={lead.overall_risk_level} className="h-2 w-2" />
                            {lead.overall_risk_level}
                          </span>
                          <span className="rounded-full bg-navavej-background px-3 py-1">{lead.ai_recommended_tier}</span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

