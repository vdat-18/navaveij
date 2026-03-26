"use client";

import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  BrainCircuit,
  CheckCircle2,
  Database,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Waves
} from "lucide-react";
import { cn } from "@/shared/utils";

const STEP_INTERVAL_MS = 1500;

const STEPS = [
  {
    id: "constraints",
    label: "Fetching clinical constraints",
    icon: Stethoscope,
    colorClass: "text-teal-600",
    bgClass: "bg-teal-50",
    ringClass: "ring-teal-200",
  },
  {
    id: "signals",
    label: "Loading clinical signals",
    icon: Waves,
    colorClass: "text-blue-600",
    bgClass: "bg-blue-50",
    ringClass: "ring-blue-200",
  },
  {
    id: "trends",
    label: "Retrieving biomarker trends",
    icon: Database,
    colorClass: "text-purple-600",
    bgClass: "bg-purple-50",
    ringClass: "ring-purple-200",
  },
  {
    id: "ruleset",
    label: "Evaluating program ruleset",
    icon: Sparkles,
    colorClass: "text-orange-600",
    bgClass: "bg-orange-50",
    ringClass: "ring-orange-200",
  },
  {
    id: "ai",
    label: "Running AI analysis",
    icon: BrainCircuit,
    colorClass: "text-red-600",
    bgClass: "bg-red-50",
    ringClass: "ring-red-200",
  },
  {
    id: "safety",
    label: "Validating safety rules",
    icon: ShieldCheck,
    colorClass: "text-green-600",
    bgClass: "bg-green-50",
    ringClass: "ring-green-200",
  },
] as const;

interface LoadingStepsProps {
  activeStep?: number;
}

export function LoadingSteps({ activeStep: controlledActiveStep }: LoadingStepsProps) {
  const [internalActiveStep, setInternalActiveStep] = useState(0);
  const isControlled = typeof controlledActiveStep === "number";
  const activeStep = isControlled
    ? Math.max(0, Math.min(STEPS.length - 1, controlledActiveStep))
    : internalActiveStep;

  useEffect(() => {
    if (isControlled) return;
    const intervalId = window.setInterval(() => {
      setInternalActiveStep((current) => {
        if (current >= STEPS.length - 1) {
          return STEPS.length - 1;
        }
        return current + 1;
      });
    }, STEP_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [isControlled]);

  const progressWidth = useMemo(() => {
    const percentage = ((activeStep + 1) / STEPS.length) * 100;
    return `${Math.max(8, percentage)}%`;
  }, [activeStep]);

  return (
    <div className="h-[650px] navavej-card p-10 md:p-12 bg-white flex flex-col justify-center relative overflow-hidden">
      <div className="mb-8">
        <h3 className="text-lg font-black uppercase tracking-[0.12em] text-navavej-gray-dark">
          Synthesizing Clinical Intelligence
        </h3>
        <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.14em] text-navavej-gray-med">
          Step-by-step AI workflow in progress
        </p>
      </div>

      <div className="mb-8 rounded-2xl border border-navavej-border bg-navavej-gray-light/40 p-5" data-testid="hero-loading-bar">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-[0.16em] text-navavej-gray-dark">
            Workflow Progress
          </span>
          <span className="text-xs font-black text-navavej-teal">
            {Math.round(((activeStep + 1) / STEPS.length) * 100)}%
          </span>
        </div>
        <div className="h-4 w-full rounded-full bg-white border border-navavej-border overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-navavej-teal via-cyan-500 to-emerald-500"
            animate={{ width: progressWidth }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            style={{ width: "8%" }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5" data-testid="compact-loading-steps">
        {STEPS.map((step, index) => {
          const isCompleted = index < activeStep;
          const isActive = index === activeStep;
          const Icon = step.icon;

          return (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
              className={cn(
                "flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-all duration-300",
                isActive && "border-navavej-teal/40 bg-navavej-teal/[0.04] shadow-sm",
                isCompleted && "border-green-200 bg-green-50/70",
                !isActive && !isCompleted && "border-navavej-border bg-navavej-gray-light/40"
              )}
            >
              <div
                className={cn(
                  "relative flex h-7 w-7 items-center justify-center rounded-full ring-1 transition-all",
                  step.bgClass,
                  step.ringClass,
                  isCompleted && "bg-green-100 ring-green-300",
                  isActive && "ring-2 ring-navavej-teal/50"
                )}
              >
                {isCompleted ? (
                  <CheckCircle2 className="h-4 w-4 text-green-700" />
                ) : (
                  <Icon className={cn("h-3.5 w-3.5", step.colorClass, isActive && "animate-pulse")} />
                )}
              </div>
              <div className="flex min-w-0 flex-col">
                <span
                  className={cn(
                    "text-[10px] font-black uppercase tracking-wide",
                    isActive && "text-navavej-gray-dark",
                    isCompleted && "text-green-700",
                    !isActive && !isCompleted && "text-navavej-gray-med"
                  )}
                >
                  {step.label}
                </span>
                <span className="text-[9px] font-bold text-navavej-gray-med">
                  {isCompleted ? "Completed" : isActive ? "In progress" : "Pending"}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
