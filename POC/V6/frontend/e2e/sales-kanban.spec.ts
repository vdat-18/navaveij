/**
 * E2E tests — Sales Kanban Board (Task 6, Workstream 13.4)
 *
 * Strategy
 * - Inject a sales auth token into sessionStorage before each test via
 *   addInitScript (runs before page JS executes).
 * - Mock all backend API calls with page.route so the backend is not
 *   required; each test controls exactly what data appears in the Kanban.
 * - Navigate to "/" and click the "My Leads" tab to mount the panel.
 *
 * URL note: The service layer uses API_BASE_URL_V3 = "/api/proxy".
 * All lead service calls go to /api/proxy/leads, /api/proxy/pre-runned-patients/{token}/recommendation,
 * and /api/proxy/leads/{id}/status -- NOT bare /api/leads.
 * Playwright page.route patterns must target the /api/proxy/* paths.
 *
 * Auth note: token logic inlined to avoid importing React/Next.js modules
 * (encodeToken = btoa(JSON.stringify(payload))).
 */

import { type LeadAssignment, type LeadStatus } from "@/types/leads";
import { test, expect, type Page } from "@playwright/test";

// ── URL patterns ──────────────────────────────────────────────────────────────

const LEADS_URL = "**/api/proxy/leads";
const RECOMMENDATION_URL = "**/api/proxy/pre-runned-patients/*/recommendation";
const STATUS_URL = "**/api/proxy/leads/*/status";

// ── Auth helper ───────────────────────────────────────────────────────────────

const SALES_TOKEN = Buffer.from(
  JSON.stringify({
    sub: "usr-sales-00001",
    name: "Somying Srisuk",
    role: "sales",
    fhir_scopes: ["patient/*.read", "observation.read"],
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
    iss: "https://auth.navavej.demo/realms/hospital",
  })
).toString("base64");

async function injectSalesAuth(page: Page) {
  await page.addInitScript(
    ({ key, token }: { key: string; token: string }) => {
      sessionStorage.setItem(key, token);
    },
    { key: "navavej.smartToken.v1", token: SALES_TOKEN }
  );
}

// ── Fixture data ──────────────────────────────────────────────────────────────

function makeLead(
  overrides: Partial<LeadAssignment> & { assignment_id: string; status: LeadStatus }
): LeadAssignment {
  return {
    patient_id: `id_${overrides.assignment_id}`,
    patient_token: `tok_${overrides.assignment_id}`,
    patient_name: `Patient ${overrides.assignment_id}`,
    scenario_label: `Scenario ${overrides.assignment_id}`,
    overall_risk_level: "Medium",
    ai_recommended_tier: "Advanced",
    generated_at: "2026-04-03T09:00:00Z",
    ai_lead_summary: `Summary for ${overrides.assignment_id}.`,
    assigned_to_user_id: "usr-sales-00001",
    assigned_to_name: "Somying Srisuk",
    assigned_by_user_id: "usr-executive-00001",
    assigned_at: "2026-04-03T10:00:00Z",
    notes: "",
    ...overrides,
  };
}

const LEAD_A = makeLead({
  assignment_id: "lead_A",
  status: "assigned",
  patient_token: "tok_A",
  patient_name: "Siriporn Chantarak",
  scenario_label: "Senior Cancer Screening Gap",
  overall_risk_level: "High",
  ai_recommended_tier: "Premium",
});

const LEAD_B = makeLead({
  assignment_id: "lead_B",
  status: "assigned",
  patient_token: "tok_B",
  patient_name: "Nalinee Kittipong",
  scenario_label: "Thyroid Nodule Follow-up",
});

const LEAD_C = makeLead({
  assignment_id: "lead_C",
  status: "contacted",
  patient_token: "tok_C",
  patient_name: "Preecha Nimitr",
  scenario_label: "Post-COVID Cardio Follow-up",
  notes: "Called patient, left message.",
});

