import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { supabase, must } from "@/lib/supabase";
import { useI18n } from "@/i18n";
import { useLoad } from "@/lib/useLoad";
import { MODULES } from "@/lib/kamiya";
import type { ActionItem, JournalEntry, NeedRating, Profile, Reflection } from "@/lib/types";
import { Button, EmptyState, ErrorNote, LinkButton, PageHeader, PageSkeleton } from "@/components/ui";
import { useContact } from "@/components/Contact";
import { NeedsBars } from "./Map";

export default function Dashboard() {
  const { t, locale } = useI18n();
  const { openContact } = useContact();
  const { data, loading, error, reload } = useLoad(async () => {
    const [profile, convs, refl, ratings, journal, plan] = await Promise.all([
      supabase.from("profiles").select("*").single(),
      supabase.from("coaching_conversations").select("module_key, coaching_messages(count)"),
      supabase.from("ikigai_reflections").select("*"),
      supabase.from("needs_ratings").select("*"),
      supabase.from("journal_entries").select("*").order("entry_date", { ascending: false }).order("created_at", { ascending: false }).limit(3),
      supabase.from("action_plans").select("id, chosen_direction, action_items(*)").maybeSingle(),
    ]);
    const counts: Record<string, number> = {};
    (must(convs) as unknown as { module_key: string; coaching_messages: { count: number }[] }[]).forEach((c) => {
      counts[c.module_key] = (counts[c.module_key] ?? 0) + (c.coaching_messages[0]?.count ?? 0);
    });
    const p = must(plan) as { chosen_direction: string | null; action_items: ActionItem[] } | null;
    return {
      profile: must(profile) as Profile,
      counts,
      reflections: must(refl) as Reflection[],
      ratings: must(ratings) as NeedRating[],
      journal: must(journal) as JournalEntry[],
      direction: p?.chosen_direction ?? null,
      items: (p?.action_items ?? []).filter((i) => i.status !== "completed").sort((a, b) => a.position - b.position).slice(0, 5),
      completed: (p?.action_items ?? []).filter((i) => i.status === "completed").length,
      total: p?.action_items.length ?? 0,
    };
  }, []);

  if (loading) return <PageSkeleton />;
  if (error || !data) return <div className="container py-16"><ErrorNote onRetry={reload} retryLabel={t.common.retry}>{error}</ErrorNote></div>;

  const confirmed = data.reflections.filter((r) => r.status === "confirmed");
  const reflByModule = Object.fromEntries(data.reflections.map((r) => [r.module_key, r]));
  const doneModules = confirmed.length;

  return (
    <div className="container py-12 md:py-16">
      <PageHeader
        title={t.dashboard.title}
        subtitle={t.dashboard.subtitle}
        eyebrow={data.profile.display_name ?? undefined}
      />

      {!data.profile.onboarding_completed_at && (
        <div className="mb-8 flex flex-col gap-4 rounded-card bg-lavender p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-serif text-xl">{t.dashboard.finishOnboarding}</p>
            <p className="text-sm text-foreground/75">{t.dashboard.finishOnboardingBody}</p>
          </div>
          <LinkButton to="/onboarding">{t.dashboard.start}</LinkButton>
        </div>
      )}

      {/* Modules progress */}
      <section aria-labelledby="mods" className="mb-12">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 id="mods" className="text-2xl">{t.dashboard.modules}</h2>
          <p className="text-sm text-muted">{t.dashboard.progress}: {doneModules}/{MODULES.length}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {MODULES.map((m) => {
            const r = reflByModule[m.key];
            const n = data.counts[m.key] ?? 0;
            return (
              <Link key={m.key} to={`/explore/${m.key}`} className={`rounded-card ${m.tone} p-6 transition-shadow hover:shadow-soft`}>
                <h3 className="text-lg">{m.title[locale]}</h3>
                <p className="mt-3 text-sm text-foreground/75">
                  {r?.status === "confirmed" ? (
                    <span className="inline-flex items-center gap-1"><CheckCircle2 className="h-4 w-4" aria-hidden />{t.dashboard.confirmed}</span>
                  ) : r ? t.dashboard.draft : n ? t.dashboard.inConversation(n) : t.dashboard.notStarted}
                </p>
              </Link>
            );
          })}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-7" aria-labelledby="conf">
          <h2 id="conf" className="mb-4 text-xl">{t.dashboard.confirmedTitle}</h2>
          {confirmed.length ? (
            <ul className="space-y-4">
              {confirmed.map((r) => (
                <li key={r.id}>
                  <p className="text-sm font-semibold">{MODULES.find((m) => m.key === r.module_key)?.title[locale]}</p>
                  <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-foreground/80">
                    {r.key_discoveries.slice(0, 2).map((k, i) => <li key={i}>{k.text}</li>)}
                  </ul>
                </li>
              ))}
            </ul>
          ) : <EmptyState>{t.dashboard.noConfirmed}</EmptyState>}
        </section>

        <section className="card p-7" aria-labelledby="mapp">
          <div className="mb-4 flex items-center justify-between">
            <h2 id="mapp" className="text-xl">{t.dashboard.mapPreview}</h2>
            <Link to="/map" className="inline-flex items-center gap-1 text-sm font-semibold text-accent-strong">{t.dashboard.openMap}<ArrowRight className="h-4 w-4" aria-hidden /></Link>
          </div>
          {data.ratings.length ? <NeedsBars ratings={data.ratings} compact /> : <EmptyState>{t.dashboard.mapEmpty}</EmptyState>}
        </section>

        <section className="card p-7" aria-labelledby="planh">
          <div className="mb-4 flex items-center justify-between">
            <h2 id="planh" className="text-xl">{t.dashboard.planTitle}</h2>
            <Link to="/action-plan" className="inline-flex items-center gap-1 text-sm font-semibold text-accent-strong">{t.dashboard.openPlan}<ArrowRight className="h-4 w-4" aria-hidden /></Link>
          </div>
          {data.direction && <p className="mb-3 font-serif text-lg">{data.direction}</p>}
          {data.total ? (
            <>
              <p className="mb-3 text-sm text-muted">{t.plan.status.completed}: {data.completed}/{data.total}</p>
              <ul className="space-y-2">
                {data.items.map((i) => (
                  <li key={i.id} className="flex items-center justify-between gap-3 rounded-xl bg-white/60 px-4 py-2 text-sm">
                    <span>{i.title}</span>
                    <span className="shrink-0 text-xs text-muted">{t.plan.status[i.status]}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : <EmptyState>{t.dashboard.planEmpty}</EmptyState>}
        </section>

        <section className="card p-7" aria-labelledby="jr">
          <div className="mb-4 flex items-center justify-between">
            <h2 id="jr" className="text-xl">{t.dashboard.recentJournal}</h2>
            <Link to="/journal" className="inline-flex items-center gap-1 text-sm font-semibold text-accent-strong">{t.dashboard.openJournal}<ArrowRight className="h-4 w-4" aria-hidden /></Link>
          </div>
          {data.journal.length ? (
            <ul className="space-y-3">
              {data.journal.map((j) => (
                <li key={j.id} className="rounded-xl bg-white/60 px-4 py-3">
                  <p className="text-xs text-muted">{new Date(j.entry_date + "T00:00:00").toLocaleDateString(locale)}</p>
                  <p className="font-medium">{j.title || j.body.slice(0, 60)}</p>
                </li>
              ))}
            </ul>
          ) : <EmptyState>{t.dashboard.journalEmpty}</EmptyState>}
        </section>
      </div>

      <section className="mt-12 flex flex-col items-start gap-4 rounded-card bg-blush p-8 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl">{t.dashboard.coachTitle}</h2>
          <p className="mt-1 text-foreground/80">{t.dashboard.coachBody}</p>
        </div>
        <Button onClick={() => openContact()}>{t.finalCta.contact}</Button>
      </section>
    </div>
  );
}
