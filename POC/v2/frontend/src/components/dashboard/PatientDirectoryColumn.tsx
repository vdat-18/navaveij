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
    <div className="xl:col-span-2">
      <div className="bg-[#fcfdfe] p-4 rounded-[20px] border border-navavej-border min-h-[600px] shadow-inner">
        <PatientList
          onSelectPatient={onSelectPatient}
          selectedId={selectedId}
          privacyMode={privacyMode}
        />
      </div>
    </div>
  );
}
