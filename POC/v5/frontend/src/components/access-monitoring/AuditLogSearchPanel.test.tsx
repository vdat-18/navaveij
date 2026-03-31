import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuditLogSearchPanel } from "./AuditLogSearchPanel";
import { AuditLogEntry } from "@/types/access-monitoring";

const entry: AuditLogEntry = {
  entry_id: "e1",
  prev_entry_hash: "prev",
  sha256_hash: "hash",
  who: { user_id: "u1", user_role: "admin", user_display_name: "Dr. One" },
  when: { iso_timestamp_utc: new Date().toISOString(), tz: "UTC" },
  where: { service_id: "svc", ip_prefix_masked: "10.0.x.x", user_agent_class: "web" },
  what: { action_type: "View", resource_type: "record", patient_token_masked: "tok-***", field_scope: "all" },
  why: { request_context: "test", legal_basis: "care", policy_version: "v1" },
  retention_expiry: "2099-01-01",
  signature_key_id: "k1",
};

describe("AuditLogSearchPanel", () => {
  it("shows HTTPS warning when crypto.subtle is unavailable", async () => {
    Object.defineProperty(globalThis, "crypto", {
      value: {},
      configurable: true,
    });

    render(
      <AuditLogSearchPanel
        entries={[entry]}
        total={1}
        filters={{}}
        onFilterChange={vi.fn()}
        onSearch={vi.fn(async () => undefined)}
      />
    );

    await userEvent.click(screen.getByText(entry.who.user_id));
    await userEvent.click(screen.getByRole("button", { name: "Verify Hash" }));

    expect(await screen.findByText("Hash verification requires a secure (HTTPS) connection")).toBeInTheDocument();
  });
});

