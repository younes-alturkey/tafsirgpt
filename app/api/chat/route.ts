/**
 * DeepSeek ⇄ Tafsir-MCP chat route.
 *
 * The browser POSTs the running conversation; this route drives an agentic loop:
 *   model → (tool calls) → MCP execution → model → … → final answer.
 * The assistant is locked to the Tafsir MCP — every fact it states comes from a
 * tool result, never from the model's own knowledge (enforced by the system
 * prompt in `lib/chat-system.ts` + the tool catalog).
 *
 * The response is a stream of newline-delimited JSON events (NDJSON), so the UI
 * can render the answer token-by-token and show each MCP invocation live:
 *   {type:"delta",  text}                      — a chunk of the answer
 *   {type:"tool_call",   id, name, args}       — the model invoked an MCP tool
 *   {type:"tool_result", id, name, ok, error?} — the tool returned
 *   {type:"done"}                              — turn complete
 *   {type:"error", message}                    — fatal error
 */

import { NextRequest } from "next/server";
import { callTool } from "@/lib/mcp";
import {
  buildSystemPrompt,
  buildToolDefs,
  CHAT_TOOL_ALLOWLIST,
} from "@/lib/chat-system";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const DEEPSEEK_URL =
  process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com/chat/completions";
const MODEL = process.env.DEEPSEEK_MODEL || "deepseek-v4-flash";
// Read from the environment only (set DEEPSEEK_API_KEY in .env.local). No
// in-source fallback — a credential must never live in committed code.
const API_KEY = process.env.DEEPSEEK_API_KEY;

// Guardrails.
const MAX_TOOL_ROUNDS = 8; // model⇄tool exchanges before we force a final answer
const MAX_TURNS = 24; // user/assistant messages accepted from the client
const MAX_MSG_CHARS = 8000; // per client message
const MAX_TOOL_RESULT_CHARS = 40000; // per tool result fed back to the model

// Pushed before the forced final round to make the model synthesise from the
// gathered data only — never from its own knowledge.
const FINAL_NUDGE: Record<Locale, string> = {
  ar: "اكتفِ بما جمعته من بيانات. اكتب الآن الجواب النهائي الكامل بصيغة Markdown اعتماداً فقط على نتائج الأدوات أعلاه. لا تستدعِ أي أداة أخرى، وممنوع إضافة أيّ كتاب أو عالِم أو قول أو حُكم لم يَرِد في نتائج الأدوات؛ وإن لم تُغطِّ المصادرُ المتاحةُ ما سُئِل عنه فاذكر ذلك صراحةً.",
  en: "Enough data has been gathered. Write the complete final answer now in Markdown, based ONLY on the tool results above. Do not call any tools, and do not add any book, scholar, quote, or ruling that did not appear in the tool results; if the available sources don't cover what was asked, say so explicitly.",
};

// Shown if the model produces no visible answer at all (e.g. forced final round
// yielded nothing), so the user never gets a silently blank reply.
const FINAL_FALLBACK: Record<Locale, string> = {
  ar: "تعذّر إنتاج إجابة من المصادر المتاحة في خادم التفسير. يُرجى إعادة صياغة سؤالك أو المحاولة مرة أخرى.",
  en: "I couldn't produce an answer from the available Tafsir sources. Please rephrase your question or try again.",
};

type Role = "user" | "assistant";
type ClientMsg = { role: Role; content: string };

type ToolCall = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
};

/** Keep only well-formed user/assistant turns, trimmed and length-capped. */
function sanitizeMessages(input: unknown): ClientMsg[] {
  if (!Array.isArray(input)) return [];
  const out: ClientMsg[] = [];
  for (const m of input) {
    const role = (m as any)?.role;
    const content = (m as any)?.content;
    if ((role !== "user" && role !== "assistant") || typeof content !== "string")
      continue;
    const text = content.trim();
    if (!text) continue;
    out.push({ role, content: text.slice(0, MAX_MSG_CHARS) });
  }
  // Cap history length; always keep the most recent turns.
  return out.slice(-MAX_TURNS);
}

function clip(text: string): string {
  if (text.length <= MAX_TOOL_RESULT_CHARS) return text;
  return (
    text.slice(0, MAX_TOOL_RESULT_CHARS) +
    '\n…[truncated — request a specific `part` for the rest]'
  );
}

