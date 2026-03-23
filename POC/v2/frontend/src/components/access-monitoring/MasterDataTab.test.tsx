import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MasterDataTab } from "./MasterDataTab";
import { MasterAddOn, MasterProgram } from "@/types/access-monitoring";

const programs: MasterProgram[] = [
  {
    program_code: "PREM_DIAMOND",
    program_name: "Diamond Plus",
    price_thb: 15000,
    target_ages: "30–60",
    gender: "All",
    status: "active",
  },
  {
    program_code: "STD_BASIC",
    program_name: "Standard Core",
    price_thb: 5000,
    target_ages: "20–50",
    gender: "All",
    status: "draft",
  },
];

const addOns: MasterAddOn[] = [
  {
    item_code: "colonoscopy",
    label: "Colonoscopy",
    category: "cancer_screening",
    status: "draft",
    gender_constraint: null,
    age_min: 45,
    age_max: 85,
    trigger_signals: ["colonoscopy_screening_gap"],
    price_thb: 9500,
  },
  {
    item_code: "psa_test",
    label: "PSA Test",
    category: "cancer_screening",
    status: "active",
    gender_constraint: "male",
    age_min: 50,
    age_max: 70,
    trigger_signals: ["psa_screening_gap", "prostate_risk"],
    price_thb: null,
  },
];

describe("MasterDataTab", () => {
  it("renders Programs sub-tab by default with program data", () => {
    render(<MasterDataTab programs={programs} addOns={addOns} />);
    expect(screen.getByText("Diamond Plus")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /add-on library/i })).toBeInTheDocument();
  });

  it("derives tier badge from program code prefix", () => {
    render(<MasterDataTab programs={programs} addOns={addOns} />);
    const badges = screen.getAllByText("Premium");
    expect(badges.length).toBeGreaterThan(0);
    expect(screen.getByText("Standard")).toBeInTheDocument();
  });

  it("shows status badge for each program row", () => {
    render(<MasterDataTab programs={programs} addOns={addOns} />);
    expect(screen.getByText("active")).toBeInTheDocument();
    expect(screen.getByText("draft")).toBeInTheDocument();
  });

  it("switches to Add-On Library and shows items", async () => {
    render(<MasterDataTab programs={programs} addOns={addOns} />);
    await userEvent.click(screen.getByRole("button", { name: /add-on library/i }));
    expect(screen.getByText("Colonoscopy")).toBeInTheDocument();
    const categoryBadges = screen.getAllByText("cancer screening");
    expect(categoryBadges.length).toBeGreaterThan(0);
  });

  it("expands trigger signals on add-on row click and collapses on second click", async () => {
    render(<MasterDataTab programs={programs} addOns={addOns} />);
    await userEvent.click(screen.getByRole("button", { name: /add-on library/i }));

    expect(screen.queryByText("colonoscopy_screening_gap")).not.toBeInTheDocument();
    await userEvent.click(screen.getByText("Colonoscopy"));
    expect(screen.getByText("colonoscopy_screening_gap")).toBeInTheDocument();

    await userEvent.click(screen.getByText("Colonoscopy"));
    expect(screen.queryByText("colonoscopy_screening_gap")).not.toBeInTheDocument();
  });

  it("shows Any gender chip for null constraint and male chip for male constraint", async () => {
    render(<MasterDataTab programs={programs} addOns={addOns} />);
    await userEvent.click(screen.getByRole("button", { name: /add-on library/i }));
    expect(screen.getByText("Any")).toBeInTheDocument();
    expect(screen.getByText("male")).toBeInTheDocument();
  });

  it("shows TBD for null price and formatted price with ฿ for numeric price", async () => {
    render(<MasterDataTab programs={programs} addOns={addOns} />);
    await userEvent.click(screen.getByRole("button", { name: /add-on library/i }));
    expect(screen.getByText("TBD")).toBeInTheDocument();
    expect(screen.getByText(/9,500.*฿/)).toBeInTheDocument();
  });

  it("switches to Tier Rules and shows all 4 rule cards", async () => {
    render(<MasterDataTab programs={programs} addOns={addOns} />);
    await userEvent.click(screen.getByRole("button", { name: /tier rules/i }));
    expect(screen.getByText("PREMIUM_SEVERE_SINGLE")).toBeInTheDocument();
    expect(screen.getByText("P1")).toBeInTheDocument();
    expect(screen.getByText("STANDARD_DEFAULT")).toBeInTheDocument();
    expect(screen.getByText("P4")).toBeInTheDocument();
  });

  it("shows show-more toggle on P2 card and expands all signals on click", async () => {
    render(<MasterDataTab programs={programs} addOns={addOns} />);
    await userEvent.click(screen.getByRole("button", { name: /tier rules/i }));

    expect(screen.getByText("+ 7 more")).toBeInTheDocument();
    expect(screen.queryByText("family_hx_colon_ca_first_degree")).not.toBeInTheDocument();

    await userEvent.click(screen.getByText("+ 7 more"));
    expect(screen.getByText("family_hx_colon_ca_first_degree")).toBeInTheDocument();
    expect(screen.getByText("Show less")).toBeInTheDocument();
  });

  it("switches to Clinical Thresholds and shows reference data", async () => {
    render(<MasterDataTab programs={programs} addOns={addOns} />);
    await userEvent.click(screen.getByRole("button", { name: /clinical thresholds/i }));
    expect(screen.getByText("HbA1c")).toBeInTheDocument();
    expect(screen.getByText("< 5.7%")).toBeInTheDocument();
    expect(screen.getByText("≥ 6.5% (Diabetes)")).toBeInTheDocument();
    expect(screen.getAllByText("ADA 2024").length).toBeGreaterThan(0);
  });

  it("shows empty state for Programs when no data", () => {
    render(<MasterDataTab programs={[]} addOns={[]} />);
    expect(screen.getByText("No programs loaded.")).toBeInTheDocument();
  });

  it("shows empty state for Add-On Library when no data", async () => {
    render(<MasterDataTab programs={[]} addOns={[]} />);
    await userEvent.click(screen.getByRole("button", { name: /add-on library/i }));
    expect(screen.getByText("No add-on items loaded.")).toBeInTheDocument();
  });
});
