"use client";

import React from "react";
import { PrivacyModeProvider } from "@/shared/privacy-mode";

export function Providers({ children }: { children: React.ReactNode }) {
  return <PrivacyModeProvider>{children}</PrivacyModeProvider>;
}

