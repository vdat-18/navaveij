"use client";

import React from "react";
import { PrivacyModeProvider } from "@/shared/privacy-mode";
import { PatientProvider } from "@/shared/patient-context";
import { AuthProvider } from "@/shared/auth-context";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <PrivacyModeProvider>
        <PatientProvider>{children}</PatientProvider>
      </PrivacyModeProvider>
    </AuthProvider>
  );
}

