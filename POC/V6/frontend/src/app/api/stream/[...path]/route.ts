/**
 * SSE / streaming proxy on the default server runtime.
 * Proxies POST requests to BACKEND_URL/api/* and streams the response back.
 */
const BACKEND_URL =
  process.env.BACKEND_URL || "http://localhost:8000";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const backendPath = `/api/${path.join("/")}`;
  const url = new URL(backendPath, BACKEND_URL);

  // Forward relevant headers
  const headers = new Headers();
  const skipHeaders = new Set([
    "host",
    "connection",
    "transfer-encoding",
    "x-forwarded-host",
    "x-forwarded-port",
    "x-forwarded-proto",
  ]);
  request.headers.forEach((value, key) => {
    if (!skipHeaders.has(key.toLowerCase())) {
      headers.set(key, value);
    }
  });

  try {
    const upstream = await fetch(url.toString(), {
      method: "POST",
      headers,
      body: await request.arrayBuffer(),
    });

    if (!upstream.ok) {
      const text = await upstream.text().catch(() => "");
      return new Response(
        JSON.stringify({ error: `Upstream ${upstream.status}`, detail: text }),
        {
          status: upstream.status,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Stream the upstream body directly to the client
    const responseHeaders = new Headers();
    upstream.headers.forEach((value, key) => {
      if (!["transfer-encoding", "connection"].includes(key.toLowerCase())) {
        responseHeaders.set(key, value);
      }
    });
    // Ensure SSE content type
    if (!responseHeaders.has("content-type")) {
      responseHeaders.set("content-type", "text/event-stream; charset=utf-8");
    }
    responseHeaders.set("cache-control", "no-cache");
    responseHeaders.set("x-accel-buffering", "no");

    return new Response(upstream.body, {
      status: 200,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("[api/stream] upstream error:", error);
    return new Response(
      JSON.stringify({ error: "Backend unavailable", detail: String(error) }),
      {
        status: 502,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
