/**
 * Server-side client for the Tafsir MCP server (Streamable HTTP transport).
 *
 * The server (https://mcp.tafsir.net/mcp) speaks MCP protocol 2024-11-05 over
 * HTTP with Server-Sent-Event responses. Every logical request is a 3-step
 * handshake that must hit the same backend instance:
 *   1. POST initialize                -> returns an `mcp-session-id` header
 *   2. POST notifications/initialized  (with the session id)
 *   3. POST tools/call | resources/read (with the session id)
 *
 * The server runs behind a multi-instance Fly.io router with no sticky session,
 * so a freshly minted session id occasionally lands on a different instance and
 * yields `-32600 Session not found`. We therefore retry the whole handshake.
 */

const MCP_ENDPOINT = process.env.MCP_ENDPOINT || "https://mcp.tafsir.net/mcp";
const PROTOCOL_VERSION = "2024-11-05";
const CLIENT_INFO = { name: "tafsirgpt", version: "1.0.0" };

export class McpError extends Error {
  code?: number;
  constructor(message: string, code?: number) {
    super(message);
    this.name = "McpError";
    this.code = code;
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type JsonRpcResponse = {
  jsonrpc: string;
  id?: string | number;
  result?: any;
  error?: { code: number; message: string; data?: unknown };
};

/** Parse an SSE body, joining multi-line `data:` fields, and return the last
 *  JSON-RPC message that carries a `result` or `error`. */
function parseSse(raw: string): JsonRpcResponse | null {
  const events: string[] = [];
  let current: string[] = [];
  for (const line of raw.split(/\r?\n/)) {
    if (line.startsWith("data:")) {
      current.push(line.slice(5).replace(/^ /, ""));
    } else if (line.trim() === "") {
      if (current.length) {
        events.push(current.join("\n"));
        current = [];
      }
    }
  }
  if (current.length) events.push(current.join("\n"));

  let out: JsonRpcResponse | null = null;
  for (const e of events) {
    try {
      const j = JSON.parse(e) as JsonRpcResponse;
      if (j && (j.result !== undefined || j.error !== undefined)) out = j;
    } catch {
      // ignore non-JSON event payloads
    }
  }
  return out;
}

async function rawPost(body: unknown, sessionId?: string): Promise<Response> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream",
    "MCP-Protocol-Version": PROTOCOL_VERSION,
  };
  if (sessionId) headers["mcp-session-id"] = sessionId;
  return fetch(MCP_ENDPOINT, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    // Never cache the MCP transport itself.
    cache: "no-store",
  });
}

/** Run one full handshake and a single JSON-RPC call, retrying transient
 *  session-affinity failures. Returns the JSON-RPC `result`. */
async function mcpCall(
  method: string,
  params: unknown,
  { retries = 6 }: { retries?: number } = {},
): Promise<any> {
  let lastError: unknown = null;
  // Backoff with jitter; the Fly.io router occasionally lands a fresh session
  // on a different instance (404 / "Session not found") under concurrency.
  const backoff = (n: number) => sleep(120 * (n + 1) + Math.floor(Math.random() * 120));

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      // 1. initialize
      const initRes = await rawPost({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: PROTOCOL_VERSION,
          capabilities: {},
          clientInfo: CLIENT_INFO,
        },
      });
      const sessionId = initRes.headers.get("mcp-session-id") || undefined;
      await initRes.text(); // drain
      if (!sessionId) {
        lastError = new McpError("No session id returned by MCP server");
        await backoff(attempt);
        continue;
      }

      // 2. notifications/initialized
      const notifyRes = await rawPost(
        { jsonrpc: "2.0", method: "notifications/initialized" },
        sessionId,
      );
      await notifyRes.text(); // drain

      // 3. the actual call
      const res = await rawPost(
        { jsonrpc: "2.0", id: 2, method, params },
        sessionId,
      );
      const text = await res.text();
      const json = parseSse(text);

      if (!json) {
        lastError = new McpError(
          `Unparseable MCP response (HTTP ${res.status})`,
        );
        await backoff(attempt);
        continue;
      }

      if (json.error) {
        const msg = json.error.message || "MCP error";
        // Session affinity miss -> retry the whole handshake.
        if (/session/i.test(msg)) {
          lastError = new McpError(msg, json.error.code);
          await backoff(attempt);
          continue;
        }
        throw new McpError(msg, json.error.code);
      }

      return json.result;
    } catch (err) {
      if (err instanceof McpError && err.code !== undefined) throw err;
      lastError = err;
      await backoff(attempt);
    }
  }

  if (lastError instanceof Error) throw lastError;
  throw new McpError("MCP request failed after retries");
}

