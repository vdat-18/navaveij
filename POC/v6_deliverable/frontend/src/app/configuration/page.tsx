"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ConfigurationScreen } from "@/components/configuration/ConfigurationScreen";
import { useAuth } from "@/shared/auth-context";

export default function ConfigurationPage() {
  const { user } = useAuth();
  const router = useRouter();
  const role = user?.role ?? null;

  useEffect(() => {
    if (user && user.role !== "sysadmin") {
      router.replace(user.role === "executive" ? "/management" : "/");
    }
  }, [user, router]);

  if (!user || user.role !== "sysadmin") return null;

  return (
    <main className="w-full px-8 lg:px-16 py-10 min-h-screen bg-white space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-navavej-gray-dark uppercase tracking-tighter">
            Configuration
          </h1>
          <p className="text-xs font-bold text-navavej-gray-med mt-2">
            System configuration — role management, mapping tools, master data, and AI/MCP settings.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="border border-navavej-border rounded-lg px-3 py-2 text-xs font-black uppercase text-navavej-gray-dark">
            {role}
          </span>
        </div>
      </div>

      <ConfigurationScreen role="sysadmin" />
    </main>
  );
}
