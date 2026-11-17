// POST /functions/v1/generate-reflection  Body: { module_key, conversation_id, locale? }
// Creates/replaces the user's DRAFT reflection for a module from their own conversation.
import { preflight, json } from "../_shared/http.ts";
import { authenticate } from "../_shared/supabase.ts";
import { anthropic, aiConfigured, MODEL, FALLBACK, MODULES, isModuleKey, langName, Anthropic } from "../_shared/ai.ts";

const MIN_USER_MESSAGES = 2;
const FIELDS = ["key_discoveries", "recurring_themes", "supporting_examples", "open_questions", "further_exploration"] as const;

const item = {
  type: "object",
  properties: {
    text: { type: "string", description: "A tentative, plainly worded possibility (not a fact about the person)." },
    evidence: { type: "string", description: "A short verbatim quote of the person's own words that supports it, or empty string." },
  },
  required: ["text", "evidence"],
  additionalProperties: false,
};
const schema = {
  type: "object",
  properties: Object.fromEntries(FIELDS.map((f) => [f, { type: "array", items: item }])),
  required: [...FIELDS],
  additionalProperties: false,
};

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  const auth = await authenticate(req);
  if (!auth) return json(req, { error: "Not authenticated" }, 401);
  const { user, db } = auth;

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json(req, { error: "Invalid JSON" }, 400); }
  const moduleKey = body.module_key;
  const conversationId = typeof body.conversation_id === "string" ? body.conversation_id : "";
  if (!isModuleKey(moduleKey) || !conversationId) return json(req, { error: "module_key and conversation_id are required" }, 400);
  if (!aiConfigured()) return json(req, { error: "AI is not configured", code: "ai_not_configured" }, 503);

  const { data: conv, error: cErr } = await db.from("coaching_conversations").select("id, module_key").eq("id", conversationId).maybeSingle();
  if (cErr) return json(req, { error: cErr.message }, 500);
  if (!conv || conv.module_key !== moduleKey) return json(req, { error: "Conversation not found" }, 404);

  const { data: msgs, error: mErr } = await db.from("coaching_messages").select("role, content").eq("conversation_id", conversationId).order("created_at");
  if (mErr) return json(req, { error: mErr.message }, 500);
  const userCount = (msgs ?? []).filter((m) => m.role === "user").length;
  if (userCount < MIN_USER_MESSAGES) return json(req, { error: `At least ${MIN_USER_MESSAGES} messages from you are needed`, code: "not_enough" }, 400);

  const transcript = (msgs ?? []).map((m) => `${m.role === "user" ? "PERSON" : "GUIDE"}: ${m.content}`).join("\n\n");
  const lang = langName(body.locale);

  let parsed: Record<string, { text: string; evidence: string }[]>;
  try {
    const res = await anthropic().beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      output_config: { effort: "medium", format: { type: "json_schema", schema } },
      system: `You summarise a self-reflection conversation for the person's private journal, in the spirit of Mieko Kamiya's approach to ikigai (not the Western four-circle diagram). Module: "${MODULES[moduleKey].en}" — ${MODULES[moduleKey].needs}

Rules:
- Use ONLY what the PERSON said. Never invent experiences, facts or feelings. GUIDE lines are context only and are never evidence.
- Phrase every item as a tentative possibility ("You may value…", "It seems that…"), never as a diagnosis or a verdict about life purpose.
- Every key discovery and recurring theme must carry a short verbatim quote from the PERSON as evidence. supporting_examples are concrete moments the person described, with their quote.
- open_questions: questions that remain open for the person. further_exploration: gentle suggestions of what they might explore next. Evidence may be empty for these.
- 1–5 items per field, concise. If there is not enough material for a field, return an empty array.
- Write all text in ${lang}; keep quotes in the language the person used.`,
      messages: [{ role: "user", content: `Conversation transcript:\n\n${transcript}` }],
      ...FALLBACK,
    });
    if (res.stop_reason === "refusal") return json(req, { error: "The reflection could not be generated for this conversation." }, 422);
    const text = res.content.find((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")?.text ?? "";
    parsed = JSON.parse(text);
  } catch (e) {
    console.error("generate-reflection", e);
    const status = e instanceof Anthropic.RateLimitError ? 429 : 502;
    return json(req, { error: e instanceof Anthropic.APIError ? `AI service error (${e.status})` : "The reflection could not be generated. Please try again." }, status);
  }

  const clean = (arr: unknown) =>
    (Array.isArray(arr) ? arr : [])
      .filter((i) => i && typeof i.text === "string" && i.text.trim())
      .slice(0, 8)
      .map((i) => ({ text: String(i.text).slice(0, 1000), ...(i.evidence ? { evidence: String(i.evidence).slice(0, 1000) } : {}) }));

  const row = {
    user_id: user.id,
    module_key: moduleKey,
    conversation_id: conversationId,
    status: "draft",
    confirmed_at: null,
    ...Object.fromEntries(FIELDS.map((f) => [f, clean(parsed[f])])),
  };
  const { data, error } = await db.from("ikigai_reflections").upsert(row, { onConflict: "user_id,module_key" }).select("*").single();
  if (error) return json(req, { error: `Reflection could not be saved: ${error.message}` }, 500);
  return json(req, { reflection: data });
});
