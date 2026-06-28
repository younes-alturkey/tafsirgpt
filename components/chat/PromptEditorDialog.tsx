"use client";

import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { useApp } from "@/components/Providers";

type Props = {
  open: boolean;
  /** Shared value — the single source of truth lives in the composer. */
  value: string;
  onChange: (v: string) => void;
  onClose: () => void;
  onSubmit: () => void;
  canSubmit: boolean;
};

/**
 * A roomy, line-numbered editor for the same text the composer holds. It owns no
 * copy of the value: it reads/writes the composer's state directly, so the two
 * inputs can never drift out of sync. Click-away or Escape collapses it.
 */
export function PromptEditorDialog(props: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted || !props.open) return null;
  return createPortal(<PromptEditor {...props} />, document.body);
}

function PromptEditor({ value, onChange, onClose, onSubmit, canSubmit }: Props) {
  const { t } = useApp();
  const taRef = useRef<HTMLTextAreaElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  // Focus the editor (caret at the end) on open, and lock background scroll
  // while it's up so the page behind the backdrop stays put.
  useEffect(() => {
    const ta = taRef.current;
    if (ta) {
      ta.focus();
      const end = ta.value.length;
      ta.setSelectionRange(end, end);
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // ⌘/Ctrl+Enter sends; plain Enter inserts a newline (this is the multi-line
  // editor). Escape and the focus trap are handled on the panel so they work no
  // matter which control inside the dialog has focus.
  const onTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      if (canSubmit) onSubmit();
    }
  };

  // Close on Escape, and keep Tab focus cycling inside the modal so it can't
  // wander onto the obscured page behind the backdrop (aria-modal contract).
  const onPanelKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
      return;
    }
    if (e.key !== "Tab") return;
    const panel = panelRef.current;
    if (!panel) return;
    const f = panel.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    if (f.length === 0) return;
    const first = f[0];
    const last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <div
      className="editor-overlay"
      role="presentation"
      // Use mousedown + target check so a selection drag that happens to release
      // over the backdrop doesn't count as a click-away.
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="editor-panel"
        role="dialog"
        aria-modal="true"
        aria-label={t.chat.editorTitle}
        dir={t.dir}
        ref={panelRef}
        onKeyDown={onPanelKeyDown}
      >
        <div className="editor-head">
          <span className="editor-title">{t.chat.editorTitle}</span>
        </div>

        <LineNumberedTextarea
          taRef={taRef}
          value={value}
          onChange={onChange}
          onKeyDown={onTextareaKeyDown}
          placeholder={t.chat.placeholder}
          dir={t.dir}
        />

        <div className="editor-foot">
          <button
            type="button"
            className="btn btn-primary editor-send"
            onClick={onSubmit}
            disabled={!canSubmit}
          >
            {t.chat.send}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * A textarea with a synced line-number gutter. The gutter aligns to the first
 * visual row of every logical line — including wrapped ones — by measuring each
 * line's height from a hidden mirror that shares the textarea's exact box and
 * typography (same padding, wrap rules, and reserved scrollbar gutter).
 */
function LineNumberedTextarea({
  taRef,
  value,
  onChange,
  onKeyDown,
  placeholder,
  dir,
}: {
  taRef: React.RefObject<HTMLTextAreaElement | null>;
  value: string;
  onChange: (v: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  placeholder: string;
  /** Textarea AND mirror share this direction so they wrap identically. */
  dir: string;
}) {
  const gutterRef = useRef<HTMLDivElement | null>(null);
  const mirrorRef = useRef<HTMLDivElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [heights, setHeights] = useState<number[]>([]);

  const lines = useMemo(() => value.split("\n"), [value]);

  const measure = useCallback(() => {
    const mirror = mirrorRef.current;
    if (!mirror) return;
    // Fractional border-box height (not the integer-rounded offsetHeight) so the
    // stacked gutter heights track the textarea's true sub-pixel row layout and
    // numbers don't drift out of alignment over many lines.
    setHeights(
      Array.from(mirror.children).map(
        (c) => (c as HTMLElement).getBoundingClientRect().height,
      ),
    );
  }, []);

  // Re-measure synchronously whenever the text changes, before paint.
  useLayoutEffect(measure, [value, measure]);

  // Re-measure when the panel resizes (wrap width changes the wrapping).
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [measure]);

  const syncScroll = useCallback(() => {
    if (gutterRef.current && taRef.current) {
      gutterRef.current.scrollTop = taRef.current.scrollTop;
    }
  }, [taRef]);

  return (
    <div className="editor-body">
      <div className="editor-gutter" ref={gutterRef} aria-hidden="true">
        {lines.map((_, i) => (
          <div
            key={i}
            className="editor-lineno"
            style={heights[i] ? { height: heights[i] } : undefined}
          >
            {i + 1}
          </div>
        ))}
      </div>
      <div className="editor-input-wrap" ref={wrapRef}>
        <textarea
          ref={taRef}
          className="editor-input editor-type"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          onScroll={syncScroll}
          placeholder={placeholder}
          spellCheck={false}
          dir={dir}
        />
        <div
          className="editor-mirror editor-type"
          ref={mirrorRef}
          aria-hidden="true"
          dir={dir}
        >
          {lines.map((line, i) => (
            <div key={i} className="editor-mirror-line">
              {/* Zero-width space keeps empty lines one row tall. */}
              {line === "" ? "​" : line}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
