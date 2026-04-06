import AuditPage from "./page";
import { redirect } from "next/navigation";

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

describe("AuditPage", () => {
  it("redirects to access monitoring route", () => {
    AuditPage();
    expect(redirect).toHaveBeenCalledWith("/access-monitoring");
  });
});
