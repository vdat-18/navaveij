import type { Page } from "@playwright/test";

export type UserRole = "physician" | "nurse" | "dpo" | "admin";

const AUTH_KEY = "navavej.smartToken.v1";

/** Generates a base64-encoded mock SMART token (mirrors auth-context.tsx encodeToken). */
export function makeToken(role: UserRole, name = "Test User"): string {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub: `test-${role}`,
    name,
    role,
    fhir_scopes: ["read", "write"],
    iat: now,
    exp: now + 3600,
    iss: "navavej-test",
  };
  return Buffer.from(JSON.stringify(payload)).toString("base64");
}

/**
 * Injects the auth token into sessionStorage before the page loads.
 * Must be called BEFORE page.goto().
 */
export async function setAuth(page: Page, role: UserRole): Promise<void> {
  const token = makeToken(role);
  await page.addInitScript(
    ({ key, value }: { key: string; value: string }) =>
      sessionStorage.setItem(key, value),
    { key: AUTH_KEY, value: token }
  );
}
