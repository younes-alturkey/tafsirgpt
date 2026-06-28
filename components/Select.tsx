"use client";

import React, {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { useApp } from "./Providers";

export type SelectOption = {
  value: number | string;
  label: string;
  keywords?: string;
};

/** Normalize Arabic/Latin text for diacritic- and digit-insensitive search. */
function normalize(s: string): string {
  return s
    .replace(/[ً-ْٰـ]/g, "") // harakat + tatweel
    .replace(/[إأآا]/g, "ا")
    .replace(/[ىي]/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .toLowerCase()
    .trim();
}

type SelectProps = {
  value: number | string;
  onChange: (value: number | string) => void;
  options: SelectOption[];
  label?: string;
  hint?: string;
  ariaLabel?: string;
  placeholder?: string;
  /** Force the search box on/off. Defaults to on when there are >10 options. */
  searchable?: boolean;
  searchPlaceholder?: string;
  className?: string;
};

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      style={{
        flexShrink: 0,
        transition: "transform .18s ease",
        transform: open ? "rotate(180deg)" : "none",
        color: "var(--gold)",
      }}
    >
      <path
        d="M6 9l6 6 6-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Check() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M5 12.5l4 4 10-10"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Select({
  value,
  onChange,
  options,
  label,
  hint,
  ariaLabel,
  placeholder,
  searchable,
  searchPlaceholder,
  className = "",
}: SelectProps) {
  const { locale } = useApp();
  const id = useId();
  const listId = `${id}-list`;

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [openUp, setOpenUp] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const canSearch = searchable ?? options.length > 10;
  const selected = useMemo(
    () => options.find((o) => o.value === value),
    [options, value],
  );

  const filtered = useMemo(() => {
    if (!canSearch || !query) return options;
    const q = normalize(query);
    return options.filter((o) =>
      normalize(`${o.label} ${o.keywords ?? ""}`).includes(q),
    );
  }, [options, query, canSearch]);

  const openMenu = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      const below = window.innerHeight - rect.bottom;
      setOpenUp(below < 300 && rect.top > below);
    }
    setQuery("");
    setOpen(true);
  }, []);

  const closeMenu = useCallback((focusTrigger = true) => {
    setOpen(false);
    setQuery("");
    if (focusTrigger) triggerRef.current?.focus();
  }, []);

  const choose = useCallback(
    (opt: SelectOption) => {
      onChange(opt.value);
      closeMenu();
    },
    [onChange, closeMenu],
  );

  // On open: jump active to the selected row and move focus into the menu.
  useEffect(() => {
    if (!open) return;
    const idx = filtered.findIndex((o) => o.value === value);
    setActive(idx >= 0 ? idx : 0);
    const raf = requestAnimationFrame(() => {
      if (canSearch) inputRef.current?.focus();
      else listRef.current?.focus();
    });
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Keep the active index in range as the filtered set shrinks.
  useEffect(() => {
    setActive((a) => Math.min(a, Math.max(0, filtered.length - 1)));
  }, [filtered.length]);

  // Keep the active option scrolled into view.
  useEffect(() => {
    if (!open) return;
    listRef.current
      ?.querySelector(`[data-idx="${active}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const onMenuKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActive((a) => Math.min(a + 1, filtered.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActive((a) => Math.max(a - 1, 0));
        break;
      case "Home":
        e.preventDefault();
        setActive(0);
        break;
      case "End":
        e.preventDefault();
        setActive(filtered.length - 1);
        break;
      case "Enter":
        e.preventDefault();
        if (filtered[active]) choose(filtered[active]);
        break;
      case "Escape":
        e.preventDefault();
        closeMenu();
        break;
      case "Tab":
        setOpen(false);
        setQuery("");
        break;
    }
  };

  const onTriggerKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openMenu();
    }
  };

  // Event delegation keeps a single handler regardless of option count.
  const onListClick = (e: React.MouseEvent) => {
    const el = (e.target as HTMLElement).closest("[data-idx]");
    if (!el) return;
    const idx = Number(el.getAttribute("data-idx"));
    if (filtered[idx]) choose(filtered[idx]);
  };
  const onListOver = (e: React.MouseEvent) => {
    const el = (e.target as HTMLElement).closest("[data-idx]");
    if (!el) return;
    const idx = Number(el.getAttribute("data-idx"));
    if (!Number.isNaN(idx)) setActive((a) => (a === idx ? a : idx));
  };

  const activeId = filtered[active] ? `${id}-opt-${active}` : undefined;
  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <div className={className}>
      {label ? (
        <label htmlFor={id} className="field-label">
          {label}
          {hint ? <span className="text-faint font-normal"> · {hint}</span> : null}
        </label>
      ) : null}

      <div className="relative" ref={rootRef}>
        <button
          id={id}
          ref={triggerRef}
          type="button"
          className="combo-trigger"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={ariaLabel}
          onClick={() => (open ? (setOpen(false), setQuery("")) : openMenu())}
          onKeyDown={onTriggerKeyDown}
        >
          <span
            dir="auto"
            className={selected ? undefined : "text-faint"}
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              minWidth: 0,
            }}
          >
            {selected ? selected.label : placeholder || "—"}
          </span>
          <Chevron open={open} />
        </button>

        {open ? (
          <div className={`combo-panel${openUp ? " combo-panel-up" : ""}`}>
            {canSearch ? (
              <div className="combo-search">
                <input
                  ref={inputRef}
                  className="combo-input"
                  dir={dir}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={onMenuKeyDown}
                  role="combobox"
                  aria-expanded="true"
                  aria-controls={listId}
                  aria-activedescendant={activeId}
                  aria-autocomplete="list"
                  placeholder={
                    searchPlaceholder || (locale === "ar" ? "ابحث" : "Search")
                  }
                />
              </div>
            ) : null}

            <ul
              id={listId}
              ref={listRef}
              role="listbox"
              aria-label={ariaLabel || label}
              aria-activedescendant={!canSearch ? activeId : undefined}
              tabIndex={canSearch ? -1 : 0}
              onKeyDown={canSearch ? undefined : onMenuKeyDown}
              onClick={onListClick}
              onMouseOver={onListOver}
              className="combo-list"
            >
              {filtered.length === 0 ? (
                <li className="combo-empty">
                  {locale === "ar" ? "لا نتائج" : "No matches"}
                </li>
              ) : (
                filtered.map((o, i) => {
                  const isSelected = o.value === value;
                  return (
                    <li
                      key={o.value}
                      id={`${id}-opt-${i}`}
                      role="option"
                      aria-selected={isSelected}
                      data-idx={i}
                      data-active={i === active || undefined}
                      data-selected={isSelected || undefined}
                      className="combo-option"
                    >
                      <span
                        dir="auto"
                        style={{
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {o.label}
                      </span>
                      {isSelected ? (
                        <span style={{ color: "var(--gold)", flexShrink: 0 }}>
                          <Check />
                        </span>
                      ) : null}
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}
