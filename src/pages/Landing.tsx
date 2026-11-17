import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useI18n } from "@/i18n";
import { useAuth } from "@/auth/AuthProvider";
import { HeroArt, BlurShapes } from "@/components/HeroArt";
import { LinkButton, Reveal, Button } from "@/components/ui";
import { TwoSystems } from "@/components/TwoSystems";
import { useContact } from "@/components/Contact";

const cardTones = ["bg-blush", "bg-lavender", "bg-sage", "bg-lavender", "bg-sage", "bg-blush"];

export default function Landing() {
  const { t } = useI18n();
  const { user } = useAuth();
  const { openContact } = useContact();
  const beginTo = user ? "/onboarding" : "/signup";

  return (
    <>
      {/* 1. Hero */}
      <section className="relative overflow-hidden">
        <BlurShapes />
        <div className="container grid items-center gap-12 py-16 md:py-24 lg:grid-cols-[1.1fr_0.9fr]">
          <Reveal>
            <p className="eyebrow mb-6">{t.hero.eyebrow}</p>
            <h1 className="text-5xl leading-[1.05] sm:text-6xl lg:text-7xl">{t.hero.title}</h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-foreground/80">{t.hero.subtitle}</p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <LinkButton to={beginTo}>{t.hero.begin}</LinkButton>
              <LinkButton to="/human-coaching" variant="secondary">{t.hero.explore}</LinkButton>
            </div>
          </Reveal>
          <Reveal className="mx-auto w-full max-w-md lg:max-w-none">
            <HeroArt className="h-auto w-full" />
          </Reveal>
        </div>
      </section>

      {/* 2. When life no longer feels like yours */}
      <section className="section" aria-labelledby="feeling">
        <div className="container">
          <Reveal className="mx-auto mb-14 max-w-2xl text-center">
            <p className="eyebrow mb-3">{t.feeling.eyebrow}</p>
            <h2 id="feeling" className="text-3xl leading-snug md:text-4xl">{t.feeling.title}</h2>
            <p className="mt-5 leading-relaxed text-foreground/80">{t.feeling.body}</p>
          </Reveal>
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {t.feeling.cards.map((c, i) => (
              <Reveal as="li" key={c.t} className={`rounded-card ${cardTones[i]} p-7`}>
                <h3 className="text-xl">{c.t}</h3>
                <p className="mt-3 leading-relaxed text-foreground/80">{c.d}</p>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      {/* 3. Two Systems */}
      <div className="relative">
        <BlurShapes variant={2} />
        <TwoSystems />
      </div>

      {/* 4. What is Ikigai? */}
      <section className="section" aria-labelledby="what-is">
        <div className="container grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
          <Reveal>
            <p className="eyebrow mb-3">{t.whatIs.eyebrow}</p>
            <h2 id="what-is" className="text-3xl leading-snug md:text-4xl">{t.whatIs.title}</h2>
            <p aria-hidden className="mt-8 font-serif text-7xl text-accent/70">生きがい</p>
          </Reveal>
          <Reveal className="prose-soft text-lg">
            <p>{t.whatIs.p1}</p>
            <p>{t.whatIs.p2}</p>
            <p>{t.whatIs.p3}</p>
            <p className="font-serif text-xl text-foreground">{t.whatIs.p4}</p>
          </Reveal>
        </div>
      </section>

      {/* 5. Two ways to explore */}
      <section className="section bg-white/40" aria-labelledby="ways">
        <div className="container">
          <Reveal className="mx-auto mb-12 max-w-2xl text-center">
            <p className="eyebrow mb-3">{t.ways.eyebrow}</p>
            <h2 id="ways" className="text-3xl md:text-4xl">{t.ways.title}</h2>
          </Reveal>
          <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
            <Reveal className="card flex flex-col p-8 md:p-10">
              <h3 className="text-2xl">{t.ways.ai.t}</h3>
              <p className="mt-3 flex-1 leading-relaxed text-foreground/80">{t.ways.ai.d}</p>
              <LinkButton to={user ? "/coaching" : "/signup?next=%2Fcoaching"} className="mt-8 self-start">
                {t.ways.ai.cta} <ArrowRight className="h-4 w-4" aria-hidden />
              </LinkButton>
            </Reveal>
            <Reveal className="card flex flex-col p-8 md:p-10">
              <h3 className="text-2xl">{t.ways.human.t}</h3>
              <p className="mt-3 flex-1 leading-relaxed text-foreground/80">{t.ways.human.d}</p>
              <LinkButton to="/human-coaching" variant="secondary" className="mt-8 self-start">
                {t.ways.human.cta} <ArrowRight className="h-4 w-4" aria-hidden />
              </LinkButton>
            </Reveal>
          </div>
        </div>
      </section>

      {/* 6. How it works */}
      <section className="section" aria-labelledby="how">
        <div className="container">
          <Reveal className="mx-auto mb-12 max-w-2xl text-center">
            <p className="eyebrow mb-3">{t.how.eyebrow}</p>
            <h2 id="how" className="text-3xl md:text-4xl">{t.how.title}</h2>
          </Reveal>
          <ol className="mx-auto grid max-w-5xl gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {t.how.steps.map((s, i) => (
              <Reveal as="li" key={s.t} className="rounded-card border border-line/70 bg-white/50 p-7">
                <span className="font-serif text-3xl text-accent">{i + 1}</span>
                <h3 className="mt-2 text-lg">{s.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-foreground/75">{s.d}</p>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* 7. Final CTA */}
      <section className="relative overflow-hidden py-24" aria-labelledby="final">
        <BlurShapes />
        <Reveal className="container max-w-3xl text-center">
          <h2 id="final" className="text-3xl leading-snug md:text-5xl">{t.finalCta.title}</h2>
          <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
            <LinkButton to={beginTo}>{t.finalCta.begin}</LinkButton>
            <Button variant="secondary" onClick={() => openContact()}>{t.finalCta.contact}</Button>
          </div>
          <p className="mt-6 text-sm text-muted">
            <Link to="/human-coaching" className="underline underline-offset-4">{t.nav.humanCoaching}</Link>
          </p>
        </Reveal>
      </section>
    </>
  );
}
