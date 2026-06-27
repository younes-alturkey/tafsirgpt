"use client";

import React, { useState } from "react";
import { useApp } from "../Providers";
import { Field, RunButton, StateView, useAsync } from "../ui";
import { callTool } from "@/lib/client";

type FawaedResult = { page: number; fawaed_count: number; items: string[] };

export function FawaedPanel() {
  const { t, num } = useApp();
  const [page, setPage] = useState(1);
  const { state, run } = useAsync<FawaedResult>();

  function fetchFawaed() {
    const p = Math.min(604, Math.max(1, page));
    run(() => callTool("get_page_fawaed", { page: p }));
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <Field label={t.page} hint="1–604">
          <input
            type="number"
            min={1}
            max={604}
            className="input"
            value={page}
            onChange={(e) =>
              setPage(Math.min(604, Math.max(1, Number(e.target.value) || 1)))
            }
            onKeyDown={(e) => e.key === "Enter" && fetchFawaed()}
            placeholder={t.pagePlaceholder}
          />
        </Field>
        <RunButton onClick={fetchFawaed} loading={state.status === "loading"}>
          {t.fetch}
        </RunButton>
      </div>

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
    </div>
  );
}
