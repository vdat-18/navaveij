import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { AuditLogEntry, AuditLogFilters, AnomalyAlert, MappingCode, MasterProgram, MonitoringSnapshot, RbacRole } from "@/types/access-monitoring";
import { BiomarkerTrendsResponse } from "@/types/biomarker-trends";
import { Patient } from "@/types/patient";
import { RecommendationResponse } from "@/types/recommendation";
import { TimelinePayload } from "@/types/timeline";

interface AuthContext {
    user_id: string;
    role: string;
    scopes: string;
}

interface ScreeningGapsResponse {
    patient_token: string;
    screening_gaps: {
        screening_id?: string;
        label: string;
        overdue_days?: number | null;
        priority_color?: string;
        last_performed_date?: string | null;
        note?: string;
    }[];
    vaccination_gaps: {
        vaccine_id?: string;
        label: string;
        overdue_days?: number | null;
        priority_color?: string;
        last_administered_date?: string | null;
        note?: string;
    }[];
    computed_at: string;
    pipeline_run_id: string;
}

const API_BASE_URL_V1 = process.env.NEXT_PUBLIC_API_URL_V1 || "http://localhost:8000/api/v1";
const API_BASE_URL_V3 = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
const API_TIMEOUT_MS = 60000;

/**
 * apiV1 serves legacy routes under /api/v1/*
 * apiV3 serves contract-oriented routes under /api/*
 */

const apiV1 = axios.create({
    baseURL: API_BASE_URL_V1,
    timeout: API_TIMEOUT_MS,
    headers: {
        "Content-Type": "application/json",
    },
});

const apiV3 = axios.create({
    baseURL: API_BASE_URL_V3,
    timeout: API_TIMEOUT_MS,
    headers: {
        "Content-Type": "application/json",
    },
});

