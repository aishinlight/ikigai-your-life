import { useState, type FormEvent } from "react";
import { Printer, Trash2, Pencil } from "lucide-react";
import { supabase, must } from "@/lib/supabase";
import { useAuth } from "@/auth/AuthProvider";
import { useI18n } from "@/i18n";
import { useLoad } from "@/lib/useLoad";
import type { ActionItem, ActionPlan as Plan, ActionStatus } from "@/lib/types";
import { Button, EmptyState, ErrorNote, PageHeader, PageSkeleton } from "@/components/ui";
import { SITE } from "@/config/site";

const STATUSES: ActionStatus[] = ["todo", "in_progress", "completed", "postponed"];
const tone: Record<ActionStatus, string> = { todo: "bg-white/70", in_progress: "bg-lavender", completed: "bg-sage", postponed: "bg-blush" };

export default function ActionPlan() {
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const [err, setErr] = useState("");
  const [saved, setSaved] = useState("");
  const [filter, setFilter] = useState<ActionStatus | "all">("all");
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", details: "", target_date: "" });

  const { data, setData, loading, error, reload } = useLoad(async () => {
    // Ensure exactly one plan per user (unique user_id).
    let plan = must(await supabase.from("action_plans").select("*").maybeSingle()) as Plan | null;
    if (!plan) plan = must(await supabase.from("action_plans").upsert({ user_id: user!.id }, { onConflict: "user_id" }).select("*").single()) as Plan;
    const items = must(await supabase.from("action_items").select("*").eq("plan_id", plan.id).order("position").order("created_at")) as ActionItem[];
    return { plan, items };
  }, []);

  if (loading) return <PageSkeleton />;
  if (error || !data) return <div className="container py-16"><ErrorNote onRetry={reload} retryLabel={t.common.retry}>{error}</ErrorNote></div>;

  const savePlan = async (patch: Partial<Plan>) => {
    setErr("");
    const { data: row, error } = await supabase.from("action_plans").update(patch).eq("id", data.plan.id).select("*").single();
    if (error) return setErr(error.message);
    setData({ ...data, plan: row as Plan });
    setSaved(t.common.saved);
    setTimeout(() => setSaved(""), 1500);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setErr("");
    const payload = { title: form.title.trim(), details: form.details.trim() || null, target_date: form.target_date || null };
    if (editing) {
      const { data: row, error } = await supabase.from("action_items").update(payload).eq("id", editing).select("*").single();
      if (error) return setErr(error.message);
      setData({ ...data, items: data.items.map((i) => (i.id === editing ? (row as ActionItem) : i)) });
    } else {
      const position = data.items.reduce((m, i) => Math.max(m, i.position), 0) + 1;
      const { data: row, error } = await supabase.from("action_items").insert({ ...payload, plan_id: data.plan.id, position }).select("*").single();
      if (error) return setErr(error.message);
      setData({ ...data, items: [...data.items, row as ActionItem] });
    }
    setForm({ title: "", details: "", target_date: "" });
    setEditing(null);
  };

  const setStatus = async (item: ActionItem, status: ActionStatus) => {
    const { data: row, error } = await supabase.from("action_items").update({ status }).eq("id", item.id).select("*").single();
    if (error) return setErr(error.message);
    setData({ ...data, items: data.items.map((i) => (i.id === item.id ? (row as ActionItem) : i)) });
  };
  const remove = async (item: ActionItem) => {
    if (!window.confirm(t.common.confirmDelete)) return;
    const { error } = await supabase.from("action_items").delete().eq("id", item.id);
    if (error) return setErr(error.message);
    setData({ ...data, items: data.items.filter((i) => i.id !== item.id) });
  };
  const startEdit = (i: ActionItem) => {
    setEditing(i.id);
    setForm({ title: i.title, details: i.details ?? "", target_date: i.target_date ?? "" });
    document.getElementById("action-title")?.focus();
  };

  const shown = data.items.filter((i) => filter === "all" || i.status === filter);

  return (
    <div className="container py-12 md:py-16">
      <p className="print-only mb-4 font-serif text-xl">{SITE.name} — {t.plan.title}</p>
      <PageHeader title={t.plan.title} subtitle={t.plan.subtitle}
        actions={<Button variant="secondary" onClick={() => window.print()}><Printer className="h-4 w-4" aria-hidden />{t.common.print}</Button>} />

      <div className="grid gap-8 lg:grid-cols-[1fr_1.3fr]">
        <div className="space-y-6">
          <section className="card p-6">
            <label htmlFor="direction" className="label">{t.plan.direction}</label>
            <textarea id="direction" rows={2} className="input font-serif text-lg" placeholder={t.plan.directionPh}
              defaultValue={data.plan.chosen_direction ?? ""} key={data.plan.chosen_direction ?? "d"}
              onBlur={(e) => e.target.value !== (data.plan.chosen_direction ?? "") && savePlan({ chosen_direction: e.target.value || null })} />
            <label htmlFor="notes" className="label mt-5">{t.plan.notes}</label>
            <textarea id="notes" rows={6} className="input" defaultValue={data.plan.notes ?? ""}
              onBlur={(e) => e.target.value !== (data.plan.notes ?? "") && savePlan({ notes: e.target.value || null })} />
            <p className="mt-2 h-4 text-xs text-muted" aria-live="polite">{saved}</p>
          </section>

          <form onSubmit={submit} className="no-print card space-y-4 p-6">
            <h2 className="text-xl">{editing ? t.common.edit : t.plan.newAction}</h2>
            <div>
              <label className="label" htmlFor="action-title">{t.plan.actionTitle}</label>
              <input id="action-title" className="input" value={form.title} maxLength={300} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <label className="label" htmlFor="action-details">{t.plan.details} <span className="text-muted">({t.common.optional})</span></label>
              <textarea id="action-details" rows={2} className="input" value={form.details} onChange={(e) => setForm({ ...form, details: e.target.value })} />
            </div>
            <div>
              <label className="label" htmlFor="action-date">{t.plan.target} <span className="text-muted">({t.common.optional})</span></label>
              <input id="action-date" type="date" className="input" value={form.target_date} onChange={(e) => setForm({ ...form, target_date: e.target.value })} />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={!form.title.trim()}>{editing ? t.common.save : t.common.add}</Button>
              {editing && <Button variant="ghost" onClick={() => { setEditing(null); setForm({ title: "", details: "", target_date: "" }); }}>{t.common.cancel}</Button>}
            </div>
          </form>
        </div>

        <section aria-label={t.plan.title}>
          <div className="no-print mb-4 flex flex-wrap gap-2" role="group" aria-label="Filter">
            {(["all", ...STATUSES] as const).map((s) => (
              <button key={s} onClick={() => setFilter(s)} aria-pressed={filter === s}
                className={`rounded-full border px-4 py-1.5 text-sm ${filter === s ? "border-foreground bg-foreground text-background" : "border-line bg-white/60"}`}>
                {s === "all" ? t.plan.filterAll : t.plan.status[s]} {s !== "all" && `(${data.items.filter((i) => i.status === s).length})`}
              </button>
            ))}
          </div>
          {err && <div className="mb-4"><ErrorNote>{err}</ErrorNote></div>}
          {shown.length ? (
            <ul className="space-y-3">
              {shown.map((i) => (
                <li key={i.id} className={`rounded-card border border-line/60 p-5 ${tone[i.status]}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className={`font-medium ${i.status === "completed" ? "line-through opacity-70" : ""}`}>{i.title}</p>
                      {i.details && <p className="mt-1 text-sm text-foreground/75">{i.details}</p>}
                      <p className="mt-2 text-xs text-muted">
                        {t.plan.status[i.status]}{i.target_date && ` · ${t.plan.target}: ${new Date(i.target_date + "T00:00:00").toLocaleDateString(locale)}`}
                      </p>
                    </div>
                    <div className="no-print flex shrink-0 gap-1">
                      <button aria-label={`${t.common.edit}: ${i.title}`} onClick={() => startEdit(i)} className="rounded-full p-2 text-muted hover:bg-white"><Pencil className="h-4 w-4" aria-hidden /></button>
                      <button aria-label={`${t.common.delete}: ${i.title}`} onClick={() => remove(i)} className="rounded-full p-2 text-muted hover:bg-white"><Trash2 className="h-4 w-4" aria-hidden /></button>
                    </div>
                  </div>
                  <div className="no-print mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                    {i.status !== "in_progress" && i.status !== "completed" && <button onClick={() => setStatus(i, "in_progress")} className="rounded-full bg-white/80 px-3 py-1.5">{t.plan.markInProgress}</button>}
                    {i.status !== "completed" && <button onClick={() => setStatus(i, "completed")} className="rounded-full bg-white/80 px-3 py-1.5">{t.plan.complete}</button>}
                    {i.status !== "postponed" && i.status !== "completed" && <button onClick={() => setStatus(i, "postponed")} className="rounded-full bg-white/80 px-3 py-1.5">{t.plan.postpone}</button>}
                    {(i.status === "completed" || i.status === "postponed") && <button onClick={() => setStatus(i, "todo")} className="rounded-full bg-white/80 px-3 py-1.5">{t.plan.reopen}</button>}
                  </div>
                </li>
              ))}
            </ul>
          ) : <EmptyState>{t.plan.empty}</EmptyState>}
        </section>
      </div>
    </div>
  );
}