const RECOMMENDATION_A = {
  patient_id: "id_lead_A",
  patient_token: "tok_A",
  patient_name: "Siriporn Chantarak",
  age: 68,
  gender: "Female",
  scenario_label: "Senior Cancer Screening Gap",
  generated_at: "2026-04-03T09:05:00Z",
  ai_lead_summary: "Position this as a convenience-led comprehensive checkup.",
  recommendation: {
    overall_risk_level: "High",
    ai_recommended_tier: "Premium",
    tier_deviation_justification: "Multiple overdue screenings justify premium.",
    add_ons: [],
    reasoning_trace: "A premium bundle maximises screening completion.",
    reasoning_trace_annotated: [],
    supporting_signals: [],
    missing_signals: [],
    communication_script: {
      summary_headline: "Overdue screenings support premium follow-up",
      summary_headline_highlights: [],
      top_findings: [],
      program_justification: "Frame the visit around convenience.",
      program_justification_highlights: [],
      priority_add_ons: [{ label: "Colonoscopy", severity: "critical" }],
      next_actions: [],
    },
    rule_preliminary_tier: "Advanced",
    resolved_package: { tier: "Premium", name: "Navavej Premium Preventive Plus", price_thb: 17900 },
    resolved_package_status: "matched",
    confidence_score: 0.89,
    confidence_tier: "High",
    signal_coverage: 0.87,
    data_completeness: 0.9,
    rule_agreement: 0.94,
    review_required: false,
    recommendation_source: "precomputed",
    recommendation_hash: "hash_A",
    risk_summary: { source: "precomputed-fixture", is_fallback: false, description: "High preventive risk." },
    patient_high_alert: { critical_signals: [] },
    security_metadata: {},
    metadata: { generated_at: "2026-04-03T09:05:00Z" },
  },
};

// ── Route mock helpers ────────────────────────────────────────────────────────

async function mockLeadsApi(page: Page, leads: LeadAssignment[]) {
  await page.route(LEADS_URL, (route) => {
    if (route.request().method() === "GET") {
      return route.fulfill({ json: leads });
    }
    return route.continue();
  });
}

async function mockRecommendationApi(page: Page) {
  await page.route(RECOMMENDATION_URL, (route) =>
    route.fulfill({ json: RECOMMENDATION_A })
  );
}

// ── Navigation helper ─────────────────────────────────────────────────────────

