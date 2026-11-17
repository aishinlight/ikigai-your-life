import { useI18n } from "@/i18n";
import { Reveal } from "./ui";

export function TwoSystems() {
  const { t } = useI18n();
  const tones = ["bg-lavender", "bg-sage"];
  return (
    <section className="section" aria-labelledby="two-systems">
      <div className="container">
        <Reveal className="mx-auto mb-12 max-w-2xl text-center">
          <p className="eyebrow mb-3">{t.systems.eyebrow}</p>
          <h2 id="two-systems" className="text-3xl md:text-4xl">{t.systems.title}</h2>
        </Reveal>
        <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
          {t.systems.items.map((s, i) => (
            <Reveal key={s.t} className={`rounded-card ${tones[i]} p-8 md:p-10`}>
              <span className="font-serif text-sm text-accent-strong">0{i + 1}</span>
              <h3 className="mt-3 text-2xl">{s.t}</h3>
              <p className="mt-3 leading-relaxed text-foreground/85">{s.d}</p>
            </Reveal>
          ))}
        </div>
        <p className="mx-auto mt-8 max-w-2xl text-center text-sm text-muted">{t.systems.note}</p>
      </div>
    </section>
  );
}
