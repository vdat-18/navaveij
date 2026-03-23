"use client";

import React, { useEffect, useState } from "react";
import { User, ChevronRight, Activity, Search } from "lucide-react";
import { patientService } from "@/services/api";
import { cn } from "@/shared/utils";

interface Patient {
    patient_id: string;
    patient_name: string;
    patient_token: string;
}

interface PatientListProps {
    onSelectPatient: (patient: Patient) => void;
    selectedId?: string;
    privacyMode?: boolean;
}

export function PatientList({ onSelectPatient, selectedId, privacyMode = false }: PatientListProps) {
    const [patients, setPatients] = useState<Patient[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState("");

    useEffect(() => {
        const fetchPatients = async () => {
            try {
                const data = await patientService.getAll();
                setPatients(data);
            } catch (err) {
                console.error("Failed to fetch patients:", err);
                setError(err instanceof Error ? err.message : "Failed to load patients");
            } finally {
                setLoading(false);
            }
        };
        fetchPatients();
    }, []);

    const normalizedSearch = search.toLowerCase();
    const filtered = patients.filter((p) => {
        const idMatch = p.patient_id.toLowerCase().includes(normalizedSearch);
        if (!privacyMode) {
            return p.patient_name.toLowerCase().includes(normalizedSearch) || idMatch;
        }
        return idMatch || p.patient_token.toLowerCase().includes(normalizedSearch);
    });

    if (loading) {
        return (
            <div className="space-y-4 px-1">
                <div className="h-10 bg-navavej-gray-light rounded-xl animate-pulse" />
                {[1, 2, 3].map((i) => (
                    <div key={i} className="h-20 bg-navavej-gray-light rounded-[15px] animate-pulse" />
                ))}
            </div>
        );
    }

    if (error) {
        return (
            <div className="space-y-4 px-1 py-4 text-center text-red-500">
                <p className="text-xs font-bold">{error}</p>
            </div>
        );
    }

    return (
        <section className="flex flex-col h-full" aria-label="Find and select patient">
            <header className="flex items-center justify-between px-2 mb-3">
                <h3 className="text-[10px] font-black text-navavej-gray-med uppercase tracking-[0.15em]">
                    Clinical Workspace
                </h3>
                <span className="bg-navavej-teal/10 text-navavej-teal text-[10px] font-black px-2 py-0.5 rounded-full">
                    {filtered.length} Active
                </span>
            </header>

            <div className="sticky top-0 z-10 bg-[#fcfdfe] pb-3">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-navavej-gray-med" />
                    <input
                        type="text"
                        aria-label="Search patients"
                        placeholder={privacyMode ? "Find by token / ID..." : "Find patients..."}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-navavej-gray-light border-none rounded-xl py-2 pl-9 pr-4 text-xs focus:ring-2 focus:ring-navavej-teal/30 focus:outline-none placeholder:text-navavej-gray-med transition-all"
                    />
                </div>
            </div>

            <div className="pr-1 custom-scrollbar overflow-y-auto flex-1 min-h-0">
                {filtered.length > 0 ? (
                    <ul className="space-y-3" aria-label="Patient results">
                        {filtered.map((patient, index) => (
                            <li key={patient.patient_id}>
                                <button
                                    onClick={() => onSelectPatient(patient)}
                                    className={cn(
                                        "navavej-card w-full flex items-center justify-between p-3 transition-all duration-300 group",
                                        selectedId === patient.patient_id
                                            ? "border-navavej-teal bg-white ring-2 ring-navavej-teal/5"
                                            : "hover:border-navavej-teal/40 bg-white"
                                    )}
                                >
                                    <div className="flex items-center gap-2">
                                        <div className={cn(
                                            "w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-500",
                                            selectedId === patient.patient_id
                                                ? "bg-navavej-teal text-white shadow-lg shadow-navavej-teal/20 rotate-3"
                                                : "bg-navavej-gray-light text-navavej-gray-med group-hover:bg-navavej-teal/10 group-hover:text-navavej-teal"
                                        )}>
                                            <User className="w-4 h-4" />
                                        </div>
                                        <div className="text-left">
                                            <p className={cn(
                                                "text-xs font-bold leading-tight transition-colors",
                                                selectedId === patient.patient_id ? "text-navavej-teal" : "text-navavej-gray-dark"
                                            )}>
                                                {privacyMode ? `Patient ${index + 1}` : patient.patient_name}
                                            </p>
                                            <p className="text-[9px] text-navavej-gray-med font-bold uppercase tracking-wider mt-0.5">
                                                {privacyMode ? "ID hidden" : patient.patient_id}
                                            </p>
                                        </div>
                                    </div>
                                    {selectedId === patient.patient_id ? (
                                        <Activity className="w-4 h-4 text-navavej-teal animate-pulse" />
                                    ) : (
                                        <ChevronRight className="w-4 h-4 text-navavej-border group-hover:text-navavej-teal transition-transform group-hover:translate-x-1" />
                                    )}
                                </button>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <div className="py-12 flex flex-col items-center justify-center opacity-40">
                        <Search className="w-10 h-10 mb-2" />
                        <p className="text-xs font-bold uppercase">No patients found</p>
                    </div>
                )}
            </div>
        </section>
    );
}
