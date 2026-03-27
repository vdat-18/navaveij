"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Lock } from "lucide-react";
import { encodeToken, MockTokenPayload, UserRole, useAuth } from "@/shared/auth-context";
import { usePatient } from "@/shared/patient-context";

const PERSONAS: { label: string; sub: string; name: string; role: UserRole }[] = [
  { label: "Dr. Ananya Sharma (Physician)", sub: "usr-physician-00001", name: "Dr. Ananya Sharma", role: "physician" },
  { label: "Nurse Somying Srisuk (Nurse)", sub: "usr-nurse-00001", name: "Nurse Somying Srisuk", role: "nurse" },
  { label: "Wanchai Thongchai (DPO Officer)", sub: "usr-dpo-00001", name: "Wanchai Thongchai", role: "dpo" },
  { label: "System Admin", sub: "usr-admin-00001", name: "System Admin", role: "admin" },
];

const FHIR_SCOPES = [
  { id: "patient_read", value: "patient/*.read", label: "patient/*.read", desc: "Read patient demographics and identifiers" },
  { id: "observation_read", value: "observation.read", label: "observation.read", desc: "Read clinical observations and lab results" },
  { id: "condition_read", value: "condition.read", label: "condition.read", desc: "Read diagnoses and clinical conditions" },
];

export default function LoginPage() {
  const router = useRouter();
  const { signIn } = useAuth();
  const { setSelectedPatient } = usePatient();
  const [selectedPersona, setSelectedPersona] = useState(0);

  const SEARCH_FLOW_ROLES = new Set(["physician", "nurse"]);

  const handleAuthorize = () => {
    const persona = PERSONAS[selectedPersona];
    const now = Math.floor(Date.now() / 1000);
    const payload: MockTokenPayload = {
      sub: persona.sub,
      name: persona.name,
      role: persona.role,
      fhir_scopes: FHIR_SCOPES.map((s) => s.value),
      iat: now,
      exp: now + 3600,
      iss: "https://auth.navavej.demo/realms/hospital",
    };
    // signIn sets token in React state AND sessionStorage before navigation,
    // preventing the auth guard from seeing a null token mid-redirect.
    signIn(encodeToken(payload));
    // Physician/nurse always start at the search screen — clear any previously
    // selected patient so localStorage doesn't restore it on load.
    if (SEARCH_FLOW_ROLES.has(persona.role)) {
      setSelectedPatient(null);
      router.replace("/");
    } else {
      router.replace("/access-monitoring");
    }
  };

  const handleDeny = () => {
    // Stay on login page — no token issued
    setSelectedPersona(0);
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-[#f0f2f5] flex items-center justify-center">
      {/* Keycloak-style card */}
      <div className="w-full max-w-md bg-white rounded-lg shadow-xl overflow-hidden">

        {/* Header bar */}
        <div className="bg-[#00ABC7] px-6 py-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
            <Lock className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-none">Navavej Hospital</p>
            <p className="text-white/70 text-[10px] mt-0.5">Demo Identity Provider · Powered by Keycloak</p>
          </div>
        </div>

        <div className="px-8 py-6">
          {/* App requesting access */}
          <div className="mb-6">
            <h1 className="text-lg font-black text-gray-800 mb-1">Authorization</h1>
            <p className="text-sm text-gray-500">
              <span className="font-bold text-[#00ABC7]">ROC Clinical Dashboard</span> is requesting access to your account.
            </p>
          </div>

          {/* Role selector */}
          <div className="mb-5">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
              Login as
            </label>
            <select
              value={selectedPersona}
              onChange={(e) => setSelectedPersona(Number(e.target.value))}
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#00ABC7]/30 focus:border-[#00ABC7]"
            >
              {PERSONAS.map((p, i) => (
                <option key={p.sub} value={i}>{p.label}</option>
              ))}
            </select>
          </div>

          {/* FHIR scopes */}
          <div className="mb-6">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
              Requested FHIR Scopes
            </label>
            <div className="border border-gray-100 rounded-md divide-y divide-gray-100 bg-gray-50">
              {FHIR_SCOPES.map((scope) => (
                <div key={scope.id} className="flex items-start gap-3 px-4 py-3">
                  <div className="mt-0.5 w-4 h-4 rounded border-2 border-[#00ABC7] bg-[#00ABC7] flex items-center justify-center flex-shrink-0">
                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 10 8">
                      <path d="M1 4l2.5 2.5L9 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-mono font-bold text-gray-700">{scope.label}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{scope.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Security note */}
          <div className="flex items-start gap-2 mb-6 bg-blue-50 rounded-md px-4 py-3">
            <ShieldCheck className="w-4 h-4 text-[#00ABC7] flex-shrink-0 mt-0.5" />
            <p className="text-[10px] text-gray-500 leading-relaxed">
              This is a <strong>demo authorization flow</strong>. No real credentials are transmitted.
              Token is stored in session storage and expires after 1 hour.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleDeny}
              className="flex-1 px-4 py-2.5 text-sm font-bold text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
            >
              Deny
            </button>
            <button
              onClick={handleAuthorize}
              className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-[#00ABC7] rounded-md hover:bg-[#0097b2] transition-colors shadow-sm"
            >
              Authorize
            </button>
          </div>
        </div>

        <div className="bg-gray-50 border-t border-gray-100 px-8 py-3 text-center">
          <p className="text-[9px] text-gray-400 uppercase tracking-widest font-bold">
            Navavej International Hospital · Clinical AI Platform · POC Demo
          </p>
        </div>
      </div>
    </div>
  );
}
