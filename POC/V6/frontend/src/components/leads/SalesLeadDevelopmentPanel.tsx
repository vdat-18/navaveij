"use client";

import { useEffect, useMemo, useState } from "react";

import { ReadOnlyRecommendationView } from "@/components/leads/ReadOnlyRecommendationView";
import { leadService } from "@/services/api";
import { LeadAssignment, LeadStatus, PreRunnedRecommendation } from "@/types/leads";

const LEAD_STATUS_OPTIONS: LeadStatus[] = ["assigned", "contacted", "scheduled", "converted", "declined"];

export function SalesLeadDevelopmentPanel() {
  const [leads, setLeads] = useState<LeadAssignment[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [selectedRecommendation, setSelectedRecommendation] = useState<PreRunnedRecommendation | null>(null);
  const [status, setStatus] = useState<LeadStatus>("assigned");
  const [notes, setNotes] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedLead = useMemo(
    () => leads.find((lead) => lead.assignment_id === selectedLeadId) ?? null,
    [leads, selectedLeadId]
  );

  const refreshLeads = async () => {
    const leadData = await leadService.getLeads();
    setLeads(leadData);
    if (!selectedLeadId && leadData.length > 0) {
      setSelectedLeadId(leadData[0].assignment_id);
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true);
        setError(null);
        await refreshLeads();
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Failed to load assigned leads.");
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, []);

  useEffect(() => {
    const loadRecommendation = async () => {
      if (!selectedLead) {
        setSelectedRecommendation(null);
        return;
      }
      setStatus(selectedLead.status);
      setNotes(selectedLead.notes);
      try {
        const recommendation = await leadService.getPreRunnedRecommendation(selectedLead.patient_token);
        setSelectedRecommendation(recommendation);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Failed to load lead recommendation.");
      }
    };
    void loadRecommendation();
  }, [selectedLead]);

  const handleSave = async () => {
    if (!selectedLead) {
      return;
    }
    try {
      setIsSaving(true);
      setError(null);
      const updatedLead = await leadService.updateLeadStatus(selectedLead.assignment_id, status, notes);
      setLeads((current) => current.map((lead) => lead.assignment_id === updatedLead.assignment_id ? updatedLead : lead));
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to update lead.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="rounded-2xl border border-navavej-border bg-white p-6 text-sm text-navavej-gray-dark">Loading assigned leads...</div>;
  }

  if (leads.length === 0) {
    return (
      <div className="rounded-2xl border border-navavej-border bg-white p-8 text-center shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-navavej-teal">My leads</p>
        <h2 className="mt-3 text-2xl font-black text-navavej-gray-dark">No assigned outreach leads yet</h2>
        <p className="mt-3 text-sm leading-6 text-navavej-gray-dark">
          Executive-assigned pre-runned patients will appear here for follow-up without any AI rerun.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error ? (
        <div className="rounded-2xl border border-navavej-red/20 bg-navavej-red/[0.03] px-4 py-3 text-sm text-navavej-red">
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="space-y-4">
          <div className="rounded-2xl border border-navavej-border bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-navavej-teal">My leads</p>
                <h2 className="mt-2 text-2xl font-black text-navavej-gray-dark">Sales lead development</h2>
              </div>
              <span className="rounded-full bg-navavej-background px-4 py-2 text-[11px] font-black uppercase tracking-[0.14em] text-navavej-gray">
                {leads.length} assigned
              </span>
            </div>
            <div className="mt-5 space-y-3">
              {leads.map((lead) => {
                const isSelected = lead.assignment_id === selectedLeadId;
                return (
                  <button
                    key={lead.assignment_id}
                    type="button"
                    onClick={() => setSelectedLeadId(lead.assignment_id)}
                    className={`w-full rounded-2xl border p-4 text-left transition-all ${
                      isSelected
                        ? "border-navavej-teal bg-navavej-teal/[0.04] shadow-sm"
                        : "border-navavej-border bg-white hover:border-navavej-teal/40"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-black text-navavej-navy">{lead.patient_name}</p>
                        <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-navavej-gray">{lead.scenario_label}</p>
                      </div>
                      <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-navavej-gray-dark">
                        {lead.status}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-black uppercase tracking-[0.14em] text-navavej-gray">
                      <span className="rounded-full bg-navavej-background px-3 py-1">{lead.overall_risk_level}</span>
                      <span className="rounded-full bg-navavej-background px-3 py-1">{lead.ai_recommended_tier}</span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-navavej-gray-dark">{lead.ai_lead_summary}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-navavej-border bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-navavej-teal">Lead action</p>
            <div className="mt-4 space-y-4">
              <div>
                <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.14em] text-navavej-gray">Lead status</label>
                <select
                  value={status}
                  onChange={(event) => setStatus(event.target.value as LeadStatus)}
                  className="w-full rounded-xl border border-navavej-border bg-white px-4 py-3 text-sm text-navavej-gray-dark outline-none focus:border-navavej-teal"
                >
                  {LEAD_STATUS_OPTIONS.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.14em] text-navavej-gray">Sales notes</label>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={5}
                  className="w-full rounded-xl border border-navavej-border bg-white px-4 py-3 text-sm text-navavej-gray-dark outline-none focus:border-navavej-teal"
                  placeholder="Capture outreach progress, objections, or next steps..."
                />
              </div>
              <button
                type="button"
                onClick={handleSave}
                disabled={!selectedLead || isSaving}
                className="inline-flex items-center rounded-full bg-navavej-teal px-5 py-3 text-xs font-black uppercase tracking-[0.18em] text-white transition hover:bg-navavej-teal-dark disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSaving ? "Saving..." : "Update lead"}
              </button>
            </div>
          </div>
        </section>

        <section>
          {selectedRecommendation ? <ReadOnlyRecommendationView data={selectedRecommendation} /> : null}
        </section>
      </div>
    </div>
  );
}
