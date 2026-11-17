import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { supabase, isBackendConfigured } from "@/lib/supabase";
import { appUrl } from "@/lib/redirect";
import { useI18n } from "@/i18n";
import { BlurShapes } from "@/components/HeroArt";
import { Button, ErrorNote, Notice } from "@/components/ui";

export function AuthShell({ title, sub, children, footer }: { title: string; sub: string; children: ReactNode; footer?: ReactNode }) {
  const { t } = useI18n();
  return (
    <section className="relative overflow-hidden">
      <BlurShapes />
      <div className="container flex justify-center py-16 md:py-24">
        <div className="card w-full max-w-md p-8 md:p-10">
          <h1 className="text-3xl">{title}</h1>
          <p className="mt-2 text-muted">{sub}</p>
          {!isBackendConfigured && <div className="mt-6"><ErrorNote>{t.auth.backendMissing}</ErrorNote></div>}
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-8 text-center text-sm text-muted">{footer}</div>}
        </div>
      </div>
    </section>
  );
}

/** Reads the auth server's public settings to know whether Google is actually enabled. */
function useGoogleEnabled() {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  useEffect(() => {
    if (!isBackendConfigured) return setEnabled(false);
    const url = import.meta.env.VITE_SUPABASE_URL as string;
    fetch(`${url}/auth/v1/settings`, { headers: { apikey: import.meta.env.VITE_SUPABASE_ANON_KEY as string } })
      .then((r) => (r.ok ? r.json() : null))
      .then((s) => setEnabled(Boolean(s?.external?.google)))
      .catch(() => setEnabled(false));
  }, []);
  return enabled;
}

export function GoogleButton({ next }: { next: string }) {
  const { t } = useI18n();
  const enabled = useGoogleEnabled();
  const [err, setErr] = useState("");
  if (enabled === null) return null;
  if (!enabled) return <p className="text-center text-xs text-muted">{t.auth.googleUnavailable}</p>;
  const go = async () => {
    setErr("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: appUrl(next) },
    });
    if (error) setErr(error.message);
  };
  return (
    <>
      <Button variant="secondary" className="w-full" onClick={go}>
        <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden><path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.7z"/><path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24z"/><path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8l4-3.1z"/><path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.8 3.6-4.9 6.7-4.9z"/></svg>
        {t.auth.google}
      </Button>
      {err && <div className="mt-3"><ErrorNote>{err}</ErrorNote></div>}
    </>
  );
}

export function Divider() {
  const { t } = useI18n();
  return (
    <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-widest text-muted">
      <span className="h-px flex-1 bg-line" /> {t.auth.or} <span className="h-px flex-1 bg-line" />
    </div>
  );
}

export { Notice, Link };
