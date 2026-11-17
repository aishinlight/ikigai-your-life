import { supabase, functionsUrl, isBackendConfigured } from "./supabase";

async function authHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Your session has expired. Please log in again.");
  return {
    Authorization: `Bearer ${token}`,
    apikey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
    "Content-Type": "application/json",
  };
}

export class ApiError extends Error {
  constructor(message: string, public code?: string, public status?: number) { super(message); }
}

export async function callFunction<T>(name: string, body: unknown): Promise<T> {
  if (!isBackendConfigured) throw new ApiError("Backend not configured", "backend_missing");
  const res = await fetch(`${functionsUrl}/${name}`, { method: "POST", headers: await authHeader(), body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error ?? `Request failed (${res.status})`, data.code, res.status);
  return data as T;
}

type ChatEvent =
  | { t: "meta"; conversation_id: string }
  | { t: "delta"; text: string }
  | { t: "done"; message_id: string }
  | { t: "error"; message: string };

/** Streams a coach reply. Calls onEvent for each NDJSON event. */
export async function streamChat(
  body: { module_key: string; conversation_id?: string; message?: string; locale: string; new_conversation?: boolean },
  onEvent: (e: ChatEvent) => void,
  signal?: AbortSignal,
) {
  const res = await fetch(`${functionsUrl}/coach-chat`, { method: "POST", headers: await authHeader(), body: JSON.stringify(body), signal });
  if (!res.ok || !res.body) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(data.error ?? `Request failed (${res.status})`, data.code, res.status);
  }
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  let finished = false;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i;
    while ((i = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, i).trim();
      buf = buf.slice(i + 1);
      if (!line) continue;
      const ev = JSON.parse(line) as ChatEvent;
      if (ev.t === "done" || ev.t === "error") finished = true;
      onEvent(ev);
    }
  }
  if (!finished) onEvent({ t: "error", message: "The connection was interrupted." });
}
