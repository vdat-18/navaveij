"use client";

import React from "react";
import { useAuth } from "@/shared/auth-context";

/** Roles that hide the sidebar and should have no left padding offset. */
const NO_SIDEBAR_ROLES = new Set(["physician", "nurse"]);

/**
 * Wraps the main content area.
 * - Admin / DPO: keeps the sidebar-width left padding (old behaviour).
 * - Physician / Nurse: no left padding (sidebar is hidden for these roles).
 */
export function RoleAwareMain({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const hasSidebar = user ? !NO_SIDEBAR_ROLES.has(user.role) : false;

  return (
    <main
      className="min-h-screen bg-white"
      style={hasSidebar ? { paddingLeft: "var(--sidebar-width)" } : undefined}
    >
      {children}
    </main>
  );
}
