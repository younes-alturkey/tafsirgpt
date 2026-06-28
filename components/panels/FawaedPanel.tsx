"use client";

import React, { useEffect, useState } from "react";
import { useApp } from "../Providers";
import { Field, RunButton, StateView, useAsync } from "../ui";
import { Pagination } from "../Pagination";
import { callTool } from "@/lib/client";

const TOTAL_PAGES = 604; // pages in the standard Madani mushaf

type FawaedResult = { page: number; fawaed_count: number; items: string[] };

export function FawaedPanel() {
  const { t, num } = useApp();
  const [page, setPage] = useState(1); // committed page — drives the fetch and pager
  const [draft, setDraft] = useState("1"); // raw text in the jump-to input
  const { state, run } = useAsync<FawaedResult>();

  function loadPage(p: number) {
    const clamped = Math.min(TOTAL_PAGES, Math.max(1, p));
    setPage(clamped);
    setDraft(String(clamped));
    run(() => callTool("get_page_fawaed", { page: clamped }));
  }

  function fetchFawaed() {
    loadPage(Number(draft) || page);
  }

  // Show the default page (1) on first open.
  useEffect(() => {
    fetchFawaed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <Field label={t.page} hint={`1–${TOTAL_PAGES}`}>
          <input
            type="number"
            min={1}
            max={TOTAL_PAGES}
            className="input"
            value={draft}
            onChange={(e) => {
              const digits = e.target.value.replace(/[^0-9]/g, "");
              // Enforce the stated max as you type — the native `max` attr only
              // marks the field invalid, it never stops you typing past it.
              setDraft(
                digits === "" ? "" : String(Math.min(TOTAL_PAGES, Number(digits))),
              );
            }}
            onBlur={() =>
              setDraft(
                String(Math.min(TOTAL_PAGES, Math.max(1, Number(draft) || page))),
              )
            }
            onKeyDown={(e) => e.key === "Enter" && fetchFawaed()}
            placeholder={t.pagePlaceholder}
          />
        </Field>
        <RunButton onClick={fetchFawaed} loading={state.status === "loading"}>
          {t.fetch}
        </RunButton>
      </div>

      {/* StateView swaps the body for a skeleton/error, so the pager lives
          outside it (driven by `page`) to stay put and usable across loads
          and failures. */}
      <StateView state={state} onRetry={fetchFawaed}>
        {(d) =>
          d.items?.length ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="badge">
                  {t.page} {num(d.page)}
                </span>
                <span className="badge">
                  {t.fawaedCount}: {num(d.fawaed_count)}
                </span>
              </div>
              <ul className="space-y-3">
                {d.items.map((item, i) => (
                  <li key={i} className="card p-4">
                    <div className="source-text !text-base" dir="rtl">
                      {item}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="py-8 text-center text-faint">{t.noResults}</p>
          )
        }
      </StateView>

      <Pagination
        page={page}
        total={TOTAL_PAGES}
        onChange={loadPage}
        disabled={state.status === "loading"}
        unit="page"
        className="border-t hairline pt-4"
      />
    </div>
  );
}
