"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ReportPage } from "@/components/report/ReportPage";
import { Patient } from "@/types/patient";
import { RecommendationResponse } from "@/types/recommendation";

export interface ReportExportData {
    patient: Patient;
    recommendation: RecommendationResponse;
    generatedAt: string;
}

export default function ReportRoute() {
    const router = useRouter();
    const [data, setData] = useState<ReportExportData | null>(null);
    const hasRunRef = useRef(false);

    useEffect(() => {
        if (hasRunRef.current) return;
        hasRunRef.current = true;
        const raw = sessionStorage.getItem("navaveij_report_export");
        if (!raw) {
            router.replace("/");
            return;
        }
        sessionStorage.removeItem("navaveij_report_export");
        try {
            setData(JSON.parse(raw) as ReportExportData);
        } catch {
            router.replace("/");
        }
    }, [router]);

    if (!data) return null;

    return <ReportPage data={data} />;
}
