import { NextRequest, NextResponse } from "next/server";
import { callTool, readResource, cached, McpError } from "@/lib/mcp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Allowlist: only these MCP tools and resources may be proxied.
const ALLOWED_TOOLS = new Set([
  "fetch_ayah",
  "fetch_tafsir",
  "list_tafsir_sources",
  "list_science_sources",
  "list_all_sources",
  "list_sources_for_ayah",
  "fetch_nuzool_reason",
  "fetch_surah_info",
  "get_surah_statistics",
  "analyze_word",
  "find_root_occurrences",
  "get_root_stats",
  "get_qeraat_variants",
  "search_quran_text",
  "search_in_tafsir",
  "get_quran_overview",
  "get_page_fawaed",
]);

const ALLOWED_RESOURCES = new Set([
  "quran://surahs",
  "quran://tafsirs",
  "quran://sciences",
  "quran://schema",
]);

function errorResponse(message: string, status: number) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

/** GET /api/mcp?bootstrap=1 — load immutable catalogs + overview in one shot. */
export async function GET(req: NextRequest) {
  const wantsBootstrap = req.nextUrl.searchParams.get("bootstrap");
  if (!wantsBootstrap) {
    return errorResponse("Use ?bootstrap=1 or POST a tool/resource call.", 400);
  }
  try {
    const [surahs, tafsirs, sciences, overview] = await Promise.all([
      cached("res:surahs", () => readResource("quran://surahs")),
      cached("res:tafsirs", () => readResource("quran://tafsirs")),
      cached("res:sciences", () => readResource("quran://sciences")),
      cached("tool:overview", () => callTool("get_quran_overview", {})),
    ]);
    return NextResponse.json({
      ok: true,
      data: { surahs, tafsirs, sciences, overview },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bootstrap failed";
    return errorResponse(message, 502);
  }
}

/** POST /api/mcp — body: { kind: "tool", name, args } | { kind: "resource", uri } */
export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }

  const kind = body?.kind;

  try {
    if (kind === "tool") {
      const name = String(body?.name || "");
      if (!ALLOWED_TOOLS.has(name)) {
        return errorResponse(`Unknown or disallowed tool: ${name}`, 400);
      }
      const args =
        body?.args && typeof body.args === "object" ? body.args : {};
      const data = await callTool(name, args);
      return NextResponse.json({ ok: true, data });
    }

    if (kind === "resource") {
      const uri = String(body?.uri || "");
      if (!ALLOWED_RESOURCES.has(uri)) {
        return errorResponse(`Unknown or disallowed resource: ${uri}`, 400);
      }
      const data = await cached(`res:${uri}`, () => readResource(uri));
      return NextResponse.json({ ok: true, data });
    }

    return errorResponse("Body must include kind: 'tool' | 'resource'", 400);
  } catch (err) {
    const message =
      err instanceof McpError
        ? err.message
        : err instanceof Error
          ? err.message
          : "MCP request failed";
    // 422 for tool-level errors (bad slug, ayah out of range), 502 for transport.
    const status = err instanceof McpError && err.code === undefined ? 422 : 502;
    return errorResponse(message, status);
  }
}
