"use client";

import Link from "next/link";

import { ExecutiveLeadAssignmentScreen } from "@/components/leads/ExecutiveLeadAssignmentScreen";
import { useAuth } from "@/shared/auth-context";

export default function LeadAssignmentPage() {
  const { user } = useAuth();
  const role = user?.role ?? null;

  if (role !== "executive") {
    return (
      <main className="w-full px-8 lg:px-16 py-10 min-h-screen bg-white flex flex-col items-center justify-center space-y-4">
        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center">
          <span className="text-2xl">🔒</span>
        </div>
        <h1 className="text-2xl font-black text-navavej-gray-dark uppercase tracking-tight">Access Denied</h1>
        <p className="text-sm font-medium text-navavej-gray-med">
          Your current role ({role}) does not have permission to view the lead assignment workspace.
        </p>
        <Link href="/" className="mt-4 px-6 py-2 bg-navavej-gray-light text-navavej-gray-dark text-xs font-bold rounded-lg uppercase tracking-widest hover:bg-navavej-border transition-colors">
          Return to Dashboard
        </Link>
      </main>
    );
  }

  return (
    <main className="w-full px-8 lg:px-16 py-10 min-h-screen bg-white space-y-6">
      <div>
        <h1 className="text-3xl font-black text-navavej-gray-dark uppercase tracking-tighter">
          Lead Assignment Flow
        </h1>
        <p className="text-xs font-bold text-navavej-gray-med mt-2">
          Executive workspace for assigning pre-runned outreach leads to sales.
        </p>
      </div>
      <ExecutiveLeadAssignmentScreen />
    </main>
  );
}
