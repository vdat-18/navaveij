"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { clearAuthCache } from "@/services/api";

export type UserRole = "physician" | "nurse" | "dpo" | "admin";

export interface MockTokenPayload {
  sub: string;
  name: string;
  role: UserRole;
  fhir_scopes: string[];
  iat: number;
  exp: number;
  iss: string;
}

type AuthContextValue = {
  token: string | null;
  user: MockTokenPayload | null;
  signIn: (token: string) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export const AUTH_STORAGE_KEY = "navavej.smartToken.v1";

export function decodeToken(token: string): MockTokenPayload | null {
  try {
    return JSON.parse(atob(token)) as MockTokenPayload;
  } catch {
    return null;
  }
}

export function encodeToken(payload: MockTokenPayload): string {
  return btoa(JSON.stringify(payload));
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // undefined = not yet read from storage; null = no token; string = valid token
  const [token, setToken] = useState<string | null | undefined>(undefined);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const stored = sessionStorage.getItem(AUTH_STORAGE_KEY);
    setToken(stored ?? null);
  }, []);

  useEffect(() => {
    if (pathname === "/login") return;
    if (token === undefined) return; // still initialising from sessionStorage
    if (!token) {
      router.replace("/login");
    }
  }, [token, pathname, router]);

  const signIn = useCallback((newToken: string) => {
    sessionStorage.setItem(AUTH_STORAGE_KEY, newToken);
    setToken(newToken);
  }, []);

  const logout = useCallback(() => {
    clearAuthCache();
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
    setToken(null);
  }, []);

  const user = useMemo(() => (token ? decodeToken(token) : null), [token]);

  const value = useMemo<AuthContextValue>(
    () => ({ token: token ?? null, user, signIn, logout }),
    [token, user, signIn, logout]
  );

  // Avoid flash: render nothing while auth is being read from storage
  // (except on the login page itself — always render there)
  if (token === undefined && pathname !== "/login") {
    return null;
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
