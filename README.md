# مُستكشِف التفسير · Tafsir Explorer

A single-page Next.js app that is powered **end-to-end** by the
[Tafsir MCP server](https://mcp.tafsir.net/mcp) of the
[Tafsir Center for Quranic Studies](https://tafsir.net). Every feature in the UI
is backed by a live MCP tool or resource call — there is no bundled Quran data.

- 🌙 **Arabic by default**, full **English** support, instant RTL ⇄ LTR
- ☀️ **Dark / light** theme with no flash (pre-paint restore) + OS-preference default
- 📱 **Mobile-first**, single page, fully responsive
- 🕌 Refined gold / olive / cream scholarly aesthetic (Cairo + Amiri fonts)
- 🔌 Exercises **all 17 MCP tools and all 4 MCP resources**

## Features → MCP tools

| Section (ar / en)            | MCP tool(s)                                             |
| ---------------------------- | ------------------------------------------------------ |
| الآية والعلوم / Ayah & sciences | `fetch_ayah` (tajwid, i'rab, gharib, qira'at, tadabbur) |
| التفسير / Tafsir              | `fetch_tafsir` (28 sources, paginated)                 |
| بطاقة السورة / Surah card     | `fetch_surah_info`, `get_surah_statistics`             |
| تحليل الكلمة / Word analysis  | `analyze_word` (meaning, i'rab, sarf, stats, qira'at)  |
| الجذور اللغوية / Roots        | `get_root_stats`, `find_root_occurrences`              |
| القراءات / Qira'at            | `get_qeraat_variants`                                  |
| أسباب النزول / Revelation     | `fetch_nuzool_reason`                                  |
| البحث / Search               | `search_quran_text`, `search_in_tafsir`                |
| فوائد الصفحة / Page benefits  | `get_page_fawaed`                                      |
| المصادر والإحصاء / Sources    | `get_quran_overview`, `list_all_sources`, `list_tafsir_sources`, `list_science_sources`, `list_sources_for_ayah` |

Resources used: `quran://surahs`, `quran://tafsirs`, `quran://sciences`,
`quran://schema`.

## Architecture

```
Browser (lib/client.ts)
   │  POST /api/mcp { kind, name|uri, args }
   ▼
Next.js route (app/api/mcp/route.ts)   ── allowlist of 17 tools + 4 resources
   │
   ▼
lib/mcp.ts  ── MCP Streamable-HTTP client
   1. POST initialize            → mcp-session-id header
   2. POST notifications/initialized
   3. POST tools/call | resources/read   → SSE response
   ▼
https://mcp.tafsir.net/mcp
```

Notable details handled in `lib/mcp.ts`:

- **SSE parsing** that joins multi-line `data:` fields.
- **Session-affinity retries**: the server runs on a multi-instance Fly.io
  router with no sticky sessions, so a fresh session id occasionally lands on
  another instance (`404` / `Session not found`). The whole handshake is retried
  with jittered backoff.
- **Multi-block results**: collection tools (`search_*`, `find_root_occurrences`)
  return one `content` block per item; single-value tools return one. The client
  normalizes both.
- **Guidance stripping**: fields beginning with `_` (e.g. `_display`) are LLM
  display hints, not user content — they are removed before reaching the UI.
- Verbatim scholarly text is shown **in full, never summarized**, with
  attribution and footnotes, per the server's display charter.

## Run

```bash
npm install
npm run dev      # http://localhost:3000
# or
npm run build && npm start
```

The MCP endpoint can be overridden with the `MCP_ENDPOINT` env var (defaults to
`https://mcp.tafsir.net/mcp`).

## Tech

Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS 3 · zero runtime
data dependencies — all content is fetched live from the Tafsir MCP server.
