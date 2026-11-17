// POST /functions/v1/delete-account  Body: { confirm: "DELETE" }
// Deletes the caller's auth user; all personal rows cascade via FK. Verifies cleanup before reporting success.
import { preflight, json } from "../_shared/http.ts";
import { authenticate, adminClient } from "../_shared/supabase.ts";

const TABLES = ["profiles", "user_roles", "onboarding_responses", "coaching_conversations", "ikigai_reflections",
  "needs_ratings", "possible_directions", "action_plans", "journal_entries"];

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  const auth = await authenticate(req);
  if (!auth) return json(req, { error: "Not authenticated" }, 401);
  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* handled below */ }
  if (body.confirm !== "DELETE") return json(req, { error: 'Type "DELETE" to confirm' }, 400);

  const uid = auth.user.id;
  const admin = adminClient();
  const { error } = await admin.auth.admin.deleteUser(uid);
  if (error) return json(req, { error: `Could not delete account: ${error.message}` }, 500);

  // Verify server-side cleanup (child tables cascade from their parents).
  const leftovers: string[] = [];
  for (const t of TABLES) {
    const col = t === "profiles" ? "id" : "user_id";
    const { count, error: cErr } = await admin.from(t).select("*", { count: "exact", head: true }).eq(col, uid);
    if (cErr) leftovers.push(`${t}: ${cErr.message}`);
    else if (count) leftovers.push(`${t}: ${count} rows`);
  }
  if (leftovers.length) return json(req, { error: `Account removed but some data remains: ${leftovers.join(", ")}` }, 500);
  return json(req, { deleted: true });
});
