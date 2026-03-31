/**
 * WS-A — Visual & Display Quick Wins
 * End-to-end tests covering GAP-F2, GAP-F3, GAP-F4, GAP-F13.
 *
 * All backend API calls (localhost:8000) are intercepted via page.route().
 * The Next.js dev server (localhost:3000) is started by playwright.config.ts.
 *
 * Route ordering note: Playwright evaluates routes LIFO (last-added = highest priority).
 * Catch-all patterns must be added FIRST so that more-specific mocks added AFTER take priority.
 */

import { test, expect, type Page } from "@playwright/test";
import { setAuth } from "./helpers/auth";
import {
  makeRecommendation,
  PATIENT_LIST,
  SYSTEM_CONFIG,
} from "./fixtures/mock-data";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const API = "http://localhost:8000";

/**
 * Minimal valid response body that satisfies ALL AccessMonitoringScreen Promise.all
 * destructuring expectations. The monitoring-snapshot fields (alert_counts etc.) are
 * included because LiveMetricsBar accesses them directly without optional chaining.
 */
const ADMIN_EMPTY_RESPONSE = {
  // AnomalyAlerts / AuditLogs / RBAC / Mapping / Master endpoints
  alerts: [],
  entries: [],
  total: 0,
  roles: [],
  mappings: [],
  programs: [],
  add_ons: [],
  // MonitoringSnapshot fields consumed by LiveMetricsBar
  active_users_now: 0,
  sessions_today: 0,
  patient_records_accessed_today: 0,
  alert_counts: { critical: 0, high: 0, medium: 0, low: 0 },
  ai_recommendations_generated_today: 0,
  safety_validator_failures_today: 0,
  snapshot_at: new Date(0).toISOString(),
};

// ---------------------------------------------------------------------------
// Route helpers
// ---------------------------------------------------------------------------

async function mockPatients(page: Page): Promise<void> {
  await page.route(`${API}/api/v1/patients`, (route) =>
    route.fulfill({ json: PATIENT_LIST })
  );
}

async function mockRecommendation(
  page: Page,
  overrides: Parameters<typeof makeRecommendation>[0] = {},
  delayMs = 0
): Promise<void> {
  await page.route(`${API}/api/recommend`, async (route) => {
    if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
    await route.fulfill({ json: makeRecommendation(overrides) });
  });
}

/**
 * Sets up all routes needed for the /access-monitoring page.
 * system-config is mocked with real fixture data (added FIRST = highest FIFO priority).
 * All other admin API endpoints get an empty-but-valid catch-all response (added SECOND).
 *
 * Must be called BEFORE page.goto().
 */
async function setupAdminPage(page: Page): Promise<void> {
  await setAuth(page, "admin");
  // Playwright evaluates routes LIFO (last added = highest priority).
  // Catch-all added FIRST → lowest priority, only matches if no specific route fires.
  await page.route(`${API}/api/**`, (route) =>
    route.fulfill({ json: ADMIN_EMPTY_RESPONSE })
  );
  // Specific mock added LAST → highest priority, intercepts system-config before catch-all.
  await page.route(`${API}/api/system-config**`, (route) =>
    route.fulfill({ json: SYSTEM_CONFIG })
  );
}

/** Clicks the first patient card in the patient directory. Auto-waits for visibility. */
async function selectTestPatient(page: Page): Promise<void> {
  await page
    .locator("button")
    .filter({ hasText: "Test Patient Alpha" })
    .first()
    .click();
}

// ---------------------------------------------------------------------------
// GAP-F2 — Loading Steps
// ---------------------------------------------------------------------------

