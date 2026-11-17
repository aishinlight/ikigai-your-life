import { supabase } from "./supabase";

const TABLES = [
  "profiles",
  "user_roles",
  "onboarding_responses",
  "coaching_conversations",
  "coaching_messages",
  "ikigai_reflections",
  "needs_ratings",
  "possible_directions",
  "action_plans",
  "action_items",
  "journal_entries",
] as const;

/** Collects every row RLS lets the signed-in user read. Throws on ANY query error (no partial export). */
export async function collectExport() {
  const { data: u, error: uErr } = await supabase.auth.getUser();
  if (uErr || !u.user) throw new Error(uErr?.message ?? "Not signed in");
  const out: Record<string, unknown> = {
    exported_at: new Date().toISOString(),
    account: { id: u.user.id, email: u.user.email, created_at: u.user.created_at, providers: u.user.app_metadata?.providers ?? [] },
  };
  const errors: string[] = [];
  for (const table of TABLES) {
    const rows: unknown[] = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabase.from(table).select("*").range(from, from + 999);
      if (error) { errors.push(`${table}: ${error.message}`); break; }
      rows.push(...(data ?? []));
      if (!data || data.length < 1000) break;
    }
    out[table] = rows;
  }
  if (errors.length) throw new Error(errors.join("; "));
  return out;
}

export function downloadJson(obj: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
