"use client";

import { useEffect, useMemo, useState } from "react";

import { ReadOnlyRecommendationView } from "@/components/leads/ReadOnlyRecommendationView";
import { leadService } from "@/services/api";
import { LeadAssignment, PreRunnedPatient, PreRunnedRecommendation, SalesUser } from "@/types/leads";

export function ExecutiveLeadAssignmentScreen() {
  const [patients, setPatients] = useState<PreRunnedPatient[]>([]);
  const [leads, setLeads] = useState<LeadAssignment[]>([]);
  const [salesUsers, setSalesUsers] = useState<SalesUser[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [selectedSalesUserId, setSelectedSalesUserId] = useState<string>("");
  const [assignmentNotes, setAssignmentNotes] = useState("");
  const [selectedRecommendation, setSelectedRecommendation] = useState<PreRunnedRecommendation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAssigning, setIsAssigning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedPatient = useMemo(
    () => patients.find((patient) => patient.patient_id === selectedPatientId) ?? null,
    [patients, selectedPatientId]
  );

  const refreshData = async () => {
    const [patientData, leadData, salesData] = await Promise.all([
      leadService.getPreRunnedPatients(),
      leadService.getLeads(),
      leadService.getSalesUsers(),
    ]);
    setPatients(patientData);
    setLeads(leadData);
    setSalesUsers(salesData);
    if (!selectedPatientId && patientData.length > 0) {
      setSelectedPatientId(patientData[0].patient_id);
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true);
        setError(null);
        await refreshData();
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Failed to load lead assignment data.");
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, []);

  useEffect(() => {
    const loadRecommendation = async () => {
      if (!selectedPatient) {
        setSelectedRecommendation(null);
        return;
      }
      try {
        const recommendation = await leadService.getPreRunnedRecommendation(selectedPatient.patient_token);
        setSelectedRecommendation(recommendation);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Failed to load recommendation preview.");
      }
    };
    void loadRecommendation();
  }, [selectedPatient]);

  const handleAssign = async () => {
    if (!selectedPatient || !selectedSalesUserId) {
      return;
    }
    const salesUser = salesUsers.find((user) => user.user_id === selectedSalesUserId);
    if (!salesUser) {
      return;
    }
    try {
      setIsAssigning(true);
      setError(null);
      await leadService.assignLead(selectedPatient.patient_id, salesUser.user_id, salesUser.name, assignmentNotes);
      setAssignmentNotes("");
      await refreshData();
    } catch (assignError) {
      setError(assignError instanceof Error ? assignError.message : "Failed to assign lead.");
    } finally {
      setIsAssigning(false);
    }
  };

  if (isLoading) {
    return <div className="rounded-2xl border border-navavej-border bg-white p-6 text-sm text-navavej-gray-dark">Loading lead assignment workspace...</div>;
  }

  return (
    <div className="space-y-6">
      {error ? (
        <div className="rounded-2xl border border-navavej-red/20 bg-navavej-red/[0.03] px-4 py-3 text-sm text-navavej-red">
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <section className="space-y-4">
          <div className="rounded-2xl border border-navavej-border bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-navavej-teal">Pre-runned patient pool</p>
                <h2 className="mt-2 text-2xl font-black text-navavej-gray-dark">Executive lead assignment</h2>
                <p className="mt-2 text-sm leading-6 text-navavej-gray-dark">
                  Assign pre-runned outreach candidates to sales without triggering any new AI run.
                </p>
              </div>
              <div className="rounded-xl border border-navavej-border bg-navavej-background px-4 py-3 text-right">
                <p className="text-[11px] font-black uppercase tracking-[0.14em] text-navavej-gray">Available leads</p>
                <p className="mt-1 text-2xl font-black text-navavej-navy">{patients.filter((patient) => !patient.is_assigned).length}</p>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {patients.map((patient) => {
                const isSelected = patient.patient_id === selectedPatientId;
                return (
                  <button
                    key={patient.patient_id}
                    type="button"
                    onClick={() => setSelectedPatientId(patient.patient_id)}
                    className={`w-full rounded-2xl border p-4 text-left transition-all ${
                      isSelected
                        ? "border-navavej-teal bg-navavej-teal/[0.04] shadow-sm"
                        : "border-navavej-border bg-white hover:border-navavej-teal/40"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-black text-navavej-navy">{patient.patient_name}</p>
                        <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-navavej-gray">{patient.scenario_label}</p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] ${patient.is_assigned ? "bg-navavej-gray-light text-navavej-gray-dark" : "bg-emerald-50 text-emerald-700"}`}>
                        {patient.is_assigned ? `Assigned${patient.assigned_to_name ? ` • ${patient.assigned_to_name}` : ""}` : "Ready"}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-black uppercase tracking-[0.14em] text-navavej-gray">
                      <span className="rounded-full bg-navavej-background px-3 py-1">{patient.overall_risk_level}</span>
                      <span className="rounded-full bg-navavej-background px-3 py-1">{patient.ai_recommended_tier}</span>
                      {patient.age ? <span className="rounded-full bg-navavej-background px-3 py-1">Age {patient.age}</span> : null}
                    </div>
                    <p className="mt-3 text-sm leading-6 text-navavej-gray-dark">{patient.ai_lead_summary}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-navavej-border bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-navavej-teal">Assign selected lead</p>
            <div className="mt-4 space-y-4">
              <div>
                <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.14em] text-navavej-gray">Sales owner</label>
                <select
                  value={selectedSalesUserId}
                  onChange={(event) => setSelectedSalesUserId(event.target.value)}
                  className="w-full rounded-xl border border-navavej-border bg-white px-4 py-3 text-sm text-navavej-gray-dark outline-none focus:border-navavej-teal"
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
                  onChange={(event) => setAssignmentNotes(event.target.value)}
                  rows={4}
                  className="w-full rounded-xl border border-navavej-border bg-white px-4 py-3 text-sm text-navavej-gray-dark outline-none focus:border-navavej-teal"
                  placeholder="Add context for the sales follow-up..."
                />
              </div>
              <button
                type="button"
                onClick={handleAssign}
                disabled={!selectedPatient || selectedPatient.is_assigned || !selectedSalesUserId || isAssigning}
                className="inline-flex items-center rounded-full bg-navavej-teal px-5 py-3 text-xs font-black uppercase tracking-[0.18em] text-white transition hover:bg-navavej-teal-dark disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isAssigning ? "Assigning..." : "Assign lead"}
              </button>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          {selectedRecommendation ? <ReadOnlyRecommendationView data={selectedRecommendation} /> : null}

          <div className="rounded-2xl border border-navavej-border bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-navavej-teal">Assignment tracker</p>
                <h3 className="mt-2 text-xl font-black text-navavej-gray-dark">Current lead ownership</h3>
              </div>
              <span className="rounded-full bg-navavej-background px-4 py-2 text-[11px] font-black uppercase tracking-[0.14em] text-navavej-gray">
                {leads.length} active leads
              </span>
            </div>
            <div className="mt-4 space-y-3">
              {leads.map((lead) => (
                <div key={lead.assignment_id} className="rounded-2xl border border-navavej-border bg-navavej-background p-4">
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
                    <span className="rounded-full bg-white px-3 py-1">{lead.assigned_to_name}</span>
                    <span className="rounded-full bg-white px-3 py-1">{lead.overall_risk_level}</span>
                    <span className="rounded-full bg-white px-3 py-1">{lead.ai_recommended_tier}</span>
                  </div>
                  {lead.notes ? <p className="mt-3 text-sm leading-6 text-navavej-gray-dark">{lead.notes}</p> : null}
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
