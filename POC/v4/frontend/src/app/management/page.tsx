import React from "react";
import { ManagementDashboard } from "@/components/management/ManagementDashboard";

export default function ManagementPage() {
  return (
    <main className="flex-1 flex flex-col h-screen overflow-hidden bg-white">
      {/* Main Content Dashboard handles its own header and scrolling */}
      <ManagementDashboard />
    </main>
  );
}