async function goToMyLeads(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "My Leads" }).click();
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test.describe("Sales Kanban Board", () => {
  test("renders all 5 status columns", async ({ page }) => {
    await injectSalesAuth(page);
    await mockLeadsApi(page, [LEAD_A, LEAD_C]);
    await mockRecommendationApi(page);
    await goToMyLeads(page);

    for (const label of ["Assigned", "Contacted", "Scheduled", "Converted", "Declined"]) {
      await expect(page.getByText(label, { exact: true }).first()).toBeVisible();
    }
  });

  test("places each lead in the column matching its status", async ({ page }) => {
    await injectSalesAuth(page);
    await mockLeadsApi(page, [LEAD_A, LEAD_B, LEAD_C]);
    await mockRecommendationApi(page);
    await goToMyLeads(page);

    // "Assigned" column has 2 leads (A, B); "Contacted" has 1 (C)
    // The column header count badge should reflect this
    const assignedColumn = page.locator(".grid.grid-cols-5 > div").nth(0);
    const contactedColumn = page.locator(".grid.grid-cols-5 > div").nth(1);

    await expect(assignedColumn.getByText("Siriporn Chantarak")).toBeVisible();
    await expect(assignedColumn.getByText("Nalinee Kittipong")).toBeVisible();
    await expect(contactedColumn.getByText("Preecha Nimitr")).toBeVisible();

    // Empty columns (Scheduled, Converted, Declined) each show the placeholder
    const emptyPlaceholders = page.locator("text=No leads");
    await expect(emptyPlaceholders).toHaveCount(3);
  });

  test("auto-selects first lead from first non-empty column on load", async ({ page }) => {
    await injectSalesAuth(page);
    await mockLeadsApi(page, [LEAD_A, LEAD_C]);
    await mockRecommendationApi(page);
    await goToMyLeads(page);

    // LEAD_A is first in "assigned" (first non-empty column) → its recommendation loads
    await expect(page.getByText("Navavej Premium Preventive Plus")).toBeVisible();

    // "Move to" should default to next status after "assigned" = "contacted"
    await expect(page.getByRole("combobox")).toHaveValue("contacted");
  });

  test("clicking a card in a different column loads that lead and updates Move-to", async ({ page }) => {
    await injectSalesAuth(page);
    await mockLeadsApi(page, [LEAD_A, LEAD_C]);
    // Serve a distinct recommendation for LEAD_C
    await page.route("**/api/proxy/pre-runned-patients/tok_C/recommendation", (route) =>
      route.fulfill({
        json: {
          ...RECOMMENDATION_A,
          patient_token: "tok_C",
          patient_name: "Preecha Nimitr",
          recommendation: {
            ...RECOMMENDATION_A.recommendation,
            resolved_package: { tier: "Advanced", name: "Navavej Advanced Recovery Review", price_thb: 12900 },
          },
        },
      })
    );
    await page.route("**/api/proxy/pre-runned-patients/tok_A/recommendation", (route) =>
      route.fulfill({ json: RECOMMENDATION_A })
    );
    await goToMyLeads(page);

    // LEAD_A is auto-selected on load; click LEAD_C in the "Contacted" column
    const contactedColumn = page.locator(".grid.grid-cols-5 > div").nth(1);
    await contactedColumn.getByText("Preecha Nimitr").click();

    await expect(page.getByText("Navavej Advanced Recovery Review")).toBeVisible();
    // LEAD_C is "contacted" → next status is "scheduled"
    await expect(page.getByRole("combobox")).toHaveValue("scheduled");
    // Notes from LEAD_C are pre-populated
    await expect(page.getByRole("textbox")).toHaveValue("Called patient, left message.");
  });

  test("updating status moves card to new column and advances Move-to", async ({ page }) => {
    await injectSalesAuth(page);
    await mockLeadsApi(page, [LEAD_A, LEAD_C]);
    await mockRecommendationApi(page);

    // Mock the PATCH for LEAD_A's status update
    await page.route(STATUS_URL, (route) => {
      if (route.request().method() === "PATCH") {
        const body = JSON.parse(route.request().postData() ?? "{}") as { status: LeadStatus; notes: string };
        return route.fulfill({ json: { ...LEAD_A, status: body.status, notes: body.notes ?? "" } });
      }
      return route.continue();
    });

    await goToMyLeads(page);

    // LEAD_A ("assigned") is auto-selected, "Move to" defaults to "contacted"
    await expect(page.getByRole("combobox")).toHaveValue("contacted");

    // Click Update Lead
    await page.getByRole("button", { name: "Update lead" }).click();

    // After update: LEAD_A moves to "Contacted" column; "Assigned" becomes empty
    const assignedColumn = page.locator(".grid.grid-cols-5 > div").nth(0);
    await expect(assignedColumn.getByText("No leads")).toBeVisible();

    // "Contacted" column now has 2 leads
    const contactedColumn = page.locator(".grid.grid-cols-5 > div").nth(1);
    await expect(contactedColumn.getByText("Siriporn Chantarak")).toBeVisible();

    // "Move to" advances to next status after "contacted" = "scheduled"
    await expect(page.getByRole("combobox")).toHaveValue("scheduled");
  });

  test("shows empty state when no leads are assigned", async ({ page }) => {
    await injectSalesAuth(page);
    await mockLeadsApi(page, []);
    await goToMyLeads(page);

    await expect(page.getByText("No assigned outreach leads yet")).toBeVisible();
  });

  test("Kanban is horizontally scrollable at narrow viewport", async ({ page }) => {
    await injectSalesAuth(page);
    await mockLeadsApi(page, [LEAD_A]);
    await mockRecommendationApi(page);

    await page.setViewportSize({ width: 768, height: 900 });
    await goToMyLeads(page);

    // overflow-x-auto container wraps the 1100px minimum-width inner grid
    const scrollContainer = page.locator(".overflow-x-auto").first();
    await expect(scrollContainer).toBeVisible();

    const innerGrid = scrollContainer.locator(".grid.grid-cols-5");
    const box = await innerGrid.boundingBox();
    expect(box?.width).toBeGreaterThanOrEqual(1100);
  });
});
