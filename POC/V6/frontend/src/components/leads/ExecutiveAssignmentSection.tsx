"use client";

import { ReadOnlyRecommendationView } from "@/components/leads/ReadOnlyRecommendationView";
import { RiskDot } from "@/components/leads/LeadBadges";
import { getRiskStyles } from "@/components/leads/leadVisualMaps";
import type { PreRunnedPatient, PreRunnedRecommendation, SalesUser } from "@/types/leads";
import { Maximize2, X } from "lucide-react";
import { useEffect, useState } from "react";

export function ExecutiveAssignmentSection({
  unassignedPatients,
  selectedPatientId,
  onSelectPatientId,
  selectedRecommendation,
  salesUsers,
  selectedSalesUserId,
  onSelectSalesUserId,
  assignmentNotes,
  onAssignmentNotesChange,
  onAssign,
  isAssigning,
}: {
  unassignedPatients: PreRunnedPatient[];
  selectedPatientId: string | null;
  onSelectPatientId: (patientId: string) => void;
  selectedRecommendation: PreRunnedRecommendation | null;
  salesUsers: SalesUser[];
  selectedSalesUserId: string;
  onSelectSalesUserId: (salesUserId: string) => void;
  assignmentNotes: string;
  onAssignmentNotesChange: (notes: string) => void;
  onAssign: () => void;
  isAssigning: boolean;
}) {
  const selectedPatient =
    unassignedPatients.find((patient) => patient.patient_id === selectedPatientId) ?? null;
  const [isPreviewFullscreen, setIsPreviewFullscreen] = useState(false);

  useEffect(() => {
    if (!selectedRecommendation) {
      setIsPreviewFullscreen(false);
    }
  }, [selectedRecommendation]);

  return (
    <section className="space-y-4">
      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-2xl border border-navavej-border bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-navavej-teal">Pre-run patient pool</p>
              <h2 className="mt-2 text-2xl font-black text-navavej-gray-dark">Lead assignment</h2>
              <p className="mt-2 text-sm leading-6 text-navavej-gray-dark">
                Assign pre-run outreach candidates to sales without triggering any new AI run.
              </p>
            </div>
            <div className="rounded-xl border border-navavej-border bg-navavej-background px-4 py-3 text-right">
              <p className="text-[11px] font-black uppercase tracking-[0.14em] text-navavej-gray">Unassigned</p>
              <p className="mt-1 text-2xl font-black text-navavej-navy">{unassignedPatients.length}</p>
            </div>
          </div>

          {unassignedPatients.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-navavej-border bg-navavej-background p-5">
              <p className="text-sm font-black text-navavej-gray-dark">No unassigned leads</p>
              <p className="mt-2 text-sm leading-6 text-navavej-gray-dark">
                All pre-run leads have been assigned. Use the tracker below to monitor progress.
              </p>
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {unassignedPatients.map((patient) => {
                const isSelected = patient.patient_id === selectedPatientId;
                const riskStyles = getRiskStyles(patient.overall_risk_level);
                return (
                  <button
                    key={patient.patient_id}
                    type="button"
                    onClick={() => onSelectPatientId(patient.patient_id)}
                    className={`w-full rounded-2xl border border-l-4 p-4 text-left transition-all ${
                      isSelected
                        ? "border-navavej-teal bg-navavej-teal/[0.04] shadow-sm"
                        : "border-navavej-border bg-white hover:border-navavej-teal/40"
                    } ${riskStyles.borderLeft}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-black text-navavej-navy">{patient.patient_name}</p>
                        <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-navavej-gray">
                          {patient.scenario_label}
                        </p>
                      </div>
                      <span className="inline-flex items-center gap-2 rounded-full border border-navavej-border bg-white px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-navavej-gray-dark">
                        <RiskDot riskLevel={patient.overall_risk_level} />
                        Ready
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-black uppercase tracking-[0.14em] text-navavej-gray">
                      <span className="inline-flex items-center gap-2 rounded-full bg-navavej-background px-3 py-1">
                        <RiskDot riskLevel={patient.overall_risk_level} className="h-2 w-2" />
                        {patient.overall_risk_level}
                      </span>
                      <span className="rounded-full bg-navavej-background px-3 py-1">{patient.ai_recommended_tier}</span>
                      {patient.age ? <span className="rounded-full bg-navavej-background px-3 py-1">Age {patient.age}</span> : null}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="space-y-4">
          {selectedRecommendation ? (
            <>
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-navavej-gray">
                  Recommendation preview
                </p>
                <button
                  type="button"
                  onClick={() => setIsPreviewFullscreen(true)}
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
              {unassignedPatients.length === 0
                ? "No recommendation preview available until new pre-run leads exist."
                : "Select a lead to preview the recommendation."}
            </div>
          )}

          <div className="rounded-2xl border border-navavej-border bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-navavej-teal">Assign selected lead</p>
            {selectedPatient ? (
              <p className="mt-2 text-sm font-semibold text-navavej-gray-dark">
                Assigning: <span className="font-black text-navavej-navy">{selectedPatient.patient_name}</span>
              </p>
            ) : null}
            <div className="mt-4 space-y-4">
              <div>
                <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.14em] text-navavej-gray">Sales owner</label>
                <select
                  value={selectedSalesUserId}
                  onChange={(event) => onSelectSalesUserId(event.target.value)}
                  disabled={!selectedPatient || isAssigning}
                  className="w-full rounded-xl border border-navavej-border bg-white px-4 py-3 text-sm text-navavej-gray-dark outline-none focus:border-navavej-teal disabled:cursor-not-allowed disabled:bg-navavej-background"
                >
                  <option value="">Select sales user</option>
                  {salesUsers.map((user) => (
                    <option key={user.user_id} value={user.user_id}>{user.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.14em] text-navavej-gray">Executive notes</label>
                <textarea
                  value={assignmentNotes}
                  onChange={(event) => onAssignmentNotesChange(event.target.value)}
                  rows={4}
                  disabled={!selectedPatient || isAssigning}
                  className="w-full rounded-xl border border-navavej-border bg-white px-4 py-3 text-sm text-navavej-gray-dark outline-none focus:border-navavej-teal disabled:cursor-not-allowed disabled:bg-navavej-background"
                  placeholder="Add context for the sales follow-up..."
                />
              </div>
              <button
                type="button"
                onClick={onAssign}
                disabled={!selectedPatient || !selectedSalesUserId || isAssigning}
                className="inline-flex items-center rounded-full bg-navavej-teal px-5 py-3 text-xs font-black uppercase tracking-[0.18em] text-white transition hover:bg-navavej-teal-dark disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isAssigning ? "Assigning..." : "Assign lead"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {isPreviewFullscreen && selectedRecommendation ? (
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
                onClick={() => setIsPreviewFullscreen(false)}
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
    </section>
  );
}
