import { useState, type FormEvent } from "react";
import { supabase, must } from "@/lib/supabase";
import { useAuth } from "@/auth/AuthProvider";
import { useI18n } from "@/i18n";
import { useLoad } from "@/lib/useLoad";
import type { CoachingPreference, Profile as P } from "@/lib/types";
import { Button, ErrorNote, LinkButton, Notice, PageHeader, PageSkeleton } from "@/components/ui";

export default function Profile() {
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [pref, setPref] = useState<CoachingPreference | "">("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState(false);

  const { data, loading, error, reload } = useLoad(async () => {
    const p = must(await supabase.from("profiles").select("*").single()) as P;
    setName(p.display_name ?? "");
    setPref(p.coaching_preference ?? "");
    return p;
  }, []);

  if (loading) return <PageSkeleton />;
  if (error || !data) return <div className="container py-16"><ErrorNote onRetry={reload} retryLabel={t.common.retry}>{error}</ErrorNote></div>;

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr(""); setOk(false);
    const { error } = await supabase.from("profiles").update({ display_name: name.trim() || null, coaching_preference: pref || null }).eq("id", user!.id);
    setBusy(false);
    if (error) return setErr(error.message);
    setOk(true);
  };

  return (
    <div className="container max-w-2xl py-12 md:py-16">
      <PageHeader title={t.profile.title} />
      <form onSubmit={save} className="card space-y-5 p-7">
        <div>
          <label className="label" htmlFor="p-name">{t.profile.name}</label>
          <input id="p-name" className="input" maxLength={120} value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="p-pref">{t.profile.preference}</label>
          <select id="p-pref" className="input" value={pref} onChange={(e) => setPref(e.target.value as CoachingPreference)}>
            <option value="">—</option>
            {t.onboarding.choices.map((c) => <option key={c.v} value={c.v}>{c.l}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="p-email">{t.profile.email}</label>
          <input id="p-email" className="input bg-foreground/[0.03]" value={user?.email ?? ""} readOnly aria-readonly="true" />
        </div>
        <p className="text-sm text-muted">{t.profile.memberSince}: {new Date(data.created_at).toLocaleDateString(locale, { year: "numeric", month: "long", day: "numeric" })}</p>
        {err && <ErrorNote>{err}</ErrorNote>}
        {ok && <Notice>{t.common.saved}</Notice>}
        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={busy}>{busy ? t.common.saving : t.common.save}</Button>
          <LinkButton to="/onboarding" variant="secondary">{t.profile.revisit}</LinkButton>
        </div>
      </form>
    </div>
  );
}
