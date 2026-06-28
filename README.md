# تفسير جي بي تي · TafsirGPT

A single-page Next.js app that is powered **end-to-end** by the
[Tafsir MCP server](https://mcp.tafsir.net/mcp) of the
[Tafsir Center for Quranic Studies](https://tafsir.net). Every feature in the UI
is backed by a live MCP tool or resource call — there is no bundled Quran data.

- 🧭 **Two modes** via a header switch: **Explore** (the panel UI) and **Chat** (an AI assistant)
- 💬 **Chat assistant** — a ChatGPT-style interface powered by **DeepSeek v4 Flash**, answering *only* from live MCP data
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

## Chat assistant (DeepSeek + MCP)

The header **Chat** mode is a clean, ChatGPT-style assistant that is **100 %
grounded in the Tafsir MCP** — it answers from tool results only, never from the
model's own training data.

```
Browser (components/chat/ChatView.tsx)
   │  POST /api/chat { messages, locale }           ← streams NDJSON events back
   ▼
Next.js route (app/api/chat/route.ts)
   │  agentic loop:  DeepSeek → tool calls → MCP → DeepSeek → … → answer
   ├─ buildSystemPrompt()  ── injects the live source + surah catalogs so the
   │                          model always passes valid slugs / surah numbers
   ├─ buildToolDefs()      ── the 17 MCP tools as DeepSeek function specs
   ▼                          (lib/chat-system.ts)
DeepSeek v4 Flash  ⇄  lib/mcp.ts callTool()  ⇄  https://mcp.tafsir.net/mcp
```

Key design points (`app/api/chat/route.ts`, `lib/chat-system.ts`):

- **MCP-only grounding** — a strict system prompt forbids answering from the
  model's own knowledge; it must fetch via tools and may quote only what a tool
  returned (no fabricated books, scholars, or rulings — it says so when the
  corpus doesn't cover a point).
- **Stays on topic** — off-topic questions get a one-line decline and a nudge
  back to Quran/tafsir; in-scope fiqh/creed/language questions are answered from
  the tafsir corpus (e.g. Qurtubi's *Aḥkām*) via `search_quran_text` discovery.
- **Live tool transparency** — every MCP invocation is streamed to the UI as a
  status chip, and the answer streams token-by-token with Markdown + copy.
- **Thinking-model handling** — DeepSeek v4 Flash streams `reasoning_content`
  which is captured and echoed back in each assistant turn (required, or the
  model leaks raw tool-call markup); a forced tool-free final round guarantees a
  synthesised answer if the tool budget is exhausted.

Set up the key (a real DeepSeek key is required for Chat mode):

```bash
echo 'DEEPSEEK_API_KEY=sk-...' >> .env.local   # .env.local is gitignored
# optional: DEEPSEEK_MODEL=deepseek-v4-flash
```

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

### `/mcp` — transparent MCP proxy

Besides driving its own UI, this app **re-exposes the upstream MCP server** at its
own `/mcp` path. Any standard MCP client can connect to it directly:

```
https://<this-app>/mcp   →  proxies  →  https://mcp.tafsir.net/mcp
```

`app/mcp/route.ts` is a transparent reverse proxy: it does **not** interpret the
protocol, it forwards the raw request and streams the raw response back, so the
full Streamable-HTTP transport survives end-to-end — SSE bodies, the
`mcp-session-id` handshake, every JSON-RPC method, and any future server
capability all pass through verbatim. It adds permissive CORS (exposing
`mcp-session-id`) so browser clients like the MCP Inspector work too. This is
distinct from `/api/mcp`, the simplified JSON helper the browser UI uses.

Being a faithful pass-through, it inherits the upstream's behavior exactly —
including the multi-instance session-affinity flakiness described below (a fresh
session occasionally lands on another instance). Standard MCP clients tolerate
this by reconnecting; the in-app UI works around it in `lib/mcp.ts` instead.

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

Environment variables (all optional except the DeepSeek key for Chat mode):

| Var                | Purpose                          | Default                        |
| ------------------ | -------------------------------- | ------------------------------ |
| `MCP_ENDPOINT`     | Upstream MCP server              | `https://mcp.tafsir.net/mcp`   |
| `DEEPSEEK_API_KEY` | DeepSeek key (Chat mode)         | —                              |
| `DEEPSEEK_MODEL`   | DeepSeek model                   | `deepseek-v4-flash`            |

## Tech

Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS 3 ·
`react-markdown` + `remark-gfm` (chat answers) · DeepSeek v4 Flash (chat) · zero
bundled Quran data — all content is fetched live from the Tafsir MCP server.
