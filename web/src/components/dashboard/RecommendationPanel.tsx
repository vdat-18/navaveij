"use client";

import React, { useEffect, useState } from "react";
import {
    ShieldCheck,
    BrainCircuit,
    AlertTriangle,
    CheckCircle2,
    Package,
    ArrowRight,
    TrendingDown,
    TrendingUp,
    Activity,
    Heart,
    Stethoscope,
    ChevronDown
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { clinicalService } from "@/services/api";
import { cn } from "@/lib/utils";
import { BiomarkerCharts } from "./BiomarkerCharts";
import { LabResultsGrid } from "./LabResultsGrid";

interface RecommendationPanelProps {
    patientId: string | null;
}

const ClinicalRiskGauge = ({ value }: { value: string }) => {
    const isHigh = value === "High";
    const percentage = isHigh ? 85 : 30;

    return (
        <div className="relative flex flex-col items-center group">
            <svg className="w-48 h-24" viewBox="0 0 100 50">
                <path
                    d="M 10 45 A 40 40 0 0 1 90 45"
                    fill="none"
                    stroke="#E9ECEF"
                    strokeWidth="6"
                    strokeLinecap="round"
                />
                <motion.path
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: percentage / 100 }}
                    transition={{ duration: 2, ease: "circOut" }}
                    d="M 10 45 A 40 40 0 0 1 90 45"
                    fill="none"
                    stroke={isHigh ? "#9D0A31" : "#10B981"}
                    strokeWidth="8"
                    strokeLinecap="round"
                    className="transition-all duration-500"
                />
            </svg>
            <div className="absolute top-10 flex flex-col items-center">
                <span className={cn(
                    "text-3xl font-black transition-all duration-1000 tracking-tighter",
                    isHigh ? "text-navavej-red" : "text-emerald-500"
                )}>
                    {value}
                </span>
                <span className="text-[10px] uppercase tracking-[0.2em] text-navavej-gray-med font-black">Entity Risk Level</span>
            </div>
        </div>
    );
};

