import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase, must } from "@/lib/supabase";
import { useAuth } from "@/auth/AuthProvider";
import { useI18n } from "@/i18n";
import { useLoad } from "@/lib/useLoad";
import { Button, ErrorNote, PageSkeleton } from "@/components/ui";
import type { CoachingPreference } from "@/lib/types";

type Answer = { answer: string; skipped: boolean };

export default function Onboarding() {
  const { t } = useI18n();
  const { user } = useAuth();
  const nav = useNavigate();
  const qs = t.onboarding.questions;
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [status, setStatus] = useState<"" | "saving" | "saved">("");
  const [err, setErr] = useState("");
  const timer = useRef<number>();

  const { loading, error, reload } = useLoad(async () => {
    const rows = must(await supabase.from("onboarding_responses").select("question_key, answer, skipped"));
    const map: Record<string, Answer> = {};
    (rows ?? []).forEach((r) => (map[r.question_key] = { answer: r.answer ?? "", skipped: r.skipped }));
    setAnswers(map);
    const firstOpen = qs.findIndex((q) => !map[q.key]);
    setStep(firstOpen === -1 ? 0 : firstOpen);
    return true;
  }, []);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const persist = async (key: string, a: Answer) => {
    setStatus("saving");
    setErr("");
    const { error } = await supabase
      .from("onboarding_responses")
      .upsert({ user_id: user!.id, question_key: key, answer: a.answer || null, skipped: a.skipped }, { onConflict: "user_id,question_key" });
    if (error) { setErr(error.message); setStatus(""); return false; }
    if (key === "how_to_begin" && !a.skipped && a.answer) {
      const pe = await supabase.from("profiles").update({ coaching_preference: a.answer as CoachingPreference }).eq("id", user!.id);
      if (pe.error) { setErr(pe.error.message); setStatus(""); return false; }
    }
    setStatus("saved");
    return true;
  };

  const q = qs[step];
  const cur = answers[q?.key] ?? { answer: "", skipped: false };

  const change = (value: string, immediate = false) => {
    const a = { answer: value, skipped: false };
    setAnswers((s) => ({ ...s, [q.key]: a }));
    window.clearTimeout(timer.current);
    if (immediate) void persist(q.key, a);
    else timer.current = window.setTimeout(() => void persist(q.key, a), 700);
  };

  const finish = async () => {
    const { error } = await supabase.from("profiles").update({ onboarding_completed_at: new Date().toISOString() }).eq("id", user!.id);
    if (error) return setErr(error.message);
    const pref = answers.how_to_begin?.answer;
    nav(pref === "human" ? "/human-coaching" : pref === "ai" || pref === "both" ? "/coaching" : "/dashboard");
  };

  const go = async (dir: 1 | -1, skip = false) => {
    window.clearTimeout(timer.current);
    const a = skip ? { answer: "", skipped: true } : cur;
    if (skip) setAnswers((s) => ({ ...s, [q.key]: a }));
    if (dir === 1 && !(await persist(q.key, a))) return;
    if (dir === 1 && step === qs.length - 1) return finish();
    setStep((s) => Math.max(0, Math.min(qs.length - 1, s + dir)));
    setStatus("");
  };

  if (loading) return <PageSkeleton />;
  if (error) return <div className="container py-16"><ErrorNote onRetry={reload} retryLabel={t.common.retry}>{error}</ErrorNote></div>;

  return (
    <div className="container max-w-2xl py-14 md:py-20">
      <p className="eyebrow mb-3">{t.onboarding.title}</p>
      <div className="mb-8 flex items-center justify-between text-sm text-muted">
        <span>{t.onboarding.progress(step + 1, qs.length)}</span>
        <span aria-live="polite">{status === "saving" ? t.common.saving : status === "saved" ? t.common.saved : t.onboarding.savedAuto}</span>
      </div>
      <div className="mb-8 h-1 rounded-full bg-line" aria-hidden>
        <div className="h-1 rounded-full bg-accent transition-all" style={{ width: `${((step + 1) / qs.length) * 100}%` }} />
      </div>

      <div className="card p-7 md:p-10">
        <h1 className="mb-6 text-2xl leading-snug md:text-3xl" id="q-label">{q.q}</h1>
        {q.key === "how_to_begin" ? (
          <div role="radiogroup" aria-labelledby="q-label" className="grid gap-3">
            {t.onboarding.choices.map((c) => (
              <button
                key={c.v}
                role="radio"
                aria-checked={cur.answer === c.v}
                onClick={() => change(c.v, true)}
                className={`rounded-2xl border px-5 py-4 text-left transition-colors ${cur.answer === c.v ? "border-accent bg-blush" : "border-line bg-white/70 hover:bg-white"}`}
              >
                {c.l}
              </button>
            ))}
          </div>
        ) : (
          <>
            {q.key === "life_area" && (
              <div className="mb-4 flex flex-wrap gap-2">
                {t.onboarding.areas.map((a) => (
                  <button key={a} onClick={() => change(a, true)} aria-pressed={cur.answer === a}
                    className={`rounded-full border px-4 py-2 text-sm ${cur.answer === a ? "border-accent bg-blush" : "border-line bg-white/70 hover:bg-white"}`}>
                    {a}
                  </button>
                ))}
              </div>
            )}
            <textarea
              aria-labelledby="q-label"
              rows={5}
              className="input resize-y"
              placeholder={t.onboarding.placeholder}
              value={cur.answer}
              onChange={(e) => change(e.target.value)}
              maxLength={5000}
            />
          </>
        )}
        {err && <div className="mt-4"><ErrorNote>{err}</ErrorNote></div>}
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
          <Button variant="ghost" onClick={() => go(-1)} disabled={step === 0}>{t.common.back}</Button>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => go(1, true)}>{t.common.skip}</Button>
            <Button onClick={() => go(1)}>{step === qs.length - 1 ? t.onboarding.finish : t.common.continue}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
