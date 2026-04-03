import { AUTH_STORAGE_KEY, encodeToken, MockTokenPayload } from "@/shared/auth-context";

const { postMock, getMock, createMock } = vi.hoisted(() => {
  const postMock = vi.fn();
  const getMock = vi.fn();
  const createMock = vi.fn(() => ({
    post: postMock,
    get: vi.fn(),
    patch: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  }));

  return { postMock, getMock, createMock };
});

vi.mock("axios", () => ({
  default: {
    create: createMock,
    get: getMock,
  },
  create: createMock,
  get: getMock,
}));

describe("clinicalService.healthCheck", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it("posts to the health-check endpoint with monitoring headers", async () => {
    const payload: MockTokenPayload = {
      sub: "usr-sysadmin-00001",
      name: "System Admin",
      role: "sysadmin",
      fhir_scopes: [],
      iat: 1,
      exp: 9999999999,
      iss: "test",
    };
    sessionStorage.setItem(AUTH_STORAGE_KEY, encodeToken(payload));
    postMock.mockResolvedValue({
      data: {
        client_name: "OpenAIClient",
        status: "ok",
        provider: "openai",
        model_id: "gpt-5.4-mini",
        template_version: "openai-v1",
        latency_ms: 18,
        error_message: null,
      },
    });

    const { clinicalService } = await import("./api");
    const response = await clinicalService.healthCheck("OpenAIClient");

    expect(postMock).toHaveBeenCalledWith(
      "/system-config/health-check",
      { client_name: "OpenAIClient" },
      expect.objectContaining({
        headers: expect.objectContaining({
          "X-Auth-Role": "sysadmin",
          "X-Auth-Scopes": "recommendation:read,recommendation:write,monitoring:read",
        }),
      })
    );
    expect(response.status).toBe("ok");
  });

  it("surfaces a specific message when the health-check route is unavailable", async () => {
    const payload: MockTokenPayload = {
      sub: "usr-sysadmin-00001",
      name: "System Admin",
      role: "sysadmin",
      fhir_scopes: [],
      iat: 1,
      exp: 9999999999,
      iss: "test",
    };
    sessionStorage.setItem(AUTH_STORAGE_KEY, encodeToken(payload));
    postMock.mockRejectedValue(new Error("Not Found"));

    const { clinicalService } = await import("./api");

    await expect(clinicalService.healthCheck("OpenAIClient")).rejects.toThrow(
      "Health check service unavailable. Backend may be outdated or needs restart."
    );
  });
});