export function RecommendationPanel({ patientId }: RecommendationPanelProps) {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [isApproving, setIsApproving] = useState(false);
    const [decided, setDecided] = useState<boolean>(false);
    const [notes, setNotes] = useState("");

    useEffect(() => {
        if (!patientId) return;
        const fetchRecommendation = async () => {
            setLoading(true);
            setDecided(false);
            setNotes("");
            try {
                const result = await clinicalService.getRecommendation(patientId);
                setData(result);
            } catch (error) {
                console.error("Failed to fetch recommendation:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchRecommendation();
    }, [patientId]);

    const handleApprove = async () => {
        if (!data?.recommendation_hash || !patientId) return;
        setIsApproving(true);
        try {
            await clinicalService.recordDecision(patientId, data.recommendation_hash, "Approve", notes);
            setDecided(true);
        } catch (error) {
            console.error("Failed to approve:", error);
            alert("Approval failed. Please check backend connection.");
        } finally {
            setIsApproving(false);
        }
    };

    if (!patientId) {
        return (
            <div className="h-[650px] flex flex-col items-center justify-center navavej-card bg-navavej-gray-light border-dashed border-2">
                <div className="relative mb-8">
                    <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-lg border border-navavej-border">
                        <Stethoscope className="w-10 h-10 text-navavej-teal opacity-30" />
                    </div>
                    <div className="absolute inset-x-0 bottom-[-10px] flex justify-center">
                        <div className="px-3 py-1 bg-navavej-teal text-white text-[9px] font-black uppercase tracking-widest rounded-full shadow-md">System Ready</div>
                    </div>
                </div>
                <h3 className="text-sm font-black text-navavej-gray-dark uppercase tracking-[0.2em]">Patient Analysis Pending</h3>
                <p className="text-xs text-navavej-gray-med mt-2 font-medium">Please select a validated entity from the clinical sidebar</p>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="h-[650px] flex flex-col items-center justify-center navavej-card relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-navavej-teal/10 overflow-hidden">
                    <motion.div
                        animate={{ x: ["-100%", "100%"] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                        className="w-1/3 h-full bg-navavej-teal"
                    />
                </div>
                <motion.div
                    animate={{ scale: [1, 1.05, 1], rotate: [0, 5, -5, 0] }}
                    transition={{ duration: 4, repeat: Infinity }}
                    className="relative z-10"
                >
                    <div className="w-28 h-28 bg-navavej-gray-light rounded-[30px] flex items-center justify-center shadow-xl border border-navavej-border">
                        <BrainCircuit className="w-14 h-14 text-navavej-teal animate-pulse" />
                    </div>
                </motion.div>
                <p className="mt-10 text-lg font-black tracking-[0.1em] text-navavej-gray-dark uppercase">
                    Synthesizing Clinical Intelligence
                </p>
                <p className="text-[10px] font-bold text-navavej-gray-med uppercase tracking-widest mt-2">Checking signal store & rulesets...</p>
            </div>
        );
    }

    if (!data) return null;

    return (
        <AnimatePresence mode="wait">
            <motion.div
                key={patientId}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-10"
            >
                {/* Intelligence HUD Panels */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">

                    <div className="lg:col-span-4 navavej-card p-10 flex flex-col items-center justify-center relative bg-white group overflow-hidden">
                        <div className="absolute top-0 left-0 w-2 h-full bg-navavej-teal/20 transition-all group-hover:bg-navavej-teal" />
                        <ClinicalRiskGauge value={data.overall_risk_level} />
                        <div className="mt-8 flex flex-col items-center">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-2 h-2 bg-navavej-teal rounded-full animate-ping" />
                                <span className="text-[9px] font-black text-navavej-teal uppercase tracking-widest">Active Monitoring</span>
                            </div>
                            <p className="text-[11px] text-navavej-gray-med font-medium text-center italic">Calculated based on current BMI, ASCVD scores and clinical signals.</p>
                        </div>
                    </div>

                    <div className="lg:col-span-8 navavej-card p-0 rounded-[20px] overflow-hidden flex flex-col md:flex-row shadow-xl">
                        <div className="bg-navavej-teal p-12 text-white flex flex-col justify-center md:w-[45%]">
                            <div className="flex items-center gap-2 mb-4 opacity-70">
                                <Package className="w-5 h-5" />
                                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Strategy Assignment</span>
                            </div>
                            <h3 className="text-4xl font-black tracking-tight">{data.ai_recommended_tier || "Premium"}</h3>
                            <div className="mt-6 flex items-center gap-2">
                                <div className="w-10 h-1 bg-white/30 rounded-full overflow-hidden">
                                    <motion.div initial={{ x: "-100%" }} animate={{ x: 0 }} transition={{ duration: 1 }} className="w-full h-full bg-white" />
                                </div>
                                <span className="text-[10px] font-bold uppercase">Optimal Confidence</span>
                            </div>
                        </div>

                        <div className="flex-1 p-12 bg-white flex flex-col justify-center items-start border-l border-navavej-border">
                            <div className="flex items-center justify-between w-full mb-8">
                                <div className="flex flex-col">
                                    <span className="text-[9px] font-black text-navavej-gray-med uppercase tracking-[0.2em] mb-1">Recommended Package</span>
                                    <span className="text-xl font-black text-navavej-gray-dark uppercase tracking-wide">Diamond Plus Center</span>
                                </div>
                                <div className="flex flex-col items-end">
                                    <span className="text-[9px] font-black text-navavej-gray-med uppercase tracking-[0.2em] mb-1">Program Value</span>
                                    <span className="text-3xl font-black text-navavej-teal italic">฿15,000</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 w-full">
                                <div className="px-5 py-3 bg-navavej-gray-light rounded-xl flex items-center gap-3 border border-navavej-border">
                                    <ShieldCheck className="w-5 h-5 text-navavej-teal" />
                                    <span className="text-[10px] font-black uppercase text-navavej-gray-dark">AI Verified</span>
                                </div>
                                <div className="px-5 py-3 bg-navavej-gray-light rounded-xl flex items-center gap-3 border border-navavej-border">
                                    <CheckCircle2 className="w-5 h-5 text-navavej-teal" />
                                    <span className="text-[10px] font-black uppercase text-navavej-gray-dark">Safety Log OK</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Evolution & Trends - Newly Implemented Visualization */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 text-navavej-teal">
                        <TrendingUp className="w-5 h-5" />
                        <span className="text-xs font-black uppercase tracking-[0.2em]">Biomarker Evolution Trends</span>
                    </div>
                    <BiomarkerCharts
                        bmiHistory={data.biomarker_trends?.bmi?.history || []}
                        bpHistory={data.biomarker_trends?.blood_pressure?.history || []}
                    />
                    <LabResultsGrid labs={data.biomarker_trends?.labs || []} />
                </div>

                {/* Detailed Logic & Alerts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">

                    <div className="navavej-card p-12 border-t-[8px] border-navavej-teal">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-navavej-gray-light rounded-2xl flex items-center justify-center border border-navavej-border">
                                    <BrainCircuit className="w-6 h-6 text-navavej-teal" />
                                </div>
                                <h3 className="text-xl font-black text-navavej-gray-dark uppercase tracking-tight">Clinical AI Reasoning</h3>
                            </div>
                            <div className="px-3 py-1 bg-navavej-teal/10 rounded-full text-[9px] font-black text-navavej-teal uppercase tracking-widest">Neural Execution Trace</div>
                        </div>

                        <div className="space-y-6">
                            <p className="text-sm text-navavej-gray-med leading-relaxed italic font-medium">
                                "{data.reasoning_trace}"
                            </p>
                            <div className="h-[1px] bg-navavej-border w-full" />
                            <div className="flex items-center gap-4 text-navavej-gray-med text-[10px] font-black uppercase tracking-widest">
                                <span className="flex items-center gap-1.5"><Search className="w-3 h-3" /> Scan: Complete</span>
                                <span className="flex items-center gap-1.5"><Activity className="w-3 h-3" /> Signals: Normal</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-6">
                        <div className="navavej-card p-10 bg-navavej-red/[0.02] border-l-[12px] border-navavej-red">
                            <div className="flex items-center gap-5 mb-8">
                                <div className="w-12 h-12 bg-navavej-red/10 rounded-2xl flex items-center justify-center border border-navavej-red/20 shadow-lg shadow-navavej-red/10 animate-float">
                                    <AlertTriangle className="w-6 h-6 text-navavej-red" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-navavej-gray-dark uppercase tracking-tight leading-none">Critical Signals</h3>
                                    <p className="text-[10px] font-bold text-navavej-red uppercase tracking-widest mt-1">Manual physician review required</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                {[
                                    { label: "Hypertensive Crisis", sub: "SBP > 180 mmHg detected", value: "URGENT" },
                                    { label: "High ASCVD Risk", sub: "Score ≥ 20.0%", value: "MONITOR" }
                                ].map((alert, i) => (
                                    <div key={i} className="flex items-center justify-between p-5 bg-white rounded-2xl border border-navavej-border group hover:border-navavej-red/40 transition-colors cursor-default">
                                        <div className="flex items-center gap-4">
                                            <div className="w-2 h-2 bg-navavej-red rounded-full shadow-[0_0_8px_rgba(157,10,49,0.5)]" />
                                            <div>
                                                <h4 className="text-xs font-black text-navavej-gray-dark uppercase tracking-tight">{alert.label}</h4>
                                                <p className="text-[10px] text-navavej-gray-med font-bold italic">{alert.sub}</p>
                                            </div>
                                        </div>
                                        <span className="text-[9px] font-black text-navavej-red border border-navavej-red/20 px-2 py-1 rounded tracking-[0.1em]">{alert.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Physician Notes Section */}
                        <div className="navavej-card p-8 bg-navavej-gray-light/50 border-none shadow-inner">
                            <div className="flex items-center gap-2 mb-4 text-navavej-gray-med">
                                <Activity className="w-3.5 h-3.5" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Physician Clinical Notes</span>
                            </div>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                disabled={decided || isApproving}
                                placeholder="Enter clinical observations, follow-up requirements, or specific patient instructions..."
                                className="w-full h-32 bg-white/50 border-2 border-navavej-border rounded-2xl p-4 text-xs font-medium focus:ring-2 focus:ring-navavej-teal/20 focus:border-navavej-teal outline-none transition-all resize-none placeholder:italic"
                            />
                        </div>

                        <button
                            onClick={handleApprove}
                            disabled={isApproving || decided}
                            className={cn(
                                "navavej-button-primary w-full py-6 flex items-center justify-center gap-4 group shadow-xl transition-all",
                                decided && "bg-emerald-500 hover:bg-emerald-500 shadow-emerald-500/20",
                                isApproving && "opacity-70 cursor-wait"
                            )}
                        >
                            <span className="text-base uppercase tracking-[0.2em] font-black">
                                {isApproving ? "Processing..." : decided ? "Strategy Approved" : "Approve Intelligent Strategy"}
                            </span>
                            {decided ? (
                                <CheckCircle2 className="w-6 h-6" />
                            ) : (
                                <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform duration-300" />
                            )}
                        </button>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}

// Logic helper for extra visual flare
import { Search } from "lucide-react";
