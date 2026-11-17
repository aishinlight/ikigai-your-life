import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useI18n } from "@/i18n";
import { MODULES, NEEDS } from "@/lib/kamiya";
import { PageHeader, Notice } from "@/components/ui";

export default function Coaching() {
  const { t, locale } = useI18n();
  return (
    <div className="container py-12 md:py-16">
      <PageHeader title={t.coaching.title} subtitle={t.coaching.subtitle} />
      <div className="grid gap-6 md:grid-cols-2">
        {MODULES.map((m, i) => (
          <Link key={m.key} to={`/explore/${m.key}`} className={`group rounded-card ${m.tone} p-8 transition-shadow hover:shadow-soft`}>
            <span className="font-serif text-sm text-accent-strong">0{i + 1}</span>
            <h2 className="mt-2 text-2xl">{m.title[locale]}</h2>
            <p className="mt-3 leading-relaxed text-foreground/80">{m.intro[locale]}</p>
            <p className="mt-4 text-xs text-muted">
              {m.needs.map((n) => { const need = NEEDS.find((x) => x.key === n)!; return `${need.name[locale]} (${need.jp})`; }).join(" · ")}
            </p>
            <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-accent-strong">
              {t.coaching.open} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />
            </span>
          </Link>
        ))}
      </div>
      <div className="mt-10"><Notice tone="lavender">{t.coaching.disclaimer}</Notice></div>
    </div>
  );
}
