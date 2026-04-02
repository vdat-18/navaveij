import { clinicalService } from "./api";
import { AUTH_STORAGE_KEY, encodeToken, MockTokenPayload } from "@/shared/auth-context";

const makeStreamResponse = (chunks: string[]) => {
  let index = 0;
  const encoder = new TextEncoder();

  return {
    ok: true,
    status: 200,
    body: {
      getReader: () => ({
        read: async () => {
          if (index >= chunks.length) {
            return { done: true, value: undefined };
          }
          const value = encoder.encode(chunks[index]);
          index += 1;
          return { done: false, value };
        },
      }),
    },
  } as Response;
};

describe("clinicalService.streamRecommendation", () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("uses the stream proxy endpoint and executive monitoring scopes", async () => {
    const payload: MockTokenPayload = {
      sub: "usr-executive-00001",
      name: "Wanchai Thongchai",
      role: "executive",
      fhir_scopes: [],
      iat: 1,
      exp: 9999999999,
      iss: "test",
    };
    sessionStorage.setItem(AUTH_STORAGE_KEY, encodeToken(payload));

    const fetchMock = vi.fn().mockResolvedValue(
      makeStreamResponse([
        'data: {"type":"stage","stage":1,"label":"Preparing"}\n\n',
        'data: {"type":"result","summary":"done"}\n\n',
      ])
    );
    vi.stubGlobal("fetch", fetchMock);

    const onStage = vi.fn();
    const result = await clinicalService.streamRecommendation("tok-123", onStage);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/stream/recommend/stream",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          "X-Auth-Role": "executive",
          "X-Auth-Scopes": "recommendation:read,monitoring:read",
        }),
      })
    );
    expect(onStage).toHaveBeenCalledWith({ stage: 1, label: "Preparing" });
    expect(result).toEqual(expect.objectContaining({ summary: "done" }));
  });
});
