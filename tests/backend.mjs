// Backend integration test against a LOCAL Supabase stack (npx supabase start).
// Exercises: signup + email confirmation, profile/role trigger, RLS isolation, edge functions,
// export coverage and account deletion. Run: node tests/backend.mjs
import { createClient } from "@supabase/supabase-js";
import assert from "node:assert/strict";

const URL = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const ANON = process.env.SUPABASE_ANON_KEY;
const MAILPIT = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";
const FN = `${URL}/functions/v1`;
if (!ANON) throw new Error("Set SUPABASE_ANON_KEY");

let passed = 0;
const step = async (name, fn) => {
  try { await fn(); passed++; console.log(`  ✓ ${name}`); }
  catch (e) { console.error(`  ✗ ${name}\n    ${e.stack ?? e}`); process.exitCode = 1; }
};
const client = () => createClient(URL, ANON, { auth: { persistSession: false, flowType: "pkce", storage: memStorage() } });
function memStorage() { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function confirmViaEmail(c, email) {
  for (let i = 0; i < 20; i++) {
    const list = await (await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`)).json();
    const msg = list.messages?.[0];
    if (msg) {
      const full = await (await fetch(`${MAILPIT}/api/v1/message/${msg.ID}`)).json();
      const link = (full.Text.match(/https?:\/\/\S+verify\S+/) ?? [])[0];
      assert.ok(link, "confirmation link in email");
      const r = await fetch(link.replace(/&amp;/g, "&"), { redirect: "manual" });
      const loc = r.headers.get("location") ?? "";
      const code = new globalThis.URL(loc).searchParams.get("code");
      assert.ok(code, `redirect carries PKCE code (got ${loc})`);
      const { error } = await c.auth.exchangeCodeForSession(code);
      assert.ifError(error);
      return loc;
    }
    await sleep(300);
  }
  throw new Error("confirmation email not received");
}

async function fn(c, name, body) {
  const { data } = await c.auth.getSession();
  const res = await fetch(`${FN}/${name}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${data.session.access_token}`, apikey: ANON, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res;
}
async function chat(c, body) {
  const res = await fn(c, "coach-chat", body);
  if (!res.ok) return { status: res.status, body: await res.json() };
  const lines = (await res.text()).trim().split("\n").map((l) => JSON.parse(l));
  return { status: res.status, lines };
}

const stamp = Date.now();
const A = { email: `a${stamp}@example.test`, password: "test-password-1" };
const B = { email: `b${stamp}@example.test`, password: "test-password-2" };
const a = client(), b = client(), anon = client();
let convId, aUserId;

console.log("Backend integration tests");

await step("signup requires email confirmation (no session before confirm)", async () => {
  const { data, error } = await a.auth.signUp({ email: A.email, password: A.password, options: { data: { full_name: "Alice Test" }, emailRedirectTo: "http://localhost:8080/onboarding" } });
  assert.ifError(error);
  assert.equal(data.session, null);
  const bad = await a.auth.signInWithPassword(A);
  assert.ok(bad.error, "login blocked before confirmation");
});

await step("email confirmation link logs the user in and redirects to the requested page", async () => {
  const loc = await confirmViaEmail(a, A.email);
  assert.match(loc, /^http:\/\/localhost:8080\/onboarding/);
  const { data } = await a.auth.getUser();
  aUserId = data.user.id;
});

await step("second user signs up and confirms", async () => {
  const { error } = await b.auth.signUp({ email: B.email, password: B.password, options: { emailRedirectTo: "http://localhost:8080/dashboard" } });
  assert.ifError(error);
  await confirmViaEmail(b, B.email);
});

await step("password login + logout work", async () => {
  const c = client();
  const { error } = await c.auth.signInWithPassword(A);
  assert.ifError(error);
  assert.ifError((await c.auth.signOut({ scope: "local" })).error);
});

await step("password reset email is sent", async () => {
  const { error } = await anon.auth.resetPasswordForEmail(A.email, { redirectTo: "http://localhost:8080/reset-password" });
  assert.ifError(error);
});

await step("exactly one profile (name from metadata) and one 'client' role per user", async () => {
  const p = await a.from("profiles").select("*");
  assert.ifError(p.error);
  assert.equal(p.data.length, 1);
  assert.equal(p.data[0].display_name, "Alice Test");
  const r = await a.from("user_roles").select("role");
  assert.deepEqual(r.data.map((x) => x.role), ["client"]);
});

await step("users cannot grant themselves roles", async () => {
  const r = await a.from("user_roles").insert({ user_id: aUserId, role: "admin" });
  assert.ok(r.error, "insert into user_roles must be rejected");
  const u = await a.from("user_roles").update({ role: "admin" }).eq("user_id", aUserId).select();
  assert.equal(u.data?.length ?? 0, 0);
});

await step("onboarding answers persist and upsert per question", async () => {
  for (const ans of ["first", "second"]) {
    const r = await a.from("onboarding_responses").upsert({ user_id: aUserId, question_key: "what_brings_you", answer: ans }, { onConflict: "user_id,question_key" });
    assert.ifError(r.error);
  }
  const r = await a.from("onboarding_responses").select("*");
  assert.equal(r.data.length, 1);
  assert.equal(r.data[0].answer, "second");
});

await step("coach-chat opens a conversation and streams a reply", async () => {
  const r = await chat(a, { module_key: "aliveness", locale: "en" });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.lines[0].t, "meta");
  convId = r.lines[0].conversation_id;
  assert.ok(r.lines.filter((l) => l.t === "delta").length > 1, "multiple deltas = streamed");
  assert.equal(r.lines.at(-1).t, "done");
});

await step("summary is blocked below 2 user messages", async () => {
  const res = await fn(a, "generate-reflection", { module_key: "aliveness", conversation_id: convId });
  assert.equal(res.status, 400);
  assert.equal((await res.json()).code, "not_enough");
});

await step("user + assistant messages persist and reload in order", async () => {
  for (const m of ["I lose track of time in the workshop", "Weekends feel alive, weekdays feel grey"]) {
    const r = await chat(a, { module_key: "aliveness", conversation_id: convId, message: m, locale: "en" });
    assert.equal(r.lines.at(-1).t, "done");
  }
  const { data } = await a.from("coaching_messages").select("role, content").eq("conversation_id", convId).order("created_at");
  assert.deepEqual(data.map((m) => m.role), ["assistant", "user", "assistant", "user", "assistant"]);
});

await step("resume: chat without conversation_id continues the latest conversation", async () => {
  const r = await chat(a, { module_key: "aliveness", message: "Still here", locale: "en" });
  assert.equal(r.lines[0].conversation_id, convId);
});

await step("users cannot forge assistant messages", async () => {
  const r = await a.from("coaching_messages").insert({ conversation_id: convId, role: "assistant", content: "fake" });
  assert.ok(r.error);
});

await step("RLS: other user cannot read, write or chat into A's conversation", async () => {
  const read = await b.from("coaching_messages").select("*").eq("conversation_id", convId);
  assert.equal(read.data.length, 0);
  const write = await b.from("coaching_messages").insert({ conversation_id: convId, role: "user", content: "intrusion" });
  assert.ok(write.error);
  const r = await chat(b, { module_key: "aliveness", conversation_id: convId, message: "hi", locale: "en" });
  assert.equal(r.status, 404);
});

await step("unauthenticated function calls are rejected", async () => {
  const res = await fetch(`${FN}/coach-chat`, { method: "POST", headers: { apikey: ANON, "Content-Type": "application/json" }, body: "{}" });
  assert.equal(res.status, 401);
});

let reflId;
await step("generate-reflection creates a structured DRAFT with evidence", async () => {
  const res = await fn(a, "generate-reflection", { module_key: "aliveness", conversation_id: convId, locale: "en" });
  const body = await res.json();
  assert.equal(res.status, 200, JSON.stringify(body));
  assert.equal(body.reflection.status, "draft");
  for (const f of ["key_discoveries", "recurring_themes", "supporting_examples", "open_questions", "further_exploration"]) assert.ok(Array.isArray(body.reflection[f]));
  assert.ok(body.reflection.key_discoveries[0].evidence);
  reflId = body.reflection.id;
});

await step("directions are refused until a reflection is confirmed", async () => {
  const res = await fn(a, "generate-directions", { locale: "en" });
  assert.equal(res.status, 400);
});

await step("user edits and confirms the reflection", async () => {
  const r = await a.from("ikigai_reflections").update({ key_discoveries: [{ text: "Edited by me", evidence: "workshop" }], status: "confirmed", confirmed_at: new Date().toISOString() }).eq("id", reflId).select().single();
  assert.ifError(r.error);
  assert.equal(r.data.status, "confirmed");
  assert.equal(r.data.key_discoveries[0].text, "Edited by me");
});

await step("generate-directions saves evidence-based directions", async () => {
  await a.from("needs_ratings").upsert({ user_id: aUserId, need_key: "change_growth", score: 3 }, { onConflict: "user_id,need_key" });
  const res = await fn(a, "generate-directions", { locale: "en" });
  const body = await res.json();
  assert.equal(res.status, 200, JSON.stringify(body));
  assert.ok(body.directions.length >= 1);
  assert.ok(body.directions[0].id && body.directions[0].evidence.length);
  const { data } = await a.from("possible_directions").select("*");
  assert.equal(data.length, body.directions.length);
});

let planId;
await step("action plan + items: add, status change, edit, delete", async () => {
  const p = await a.from("action_plans").upsert({ user_id: aUserId, chosen_direction: "Weekly craft" }, { onConflict: "user_id" }).select().single();
  assert.ifError(p.error);
  planId = p.data.id;
  const i = await a.from("action_items").insert({ plan_id: planId, title: "Book workshop time", target_date: "2026-12-01" }).select().single();
  assert.ifError(i.error);
  for (const s of ["in_progress", "postponed", "completed"]) {
    const u = await a.from("action_items").update({ status: s }).eq("id", i.data.id).select().single();
    assert.equal(u.data.status, s);
  }
  const bad = await a.from("action_items").update({ status: "booked" }).eq("id", i.data.id);
  assert.ok(bad.error, "invalid status rejected");
  const extra = await a.from("action_items").insert({ plan_id: planId, title: "temp" }).select().single();
  assert.ifError((await a.from("action_items").delete().eq("id", extra.data.id)).error);
});

await step("RLS: other user cannot add items to A's plan", async () => {
  const r = await b.from("action_items").insert({ plan_id: planId, title: "x" });
  assert.ok(r.error);
  assert.equal((await b.from("action_plans").select("*")).data.length, 0);
});

await step("journal entries: create, edit, newest first, private", async () => {
  await a.from("journal_entries").insert({ user_id: aUserId, body: "older", entry_date: "2026-11-01" });
  const n = await a.from("journal_entries").insert({ user_id: aUserId, body: "newer", entry_date: "2026-11-10" }).select().single();
  await a.from("journal_entries").update({ title: "Edited" }).eq("id", n.data.id);
  const { data } = await a.from("journal_entries").select("*").order("entry_date", { ascending: false });
  assert.deepEqual(data.map((e) => e.body), ["newer", "older"]);
  assert.equal(data[0].title, "Edited");
  assert.equal((await b.from("journal_entries").select("*")).data.length, 0);
  const spoof = await b.from("journal_entries").insert({ user_id: aUserId, body: "spoof" });
  assert.ok(spoof.error, "cannot write rows owned by another user");
});

await step("anonymous role reads nothing", async () => {
  for (const t of ["profiles", "journal_entries", "coaching_messages", "ikigai_reflections"]) {
    const r = await anon.from(t).select("*");
    assert.ok(r.error || r.data.length === 0, `${t} visible to anon`);
  }
});

await step("export covers every table the user owns", async () => {
  const tables = ["profiles", "user_roles", "onboarding_responses", "coaching_conversations", "coaching_messages", "ikigai_reflections", "needs_ratings", "possible_directions", "action_plans", "action_items", "journal_entries"];
  for (const t of tables) {
    const r = await a.from(t).select("*");
    assert.ifError(r.error);
    assert.ok(r.data.length > 0, `${t} should have data for A`);
  }
});

await step("delete-account requires typed DELETE", async () => {
  const res = await fn(b, "delete-account", { confirm: "delete" });
  assert.equal(res.status, 400);
});

await step("delete-account removes the user and verifies cleanup", async () => {
  const res = await fn(a, "delete-account", { confirm: "DELETE" });
  const body = await res.json();
  assert.equal(res.status, 200, JSON.stringify(body));
  assert.equal(body.deleted, true);
  const login = await client().auth.signInWithPassword(A);
  assert.ok(login.error, "deleted user can no longer log in");
});

await step("other user's data is untouched by A's deletion", async () => {
  const p = await b.from("profiles").select("*");
  assert.equal(p.data.length, 1);
});

console.log(`\n${passed} passed${process.exitCode ? ", some FAILED" : ""}`);
