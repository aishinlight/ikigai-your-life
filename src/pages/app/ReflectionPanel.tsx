import { useEffect, useState } from "react";
import { Plus, Trash2, CheckCircle2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useI18n } from "@/i18n";
import { callFunction, ApiError } from "@/lib/api";
import { REFLECTION_FIELDS, type ModuleKey, type ReflectionField, type ReflectionItem } from "@/lib/kamiya";
import type { Reflection } from "@/lib/types";
import { Button, ErrorNote, Notice } from "@/components/ui";

type Draft = Record<ReflectionField, ReflectionItem[]>;
const toDraft = (r: Reflection | null): Draft =>
  Object.fromEntries(REFLECTION_FIELDS.map((f) => [f, r ? r[f].map((i) => ({ ...i })) : []])) as Draft;

export function ReflectionPanel({
  moduleKey, conversationId, userCount, min, reflection, onChange,
}: {
  moduleKey: ModuleKey;
  conversationId: string | null;
  userCount: number;
  min: number;
  reflection: Reflection | null;
  onChange: (r: Reflection) => void;
}) {
  const { t, locale } = useI18n();
  const [draft, setDraft] = useState<Draft>(() => toDraft(reflection));
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState<"" | "gen" | "save" | "confirm">("");
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => { setDraft(toDraft(reflection)); setDirty(false); }, [reflection]);

  const canGenerate = userCount >= min && !!conversationId;

  const generate = async () => {
    if (reflection && !window.confirm(t.explore.regenerateWarn)) return;
    setBusy("gen"); setErr(""); setMsg("");
    try {
      const res = await callFunction<{ reflection: Reflection }>("generate-reflection", { module_key: moduleKey, conversation_id: conversationId, locale });
      onChange(res.reflection);
    } catch (e) {
      const ae = e as ApiError;
      setErr(ae.code === "ai_not_configured" ? t.explore.aiNotConfigured : ae.message);
    } finally { setBusy(""); }
  };

  const save = async (status?: "draft" | "confirmed") => {
    if (!reflection) return;
    setBusy(status === "confirmed" ? "confirm" : "save"); setErr(""); setMsg("");
    const clean = Object.fromEntries(
      REFLECTION_FIELDS.map((f) => [f, draft[f].filter((i) => i.text.trim()).map((i) => ({ text: i.text.trim(), ...(i.evidence?.trim() ? { evidence: i.evidence.trim() } : {}) }))]),
    );
    const patch: Record<string, unknown> = { ...clean };
    if (status) { patch.status = status; patch.confirmed_at = status === "confirmed" ? new Date().toISOString() : null; }
    const { data, error } = await supabase.from("ikigai_reflections").update(patch).eq("id", reflection.id).select("*").single();
    setBusy("");
    if (error) return setErr(error.message);
    onChange(data as Reflection);
    setMsg(t.common.saved);
  };

  const edit = (f: ReflectionField, i: number, patch: Partial<ReflectionItem>) => {
    setDraft((d) => ({ ...d, [f]: d[f].map((it, j) => (j === i ? { ...it, ...patch } : it)) }));
    setDirty(true);
  };
  const remove = (f: ReflectionField, i: number) => { setDraft((d) => ({ ...d, [f]: d[f].filter((_, j) => j !== i) })); setDirty(true); };
  const add = (f: ReflectionField) => { setDraft((d) => ({ ...d, [f]: [...d[f], { text: "" }] })); setDirty(true); };

  return (
    <div className="card p-6">
      <h2 className="mb-2 text-2xl">{t.explore.summaryTitle}</h2>
      {!reflection ? (
        <>
          <p className="mb-5 text-sm text-muted">{canGenerate ? t.explore.tentative : t.explore.summaryNeed(Math.max(1, min - userCount))}</p>
          <Button onClick={generate} disabled={!canGenerate || busy !== ""}>{busy === "gen" ? t.explore.generating : t.explore.generate}</Button>
        </>
      ) : (
        <>
          <p className={`mb-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${reflection.status === "confirmed" ? "bg-sage" : "bg-blush"}`}>
            {reflection.status === "confirmed" && <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />}
            {reflection.status === "confirmed" ? t.explore.confirmedBadge : t.explore.draftBadge}
          </p>
          <p className="mb-5 text-sm text-muted">{t.explore.tentative}</p>
          <div className="space-y-6">
            {REFLECTION_FIELDS.map((f) => (
              <fieldset key={f}>
                <legend className="mb-2 text-sm font-semibold">{t.explore.fields[f]}</legend>
                <ul className="space-y-3">
                  {draft[f].map((it, i) => (
                    <li key={i} className="rounded-2xl bg-white/70 p-3">
                      <div className="flex gap-2">
                        <textarea aria-label={`${t.explore.fields[f]} ${i + 1}`} rows={2} className="input resize-y py-2 text-sm" value={it.text} onChange={(e) => edit(f, i, { text: e.target.value })} />
                        <button onClick={() => remove(f, i)} aria-label={`${t.common.delete} ${i + 1}`} className="self-start rounded-full p-2 text-muted hover:bg-blush">
                          <Trash2 className="h-4 w-4" aria-hidden />
                        </button>
                      </div>
                      <label className="mt-2 block text-xs text-muted">
                        {t.explore.evidence}
                        <input className="input mt-1 py-2 text-xs italic" value={it.evidence ?? ""} onChange={(e) => edit(f, i, { evidence: e.target.value })} />
                      </label>
                    </li>
                  ))}
                </ul>
                <button onClick={() => add(f)} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-accent-strong">
                  <Plus className="h-3.5 w-3.5" aria-hidden /> {t.explore.addItem}
                </button>
              </fieldset>
            ))}
          </div>
          {err && <div className="mt-4"><ErrorNote>{err}</ErrorNote></div>}
          {msg && !err && <div className="mt-4"><Notice>{msg}</Notice></div>}
          <div className="mt-6 flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => save()} disabled={!dirty || busy !== ""}>{busy === "save" ? t.common.saving : t.explore.saveDraft}</Button>
            {reflection.status === "draft" ? (
              <Button onClick={() => save("confirmed")} disabled={busy !== ""}>{busy === "confirm" ? t.common.saving : t.explore.confirm}</Button>
            ) : (
              <Button variant="ghost" onClick={() => save("draft")} disabled={busy !== ""}>{t.explore.unconfirm}</Button>
            )}
            <Button variant="ghost" onClick={generate} disabled={!canGenerate || busy !== ""}>{busy === "gen" ? t.explore.generating : t.explore.regenerate}</Button>
          </div>
        </>
      )}
      {!reflection && err && <div className="mt-4"><ErrorNote>{err}</ErrorNote></div>}
    </div>
  );
}
