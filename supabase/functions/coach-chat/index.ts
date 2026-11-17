// POST /functions/v1/coach-chat
// Body: { module_key, conversation_id?, message?, locale?, new_conversation? }
// Streams NDJSON lines: {"t":"meta","conversation_id"} {"t":"delta","text"} {"t":"done","message_id"} {"t":"error","message"}
import { preflight, json, corsHeaders } from "../_shared/http.ts";
import { authenticate, adminClient } from "../_shared/supabase.ts";
import { anthropic, aiConfigured, MODEL, FALLBACK, MODULES, isModuleKey, langName, BASE_PRINCIPLES, Anthropic } from "../_shared/ai.ts";

const MAX_MESSAGE = 4000;
const HISTORY_LIMIT = 60;

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;

  const auth = await authenticate(req);
  if (!auth) return json(req, { error: "Not authenticated" }, 401);
  const { user, db } = auth;

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json(req, { error: "Invalid JSON" }, 400); }

  const moduleKey = body.module_key;
  if (!isModuleKey(moduleKey)) return json(req, { error: "Unknown module" }, 400);
  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (message.length > MAX_MESSAGE) return json(req, { error: `Message is longer than ${MAX_MESSAGE} characters` }, 400);
  const locale = body.locale === "uk" ? "uk" : "en";

  if (!aiConfigured()) return json(req, { error: "AI is not configured", code: "ai_not_configured" }, 503);

  // Resolve conversation — ownership is enforced by RLS on the user-scoped client.
  let conversationId = typeof body.conversation_id === "string" ? body.conversation_id : "";
  if (conversationId) {
    const { data, error } = await db.from("coaching_conversations").select("id, module_key").eq("id", conversationId).maybeSingle();
    if (error) return json(req, { error: error.message }, 500);
    if (!data || data.module_key !== moduleKey) return json(req, { error: "Conversation not found" }, 404);
  } else {
    if (!body.new_conversation) {
      const { data: latest } = await db.from("coaching_conversations").select("id")
        .eq("module_key", moduleKey).order("updated_at", { ascending: false }).limit(1).maybeSingle();
      if (latest) conversationId = latest.id;
    }
    if (!conversationId) {
      const { data, error } = await db.from("coaching_conversations").insert({ user_id: user.id, module_key: moduleKey }).select("id").single();
      if (error) return json(req, { error: error.message }, 500);
      conversationId = data.id;
    }
  }

  // Persist the user's message first (RLS: only role='user' into own conversation).
  if (message) {
    const { error } = await db.from("coaching_messages").insert({ conversation_id: conversationId, role: "user", content: message });
    if (error) return json(req, { error: error.message }, 500);
  }

  const { data: history, error: hErr } = await db.from("coaching_messages").select("role, content")
    .eq("conversation_id", conversationId).order("created_at", { ascending: false }).limit(HISTORY_LIMIT);
  if (hErr) return json(req, { error: hErr.message }, 500);
  const msgs = (history ?? []).reverse() as { role: "user" | "assistant"; content: string }[];

  // Nothing to answer: last message already from the assistant (and no new message).
  if (msgs.length && msgs[msgs.length - 1].role === "assistant") {
    return json(req, { error: "Nothing to reply to", code: "nothing_to_reply" }, 409);
  }

  // Context: onboarding answers + confirmed reflections from other modules (user's own data only).
  const [{ data: onboarding }, { data: confirmed }] = await Promise.all([
    db.from("onboarding_responses").select("question_key, answer").eq("skipped", false),
    db.from("ikigai_reflections").select("module_key, key_discoveries, recurring_themes").eq("status", "confirmed").neq("module_key", moduleKey),
  ]);
  const onboardingText = (onboarding ?? []).filter((o) => o.answer).map((o) => `- ${o.question_key}: ${o.answer}`).join("\n") || "(none)";
  const confirmedText = (confirmed ?? []).map((r) =>
    `- ${r.module_key}: ${[...r.key_discoveries, ...r.recurring_themes].map((i: { text: string }) => i.text).join("; ")}`).join("\n") || "(none)";

  const mod = MODULES[moduleKey];
  const system = `${BASE_PRINCIPLES}

Current module: "${mod.en}". Focus: ${mod.needs}

What the person shared in their introductory questions (their words):
${onboardingText}

Reflections the person has already confirmed in other modules:
${confirmedText}

Always reply in ${langName(locale)}.`;

  const apiMessages: Anthropic.Beta.BetaMessageParam[] = msgs.length
    ? msgs.map((m) => ({ role: m.role, content: m.content }))
    : [{ role: "user", content: "(The person has just opened this module and hasn't written anything yet. Welcome them in one short sentence, then ask your first open question for this module.)" }];

  const admin = adminClient();
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (o: unknown) => controller.enqueue(encoder.encode(JSON.stringify(o) + "\n"));
      send({ t: "meta", conversation_id: conversationId });
      let text = "";
      try {
        const s = anthropic().beta.messages.stream({
          model: MODEL,
          max_tokens: 2000,
          output_config: { effort: "low" },
          system,
          messages: apiMessages,
          ...FALLBACK,
        });
        for await (const ev of s) {
          if (ev.type === "content_block_delta" && ev.delta.type === "text_delta") {
            text += ev.delta.text;
            send({ t: "delta", text: ev.delta.text });
          }
        }
        const final = await s.finalMessage();
        if (final.stop_reason === "refusal" || !text.trim()) {
          throw new Error("The guide could not respond to this message. Please rephrase and try again.");
        }
        // Assistant message written with service role, after ownership was verified above.
        const { data, error } = await admin.from("coaching_messages")
          .insert({ conversation_id: conversationId, role: "assistant", content: text.trim() }).select("id").single();
        if (error) throw new Error(`Reply could not be saved: ${error.message}`);
        send({ t: "done", message_id: data.id });
      } catch (e) {
        let msg = e instanceof Error ? e.message : String(e);
        if (e instanceof Anthropic.RateLimitError) msg = "The AI service is busy. Please try again in a moment.";
        else if (e instanceof Anthropic.AuthenticationError) msg = "The AI service key is invalid. The site owner needs to check ANTHROPIC_API_KEY.";
        else if (e instanceof Anthropic.APIError) msg = `AI service error (${e.status}). Please try again.`;
        console.error("coach-chat error", e);
        send({ t: "error", message: msg });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { ...corsHeaders(req), "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store", "x-conversation-id": conversationId },
  });
});