test.describe("GAP-F2 — Loading Steps", () => {
  test("shows all 6 step labels while recommendation is pending", async ({
    page,
  }) => {
    await setAuth(page, "physician");
    await mockPatients(page);
    // Delay the response long enough for loading UI to be asserted
    await mockRecommendation(page, {}, 8_000);

    await page.goto("/");
    await selectTestPatient(page);

    // Loading header
    await expect(
      page.getByText("Synthesizing Clinical Intelligence")
    ).toBeVisible({ timeout: 5_000 });

    // All 6 step labels
    await expect(
      page.getByText("Fetching clinical constraints")
    ).toBeVisible();
    await expect(page.getByText("Loading clinical signals")).toBeVisible();
    await expect(page.getByText("Retrieving biomarker trends")).toBeVisible();
    await expect(page.getByText("Evaluating program ruleset")).toBeVisible();
    await expect(page.getByText("Running AI analysis")).toBeVisible();
    await expect(page.getByText("Validating safety rules")).toBeVisible();
  });

  test("loading steps clear and recommendation panel renders after response resolves", async ({
    page,
  }) => {
    await setAuth(page, "physician");
    await mockPatients(page);
    await mockRecommendation(page); // no delay

    await page.goto("/");
    await selectTestPatient(page);

    // Recommendation data appears
    await expect(page.getByText("Standard Health Screen")).toBeVisible({
      timeout: 12_000,
    });

    // Loading header is gone
    await expect(
      page.getByText("Synthesizing Clinical Intelligence")
    ).not.toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// GAP-F3 — Risk Gauge Prominence
// ---------------------------------------------------------------------------

test.describe("GAP-F3 — Risk Gauge", () => {
  test("renders SVG gauge and pulsing border ring for Critical risk", async ({
    page,
  }) => {
    await setAuth(page, "physician");
    await mockPatients(page);
    await mockRecommendation(page, { overall_risk_level: "Critical" });

    await page.goto("/");
    await selectTestPatient(page);

    await expect(page.getByText("Critical").first()).toBeVisible({
      timeout: 12_000,
    });

    // SVG gauge is present
    await expect(page.locator("svg").first()).toBeVisible();

    // Pulsing ring: only rendered on Critical, has a red border class
    await expect(
      page.locator("[class*='border-red']").first()
    ).toBeVisible();
  });

  for (const [riskLevel, colorClass] of [
    ["Critical", "text-red-600"],
    ["High", "text-orange-600"],
    ["Medium", "text-yellow-600"],
    ["Low", "text-green-700"],
  ] as const) {
    test(`renders ${riskLevel} label with ${colorClass}`, async ({ page }) => {
      await setAuth(page, "physician");
      await mockPatients(page);
      await mockRecommendation(page, { overall_risk_level: riskLevel });

      await page.goto("/");
      await selectTestPatient(page);

      await expect(page.getByText(riskLevel).first()).toBeVisible({
        timeout: 12_000,
      });

      // The label element carries the correct Tailwind color class
      await expect(
        page.locator(`.${colorClass}`).filter({ hasText: riskLevel }).first()
      ).toBeVisible();
    });
  }
});

// ---------------------------------------------------------------------------
// GAP-F4 — Confidence Score Numeric
// ---------------------------------------------------------------------------

test.describe("GAP-F4 — Confidence Score Numeric", () => {
  test("displays numeric confidence percentage", async ({ page }) => {
    await setAuth(page, "physician");
    await mockPatients(page);
    await mockRecommendation(page, { confidence_score: 0.87 });

    await page.goto("/");
    await selectTestPatient(page);

    await expect(page.getByText("87% Confidence")).toBeVisible({
      timeout: 12_000,
    });
  });

  test("colors confidence ≥75% green (text-green-700)", async ({ page }) => {
    await setAuth(page, "physician");
    await mockPatients(page);
    await mockRecommendation(page, { confidence_score: 0.87 });

    await page.goto("/");
    await selectTestPatient(page);

    await expect(
      page.locator(".text-green-700").filter({ hasText: /% Confidence/ })
    ).toBeVisible({ timeout: 12_000 });
  });

  test("colors confidence ≥50% and <75% amber (text-amber-700)", async ({
    page,
  }) => {
    await setAuth(page, "physician");
    await mockPatients(page);
    await mockRecommendation(page, { confidence_score: 0.62 });

    await page.goto("/");
    await selectTestPatient(page);

    await expect(page.getByText("62% Confidence")).toBeVisible({
      timeout: 12_000,
    });
    await expect(
      page.locator(".text-amber-700").filter({ hasText: /% Confidence/ })
    ).toBeVisible();
  });

  test("colors confidence <50% red (text-red-700)", async ({ page }) => {
    await setAuth(page, "physician");
    await mockPatients(page);
    await mockRecommendation(page, { confidence_score: 0.4 });

    await page.goto("/");
    await selectTestPatient(page);

    await expect(page.getByText("40% Confidence")).toBeVisible({
      timeout: 12_000,
    });
    await expect(
      page.locator(".text-red-700").filter({ hasText: /% Confidence/ })
    ).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// GAP-F13 — Admin Panel Updates
// ---------------------------------------------------------------------------

test.describe("GAP-F13 — Admin Panel", () => {
  test.beforeEach(async ({ page }) => {
    await setupAdminPage(page);
    await page.goto("/access-monitoring");
    // Wait for the data loading spinner to clear before interacting with tabs
    await expect(
      page.getByText("Loading access monitoring data...")
    ).not.toBeVisible({ timeout: 10_000 });
    await page.getByRole("button", { name: "System Config" }).click();
  });

  test("shows AI Gateway label and hides BAML Client Registry", async ({
    page,
  }) => {
    await expect(page.getByText("AI Gateway")).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText("BAML Client Registry")).not.toBeVisible();
  });

  test("Auth Configuration section is absent", async ({ page }) => {
    await expect(page.getByText("Auth Configuration")).not.toBeVisible();
  });

  test("renders provider logo glyphs for each client", async ({ page }) => {
    await expect(page.getByText("◎")).toBeVisible({ timeout: 5_000 }); // OpenAI
    await expect(page.getByText("◈")).toBeVisible(); // Anthropic
  });
});