/** Strip anything secret-looking from a string before it can reach the client.
 *  Upstream errors never echo our Authorization header, but this guarantees the
 *  DeepSeek key (or any bearer token) can never ride out on an error message. */
function redactSecrets(message: string): string {
  let out = message;
  if (API_KEY) out = out.split(API_KEY).join("[redacted]");
  return out
    .replace(/sk-[A-Za-z0-9_-]{8,}/g, "sk-[redacted]")
    .replace(/Bearer\s+\S+/gi, "Bearer [redacted]");
}

/**
 * Stream one DeepSeek completion. Forwards answer text via `onDelta` as it
 * arrives and accumulates any tool calls. Returns the full assistant content and
 * the assembled tool calls for this round.
 */
async function streamRound(
  messages: unknown[],
  tools: unknown[],
  onDelta: (text: string) => void,
  signal: AbortSignal,
  toolChoice: "auto" | "none" = "auto",
): Promise<{ content: string; reasoning: string; toolCalls: ToolCall[] }> {
  const res = await fetch(DEEPSEEK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      // Tools stay declared even on the forced final round; `tool_choice:"none"`
      // forbids further calls so the model must synthesise a text answer.
      tools,
      tool_choice: toolChoice,
      stream: true,
      temperature: 0.2,
    }),
    cache: "no-store",
    signal,
  });

  if (!res.ok || !res.body) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      `DeepSeek API error (HTTP ${res.status})${detail ? `: ${detail.slice(0, 300)}` : ""}`,
    );
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let content = "";
  // `deepseek-v4-flash` is a thinking model: it streams `reasoning_content`
  // which MUST be echoed back in the assistant turn, or the next round regresses
  // to emitting raw tool-call markup as text. We capture it but never display it.
  let reasoning = "";
  let leaked = false;
  // Holds back the last few chars of unforwarded text so a control marker split
  // across streamed tokens (e.g. `<`,`｜`,`｜`,`D`,`S`,`M`,`L`) is still caught.
  let pending = "";
  const MARKER = /<｜|｜｜|DSML/;
  const SAFE_TAIL = 6; // ≥ longest marker length, so no partial start leaks
  const toolCalls: ToolCall[] = [];

  // Defence-in-depth: if the thinking model ever leaks its internal tool-call
  // control tokens (e.g. `<｜｜DSML｜｜…>`) into visible content, trim at the marker
  // and suppress the rest of the round so the user never sees raw markup.
  const emit = (text: string) => {
    if (leaked || !text) return;
    pending += text;
    const idx = pending.search(MARKER);
    if (idx >= 0) {
      const clean = pending.slice(0, idx);
      if (clean) {
        content += clean;
        onDelta(clean);
      }
      leaked = true;
      pending = "";
      return;
    }
    // Forward everything except a trailing tail that could begin a marker.
    const emitLen = Math.max(0, pending.length - SAFE_TAIL);
    const out = pending.slice(0, emitLen);
    if (out) {
      content += out;
      onDelta(out);
    }
    pending = pending.slice(emitLen);
  };

  // Flush any held-back tail once the stream ends (no marker materialised).
  const flushPending = () => {
    if (!leaked && pending) {
      content += pending;
      onDelta(pending);
    }
    pending = "";
  };

  const handleLine = (line: string) => {
    const trimmed = line.trim();
    if (!trimmed.startsWith("data:")) return;
    const data = trimmed.slice(5).trim();
    if (!data || data === "[DONE]") return;
    let json: any;
    try {
      json = JSON.parse(data);
    } catch {
      return;
    }
    const delta = json?.choices?.[0]?.delta;
    if (!delta) return;
    if (typeof delta.reasoning_content === "string") {
      reasoning += delta.reasoning_content;
    }
    if (typeof delta.content === "string" && delta.content) {
      emit(delta.content);
    }
    if (Array.isArray(delta.tool_calls)) {
      for (const tc of delta.tool_calls) {
        const idx = typeof tc.index === "number" ? tc.index : 0;
        const slot =
          toolCalls[idx] ||
          (toolCalls[idx] = {
            id: "",
            type: "function",
            function: { name: "", arguments: "" },
          });
        if (tc.id) slot.id = tc.id;
        if (tc.function?.name) slot.function.name += tc.function.name;
        if (tc.function?.arguments)
          slot.function.arguments += tc.function.arguments;
      }
    }
  };

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    for (const line of lines) handleLine(line);
  }
  buffer += decoder.decode(); // flush any trailing multibyte remainder
  if (buffer) handleLine(buffer);
  flushPending();

  return {
    content,
    reasoning,
    toolCalls: toolCalls.filter((t) => t && t.function.name),
  };
}

