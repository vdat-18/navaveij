import { NextResponse } from 'next/server';

export async function GET() {
    // In a real app, this would read from a secure session/cookie
    // For POC, we read from server-side environment variables
    return NextResponse.json({
        user_id: process.env.AUTH_USER_ID || "dr-admin-001",
        role: (process.env.AUTH_ROLE || "admin").toLowerCase(),
        scopes: process.env.AUTH_SCOPES || "recommendation:read,recommendation:write,monitoring:read",
    });
}
