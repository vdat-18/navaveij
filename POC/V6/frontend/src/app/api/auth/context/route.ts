import { NextRequest, NextResponse } from 'next/server';

// Role → backend scopes mapping for smart_on_fhir_demo mode
const ROLE_SCOPES: Record<string, string> = {
    physician: "recommendation:read,recommendation:write",
    sales: "recommendation:read,recommendation:write",
    pharmacist: "recommendation:read",
    executive: "recommendation:read,monitoring:read",
    sysadmin: "recommendation:read,recommendation:write,monitoring:read",
};

interface MockTokenPayload {
    sub: string;
    name: string;
    role: string;
    fhir_scopes: string[];
    iat: number;
    exp: number;
}

function decodeBearer(authHeader: string): MockTokenPayload | null {
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    if (!match) return null;
    try {
        return JSON.parse(Buffer.from(match[1], "base64").toString("utf-8")) as MockTokenPayload;
    } catch {
        return null;
    }
}

export async function GET(request: NextRequest) {
    const authHeader = request.headers.get("Authorization") ?? "";
    const payload = authHeader ? decodeBearer(authHeader) : null;

    if (payload) {
        const role = payload.role.toLowerCase();
        return NextResponse.json({
            user_id: payload.sub,
            role,
            scopes: ROLE_SCOPES[role] ?? "recommendation:read",
        });
    }

    // Fallback: env-based values (poc_claims / disabled modes)
    return NextResponse.json({
        user_id: process.env.AUTH_USER_ID || "usr-sysadmin-00001",
        role: (process.env.AUTH_ROLE || "sysadmin").toLowerCase(),
        scopes: process.env.AUTH_SCOPES || "recommendation:read,recommendation:write,monitoring:read",
    });
}
