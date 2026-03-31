"use client";

import { PatientDirectoryColumn } from "@/components/dashboard/PatientDirectoryColumn";
import { TrendTimelineScreen } from "@/components/trend-timeline/TrendTimelineScreen";
import { usePrivacyMode } from "@/shared/privacy-mode";
import { usePatient } from "@/shared/patient-context";
import { useAuth } from "@/shared/auth-context";
import { useRouter } from "next/navigation";
import React, { useEffect } from "react";

export default function TrendTimelinePage() {
  const { selectedPatient, setSelectedPatient } = usePatient();
  const { privacyMode, togglePrivacyMode } = usePrivacyMode();
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user && (user.role === "physician" || user.role === "nurse")) {
      router.replace("/");
    }
  }, [user, router]);

  if (user && (user.role === "physician" || user.role === "nurse")) {
    return null;
  }

  return (
    <main className="w-full pl-4 pr-8 lg:pl-8 lg:pr-16 py-10 min-h-screen bg-white">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-black text-navavej-gray-dark uppercase tracking-tighter">
          Trend & Timeline
        </h1>
        <div className="flex items-center gap-4">
          <div className="hidden md:flex flex-col mr-4">
            <span className="text-[9px] font-black text-navavej-gray-med uppercase tracking-widest text-right">Data Visibility</span>
            <span className="text-[10px] font-bold text-navavej-teal text-right">
              {privacyMode ? "Partial De-identification Active" : "Full Clinical View"}
            </span>
          </div>
          <button
            onClick={togglePrivacyMode}
            className={`px-4 py-2 rounded-full font-black text-[10px] uppercase tracking-widest transition-all shadow-sm border-2 ${privacyMode
                ? "bg-navavej-red text-white border-navavej-red"
                : "bg-white text-navavej-gray-med border-navavej-border hover:border-emerald-500 hover:text-emerald-600"
              }`}
          >
            {privacyMode ? "Privacy Mode On" : "Privacy Mode Off"}
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        <PatientDirectoryColumn
          onSelectPatient={setSelectedPatient}
          selectedId={selectedPatient?.patient_id}
          privacyMode={privacyMode}
        />
        <div className="xl:col-span-10">
          {selectedPatient ? (
            <TrendTimelineScreen
              patientName={selectedPatient.patient_name}
              patientId={selectedPatient.patient_id}
              patientToken={selectedPatient.patient_token}
              privacyMode={privacyMode}
            />
          ) : (
            <div className="navavej-card bg-white p-10 text-center">
              <p className="text-sm font-black text-navavej-gray-med uppercase">
                Select a patient to inspect trend and timeline data
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
