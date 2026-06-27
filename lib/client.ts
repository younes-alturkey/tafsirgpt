"use client";

import type { Bootstrap } from "./types";

export class ApiError extends Error {}

/** Normalize a tool result to an array. Collection tools return an array of
 *  items, but a single-item result decodes to one object. */
export function asArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (value && typeof value === "object") return [value as T];
  return [];
}

async function handle(res: Response) {
  let json: any = null;
  try {
    json = await res.json();
  } catch {
    throw new ApiError(`HTTP ${res.status}`);
  }
  if (!res.ok || !json?.ok) {
    throw new ApiError(json?.error || `HTTP ${res.status}`);
  }
  return json.data;
}

/** Call an MCP tool through our server proxy. */
export async function callTool<T = any>(
  name: string,
  args: Record<string, unknown> = {},
): Promise<T> {
  const res = await fetch("/api/mcp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind: "tool", name, args }),
  });
  return handle(res);
}

/** Read an MCP resource through our server proxy. */
export async function readResource<T = any>(uri: string): Promise<T> {
  const res = await fetch("/api/mcp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind: "resource", uri }),
  });
  return handle(res);
}

/** Load catalogs + overview in a single request. */
export async function loadBootstrap(): Promise<Bootstrap> {
  const res = await fetch("/api/mcp?bootstrap=1");
  return handle(res);
}
