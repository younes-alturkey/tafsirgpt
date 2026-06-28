"use client";

/** Client for the `/api/chat` NDJSON event stream. */

export type ChatEvent =
  | { type: "delta"; text: string }
  | { type: "tool_call"; id: string; name: string; args: Record<string, unknown> }
  | { type: "tool_result"; id: string; name: string; ok: boolean; error?: string }
  | { type: "done" }
  | { type: "error"; message: string };

export type ChatTurn = { role: "user" | "assistant"; content: string };

/**
 * POST the conversation and dispatch each streamed event to `onEvent`.
 * Resolves when the stream ends; rejects only on a hard network failure (an
 * aborted request resolves quietly).
 */
export async function streamChat(params: {
  messages: ChatTurn[];
  locale: "ar" | "en";
  signal?: AbortSignal;
  onEvent: (event: ChatEvent) => void;
}): Promise<void> {
  const { messages, locale, signal, onEvent } = params;

  let res: Response;
  try {
    res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages, locale }),
      signal,
    });
  } catch (err) {
    if (signal?.aborted) return;
    onEvent({
      type: "error",
      message: err instanceof Error ? err.message : "Network error",
    });
    return;
  }

  if (!res.ok || !res.body) {
    let message = `HTTP ${res.status}`;
    try {
      const j = await res.json();
      if (j?.error) message = j.error;
    } catch {}
    onEvent({ type: "error", message });
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const dispatch = (line: string) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    try {
      onEvent(JSON.parse(trimmed) as ChatEvent);
    } catch {
      // ignore malformed line
    }
  };

  try {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const line of lines) dispatch(line);
    }
    buffer += decoder.decode(); // flush any trailing multibyte remainder
    if (buffer) dispatch(buffer);
  } catch (err) {
    if (signal?.aborted) return;
    onEvent({
      type: "error",
      message: err instanceof Error ? err.message : "Stream interrupted",
    });
  }
}
