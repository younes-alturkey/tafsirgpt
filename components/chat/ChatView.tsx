"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useApp } from "@/components/Providers";
import { localizeError } from "@/lib/i18n";
import { streamChat, type ChatTurn } from "@/lib/chat-client";
import { Markdown } from "./Markdown";
import { PromptEditorDialog } from "./PromptEditorDialog";

type ToolStatus = "running" | "ok" | "error";
type ToolActivity = {
  id: string;
  name: string;
  args: Record<string, unknown>;
  status: ToolStatus;
  error?: string;
};
type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  tools: ToolActivity[];
  error?: string;
};

let idSeq = 0;
const nextId = () => `m${++idSeq}_${Date.now().toString(36)}`;

// DeepSeek-v4-flash exposes a 1,000,000-token context window. Guard the composer
// so an oversized conversation is caught here instead of being sent and rejected
// by the API. We reserve headroom for the system prompt + MCP tool catalog the
// server prepends, and estimate tokens from character count — deliberately
// under-counting chars-per-token (Arabic/Quranic text packs more tokens per
// character than Latin) so the estimate stays on the conservative side.
const CONTEXT_TOKEN_LIMIT = 1_000_000;
const RESERVED_TOKENS = 24_000;
const MAX_PROMPT_TOKENS = CONTEXT_TOKEN_LIMIT - RESERVED_TOKENS;
const CHARS_PER_TOKEN = 3;

const estimateTokens = (text: string) => Math.ceil(text.length / CHARS_PER_TOKEN);

/** A compact hint of the most meaningful tool argument, e.g. "112:1" or a root. */
function toolArgHint(args: Record<string, unknown>): string {
  if (!args) return "";
  if (typeof args.surah === "number") {
    let s = String(args.surah);
    if (typeof args.ayah === "number") s += `:${args.ayah}`;
    if (typeof args.word_no === "number") s += ` · #${args.word_no}`;
    return s;
  }
  if (typeof args.root === "string") return args.root;
  if (typeof args.page === "number") return String(args.page);
  if (typeof args.query === "string") return `«${args.query.slice(0, 24)}»`;
  return "";
}

function SmallSpinner() {
  return (
    <svg className="animate-spin" width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function ToolChip({ tool }: { tool: ToolActivity }) {
  const { t } = useApp();
  const label = t.chat.tool[tool.name] || tool.name;
  const hint = toolArgHint(tool.args);
  return (
    <span
      className={`tool-chip tool-chip-${tool.status}`}
      dir="auto"
      title={tool.error ? `${label}: ${tool.error}` : undefined}
    >
      {tool.status === "running" ? (
        <SmallSpinner />
      ) : tool.status === "error" ? (
        <span aria-hidden="true">✕</span>
      ) : (
        <span aria-hidden="true">✓</span>
      )}
      <span className="font-semibold">{label}</span>
      {hint ? <span className="text-faint">{hint}</span> : null}
    </span>
  );
}

function CopyMessageButton({ text }: { text: string }) {
  const { t } = useApp();
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="msg-action"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1400);
        } catch {}
      }}
      title={t.copy}
    >
      {done ? `✓ ${t.copied}` : t.copy}
    </button>
  );
}

function ThinkingDots() {
  return (
    <span className="thinking-dots" aria-hidden="true">
      <span />
      <span />
      <span />
    </span>
  );
}