export async function POST(req: NextRequest): Promise<Response> {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const messages = sanitizeMessages(body?.messages);
  if (messages.length === 0) {
    return Response.json({ ok: false, error: "No messages provided" }, { status: 400 });
  }
  if (!API_KEY) {
    return Response.json(
      { ok: false, error: "DeepSeek API key is not configured (set DEEPSEEK_API_KEY)." },
      { status: 500 },
    );
  }
  const locale: Locale = body?.locale === "en" ? "en" : DEFAULT_LOCALE;

  const encoder = new TextEncoder();
  const signal = req.signal;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      let produced = false; // any visible answer text reached the client?
      const send = (obj: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
        } catch {
          closed = true;
        }
      };
      const sendDelta = (text: string) => {
        if (text) produced = true;
        send({ type: "delta", text });
      };
      // End the turn; if nothing visible was produced, emit a fallback first so
      // the user never sees a silently blank assistant message.
      const finish = () => {
        if (!produced) send({ type: "delta", text: FINAL_FALLBACK[locale] });
        send({ type: "done" });
        closed = true;
        controller.close();
      };

      try {
        const [systemPrompt, tools] = await Promise.all([
          buildSystemPrompt(locale),
          buildToolDefs(),
        ]);

        const convo: any[] = [
          { role: "system", content: systemPrompt },
          ...messages,
        ];

        for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
          if (signal.aborted) break;

          const { content, reasoning, toolCalls } = await streamRound(
            convo,
            tools,
            sendDelta,
            signal,
          );

          if (toolCalls.length === 0) {
            finish();
            return;
          }

          // Record the assistant's tool-call turn (echoing reasoning_content,
          // required by the thinking model), then execute each tool.
          convo.push({
            role: "assistant",
            content: content || null,
            ...(reasoning ? { reasoning_content: reasoning } : {}),
            tool_calls: toolCalls,
          });

          for (const tc of toolCalls) {
            if (signal.aborted) break; // stop firing MCP calls once disconnected
            let args: Record<string, unknown> = {};
            try {
              args = JSON.parse(tc.function.arguments || "{}");
            } catch {
              args = {};
            }
            send({ type: "tool_call", id: tc.id, name: tc.function.name, args });

            let resultText: string;
            // Enforce the allowlist at execution time too (not just when
            // advertising tools), so a hallucinated or injected tool name can
            // never be proxied to the upstream MCP server.
            if (!CHAT_TOOL_ALLOWLIST.has(tc.function.name)) {
              resultText = JSON.stringify({
                error: `Tool '${tc.function.name}' is not available.`,
              });
              send({
                type: "tool_result",
                id: tc.id,
                name: tc.function.name,
                ok: false,
                error: "disallowed tool",
              });
            } else {
              try {
                const data = await callTool(tc.function.name, args);
                resultText = clip(
                  typeof data === "string" ? data : JSON.stringify(data),
                );
                send({ type: "tool_result", id: tc.id, name: tc.function.name, ok: true });
              } catch (err) {
                const message = err instanceof Error ? err.message : "Tool error";
                resultText = JSON.stringify({ error: message });
                send({
                  type: "tool_result",
                  id: tc.id,
                  name: tc.function.name,
                  ok: false,
                  error: message,
                });
              }
            }

            convo.push({
              role: "tool",
              tool_call_id: tc.id,
              content: resultText,
            });
          }
        }

        // Tool rounds exhausted — nudge the model to answer from what it has and
        // force one final tool-free round, so the user always gets a synthesised
        // (and still strictly grounded) reply.
        if (!signal.aborted) {
          convo.push({ role: "user", content: FINAL_NUDGE[locale] });
          await streamRound(convo, tools, sendDelta, signal, "none");
        }
        finish();
      } catch (err) {
        if (!signal.aborted) {
          const message =
            err instanceof Error ? err.message : "Chat request failed";
          send({ type: "error", message: redactSecrets(message) });
        }
        closed = true;
        try {
          controller.close();
        } catch {}
      }
    },
    cancel() {
      // Client disconnected; nothing else to clean up — fetch() aborts via signal.
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      "X-Accel-Buffering": "no",
      Connection: "keep-alive",
    },
  });
}
