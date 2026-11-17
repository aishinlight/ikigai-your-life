import { useMemo, useState, type FormEvent } from "react";
import { Pencil, Trash2, Search } from "lucide-react";
import { supabase, must } from "@/lib/supabase";
import { useAuth } from "@/auth/AuthProvider";
import { useI18n } from "@/i18n";
import { useLoad } from "@/lib/useLoad";
import type { JournalEntry } from "@/lib/types";
import { Button, EmptyState, ErrorNote, PageHeader, PageSkeleton } from "@/components/ui";

const today = () => new Date().toLocaleDateString("sv-SE"); // YYYY-MM-DD in local time
const empty = () => ({ title: "", body: "", entry_date: today() });
const sortEntries = (a: JournalEntry, b: JournalEntry) =>
  b.entry_date.localeCompare(a.entry_date) || b.created_at.localeCompare(a.created_at);

export default function Journal() {
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const { data, setData, loading, error, reload } = useLoad(
    async () => must(await supabase.from("journal_entries").select("*").order("entry_date", { ascending: false }).order("created_at", { ascending: false })) as JournalEntry[],
    [],
  );

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (data ?? []).filter((e) => !term || e.body.toLowerCase().includes(term) || (e.title ?? "").toLowerCase().includes(term));
  }, [data, q]);

  if (loading) return <PageSkeleton />;
  if (error || !data) return <div className="container py-16"><ErrorNote onRetry={reload} retryLabel={t.common.retry}>{error}</ErrorNote></div>;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.body.trim()) return;
    setBusy(true); setErr("");
    const payload = { title: form.title.trim() || null, body: form.body.trim(), entry_date: form.entry_date || today() };
    const res = editing
      ? await supabase.from("journal_entries").update(payload).eq("id", editing).select("*").single()
      : await supabase.from("journal_entries").insert({ ...payload, user_id: user!.id }).select("*").single();
    setBusy(false);
    if (res.error) return setErr(res.error.message);
    const row = res.data as JournalEntry;
    setData((editing ? data.map((x) => (x.id === editing ? row : x)) : [row, ...data]).sort(sortEntries));
    setForm(empty()); setEditing(null);
  };

  const remove = async (entry: JournalEntry) => {
    if (!window.confirm(t.common.confirmDelete)) return;
    const { error } = await supabase.from("journal_entries").delete().eq("id", entry.id);
    if (error) return setErr(error.message);
    setData(data.filter((x) => x.id !== entry.id));
  };

  return (
    <div className="container max-w-4xl py-12 md:py-16">
      <PageHeader title={t.journal.title} subtitle={t.journal.subtitle} />
      <form onSubmit={submit} className="card mb-10 space-y-4 p-6">
        <h2 className="text-xl">{editing ? t.common.edit : t.journal.new}</h2>
        <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
          <div>
            <label className="label" htmlFor="j-title">{t.journal.entryTitle} <span className="text-muted">({t.common.optional})</span></label>
            <input id="j-title" className="input" maxLength={300} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div>
            <label className="label" htmlFor="j-date">{t.journal.date}</label>
            <input id="j-date" type="date" className="input" value={form.entry_date} onChange={(e) => setForm({ ...form, entry_date: e.target.value })} />
          </div>
        </div>
        <label htmlFor="j-body" className="sr-only">{t.journal.body}</label>
        <textarea id="j-body" rows={6} className="input" placeholder={t.journal.body} value={form.body} maxLength={50000} onChange={(e) => setForm({ ...form, body: e.target.value })} />
        {err && <ErrorNote>{err}</ErrorNote>}
        <div className="flex gap-2">
          <Button type="submit" disabled={busy || !form.body.trim()}>{busy ? t.common.saving : t.common.save}</Button>
          {editing && <Button variant="ghost" onClick={() => { setEditing(null); setForm(empty()); }}>{t.common.cancel}</Button>}
        </div>
      </form>

      {data.length > 0 && (
        <div className="relative mb-6">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
          <label htmlFor="j-search" className="sr-only">{t.common.search}</label>
          <input id="j-search" type="search" className="input pl-11" placeholder={t.journal.searchPh} value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      )}

      {data.length === 0 ? <EmptyState>{t.journal.empty}</EmptyState> : shown.length === 0 ? <EmptyState>{t.journal.noResults}</EmptyState> : (
        <ul className="space-y-4">
          {shown.map((e) => (
            <li key={e.id} className="card p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted">{new Date(e.entry_date + "T00:00:00").toLocaleDateString(locale, { year: "numeric", month: "long", day: "numeric" })}</p>
                  {e.title && <h3 className="mt-1 text-xl">{e.title}</h3>}
                </div>
                <div className="flex shrink-0 gap-1">
                  <button aria-label={t.common.edit} onClick={() => { setEditing(e.id); setForm({ title: e.title ?? "", body: e.body, entry_date: e.entry_date }); window.scrollTo({ top: 0 }); }} className="rounded-full p-2 text-muted hover:bg-blush"><Pencil className="h-4 w-4" aria-hidden /></button>
                  <button aria-label={t.common.delete} onClick={() => remove(e)} className="rounded-full p-2 text-muted hover:bg-blush"><Trash2 className="h-4 w-4" aria-hidden /></button>
                </div>
              </div>
              <p className="mt-3 whitespace-pre-wrap leading-relaxed text-foreground/85">{e.body}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
