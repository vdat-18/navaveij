import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { AuditLogEntry, AuditLogFilters, AnomalyAlert, MappingCode, MasterAddOn, MasterProgram, MonitoringSnapshot, RbacRole } from "@/types/access-monitoring";
import { BiomarkerTrendsResponse } from "@/types/biomarker-trends";
import { Patient } from "@/types/patient";
import { RecommendationResponse } from "@/types/recommendation";
import { TimelinePayload } from "@/types/timeline";
import { AUTH_STORAGE_KEY, decodeToken } from "@/shared/auth-context";

interface AuthContext {
    user_id: string;
    role: string;
    scopes: string;
}

export interface SystemConfig {
    active_client: string;
    all_clients: { name: string; provider: string; model: string; status: string }[];
    mcp_tools: { name: string; type: string; description: string }[];
    auth_mode: string;
    template_version: string;
}

export interface ClientPromptsResponse {
    client_name: string;
    template_version: string;
    templates: Record<string, string>;
}

export interface HealthCheckResponse {
    client_name: string;
    status: "ok" | "error";
    provider: string | null;
    model_id: string | null;
    template_version: string | null;
    latency_ms: number | null;
    error_message: string | null;
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

const API_BASE_URL_V1 = "/api/proxy/v1";
const API_BASE_URL_V3 = "/api/proxy";
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

export const clearAuthCache = (): void => { cachedAuthContext = null; };

const getSmartTokenFromStorage = (): string | null => {
    try {
        return sessionStorage.getItem(AUTH_STORAGE_KEY);
    } catch {
        return null;
    }
};

export const getAuthContext = async (): Promise<AuthContext> => {
    if (cachedAuthContext) return cachedAuthContext;
    try {
        const token = getSmartTokenFromStorage();
        const headers: Record<string, string> = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;
        const res = await axios.get<AuthContext>("/api/auth/context", { timeout: API_TIMEOUT_MS, headers });
        cachedAuthContext = res.data;
        return cachedAuthContext;
    } catch (e) {
        console.warn("Failed to fetch auth context, falling back to default");
        return {
            user_id: "usr-sysadmin-00001",
            role: "sysadmin",
            scopes: "recommendation:read,recommendation:write,monitoring:read"
        };
    }
};

const buildAuthHeaders = async (roleOverride?: string, scopeOverride?: string): Promise<Record<string, string>> => {
    const token = getSmartTokenFromStorage();
    // If a SMART token is present, derive context directly from it (avoids extra round-trip)
    if (token) {
        const payload = decodeToken(token);
        if (payload) {
            const role = (roleOverride || payload.role).toLowerCase();
            const roleScopes: Record<string, string> = {
                physician: "recommendation:read,recommendation:write",
                sales: "recommendation:read,recommendation:write",
                pharmacist: "recommendation:read",
                executive: "recommendation:read,monitoring:read",
                sysadmin: "recommendation:read,recommendation:write,monitoring:read",
            };
            return {
                "Authorization": `Bearer ${token}`,
                "X-Auth-User-Id": payload.sub,
                "X-Auth-Role": role,
                "X-Auth-Scopes": mergeScopes(roleScopes[role] ?? "recommendation:read", scopeOverride || ""),
            };
        }
    }
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

export interface StageUpdate {
    stage: number;
    label: string;
}

export const clinicalService = {
    getRecommendation: async (patientToken: string, forceRuleBased: boolean = false, promotionContext: Record<string, unknown> = {}): Promise<RecommendationResponse> => {
        const headers = await buildAuthHeaders(undefined, "recommendation:read");
        const response = await apiV3.post<RecommendationResponse>(
            "/recommend",
            {
                patient_token: patientToken,
                force_rule_based: forceRuleBased,
                promotion_context: promotionContext,
            },
            { headers }
        );
        return response.data;
    },

    /**
     * Stream recommendation progress via SSE.
     * Calls onStage() for each pipeline step, then resolves with the final result.
     */
    streamRecommendation: async (
        patientToken: string,
        onStage: (update: StageUpdate) => void,
        forceRuleBased: boolean = false,
        promotionContext: Record<string, unknown> = {},
    ): Promise<RecommendationResponse> => {
        const headers = await buildAuthHeaders(undefined, "recommendation:read");
        const response = await fetch("/api/stream/recommend/stream", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...headers,
            },
            body: JSON.stringify({
                patient_token: patientToken,
                force_rule_based: forceRuleBased,
                promotion_context: promotionContext,
            }),
        });

        if (!response.ok) {
            const text = await response.text().catch(() => "");
            throw new Error(`Stream request failed (${response.status}): ${text}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("Stream body is not readable");

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            // SSE messages are separated by double newlines
            const parts = buffer.split("\n\n");
            buffer = parts.pop() ?? "";

            for (const part of parts) {
                const line = part.trim();
                if (!line.startsWith("data:")) continue;
                const jsonStr = line.slice("data:".length).trim();
                let event: Record<string, unknown>;
                try {
                    event = JSON.parse(jsonStr);
                } catch {
                    continue;
                }

                if (event.type === "stage") {
                    onStage({ stage: event.stage as number, label: event.label as string });
                } else if (event.type === "result") {
                    const { type: _t, ...result } = event;
                    return result as unknown as RecommendationResponse;
                } else if (event.type === "error") {
                    throw new Error((event.detail as string) ?? "Unknown streaming error");
                }
            }
        }

        throw new Error("Stream ended without a result");
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
    getMonitoringSnapshot: async (role: "sysadmin" | "executive" = "sysadmin"): Promise<MonitoringSnapshot> => {
        const headers = await buildAuthHeaders(role, "monitoring:read");
        const response = await apiV3.get("/monitoring-snapshot", { headers });
        return response.data;
    },
    getAnomalyAlerts: async (role: "sysadmin" | "executive" = "sysadmin"): Promise<{ alerts: AnomalyAlert[] }> => {
        const headers = await buildAuthHeaders(role, "monitoring:read");
        const response = await apiV3.get("/anomaly-alerts", { headers });
        return response.data;
    },
    searchAuditLogs: async (
        filters: AuditLogFilters,
        role: "sysadmin" | "executive" = "sysadmin"
    ): Promise<{ total: number; entries: AuditLogEntry[] }> => {
        const headers = await buildAuthHeaders(role, "monitoring:read");
        const response = await apiV3.get("/audit-logs", {
            params: filters,
            headers
        });
        return response.data;
    },
    getRbac: async (role: "sysadmin" | "executive" = "sysadmin"): Promise<{ roles: RbacRole[] }> => {
        const headers = await buildAuthHeaders(role, "monitoring:read");
        const response = await apiV3.get("/rbac", { headers });
        return response.data;
    },
    getMappingCodes: async (role: "sysadmin" | "executive" = "sysadmin"): Promise<{ mappings: MappingCode[] }> => {
        const headers = await buildAuthHeaders(role, "monitoring:read");
        const response = await apiV3.get("/mapping-codes", { headers });
        return response.data;
    },
    getMasterPrograms: async (role: "sysadmin" | "executive" = "sysadmin"): Promise<{ programs: MasterProgram[] }> => {
        const headers = await buildAuthHeaders(role, "monitoring:read");
        const response = await apiV3.get("/master-programs", { headers });
        return response.data;
    },
    getMasterAddOns: async (role: "sysadmin" | "executive" = "sysadmin"): Promise<{ add_ons: MasterAddOn[] }> => {
        const headers = await buildAuthHeaders(role, "monitoring:read");
        const response = await apiV3.get<{ add_ons: MasterAddOn[] }>("/master-add-ons", { headers });
        return response.data;
    },
    getSystemConfig: async (role: "sysadmin" | "executive" = "sysadmin"): Promise<SystemConfig> => {
        const headers = await buildAuthHeaders(role, "monitoring:read");
        const response = await apiV3.get<SystemConfig>("/system-config", { headers });
        return response.data;
    },
    setActiveClient: async (clientName: string, role: "sysadmin" | "executive" = "sysadmin"): Promise<{ active_client: string; template_version: string }> => {
        const headers = await buildAuthHeaders(role, "monitoring:read");
        const response = await apiV3.patch<{ active_client: string; template_version: string }>("/system-config/active-client", { client_name: clientName }, { headers });
        return response.data;
    },
    healthCheck: async (clientName: string, role: "sysadmin" | "executive" = "sysadmin"): Promise<HealthCheckResponse> => {
        const headers = await buildAuthHeaders(role, "monitoring:read");
        const response = await apiV3.post<HealthCheckResponse>("/system-config/health-check", { client_name: clientName }, { headers });
        return response.data;
    },
    getClientPrompts: async (clientName: string, role: "sysadmin" | "executive" = "sysadmin"): Promise<ClientPromptsResponse> => {
        const headers = await buildAuthHeaders(role, "monitoring:read");
        const response = await apiV3.get<ClientPromptsResponse>(`/system-config/prompts/${clientName}`, { headers });
        return response.data;
    },
};