const handleRequest = (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => config;

const handleResponseError = (error: AxiosError<{ detail?: string; message?: string }>) => {
    const status = error.response?.status;
    const detail = error.response?.data?.detail || error.response?.data?.message;
    const isTimeout = error.code === "ECONNABORTED";

    const timeoutSeconds = Math.round((error.config?.timeout ?? API_TIMEOUT_MS) / 1000);
    const normalizedMessage =
        (isTimeout && `Request timed out after ${timeoutSeconds} seconds.`) ||
        detail ||
        (status ? `Request failed with status ${status}.` : "Network error. Please check backend connectivity.");

    return Promise.reject(new Error(normalizedMessage));
};

[apiV1, apiV3].forEach((client) => {
    client.interceptors.request.use(handleRequest);
    client.interceptors.response.use((response) => response, handleResponseError);
});

const mergeScopes = (...scopeGroups: string[]): string => {
    const merged = new Set<string>();
    for (const group of scopeGroups) {
        for (const scope of group.split(",").map((item) => item.trim().toLowerCase()).filter(Boolean)) {
            merged.add(scope);
        }
    }
    return Array.from(merged).join(",");
};

let cachedAuthContext: AuthContext | null = null;

export const getAuthContext = async (): Promise<AuthContext> => {
    if (cachedAuthContext) return cachedAuthContext;
    try {
        const res = await axios.get<AuthContext>("/api/auth/context", { timeout: API_TIMEOUT_MS });
        cachedAuthContext = res.data;
        return cachedAuthContext;
    } catch (e) {
        console.warn("Failed to fetch auth context, falling back to default");
        return {
            user_id: "dr-admin-001",
            role: "admin",
            scopes: "recommendation:read,recommendation:write,monitoring:read"
        };
    }
};

const buildAuthHeaders = async (roleOverride?: string, scopeOverride?: string): Promise<Record<string, string>> => {
    const context = await getAuthContext();
    const role = (roleOverride || context.role).toLowerCase();
    return {
        "X-Auth-User-Id": context.user_id,
        "X-Auth-Role": role,
        "X-Auth-Scopes": mergeScopes(context.scopes, scopeOverride || ""),
    };
};

export const patientService = {
    getAll: async (): Promise<Patient[]> => {
        const headers = await buildAuthHeaders();
        const response = await apiV1.get<Patient[]>("/patients", { headers });
        return response.data;
    },
    getDetails: async (id: string): Promise<Patient> => {
        const headers = await buildAuthHeaders();
        const response = await apiV1.get<Patient>(`/patients/${id}`, { headers });
        return response.data;
    },
};

export const clinicalService = {
    getRecommendation: async (patientToken: string, forceRuleBased: boolean = false): Promise<RecommendationResponse> => {
        const headers = await buildAuthHeaders(undefined, "recommendation:read");
        const response = await apiV3.post<RecommendationResponse>(
            "/recommend",
            {
                patient_token: patientToken,
                force_rule_based: forceRuleBased
            },
            { headers }
        );
        return response.data;
    },
    recordDecision: async (patientId: string, recommendationHash: string, decision: "Approve" | "Reject", notes: string = ""): Promise<Record<string, unknown>> => {
        const context = await getAuthContext();
        const headers = await buildAuthHeaders(undefined, "recommendation:write");
        const response = await apiV1.post<Record<string, unknown>>(
            "/clinical/approve",
            {
                patient_id: patientId,
                recommendation_hash: recommendationHash,
                decision: decision,
                physician_id: context.user_id,
                notes: notes
            },
            { headers }
        );
        return response.data;
    },
    getAuditLogs: async (): Promise<Record<string, unknown>> => {
        const headers = await buildAuthHeaders(undefined, "recommendation:read");
        const response = await apiV1.get<Record<string, unknown>>("/clinical/audit", { headers });
        return response.data;
    },
    getTimeline: async (patientToken: string): Promise<TimelinePayload> => {
        const headers = await buildAuthHeaders(undefined, "recommendation:read");
        const response = await apiV3.get(`/timeline/${patientToken}`, { headers });
        return response.data;
    },
    getBiomarkerTrends: async (patientToken: string): Promise<BiomarkerTrendsResponse> => {
        const headers = await buildAuthHeaders(undefined, "recommendation:read");
        const response = await apiV3.get<BiomarkerTrendsResponse>(`/biomarker-trends/${patientToken}`, { headers });
        return response.data;
    },
    getScreeningGaps: async (patientToken: string): Promise<ScreeningGapsResponse> => {
        const headers = await buildAuthHeaders(undefined, "recommendation:read");
        const response = await apiV3.get<ScreeningGapsResponse>(`/screening-gaps/${patientToken}`, { headers });
        return response.data;
    },
    getMonitoringSnapshot: async (role: "admin" | "dpo" = "admin"): Promise<MonitoringSnapshot> => {
        const headers = await buildAuthHeaders(role, "monitoring:read");
        const response = await apiV3.get("/monitoring-snapshot", { headers });
        return response.data;
    },
    getAnomalyAlerts: async (role: "admin" | "dpo" = "admin"): Promise<{ alerts: AnomalyAlert[] }> => {
        const headers = await buildAuthHeaders(role, "monitoring:read");
        const response = await apiV3.get("/anomaly-alerts", { headers });
        return response.data;
    },
    searchAuditLogs: async (
        filters: AuditLogFilters,
        role: "admin" | "dpo" = "admin"
    ): Promise<{ total: number; entries: AuditLogEntry[] }> => {
        const headers = await buildAuthHeaders(role, "monitoring:read");
        const response = await apiV3.get("/audit-logs", {
            params: filters,
            headers
        });
        return response.data;
    },
    getRbac: async (role: "admin" | "dpo" = "admin"): Promise<{ roles: RbacRole[] }> => {
        const headers = await buildAuthHeaders(role, "monitoring:read");
        const response = await apiV3.get("/rbac", { headers });
        return response.data;
    },
    getMappingCodes: async (role: "admin" | "dpo" = "admin"): Promise<{ mappings: MappingCode[] }> => {
        const headers = await buildAuthHeaders(role, "monitoring:read");
        const response = await apiV3.get("/mapping-codes", { headers });
        return response.data;
    },
    getMasterPrograms: async (role: "admin" | "dpo" = "admin"): Promise<{ programs: MasterProgram[] }> => {
        const headers = await buildAuthHeaders(role, "monitoring:read");
        const response = await apiV3.get("/master-programs", { headers });
        return response.data;
    }
};