export function ChatView() {
  const { t, locale, newChatSignal } = useApp();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const taRef = useRef<HTMLTextAreaElement | null>(null);
  const activeIdRef = useRef<string | null>(null);
  // Synchronous guard so two activations in the same frame (e.g. example chips)
  // can't both pass the streaming check before React commits `setStreaming`.
  const streamingRef = useRef(false);
  // Track whether the user is pinned to the bottom so streaming auto-scroll
  // never fights a deliberate scroll-up to read earlier text.
  const atBottomRef = useRef(true);

  // Estimated prompt size = the history that will be replayed + the current
  // draft. When it crosses the model's context window we block sending and warn.
  const historyTokens = useMemo(
    () => messages.reduce((n, m) => n + estimateTokens(m.content), 0),
    [messages],
  );
  const overLimit = historyTokens + estimateTokens(input) > MAX_PROMPT_TOKENS;

  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  useEffect(() => {
    if (atBottomRef.current) scrollToBottom();
  }, [messages, scrollToBottom]);

  // Abort any in-flight request if the view unmounts (e.g. switching to Explore
  // mode mid-stream) so the DeepSeek request isn't left running in the background.
  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  // The header "+" button bumps `newChatSignal`: clear the conversation and focus
  // the composer. Signal 0 is the initial load, so we don't steal focus then.
  useEffect(() => {
    if (newChatSignal === 0) return;
    abortRef.current?.abort();
    abortRef.current = null;
    streamingRef.current = false;
    activeIdRef.current = null;
    setStreaming(false);
    setMessages([]);
    setInput("");
    if (taRef.current) {
      taRef.current.style.height = "auto";
      taRef.current.focus();
    }
    // Fallback in case the textarea mounts a tick later (Explore → Chat switch).
    const id = setTimeout(() => taRef.current?.focus(), 50);
    return () => clearTimeout(id);
  }, [newChatSignal]);

  const onScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    atBottomRef.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  }, []);

  const patchActive = useCallback(
    (fn: (m: ChatMessage) => ChatMessage) => {
      const id = activeIdRef.current;
      if (!id) return;
      setMessages((prev) =>
        prev.map((m) => (m.id === id ? fn(m) : m)),
      );
    },
    [],
  );

  const send = useCallback(
    (raw: string) => {
      const text = raw.trim();
      if (!text || streamingRef.current) return;
      // Never send a turn that would exceed the model's context window.
      if (historyTokens + estimateTokens(text) > MAX_PROMPT_TOKENS) return;
      streamingRef.current = true;

      const userMsg: ChatMessage = {
        id: nextId(),
        role: "user",
        content: text,
        tools: [],
      };
      const assistantId = nextId();
      const assistantMsg: ChatMessage = {
        id: assistantId,
        role: "assistant",
        content: "",
        tools: [],
      };
      activeIdRef.current = assistantId;

      // Build the API payload from the prior turns + this new user message.
      const history: ChatTurn[] = messages
        .filter((m) => m.content.trim().length > 0)
        .map((m) => ({ role: m.role, content: m.content }));
      const payload: ChatTurn[] = [...history, { role: "user", content: text }];

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setInput("");
      setStreaming(true);
      atBottomRef.current = true;
      if (taRef.current) taRef.current.style.height = "auto";

      const controller = new AbortController();
      abortRef.current = controller;

      streamChat({
        messages: payload,
        locale,
        signal: controller.signal,
        onEvent: (ev) => {
          if (ev.type === "delta") {
            patchActive((m) => ({ ...m, content: m.content + ev.text }));
          } else if (ev.type === "tool_call") {
            patchActive((m) => ({
              ...m,
              tools: [
                ...m.tools,
                { id: ev.id, name: ev.name, args: ev.args, status: "running" },
              ],
            }));
          } else if (ev.type === "tool_result") {
            patchActive((m) => ({
              ...m,
              tools: m.tools.map((tl) =>
                tl.id === ev.id
                  ? {
                      ...tl,
                      status: ev.ok ? "ok" : "error",
                      error: ev.ok ? undefined : ev.error,
                    }
                  : tl,
              ),
            }));
          } else if (ev.type === "error") {
            patchActive((m) => ({ ...m, error: ev.message }));
          }
        },
      })
        .catch(() => {})
        .finally(() => {
          streamingRef.current = false;
          setStreaming(false);
          abortRef.current = null;
          activeIdRef.current = null;
        });
    },
    [messages, locale, patchActive, historyTokens],
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    streamingRef.current = false;
    setStreaming(false);
    activeIdRef.current = null;
  }, []);

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      if (!overLimit) send(input);
    }
  };

  // Grow the composer to fit its content, capped so it never eats the page.
  const autoSize = useCallback((el: HTMLTextAreaElement | null) => {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, []);

  const onInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    autoSize(e.target);
  };

  // Closing the editor: edits made there bypass the composer's onChange, so
  // re-fit the composer to the (possibly changed) shared value once it's back.
  const closeEditor = useCallback(() => {
    setEditorOpen(false);
    requestAnimationFrame(() => {
      const el = taRef.current;
      if (el) {
        autoSize(el);
        el.focus();
      }
    });
  }, [autoSize]);

  const empty = messages.length === 0;

  return (
    <div className="chat-view">
      <div className="chat-scroll" ref={scrollRef} onScroll={onScroll}>
        <div className="chat-inner">
          {empty ? (
            <div className="chat-hero">
              <h2 className="chat-hero-title">{t.chat.title}</h2>
              <p className="chat-hero-sub">{t.appTagline}</p>
              <div className="chat-examples">
                <span className="chat-examples-label">{t.chat.examplesTitle}</span>
                <div className="chat-examples-grid">
                  {t.chat.examples.map((ex) => (
                    <button
                      key={ex}
                      type="button"
                      className="example-chip"
                      dir="auto"
                      onClick={() => send(ex)}
                    >
                      {ex}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="chat-messages">
              {messages.map((m) => {
                const isActive = streaming && m.id === activeIdRef.current;
                if (m.role === "user") {
                  return (
                    <div key={m.id} className="msg msg-user">
                      <div className="bubble-user" dir="auto">
                        {m.content}
                      </div>
                    </div>
                  );
                }
                const showThinking =
                  isActive && m.content === "" && m.tools.length === 0;
                return (
                  <div key={m.id} className="msg msg-assistant">
                    <div className="msg-head">
                      <span className="msg-avatar" aria-hidden="true">
                        ت
                      </span>
                      <span className="msg-name">{t.chat.assistant}</span>
                    </div>
                    {m.tools.length > 0 && (
                      <div className="tool-row">
                        {m.tools.map((tl) => (
                          <ToolChip key={tl.id} tool={tl} />
                        ))}
                      </div>
                    )}
                    {showThinking ? (
                      <div className="msg-thinking">
                        <ThinkingDots />
                        <span className="text-faint text-sm">
                          {m.tools.length === 0 ? t.chat.thinking : t.chat.working}
                        </span>
                      </div>
                    ) : null}
                    {m.content ? (
                      <div className={isActive ? "msg-body streaming" : "msg-body"}>
                        <Markdown>{m.content}</Markdown>
                      </div>
                    ) : null}
                    {m.error ? (
                      <div className="msg-error" role="alert">
                        <span className="font-semibold">{t.chat.errorTitle}:</span>{" "}
                        {localizeError(m.error, locale)}
                      </div>
                    ) : null}
                    {!isActive && m.content ? (
                      <div className="msg-actions">
                        <CopyMessageButton text={m.content} />
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="chat-composer-wrap">
        <div className="chat-composer">
          {overLimit ? (
            <div className="composer-alert" role="alert">
              {t.chat.contextLimit}
            </div>
          ) : null}
          <div className="composer-box">
            <textarea
              ref={taRef}
              className="composer-input"
              value={input}
              onChange={onInput}
              onKeyDown={onKeyDown}
              placeholder={t.chat.placeholder}
              rows={1}
              aria-label={t.chat.placeholder}
            />
            <button
              type="button"
              className="composer-btn composer-expand"
              onClick={() => setEditorOpen(true)}
              aria-label={t.chat.expand}
              title={t.chat.expand}
            >
              <ExpandIcon />
            </button>
            {streaming ? (
              <button
                type="button"
                className="composer-btn composer-stop"
                onClick={stop}
                aria-label={t.chat.stop}
                title={t.chat.stop}
              >
                <span className="stop-square" aria-hidden="true" />
              </button>
            ) : (
              <button
                type="button"
                className="composer-btn composer-send"
                onClick={() => send(input)}
                disabled={!input.trim() || overLimit}
                aria-label={t.chat.send}
                title={t.chat.send}
              >
                <SendIcon />
              </button>
            )}
          </div>
        </div>
      </div>

      <PromptEditorDialog
        open={editorOpen}
        value={input}
        onChange={setInput}
        onClose={closeEditor}
        onSubmit={() => {
          send(input);
          closeEditor();
        }}
        canSubmit={!!input.trim() && !streaming && !overLimit}
      />
    </div>
  );
}

function ExpandIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M14 4h6v6M20 4l-7 7M10 20H4v-6M4 20l7-7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M5 12h13M12 5l7 7-7 7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
