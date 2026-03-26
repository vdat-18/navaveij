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
        style={{ maxHeight: "90vh" }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-navavej-border rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-navavej-border flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-navavej-teal/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-navavej-teal" />
            </div>
            <div>
              <p className="text-[10px] font-black text-navavej-teal uppercase tracking-[0.2em]">
                Trend & Timeline
              </p>
              <p className="text-sm font-black text-navavej-gray-dark tracking-tighter uppercase">
                {privacyMode ? "Patient (Privacy Mode)" : patient.patient_name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close drawer"
            className="p-2 rounded-xl text-navavej-gray-med hover:text-navavej-red hover:bg-red-50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 px-6 py-4">
          <TrendTimelineScreen
            patientName={patient.patient_name}
            patientId={patient.patient_id}
            patientToken={patient.patient_token}
            privacyMode={privacyMode}
          />
        </div>
      </div>
    </>
  );
}