/** Recursively drop keys beginning with "_" — these are LLM display-guidance
 *  fields (e.g. `_display`) the server explicitly says not to echo verbatim. */
function stripGuidanceFields<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((v) => stripGuidanceFields(v)) as unknown as T;
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (k.startsWith("_")) continue;
      out[k] = stripGuidanceFields(v);
    }
    return out as T;
  }
  return value;
}

/** Call an MCP tool and return its decoded payload.
 *  Tool results arrive as `content[0].text` holding a JSON string (or, rarely,
 *  plain text). `isError: true` means the text is a human-readable error. */
export async function callTool(name: string, args: Record<string, unknown>): Promise<any> {
  const result = await mcpCall("tools/call", { name, arguments: args });

  const blocks: { text?: string }[] = Array.isArray(result?.content)
    ? result.content
    : [];

  if (result?.isError) {
    throw new McpError(blocks[0]?.text || `Tool ${name} returned an error`);
  }
  if (blocks.length === 0) {
    return stripGuidanceFields(result);
  }

  // Collection tools (search_quran_text, find_root_occurrences, ...) return one
  // content block per item; single-value tools return exactly one block.
  const parse = (text: string | undefined) => {
    if (text === undefined) return null;
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  };

  const parsed = blocks.map((b) => parse(b.text));
  const value = parsed.length === 1 ? parsed[0] : parsed;
  return stripGuidanceFields(value);
}

export type McpToolDef = {
  name: string;
  description?: string;
  /** JSON Schema for the tool's arguments — directly usable as an LLM function
   *  spec (the `parameters` of an OpenAI/DeepSeek function definition). */
  inputSchema?: Record<string, unknown>;
};

/** List the MCP server's tool definitions (name + description + input schema).
 *  Used to expose the tools to the DeepSeek chat model as callable functions. */
export async function listTools(): Promise<McpToolDef[]> {
  const result = await mcpCall("tools/list", {});
  const tools: any[] = Array.isArray(result?.tools) ? result.tools : [];
  return tools.map((t) => ({
    name: String(t?.name || ""),
    description: typeof t?.description === "string" ? t.description : undefined,
    inputSchema:
      t?.inputSchema && typeof t.inputSchema === "object"
        ? (t.inputSchema as Record<string, unknown>)
        : undefined,
  }));
}

/** Read an MCP resource (catalogs / schema). Returns parsed JSON when possible,
 *  otherwise the raw text (the schema resource is Markdown). */
export async function readResource(uri: string): Promise<any> {
  const result = await mcpCall("resources/read", { uri });
  const text: string | undefined = result?.contents?.[0]?.text;
  if (text === undefined) return result;
  try {
    return stripGuidanceFields(JSON.parse(text));
  } catch {
    return text;
  }
}

// ---- simple in-process cache for immutable catalog data -------------------

type CacheEntry = { value: unknown; expires: number };
const cache = new Map<string, CacheEntry>();
const CATALOG_TTL_MS = 1000 * 60 * 30; // 30 min

export async function cached<T>(key: string, loader: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  const now = Date.now();
  if (hit && hit.expires > now) return hit.value as T;
  const value = await loader();
  cache.set(key, { value, expires: now + CATALOG_TTL_MS });
  return value;
}
