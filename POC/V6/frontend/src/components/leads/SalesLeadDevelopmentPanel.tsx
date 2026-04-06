"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Maximize2, X } from "lucide-react";

import { ReadOnlyRecommendationView } from "@/components/leads/ReadOnlyRecommendationView";
import { SalesKanbanBoard } from "@/components/leads/SalesKanbanBoard";
import { StatusBadge } from "@/components/leads/LeadBadges";
import { getNextLeadStatus, LEAD_STATUS_ORDER } from "@/components/leads/leadVisualMaps";
import { leadService } from "@/services/api";
import { LeadAssignment, LeadStatus, PreRunnedRecommendation } from "@/types/leads";

const pickDefaultLeadId = (leadData: LeadAssignment[]): string | null => {
  for (const status of LEAD_STATUS_ORDER) {
    const firstInColumn = leadData
      .filter((lead) => lead.status === status)
      .sort((a, b) => a.assigned_at.localeCompare(b.assigned_at))[0];
    if (firstInColumn) return firstInColumn.assignment_id;
  }
  return leadData[0]?.assignment_id ?? null;
};

export function SalesLeadDevelopmentPanel({
  onLeadCountChange,
}: {
  onLeadCountChange?: (count: number) => void;
}) {
  const [leads, setLeads] = useState<LeadAssignment[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [selectedRecommendation, setSelectedRecommendation] = useState<PreRunnedRecommendation | null>(null);
  const [moveToStatus, setMoveToStatus] = useState<LeadStatus>("assigned");
  const [notes, setNotes] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastRecommendationTokenRef = useRef<string | null>(null);
  const [isDetailFullscreen, setIsDetailFullscreen] = useState(false);

  const selectedLead = useMemo(
    () => leads.find((lead) => lead.assignment_id === selectedLeadId) ?? null,
    [leads, selectedLeadId]
  );

  const refreshLeads = async () => {
    const leadData = await leadService.getLeads();
    setLeads(leadData);
    onLeadCountChange?.(leadData.length);
    const isValidSelection = selectedLeadId ? leadData.some((lead) => lead.assignment_id === selectedLeadId) : false;
    if (!isValidSelection) {
      setSelectedLeadId(leadData.length > 0 ? pickDefaultLeadId(leadData) : null);
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
      if (!selectedLeadId) {
        setSelectedRecommendation(null);
        lastRecommendationTokenRef.current = null;
        return;
      }
      const lead = leads.find((item) => item.assignment_id === selectedLeadId) ?? null;
      if (!lead) {
        setSelectedRecommendation(null);
        lastRecommendationTokenRef.current = null;
        return;
      }
      setMoveToStatus(getNextLeadStatus(lead.status));
      setNotes(lead.notes);
      try {
        if (lastRecommendationTokenRef.current !== lead.patient_token) {
          const recommendation = await leadService.getPreRunnedRecommendation(lead.patient_token);
          setSelectedRecommendation(recommendation);
          lastRecommendationTokenRef.current = lead.patient_token;
        }
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Failed to load lead recommendation.");
      }
    };
    void loadRecommendation();
  }, [selectedLeadId, leads]);

  const handleSave = async () => {
    if (!selectedLead) {
      return;
    }
    try {
      setIsSaving(true);
      setError(null);
      const updatedLead = await leadService.updateLeadStatus(selectedLead.assignment_id, moveToStatus, notes);
      setLeads((current) => current.map((lead) => lead.assignment_id === updatedLead.assignment_id ? updatedLead : lead));
      setMoveToStatus(getNextLeadStatus(updatedLead.status));
      onLeadCountChange?.(leads.length);
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
          Executive-assigned pre-run patients will appear here for follow-up without any AI rerun.
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
                {leads.length} total
              </span>
            </div>
            <div className="mt-5">
              <SalesKanbanBoard
                leads={leads}
                selectedLeadId={selectedLeadId}
                onSelectLead={setSelectedLeadId}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-navavej-border bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-navavej-teal">Lead action</p>
            <div className="mt-4 space-y-4">
              <div>
                <div className="flex items-center justify-between gap-3">
                  <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.14em] text-navavej-gray">Move to</label>
                  {selectedLead ? <StatusBadge status={selectedLead.status} className="mb-2" /> : null}
                </div>
                <select
                  value={moveToStatus}
                  onChange={(event) => setMoveToStatus(event.target.value as LeadStatus)}
                  className="w-full rounded-xl border border-navavej-border bg-white px-4 py-3 text-sm text-navavej-gray-dark outline-none focus:border-navavej-teal"
                >
                  {LEAD_STATUS_ORDER.map((option) => (
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

        <section className="space-y-3">
          {selectedRecommendation ? (
            <>
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-navavej-gray">
                  Patient detail
                </p>
                <button
                  type="button"
                  onClick={() => setIsDetailFullscreen(true)}
                  className="inline-flex items-center gap-2 rounded-full border border-navavej-border bg-white px-4 py-2 text-[11px] font-black uppercase tracking-[0.14em] text-navavej-gray-dark hover:border-navavej-teal/40 hover:text-navavej-teal transition"
                >
                  <Maximize2 className="h-4 w-4" />
                  Focus
                </button>
              </div>
              <ReadOnlyRecommendationView data={selectedRecommendation} />
            </>
          ) : (
            <div className="rounded-2xl border border-navavej-border bg-white p-6 text-sm text-navavej-gray-dark">
              Select a lead to preview the recommendation.
            </div>
          )}
        </section>
      </div>

      {isDetailFullscreen && selectedRecommendation ? (
        <div className="fixed inset-0 z-[80] bg-black/40 p-4 backdrop-blur-[2px]">
          <div className="mx-auto flex h-full w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-navavej-border bg-white shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-navavej-border bg-white px-5 py-4">
              <div className="min-w-0">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-navavej-gray">
                  Focus mode
                </p>
                <p className="truncate text-sm font-black text-navavej-gray-dark">
                  {selectedRecommendation.patient_name} • {selectedRecommendation.scenario_label}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsDetailFullscreen(false)}
                className="inline-flex items-center gap-2 rounded-full bg-navavej-background px-4 py-2 text-[11px] font-black uppercase tracking-[0.14em] text-navavej-gray-dark hover:bg-navavej-border transition"
              >
                <X className="h-4 w-4" />
                Close
              </button>
            </div>
            <div className="flex-1 overflow-y-auto bg-navavej-background p-4">
              <ReadOnlyRecommendationView data={selectedRecommendation} />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
