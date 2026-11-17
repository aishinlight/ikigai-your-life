import { useRef, useState } from "react";
import { Printer, Sparkles, Trash2, Plus } from "lucide-react";
import { supabase, must } from "@/lib/supabase";
import { useAuth } from "@/auth/AuthProvider";
import { useI18n } from "@/i18n";
import { useLoad } from "@/lib/useLoad";
import { callFunction, ApiError } from "@/lib/api";
import { MODULES, NEEDS } from "@/lib/kamiya";
import type { Direction, NeedRating, Reflection } from "@/lib/types";
import { Button, EmptyState, ErrorNote, Notice, PageHeader, PageSkeleton } from "@/components/ui";
import { SITE, coachDisplayName } from "@/config/site";

export function NeedsBars({ ratings, compact = false }: { ratings: NeedRating[]; compact?: boolean }) {
  const { locale } = useI18n();
  const byKey = Object.fromEntries(ratings.map((r) => [r.need_key, r]));
  return (
    <ul className={compact ? "space-y-2" : "space-y-3"}>
      {NEEDS.map((n) => {
        const s = byKey[n.key]?.score;
        return (
          <li key={n.key}>
            <div className="mb-1 flex justify-between text-xs">
              <span>{n.name[locale]}</span>
              <span className="text-muted">{s ?? "–"}/10</span>
            </div>
            <div className="h-2 rounded-full bg-line/70" aria-hidden>
              <div className="h-2 rounded-full bg-accent" style={{ width: `${((s ?? 0) / 10) * 100}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export default function MapPage() {
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const timers = useRef<Record<string, number>>({});
  const [saveErr, setSaveErr] = useState("");
  const [genErr, setGenErr] = useState("");
  const [genBusy, setGenBusy] = useState(false);
  const [note, setNote] = useState("");

  const { data, setData, loading, error, reload } = useLoad(async () => {
    const [r, n, d] = await Promise.all([
      supabase.from("ikigai_reflections").select("*").eq("status", "confirmed"),
      supabase.from("needs_ratings").select("*"),
      supabase.from("possible_directions").select("*").neq("status", "dismissed").order("created_at", { ascending: false }),
    ]);
    return { reflections: must(r) as Reflection[], ratings: must(n) as NeedRating[], directions: must(d) as Direction[] };
  }, []);

  if (loading) return <PageSkeleton />;
  if (error || !data) return <div className="container py-16"><ErrorNote onRetry={reload} retryLabel={t.common.retry}>{error}</ErrorNote></div>;

  const byKey = Object.fromEntries(data.ratings.map((r) => [r.need_key, r]));

  const setRating = (key: string, patch: Partial<NeedRating>) => {
    const existing = byKey[key];
    const next = { ...(existing ?? { id: key, user_id: user!.id, need_key: key, score: 5, note: null, updated_at: "" }), ...patch } as NeedRating;
    setData({ ...data, ratings: [...data.ratings.filter((r) => r.need_key !== key), next] });
    window.clearTimeout(timers.current[key]);
    timers.current[key] = window.setTimeout(async () => {
      const { error } = await supabase.from("needs_ratings").upsert(
        { user_id: user!.id, need_key: key, score: next.score, note: next.note || null },
        { onConflict: "user_id,need_key" },
      );
      setSaveErr(error ? error.message : "");
    }, 500);
  };

  const themes = Array.from(new Set(data.reflections.flatMap((r) => r.recurring_themes.map((x) => x.text))));
  const lowest = [...data.ratings].sort((a, b) => a.score - b.score).slice(0, 2).filter((r) => r.score <= 5);

  const generate = async () => {
    setGenBusy(true); setGenErr("");
    try {
      const res = await callFunction<{ directions: Direction[] }>("generate-directions", { locale });
      setData({ ...data, directions: [...res.directions, ...data.directions] });
    } catch (e) {
      const ae = e as ApiError;
      setGenErr(ae.code === "ai_not_configured" ? t.explore.aiNotConfigured : ae.message);
    } finally { setGenBusy(false); }
  };

  const updateDirection = async (d: Direction, patch: Partial<Direction>) => {
    const { data: row, error } = await supabase.from("possible_directions").update(patch).eq("id", d.id).select("*").single();
    if (error) return setGenErr(error.message);
    const next = row as Direction;
    setData({ ...data, directions: next.status === "dismissed" ? data.directions.filter((x) => x.id !== d.id) : data.directions.map((x) => (x.id === d.id ? next : x)) });
  };
  const deleteDirection = async (d: Direction) => {
    if (!window.confirm(t.common.confirmDelete)) return;
    const { error } = await supabase.from("possible_directions").delete().eq("id", d.id);
    if (error) return setGenErr(error.message);
    setData({ ...data, directions: data.directions.filter((x) => x.id !== d.id) });
  };
  const addOwn = async () => {
    const title = window.prompt(t.map.addOwn);
    if (!title?.trim()) return;
    const { data: row, error } = await supabase.from("possible_directions")
      .insert({ user_id: user!.id, title: title.trim(), source: "user", status: "kept" }).select("*").single();
    if (error) return setGenErr(error.message);
    setData({ ...data, directions: [row as Direction, ...data.directions] });
  };
  const setAsPlan = async (d: Direction) => {
    const { error } = await supabase.from("action_plans").upsert({ user_id: user!.id, chosen_direction: d.title }, { onConflict: "user_id" });
    if (error) return setGenErr(error.message);
    if (d.status !== "kept") await updateDirection(d, { status: "kept" });
    setNote(t.map.usedInPlan);
  };

  return (
    <div className="container py-12 md:py-16">
      <div className="print-only mb-6 border-b pb-4 text-sm">
        <p className="font-serif text-xl">{SITE.name}</p>
        <p>{t.map.printedOn} {new Date().toLocaleDateString(locale)} · {coachDisplayName}{SITE.coachEmail ? ` · ${SITE.coachEmail}` : ""}</p>
      </div>
      <PageHeader
        title={t.map.title}
        subtitle={t.map.subtitle}
        actions={<Button variant="secondary" onClick={() => window.print()}><Printer className="h-4 w-4" aria-hidden />{t.common.print}</Button>}
      />

      <section aria-labelledby="needs" className="mb-12">
        <h2 id="needs" className="sr-only">{t.map.title}</h2>
        <p className="mb-5 text-sm text-muted">{t.map.scale}</p>
        <div className="grid gap-5 md:grid-cols-2">
          {NEEDS.map((n) => {
            const r = byKey[n.key];
            const id = `need-${n.key}`;
            return (
              <div key={n.key} className="card p-6">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="text-lg"><label htmlFor={id}>{n.name[locale]}</label></h3>
                  <span lang="ja" className="font-serif text-sm text-muted">{n.jp}</span>
                </div>
                <p className="mt-1 text-sm text-foreground/75">{n.desc[locale]}</p>
                <div className="mt-4 flex items-center gap-4">
                  <input
                    id={id}
                    type="range" min={0} max={10} step={1}
                    value={r?.score ?? 5}
                    onChange={(e) => setRating(n.key, { score: Number(e.target.value) })}
                    className={`no-print w-full accent-[#B58B7D] ${r ? "" : "opacity-50"}`}
                    aria-valuetext={`${r?.score ?? "–"} / 10`}
                  />
                  <span className="w-12 text-right font-serif text-xl">{r ? r.score : "–"}</span>
                </div>
                <div className="print-only mt-2 h-2 rounded bg-gray-200"><div className="h-2 rounded bg-[#B58B7D]" style={{ width: `${((r?.score ?? 0) / 10) * 100}%` }} /></div>
                <input
                  aria-label={`${t.map.note} — ${n.name[locale]}`}
                  className="input mt-3 py-2 text-sm"
                  placeholder={t.map.note}
                  value={r?.note ?? ""}
                  onChange={(e) => setRating(n.key, { note: e.target.value, score: r?.score ?? 5 })}
                  maxLength={2000}
                />
              </div>
            );
          })}
        </div>
        {saveErr && <div className="mt-4"><ErrorNote>{saveErr}</ErrorNote></div>}
        {lowest.length > 0 && (
          <p className="mt-5 text-sm"><strong>{t.map.lowest}:</strong> {lowest.map((l) => NEEDS.find((n) => n.key === l.need_key)?.name[locale]).join(", ")}</p>
        )}
        <p className="mt-2 text-xs text-muted">{t.map.snapshotNote}</p>
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        <section aria-labelledby="ins" className="card p-7">
          <h2 id="ins" className="mb-4 text-2xl">{t.map.insights}</h2>
          {data.reflections.length ? (
            <div className="space-y-6">
              {data.reflections.map((r) => (
                <div key={r.id}>
                  <h3 className="mb-2 text-lg">{MODULES.find((m) => m.key === r.module_key)?.title[locale]}</h3>
                  <ul className="space-y-2 text-sm">
                    {r.key_discoveries.map((k, i) => (
                      <li key={i}>
                        {k.text}
                        {k.evidence && <span className="mt-0.5 block text-xs italic text-muted">“{k.evidence}”</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              <p className="no-print text-xs text-muted">{t.explore.tentative}</p>
            </div>
          ) : <EmptyState>{t.map.insightsEmpty}</EmptyState>}
        </section>

        <section aria-labelledby="themes" className="card p-7">
          <h2 id="themes" className="mb-4 text-2xl">{t.map.themes}</h2>
          {themes.length ? (
            <ul className="flex flex-wrap gap-2">
              {themes.map((th) => <li key={th} className="rounded-full bg-lavender px-4 py-2 text-sm">{th}</li>)}
            </ul>
          ) : <EmptyState>{t.map.insightsEmpty}</EmptyState>}
        </section>
      </div>

      <section aria-labelledby="dirs" className="mt-12">
        <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <h2 id="dirs" className="text-2xl">{t.map.directions}</h2>
            <p className="mt-1 text-sm text-muted">{t.map.directionsBody}</p>
          </div>
          <div className="no-print flex flex-wrap gap-2">
            <Button variant="secondary" onClick={addOwn}><Plus className="h-4 w-4" aria-hidden />{t.map.addOwn}</Button>
            <Button onClick={generate} disabled={genBusy || data.reflections.length === 0} title={data.reflections.length ? undefined : t.map.needConfirmed}>
              <Sparkles className="h-4 w-4" aria-hidden />{genBusy ? t.explore.generating : t.map.generateDirections}
            </Button>
          </div>
        </div>
        {data.reflections.length === 0 && <p className="no-print mb-4 text-sm text-muted">{t.map.needConfirmed}</p>}
        {genErr && <div className="mb-4"><ErrorNote>{genErr}</ErrorNote></div>}
        {note && <div className="mb-4"><Notice>{note}</Notice></div>}
        {data.directions.length ? (
          <ul className="grid gap-5 md:grid-cols-2">
            {data.directions.map((d) => (
              <li key={d.id} className={`rounded-card p-6 ${d.status === "kept" ? "bg-sage" : "bg-white/70 border border-line"}`}>
                <input aria-label={t.map.directions} className="w-full bg-transparent font-serif text-xl focus:outline-none" defaultValue={d.title}
                  onBlur={(e) => e.target.value.trim() && e.target.value !== d.title && updateDirection(d, { title: e.target.value.trim() })} />
                <textarea aria-label={t.plan.details} rows={2} className="mt-2 w-full resize-y bg-transparent text-sm text-foreground/80 focus:outline-none" defaultValue={d.description ?? ""}
                  onBlur={(e) => e.target.value !== (d.description ?? "") && updateDirection(d, { description: e.target.value })} />
                {d.evidence.length > 0 && (
                  <div className="mt-3 text-xs text-muted">
                    <p className="font-semibold">{t.map.basedOn}:</p>
                    <ul className="mt-1 list-disc space-y-1 pl-4 italic">{d.evidence.map((e, i) => <li key={i}>{e}</li>)}</ul>
                  </div>
                )}
                <div className="no-print mt-4 flex flex-wrap gap-2">
                  {d.status !== "kept" ? (
                    <Button variant="secondary" className="min-h-0 px-4 py-2" onClick={() => updateDirection(d, { status: "kept" })}>{t.map.keep}</Button>
                  ) : <span className="self-center text-xs font-semibold">{t.map.kept}</span>}
                  <Button variant="ghost" className="min-h-0 px-4 py-2" onClick={() => setAsPlan(d)}>{t.map.useInPlan}</Button>
                  <Button variant="ghost" className="min-h-0 px-4 py-2" onClick={() => updateDirection(d, { status: "dismissed" })}>{t.map.dismiss}</Button>
                  <button aria-label={t.common.delete} onClick={() => deleteDirection(d)} className="ml-auto rounded-full p-2 text-muted hover:bg-blush"><Trash2 className="h-4 w-4" aria-hidden /></button>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </div>
  );
}
