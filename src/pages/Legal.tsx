import { useI18n } from "@/i18n";

export function LegalPage({ kind }: { kind: "privacy" | "terms" }) {
  const { t } = useI18n();
  const title = kind === "privacy" ? t.footer.privacy : t.footer.terms;
  return (
    <div className="container max-w-3xl py-16">
      <h1 className="mb-6 text-4xl">{title}</h1>
      <div role="note" className="mb-8 rounded-2xl border-2 border-dashed border-danger/50 bg-danger/5 p-5 text-sm font-medium text-danger">
        {t.legal.placeholder}
      </div>
      <div className="prose-soft text-muted">
        {kind === "privacy" ? (
          <>
            <p>[Site owner: describe who the data controller is, what personal data is collected (account email, name, onboarding answers, AI conversations, reflections, needs ratings, action plan, journal), why, the legal basis, retention, processors (e.g. Supabase for hosting and authentication, Anthropic for AI responses), international transfers, user rights and how to exercise them, and contact details.]</p>
            <p>[Describe how users can export and delete their data in Settings.]</p>
          </>
        ) : (
          <>
            <p>[Site owner: describe the service, eligibility, account responsibilities, that the AI is a self-reflection aid and not therapy or medical advice, coaching arrangements made directly with the coach, limitations of liability, governing law and contact details.]</p>
          </>
        )}
      </div>
    </div>
  );
}

export function NotFound() {
  const { t } = useI18n();
  return (
    <div className="container max-w-xl py-24 text-center">
      <h1 className="text-4xl">{t.notFound.title}</h1>
      <p className="mt-4 text-muted">{t.notFound.body}</p>
      <a href="/" className="mt-8 inline-block font-semibold text-accent-strong underline underline-offset-4">{t.notFound.home}</a>
    </div>
  );
}
