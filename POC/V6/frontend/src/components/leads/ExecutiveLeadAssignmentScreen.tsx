"use client";

import { useEffect, useMemo, useState } from "react";

import { ExecutiveAssignmentSection } from "@/components/leads/ExecutiveAssignmentSection";
import { ExecutiveTrackerSection } from "@/components/leads/ExecutiveTrackerSection";
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
  const [isUnassigning, setIsUnassigning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const unassignedPatients = useMemo(
    () => patients.filter((patient) => !patient.is_assigned),
    [patients]
  );

  useEffect(() => {
    if (unassignedPatients.length === 0) {
      if (selectedPatientId !== null) {
        setSelectedPatientId(null);
      }
      return;
    }

    const isValidSelection =
      selectedPatientId !== null && unassignedPatients.some((patient) => patient.patient_id === selectedPatientId);

    if (!isValidSelection) {
      setSelectedPatientId(unassignedPatients[0].patient_id);
    }
  }, [unassignedPatients, selectedPatientId]);

  const selectedPatient = useMemo(
    () => unassignedPatients.find((patient) => patient.patient_id === selectedPatientId) ?? null,
    [unassignedPatients, selectedPatientId]
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
      setSelectedSalesUserId("");
      await refreshData();
    } catch (assignError) {
      setError(assignError instanceof Error ? assignError.message : "Failed to assign lead.");
    } finally {
      setIsAssigning(false);
    }
  };

  const handleUnassign = async (assignmentId: string) => {
    try {
      setIsUnassigning(true);
      setError(null);
      await leadService.unassignLead(assignmentId);
      await refreshData();
    } catch (unassignError) {
      setError(unassignError instanceof Error ? unassignError.message : "Failed to unassign lead.");
    } finally {
      setIsUnassigning(false);
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

      <ExecutiveAssignmentSection
        unassignedPatients={unassignedPatients}
        selectedPatientId={selectedPatientId}
        onSelectPatientId={setSelectedPatientId}
        selectedRecommendation={selectedRecommendation}
        salesUsers={salesUsers}
        selectedSalesUserId={selectedSalesUserId}
        onSelectSalesUserId={setSelectedSalesUserId}
        assignmentNotes={assignmentNotes}
        onAssignmentNotesChange={setAssignmentNotes}
        onAssign={handleAssign}
        isAssigning={isAssigning}
      />

      <ExecutiveTrackerSection
        leads={leads}
        salesUsers={salesUsers}
        onUnassignLead={handleUnassign}
        isUnassigning={isUnassigning}
      />
    </div>
  );
}
