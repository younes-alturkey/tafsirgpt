/**
 * Transparent MCP reverse proxy.
 *
 * Re-exposes the upstream Tafsir MCP server (https://mcp.tafsir.net/mcp) at this
 * app's own `/mcp` path so any standard MCP client (Claude, Cursor, the MCP
 * Inspector, …) can connect to `https://<this-app>/mcp` and use it exactly like
 * the original — the full Streamable-HTTP transport (MCP protocol 2024-11-05) is
 * carried end-to-end.
 *
 * Unlike `/api/mcp` (a simplified JSON helper the browser UI uses), this route
 * does NOT interpret the protocol: it forwards the raw request and streams the
 * raw response back, so SSE bodies, the `mcp-session-id` handshake, every
 * JSON-RPC method, and any future server capability all pass through verbatim.
 *
 * The upstream answers POST with `text/event-stream` and disables proxy
 * buffering (`x-accel-buffering: no`); we forward its body as a live stream and
 * preserve those headers so streaming survives intermediaries (Vercel, etc.).
 */

import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Streamable-HTTP exchanges are short request/response cycles, but give SSE
// responses generous headroom rather than the platform's terse default.
export const maxDuration = 120;

const MCP_ENDPOINT = process.env.MCP_ENDPOINT || "https://mcp.tafsir.net/mcp";

// Hop-by-hop headers (RFC 7230 §6.1) plus a few that fetch must recompute or
// that would corrupt a streamed/decoded body. Never forwarded to the upstream.
const STRIP_REQUEST_HEADERS = new Set([
  "host",
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "content-length",
  // Let the upstream send uncompressed bytes; SSE + compression is fragile
  // through intermediaries, and undici would decode the body anyway.
  "accept-encoding",
]);

// Headers we must drop from the upstream response: hop-by-hop, plus length/
// encoding — undici has already decoded the body we re-stream, so the original
// content-encoding/content-length no longer describe what the client receives.
const STRIP_RESPONSE_HEADERS = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "content-encoding",
  "content-length",
  // set-cookie is re-attached separately to preserve multiple values.
  "set-cookie",
]);

/** Permissive CORS so browser-based MCP clients (e.g. the MCP Inspector) can
 *  talk to the proxy. `mcp-session-id` MUST be exposed or browsers can't read
 *  the session id the upstream returns on `initialize`. */
function applyCors(headers: Headers, origin: string | null): void {
  headers.set("Access-Control-Allow-Origin", origin || "*");
  // Always advertise that the response varies by Origin, so a shared cache can
  // never serve an Allow-Origin computed for one origin to a different one.
  headers.append("Vary", "Origin");
  headers.set("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Accept, Authorization, mcp-session-id, MCP-Protocol-Version, Last-Event-ID",
  );
  headers.set(
    "Access-Control-Expose-Headers",
    "mcp-session-id, MCP-Protocol-Version",
  );
  headers.set("Access-Control-Max-Age", "86400");
}

function buildRequestHeaders(req: NextRequest): Headers {
  const headers = new Headers();
  req.headers.forEach((value, key) => {
    if (!STRIP_REQUEST_HEADERS.has(key.toLowerCase())) headers.set(key, value);
  });
  return headers;
}

/** Best-effort recovery of the JSON-RPC request id from the (already buffered)
 *  body, so a proxy-generated error can echo it per JSON-RPC 2.0. Returns null
 *  for batches, notifications, or unparseable bodies (all spec-correct). */
function extractJsonRpcId(body: ArrayBuffer | undefined): string | number | null {
  if (!body || body.byteLength === 0) return null;
  try {
    const parsed = JSON.parse(new TextDecoder().decode(body));
    if (parsed && !Array.isArray(parsed)) {
      const id = parsed.id;
      if (typeof id === "string" || typeof id === "number") return id;
    }
  } catch {
    // Unparseable body -> null id, as the spec requires.
  }
  return null;
}

async function proxy(req: NextRequest): Promise<Response> {
  const origin = req.headers.get("origin");
  // Forward to the exact upstream path, carrying any query string verbatim.
  const target = MCP_ENDPOINT + req.nextUrl.search;

  // Buffer the body (MCP JSON-RPC messages are small); GET/HEAD have none.
  const hasBody = req.method !== "GET" && req.method !== "HEAD";
  const body = hasBody ? await req.arrayBuffer() : undefined;

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method: req.method,
      headers: buildRequestHeaders(req),
      body: body && body.byteLength > 0 ? body : undefined,
      // Bypass Next.js's fetch cache entirely — the MCP transport is never cacheable.
      cache: "no-store",
      // Propagate client disconnects to the upstream: when the downstream
      // connection drops mid-stream, abort the upstream fetch instead of
      // leaking the connection until it times out.
      signal: req.signal,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upstream MCP unreachable";
    const headers = new Headers({ "Content-Type": "application/json" });
    applyCors(headers, origin);
    return new Response(
      JSON.stringify({
        jsonrpc: "2.0",
        id: extractJsonRpcId(body),
        error: { code: -32001, message: `MCP proxy upstream error: ${message}` },
      }),
      { status: 502, headers },
    );
  }

  const responseHeaders = new Headers();
  upstream.headers.forEach((value, key) => {
    if (!STRIP_RESPONSE_HEADERS.has(key.toLowerCase())) {
      responseHeaders.set(key, value);
    }
  });
  // Preserve every Set-Cookie verbatim (upstream may use cookies for session
  // affinity); a plain copy would collapse multiple values into one.
  const setCookies =
    (upstream.headers as Headers & { getSetCookie?: () => string[] }).getSetCookie?.() ??
    [];
  for (const cookie of setCookies) responseHeaders.append("set-cookie", cookie);

  applyCors(responseHeaders, origin);

  // Stream the upstream body straight through — this is what keeps SSE live.
  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}

export async function GET(req: NextRequest): Promise<Response> {
  return proxy(req);
}

export async function POST(req: NextRequest): Promise<Response> {
  return proxy(req);
}

export async function DELETE(req: NextRequest): Promise<Response> {
  return proxy(req);
}

/** CORS preflight. Intentionally answered locally (not forwarded): OPTIONS is a
 *  browser/CORS concern, not part of the MCP protocol, and the upstream rejects
 *  it with 405 — forwarding that would fail the preflight and lock browser MCP
 *  clients out. A 204 + CORS headers is what the browser needs to proceed. */
export async function OPTIONS(req: NextRequest): Promise<Response> {
  const headers = new Headers();
  applyCors(headers, req.headers.get("origin"));
  return new Response(null, { status: 204, headers });
}
