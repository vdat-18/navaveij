"use client";

import { CountBadge, RiskDot, StatusBadge } from "@/components/leads/LeadBadges";
import { LEAD_STATUS_ORDER } from "@/components/leads/leadVisualMaps";
import type { LeadAssignment, LeadStatus, SalesUser } from "@/types/leads";

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(date);
};

const countByStatus = (leads: LeadAssignment[]) => {
  const map: Record<LeadStatus, number> = {
    assigned: 0,
    contacted: 0,
    scheduled: 0,
    converted: 0,
    declined: 0,
  };
  for (const lead of leads) {
    map[lead.status] += 1;
  }
  return map;
};

export function ExecutiveTrackerSection({
  leads,
  salesUsers,
  onUnassignLead,
  isUnassigning,
}: {
  leads: LeadAssignment[];
  salesUsers: SalesUser[];
  onUnassignLead: (assignmentId: string) => void;
  isUnassigning: boolean;
}) {
  const pipeline = countByStatus(leads);

  return (
    <section className="rounded-2xl border border-navavej-border bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-navavej-teal">Lead tracker</p>
          <h3 className="mt-2 text-xl font-black text-navavej-gray-dark">Pipeline visibility</h3>
        </div>
        <span className="rounded-full bg-navavej-background px-4 py-2 text-[11px] font-black uppercase tracking-[0.14em] text-navavej-gray">
          {leads.length} active leads
        </span>
      </div>

      {leads.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-navavej-border bg-navavej-background p-5 text-sm text-navavej-gray-dark">
          No leads assigned yet.
        </div>
      ) : (
        <div className="mt-5 space-y-6">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-navavej-gray">Pipeline summary</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {LEAD_STATUS_ORDER.map((status) => (
                <div key={status} className="flex items-center gap-2 rounded-2xl border border-navavej-border bg-white px-3 py-2">
                  <span className="text-[11px] font-black uppercase tracking-[0.14em] text-navavej-gray-dark">{status}</span>
                  <CountBadge count={pipeline[status]} status={status} />
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-navavej-gray">Per-rep workload</p>
            <div className="mt-3 space-y-2">
              {salesUsers.map((rep) => {
                const repLeads = leads.filter((lead) => lead.assigned_to_user_id === rep.user_id);
                const repCounts = countByStatus(repLeads);
                return (
                  <div key={rep.user_id} className="rounded-2xl border border-navavej-border bg-navavej-background p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-black text-navavej-navy">{rep.name}</p>
                        <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-navavej-gray">
                          {repLeads.length} total
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {LEAD_STATUS_ORDER.map((status) => (
                          <div key={`${rep.user_id}-${status}`} className="flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase tracking-[0.14em] text-navavej-gray-dark">{status}</span>
                            <CountBadge count={repCounts[status]} status={status} />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-navavej-gray">All leads</p>
            <div className="mt-3 space-y-2">
              {leads.map((lead) => (
                <details key={lead.assignment_id} className="group rounded-2xl border border-navavej-border bg-white">
                  <summary className="cursor-pointer list-none px-4 py-3">
                    <div className="grid grid-cols-[16px_1.1fr_1fr_0.8fr_0.6fr_0.7fr] items-center gap-3">
                      <RiskDot riskLevel={lead.overall_risk_level} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-navavej-navy">{lead.patient_name}</p>
                      </div>
                      <p className="truncate text-xs font-semibold uppercase tracking-[0.14em] text-navavej-gray">{lead.scenario_label}</p>
                      <p className="truncate text-xs font-semibold text-navavej-gray-dark">{lead.assigned_to_name}</p>
                      <div className="justify-self-start">
                        <StatusBadge status={lead.status} />
                      </div>
                      <p className="text-xs font-semibold text-navavej-gray-dark">{formatDate(lead.assigned_at)}</p>
                    </div>
                  </summary>
                  <div className="border-t border-navavej-border bg-navavej-background px-4 py-3 text-sm text-navavej-gray-dark">
                    {lead.notes ? (
                      <>
                        <p className="text-[11px] font-black uppercase tracking-[0.14em] text-navavej-gray">Notes</p>
                        <p className="mt-2 leading-6">{lead.notes}</p>
                      </>
                    ) : (
                      <p className="text-sm text-navavej-gray-dark">No notes captured yet.</p>
                    )}

                    <div className="mt-4 flex items-center justify-end">
                      <button
                        type="button"
                        disabled={isUnassigning}
                        onClick={() => {
                          if (!confirm("Unassign this lead and return it to the unassigned pool?")) return;
                          onUnassignLead(lead.assignment_id);
                        }}
                        className="inline-flex items-center rounded-full border border-navavej-red/30 bg-navavej-red/[0.05] px-4 py-2 text-[11px] font-black uppercase tracking-[0.14em] text-navavej-red transition hover:bg-navavej-red/[0.08] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isUnassigning ? "Unassigning..." : "Unassign"}
                      </button>
                    </div>
                  </div>
                </details>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
