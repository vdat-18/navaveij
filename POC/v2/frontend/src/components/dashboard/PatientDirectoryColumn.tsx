"use client";

import React from "react";
import { Patient } from "@/types/patient";
import { PatientList } from "./PatientList";

interface PatientDirectoryColumnProps {
  onSelectPatient: (patient: Patient) => void;
  selectedId?: string;
  privacyMode?: boolean;
}

export function PatientDirectoryColumn({
  onSelectPatient,
  selectedId,
  privacyMode = false,
}: PatientDirectoryColumnProps) {
  return (
    <aside className="xl:col-span-2">
      <section className="bg-[#fcfdfe] p-4 rounded-[20px] border border-navavej-border min-h-[600px] shadow-inner h-full flex flex-col">
        <PatientList
          onSelectPatient={onSelectPatient}
          selectedId={selectedId}
          privacyMode={privacyMode}
        />
      </section>
    </aside>
  );
}
