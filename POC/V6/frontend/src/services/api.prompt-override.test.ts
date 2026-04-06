import { AUTH_STORAGE_KEY, encodeToken, MockTokenPayload } from "@/shared/auth-context";

const { patchMock, postMock, getMock, createMock } = vi.hoisted(() => {
  const patchMock = vi.fn();
  const postMock = vi.fn();
  const getMock = vi.fn();
  const createMock = vi.fn(() => ({
    post: postMock,
    get: vi.fn(),
    patch: patchMock,
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  }));

  return { patchMock, postMock, getMock, createMock };
});

vi.mock("axios", () => ({
  default: {
    create: createMock,
    get: getMock,
  },
  create: createMock,
  get: getMock,
}));

describe("clinicalService prompt override APIs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it("patches client prompts with monitoring headers", async () => {
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
    patchMock.mockResolvedValue({
      data: {
        client_name: "OpenAIClient",
        template_version: "demo-v2",
        templates: {
          analyze_clinical_risks: "runtime prompt",
        },
      },
    });

    const { clinicalService } = await import("./api");
    const response = await clinicalService.updateClientPrompts("OpenAIClient", {
      version: "demo-v2",
      templates: {
        analyze_clinical_risks: "runtime prompt",
      },
    });

    expect(patchMock).toHaveBeenCalledWith(
      "/system-config/prompts/OpenAIClient",
      {
        version: "demo-v2",
        templates: {
          analyze_clinical_risks: "runtime prompt",
        },
      },
      expect.objectContaining({
        headers: expect.objectContaining({
          "X-Auth-Role": "sysadmin",
          "X-Auth-Scopes": "recommendation:read,recommendation:write,monitoring:read",
        }),
      })
    );
    expect(response.template_version).toBe("demo-v2");
  });

  it("posts prompt reset with monitoring headers", async () => {
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
        template_version: "openai-v1",
        templates: {
          analyze_clinical_risks: "original prompt",
        },
      },
    });

    const { clinicalService } = await import("./api");
    const response = await clinicalService.resetClientPrompts("OpenAIClient");

    expect(postMock).toHaveBeenCalledWith(
      "/system-config/prompts/OpenAIClient/reset",
      undefined,
      expect.objectContaining({
        headers: expect.objectContaining({
          "X-Auth-Role": "sysadmin",
          "X-Auth-Scopes": "recommendation:read,recommendation:write,monitoring:read",
        }),
      })
    );
    expect(response.template_version).toBe("openai-v1");
  });
});
