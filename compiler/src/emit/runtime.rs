use crate::workspace::Workspace;
use crate::CompileError;
use std::path::PathBuf;

pub fn emit_runtime(ws: &mut Workspace) -> Result<(), CompileError> {
    ws.insert_text(PathBuf::from("src/runtime/index.ts"), runtime_index());
    ws.insert_text(PathBuf::from("src/runtime/fetch.ts"), runtime_fetch());
    Ok(())
}

fn runtime_index() -> String {
    r#"// VisuAlis runtime — generated, do not edit.

import { visualisFetch, type FetchOptions, type FetchResult } from "./fetch";

type Getter = () => unknown;
type Setter = (field: string, value: unknown) => void;

const registry = new Map<string, { get: Getter; set: Setter }>();

export function register(id: string, handlers: { get: Getter; set: Setter }): () => void {
  registry.set(id, handlers);
  return () => { registry.delete(id); };
}

export function getValue(id: string): unknown {
  const entry = registry.get(id);
  if (!entry) throw new Error(`Component '${id}' not found`);
  return entry.get();
}

export function setValue(id: string, field: string, value: unknown): void {
  const entry = registry.get(id);
  if (!entry) throw new Error(`Component '${id}' not found`);
  entry.set(field, value);
}

export function redirect(target: string): void {
  window.location.href = target;
}

export async function fetch(opts: FetchOptions): Promise<FetchResult> {
  return visualisFetch(opts);
}
"#
    .to_string()
}

fn runtime_fetch() -> String {
    r#"// VisuAlis runtime fetch helper — generated, do not edit.

export interface FetchOptions {
  url: string;
  method: string;
  headers?: Record<string, string>;
  body?: string;
}

export interface FetchResult {
  ok: boolean;
  status: number;
  body: string;
  json: unknown;
  error?: string;
}

export async function visualisFetch(opts: FetchOptions): Promise<FetchResult> {
  try {
    const res = await window.fetch(opts.url, {
      method: opts.method,
      headers: opts.headers,
      body: opts.body,
    });
    const body = await res.text();
    let json: unknown = null;
    try { json = JSON.parse(body); } catch { /* not json */ }
    return { ok: res.ok, status: res.status, body, json };
  } catch (err) {
    return { ok: false, status: 0, body: "", json: null, error: String(err) };
  }
}
"#
    .to_string()
}
