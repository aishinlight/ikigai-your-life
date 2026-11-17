import { ArrowRight } from "lucide-react";
import { useI18n } from "@/i18n";
import { BlurShapes } from "@/components/HeroArt";
import { Reveal } from "@/components/ui";
import { TwoSystems } from "@/components/TwoSystems";
import { useContact } from "@/components/Contact";
import { coachDisplayName } from "@/config/site";

const tones = ["bg-blush", "bg-lavender", "bg-sage", "bg-[#F1EBE3]"];

export default function HumanCoaching() {
  const { t } = useI18n();
  const { openContact } = useContact();
  return (
    <>
      <section className="relative overflow-hidden">
        <BlurShapes />
        <Reveal className="container max-w-3xl py-20 text-center md:py-28">
          <p className="eyebrow mb-5">{t.coachingPage.eyebrow} · {coachDisplayName}</p>
          <h1 className="text-4xl leading-tight md:text-6xl">{t.coachingPage.title}</h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-foreground/80">{t.coachingPage.body}</p>
        </Reveal>
      </section>

      <TwoSystems />

      <section className="section pt-4" aria-labelledby="services">
        <div className="container">
          <Reveal className="mx-auto mb-12 max-w-2xl text-center">
            <h2 id="services" className="text-3xl md:text-4xl">{t.coachingPage.servicesTitle}</h2>
            <p className="mt-3 text-muted">{t.coachingPage.servicesNote}</p>
          </Reveal>
          <ul className="mx-auto grid max-w-5xl gap-6 md:grid-cols-2">
            {t.services.map((s, i) => (
              <Reveal as="li" key={s.id}>
                <button
                  onClick={() => openContact(s.name)}
                  className={`group flex h-full w-full flex-col rounded-card ${tones[i]} p-8 text-left transition-shadow hover:shadow-soft`}
                  data-testid={`service-${s.id}`}
                >
                  <span className="font-serif text-sm text-accent-strong">0{i + 1}</span>
                  <h3 className="mt-2 text-2xl">{s.name}</h3>
                  <p className="mt-3 flex-1 leading-relaxed text-foreground/80">{s.d}</p>
                  <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-accent-strong">
                    {t.coachingPage.request} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />
                  </span>
                </button>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
