"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

type PrivacyModeContextValue = {
  privacyMode: boolean;
  setPrivacyMode: (next: boolean) => void;
  togglePrivacyMode: () => void;
};

const PrivacyModeContext = createContext<PrivacyModeContextValue | null>(null);

const STORAGE_KEY = "navavej.privacyMode.v1";

export function PrivacyModeProvider({ children }: { children: React.ReactNode }) {
  const [privacyMode, setPrivacyModeState] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw === "1" || raw === "true") {
        setPrivacyModeState(true);
      }
      if (raw === "0" || raw === "false") {
        setPrivacyModeState(false);
      }
    } catch {
      return;
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, privacyMode ? "1" : "0");
    } catch {
      return;
    }
  }, [privacyMode]);

  const setPrivacyMode = useCallback((next: boolean) => {
    setPrivacyModeState(Boolean(next));
  }, []);

  const togglePrivacyMode = useCallback(() => {
    setPrivacyModeState((prev) => !prev);
  }, []);

  const value = useMemo<PrivacyModeContextValue>(
    () => ({ privacyMode, setPrivacyMode, togglePrivacyMode }),
    [privacyMode, setPrivacyMode, togglePrivacyMode]
  );

  return <PrivacyModeContext.Provider value={value}>{children}</PrivacyModeContext.Provider>;
}

export function usePrivacyMode(): PrivacyModeContextValue {
  const ctx = useContext(PrivacyModeContext);
  if (!ctx) {
    throw new Error("usePrivacyMode must be used within PrivacyModeProvider");
  }
  return ctx;
}

