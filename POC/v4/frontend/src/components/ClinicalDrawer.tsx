"use client";

import React, { useEffect } from "react";
import { X, TrendingUp } from "lucide-react";
import { TrendTimelineScreen } from "@/components/trend-timeline/TrendTimelineScreen";
import { Patient } from "@/types/patient";

interface ClinicalDrawerProps {
  patient: Patient;
  privacyMode?: boolean;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Slide-up drawer showing the Trend & Timeline screen for a selected patient.
 * Used by physicians and nurses — replaces the /trend-timeline page navigation.
 */
export function ClinicalDrawer({ patient, privacyMode = false, isOpen, onClose }: ClinicalDrawerProps) {
  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Trend & Timeline"
        className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl border-t border-navavej-border flex flex-col"
        style={{ maxHeight: "90vh", height: "90vh" }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 bg-navavej-border rounded-full" />
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 px-6 py-4">
          <TrendTimelineScreen
            patientName={patient.patient_name}
            patientId={patient.patient_id}
            patientToken={patient.patient_token}
            privacyMode={privacyMode}
            onClose={onClose}
          />
        </div>
      </div>
    </>
  );
}
