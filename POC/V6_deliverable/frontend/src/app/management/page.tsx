"use client";

import React, { useEffect } from "react";
import { useAuth } from "@/shared/auth-context";
import { useRouter } from "next/navigation";
import { ManagementDashboard } from "@/components/management/ManagementDashboard";

export default function ManagementPage() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user && user.role !== "executive") {
      router.replace(user.role === "sysadmin" ? "/access-monitoring" : "/");
    }
  }, [user, router]);

  if (!user || user.role !== "executive") return null;

  return (
    <main className="flex-1 flex flex-col h-screen overflow-hidden bg-white">
      <ManagementDashboard />
    </main>
  );
}
