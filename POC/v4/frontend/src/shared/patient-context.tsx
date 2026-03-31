"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Patient } from "@/types/patient";

type PatientContextValue = {
  selectedPatient: Patient | null;
  setSelectedPatient: (patient: Patient | null) => void;
};

const PatientContext = createContext<PatientContextValue | null>(null);

const STORAGE_KEY = "navavej.selectedPatient.v1";

export function PatientProvider({ children }: { children: React.ReactNode }) {
  const [selectedPatient, setSelectedPatientState] = useState<Patient | null>(null);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Patient;
        if (parsed?.patient_id) {
          setSelectedPatientState(parsed);
        }
      }
    } catch {
      return;
    }
  }, []);

  useEffect(() => {
    try {
      if (selectedPatient) {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedPatient));
      } else {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      return;
    }
  }, [selectedPatient]);

  const setSelectedPatient = useCallback((patient: Patient | null) => {
    setSelectedPatientState(patient);
  }, []);

  const value = useMemo<PatientContextValue>(
    () => ({ selectedPatient, setSelectedPatient }),
    [selectedPatient, setSelectedPatient]
  );

  return <PatientContext.Provider value={value}>{children}</PatientContext.Provider>;
}

export function usePatient(): PatientContextValue {
  const ctx = useContext(PatientContext);
  if (!ctx) {
    throw new Error("usePatient must be used within PatientProvider");
  }
  return ctx;
}
