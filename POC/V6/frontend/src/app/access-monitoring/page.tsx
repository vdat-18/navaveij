"use client";

import React from "react";
import Link from "next/link";
import { AccessMonitoringScreen } from "@/components/access-monitoring/AccessMonitoringScreen";
import { useAuth } from "@/shared/auth-context";
import { usePrivacyMode } from "@/shared/privacy-mode";

export default function AccessMonitoringPage() {
  const { user } = useAuth();
  const role = user?.role ?? null;
  const { privacyMode, togglePrivacyMode } = usePrivacyMode();

  if (role !== "executive" && role !== "sysadmin") {
    return (
      <main className="w-full px-8 lg:px-16 py-10 min-h-screen bg-white flex flex-col items-center justify-center space-y-4">
        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center">
          <span className="text-2xl">🔒</span>
        </div>
        <h1 className="text-2xl font-black text-navavej-gray-dark uppercase tracking-tight">Access Denied</h1>
        <p className="text-sm font-medium text-navavej-gray-med">
          Your current role ({role}) does not have permission to view the Access Monitoring dashboard.
        </p>
        <Link href="/" className="mt-4 px-6 py-2 bg-navavej-gray-light text-navavej-gray-dark text-xs font-bold rounded-lg uppercase tracking-widest hover:bg-navavej-border transition-colors">
          Return to Dashboard
        </Link>
      </main>
    );
  }

  return (
    <main className="w-full px-8 lg:px-16 py-10 min-h-screen bg-white space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-navavej-gray-dark uppercase tracking-tighter">
            Access Monitoring & Audit Log
          </h1>
          <p className="text-xs font-bold text-navavej-gray-med mt-2">
            Live metrics, anomaly alerts, and audit log forensics.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden md:flex flex-col mr-2">
            <span className="text-[9px] font-black text-navavej-gray-med uppercase tracking-widest text-right">Data Visibility</span>
            <span className="text-[10px] font-bold text-navavej-teal text-right">
              {privacyMode ? "Partial De-identification Active" : "Full Clinical View"}
            </span>
          </div>
          <button
            type="button"
            onClick={togglePrivacyMode}
            className={`hidden md:flex items-center gap-2 px-4 py-2 rounded-full font-black text-[10px] uppercase tracking-widest transition-all shadow-sm border-2 ${
              privacyMode
                ? "bg-navavej-red text-white border-navavej-red"
                : "bg-white text-navavej-gray-med border-navavej-border hover:border-emerald-500 hover:text-emerald-600"
            }`}
          >
            {privacyMode ? "Privacy Mode On" : "Privacy Mode Off"}
          </button>
          <span className="border border-navavej-border rounded-lg px-3 py-2 text-xs font-black uppercase text-navavej-gray-dark">
            {role}
          </span>
        </div>
      </div>

      <AccessMonitoringScreen role={role as "executive" | "sysadmin"} />
    </main>
  );
}
