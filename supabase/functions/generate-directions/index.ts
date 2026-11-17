// POST /functions/v1/generate-directions  Body: { locale? }
// Suggests tentative directions ONLY from confirmed reflections + needs ratings, saves them, returns saved rows.
import { preflight, json } from "../_shared/http.ts";
import { authenticate } from "../_shared/supabase.ts";
import { anthropic, aiConfigured, MODEL, FALLBACK, langName, Anthropic } from "../_shared/ai.ts";

const schema = {
  type: "object",
  properties: {
    directions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          evidence: { type: "array", items: { type: "string" } },
        },
        required: ["title", "description", "evidence"],
        additionalProperties: false,
      },
    },
  },
  required: ["directions"],
  additionalProperties: false,
};

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  const auth = await authenticate(req);
  if (!auth) return json(req, { error: "Not authenticated" }, 401);
  const { user, db } = auth;
  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* empty body ok */ }
  if (!aiConfigured()) return json(req, { error: "AI is not configured", code: "ai_not_configured" }, 503);

  const [{ data: refl, error: rErr }, { data: ratings, error: nErr }] = await Promise.all([
    db.from("ikigai_reflections").select("*").eq("status", "confirmed"),
    db.from("needs_ratings").select("need_key, score, note"),
  ]);
  if (rErr || nErr) return json(req, { error: (rErr ?? nErr)!.message }, 500);
  if (!refl?.length) return json(req, { error: "Confirm at least one reflection first", code: "no_confirmed" }, 400);

  const fmt = (arr: { text: string; evidence?: string }[]) => arr.map((i) => `  - ${i.text}${i.evidence ? ` [quote: "${i.evidence}"]` : ""}`).join("\n");
  const material = refl.map((r) => `Module ${r.module_key}:
 Key discoveries:\n${fmt(r.key_discoveries)}
 Recurring themes:\n${fmt(r.recurring_themes)}
 Examples:\n${fmt(r.supporting_examples)}`).join("\n\n");
  const needs = (ratings ?? []).map((n) => `- ${n.need_key}: ${n.score}/10${n.note ? ` (note: ${n.note})` : ""}`).join("\n") || "(not rated)";

  let directions: { title: string; description: string; evidence: string[] }[];
  try {
    const res = await anthropic().beta.messages.create({
      model: MODEL,
      max_tokens: 8000,
      output_config: { effort: "medium", format: { type: "json_schema", schema } },
      system: `You suggest 2–4 possible directions for a person's ikigai journey, in the spirit of Mieko Kamiya: ikigai can be found in small and large things and need not involve work or money. Do not use the Western four-circle diagram.
Rules: use ONLY the confirmed reflections and need ratings given. Each direction is a tentative possibility to explore, not advice or a verdict. Prefer directions that answer the less-satisfied needs while building on what the person already values. "evidence" must list 1–3 short items copied from the material (quotes or reflection lines, optionally with the need rating) that support the direction. Title under 12 words; description 1–3 sentences. Write in ${langName(body.locale)}.`,
      messages: [{ role: "user", content: `Confirmed reflections:\n${material}\n\nNeed satisfaction ratings (0–10):\n${needs}` }],
      ...FALLBACK,
    });
    if (res.stop_reason === "refusal") return json(req, { error: "Directions could not be generated." }, 422);
    const text = res.content.find((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")?.text ?? "";
    directions = JSON.parse(text).directions ?? [];
  } catch (e) {
    console.error("generate-directions", e);
    return json(req, { error: e instanceof Anthropic.APIError ? `AI service error (${e.status})` : "Directions could not be generated. Please try again." }, 502);
  }

  const rows = directions.filter((d) => d.title?.trim()).slice(0, 4).map((d) => ({
    user_id: user.id,
    title: d.title.slice(0, 300),
    description: (d.description ?? "").slice(0, 3000),
    evidence: (d.evidence ?? []).slice(0, 5).map((s) => String(s).slice(0, 500)),
    source: "ai",
    status: "suggested",
  }));
  if (!rows.length) return json(req, { directions: [] });
  const { data, error } = await db.from("possible_directions").insert(rows).select("*");
  if (error) return json(req, { error: `Directions could not be saved: ${error.message}` }, 500);
  return json(req, { directions: data });
});
