"use client";

import React, { useEffect, useState } from "react";
import { Search, User, Activity, ChevronRight } from "lucide-react";
import { patientService } from "@/services/api";
import { cn } from "@/shared/utils";
import { Patient } from "@/types/patient";

interface PatientSearchEntryProps {
  onSelectPatient: (patient: Patient) => void;
  privacyMode?: boolean;
}

/**
 * Full-page patient search entry point for physicians and nurses.
 * Replaces the old sidebar patient list with a centered search experience.
 */
export function PatientSearchEntry({ onSelectPatient, privacyMode = false }: PatientSearchEntryProps) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    patientService.getAll()
      .then((data) => setPatients(data))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load patients"))
      .finally(() => setLoading(false));
  }, []);

  const normalizedSearch = search.toLowerCase().trim();
  const filtered = normalizedSearch
    ? patients.filter((p) => {
        if (privacyMode) {
          return (
            p.patient_id.toLowerCase().includes(normalizedSearch) ||
            p.patient_token.toLowerCase().includes(normalizedSearch)
          );
        }
        return (
          p.patient_name.toLowerCase().includes(normalizedSearch) ||
          p.patient_id.toLowerCase().includes(normalizedSearch)
        );
      })
    : patients;

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-start pt-16 px-4">
      {/* Heading */}
      <div className="text-center mb-10">
        <p className="text-[10px] font-black text-navavej-teal uppercase tracking-[0.3em] mb-2">
          Clinical Guidance System
        </p>
        <h2 className="text-4xl font-black text-navavej-gray-dark tracking-tighter uppercase italic leading-none">
          Select a <span className="text-navavej-teal">Patient</span>
        </h2>
        <p className="text-sm text-navavej-gray-med font-medium mt-3">
          Search by patient name or ID to open their clinical dashboard.
        </p>
      </div>

      {/* Search Bar */}
      <div className="w-full max-w-xl mb-8">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-navavej-gray-med" />
          <input
            type="text"
            aria-label="Search patients"
            placeholder={privacyMode ? "Search by token or ID..." : "Search by name or patient ID..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
            className="w-full bg-white border-2 border-navavej-border rounded-2xl py-4 pl-12 pr-5 text-sm font-medium text-navavej-gray-dark shadow-md focus:ring-2 focus:ring-navavej-teal/30 focus:border-navavej-teal focus:outline-none placeholder:text-navavej-gray-med transition-all"
          />
        </div>
        {!loading && !error && (
          <p className="text-[10px] font-bold text-navavej-gray-med uppercase tracking-widest text-center mt-2">
            {filtered.length} patient{filtered.length !== 1 ? "s" : ""} available
          </p>
        )}
      </div>

      {/* Results */}
      <div className="w-full max-w-xl">
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-[72px] bg-navavej-gray-light rounded-2xl animate-pulse" />
            ))}
          </div>
        )}

        {error && (
          <div className="text-center py-10 text-navavej-red text-sm font-bold">
            {error}
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="text-center py-16 flex flex-col items-center opacity-40">
            <Search className="w-12 h-12 mb-3" />
            <p className="text-sm font-black uppercase tracking-wider">No patients found</p>
            <p className="text-xs font-medium mt-1">Try a different name or ID</p>
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <ul className="space-y-3" aria-label="Patient results">
            {filtered.map((patient, index) => (
              <li key={patient.patient_id}>
                <button
                  onClick={() => onSelectPatient(patient)}
                  className={cn(
                    "navavej-card w-full flex items-center justify-between p-4 transition-all duration-200 group",
                    "hover:border-navavej-teal/50 hover:shadow-md active:scale-[0.98] bg-white"
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-xl bg-navavej-teal/10 flex items-center justify-center flex-shrink-0 group-hover:bg-navavej-teal group-hover:text-white transition-all duration-300">
                      <User className="w-5 h-5 text-navavej-teal group-hover:text-white transition-colors" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-black text-navavej-gray-dark leading-tight group-hover:text-navavej-teal transition-colors">
                        {privacyMode ? `Patient ${index + 1}` : patient.patient_name}
                      </p>
                      <p className="text-[10px] text-navavej-gray-med font-bold uppercase tracking-wider mt-0.5">
                        {privacyMode ? "ID hidden" : patient.patient_id}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Activity className="w-4 h-4 text-navavej-teal opacity-0 group-hover:opacity-100 transition-opacity" />
                    <ChevronRight className="w-5 h-5 text-navavej-border group-hover:text-navavej-teal transition-all group-hover:translate-x-1" />
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
