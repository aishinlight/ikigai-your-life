import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { useI18n, type Locale } from "@/i18n";
import { useAuth } from "@/auth/AuthProvider";
import { useContact } from "./Contact";
import { btn } from "./ui";
import { SITE, coachDisplayName, isEmailConfigured } from "@/config/site";

function LangSwitch() {
  const { locale, setLocale, t } = useI18n();
  const opts: { v: Locale; l: string }[] = [
    { v: "en", l: "EN" },
    { v: "uk", l: "UA" },
  ];
  return (
    <div role="group" aria-label={t.nav.language} className="inline-flex rounded-full border border-line bg-white/60 p-0.5 text-xs font-semibold">
      {opts.map((o) => (
        <button
          key={o.v}
          onClick={() => setLocale(o.v)}
          aria-pressed={locale === o.v}
          lang={o.v}
          className={`rounded-full px-3 py-1.5 ${locale === o.v ? "bg-foreground text-background" : "text-muted hover:text-foreground"}`}
        >
          {o.l}
        </button>
      ))}
    </div>
  );
}

export function Header() {
  const { t } = useI18n();
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  const nav = useNavigate();
  useEffect(() => { setOpen(false); }, [loc.pathname]);

  const publicLinks = [
    { to: "/", l: t.nav.home },
    { to: "/human-coaching", l: t.nav.humanCoaching },
  ];
  const appLinks = [
    { to: "/dashboard", l: t.nav.dashboard },
    { to: "/coaching", l: t.nav.coaching },
    { to: "/map", l: t.nav.map },
    { to: "/action-plan", l: t.nav.plan },
    { to: "/journal", l: t.nav.journal },
  ];
  const links = user ? appLinks : publicLinks;
  const linkCls = ({ isActive }: { isActive: boolean }) =>
    `rounded-full px-3 py-2 text-sm ${isActive ? "bg-blush/80 text-foreground" : "text-foreground/75 hover:text-foreground"}`;

  const doLogout = async () => {
    await signOut();
    nav("/");
  };

  return (
    <header className="no-print sticky top-0 z-40 border-b border-line/50 bg-background/75 backdrop-blur-md">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:rounded-full focus:bg-foreground focus:px-4 focus:py-2 focus:text-background">
        {t.nav.skip}
      </a>
      <div className="container flex h-16 items-center justify-between gap-4">
        <Link to={user ? "/dashboard" : "/"} className="font-serif text-lg tracking-tight">
          {SITE.name}
        </Link>
        <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.to === "/"} className={linkCls}>
              {l.l}
            </NavLink>
          ))}
          {user && (
            <NavLink to="/human-coaching" className={linkCls}>
              {t.nav.humanCoaching}
            </NavLink>
          )}
        </nav>
        <div className="hidden items-center gap-3 lg:flex">
          <LangSwitch />
          {user ? (
            <>
              <NavLink to="/profile" className={linkCls}>{t.nav.profile}</NavLink>
              <NavLink to="/settings" className={linkCls}>{t.nav.settings}</NavLink>
              <button onClick={doLogout} className={btn("secondary", "px-4 py-2 min-h-0")}>{t.nav.logout}</button>
            </>
          ) : (
            <>
              <Link to="/login" className="px-3 py-2 text-sm text-foreground/80 hover:text-foreground">{t.nav.login}</Link>
              <Link to="/signup" className={btn("primary", "px-5 py-2 min-h-0")}>{t.nav.begin}</Link>
            </>
          )}
        </div>
        <div className="flex items-center gap-2 lg:hidden">
          <LangSwitch />
          <button
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? t.nav.close : t.nav.menu}
            className="rounded-full p-2.5 hover:bg-blush/60"
          >
            {open ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
          </button>
        </div>
      </div>
      {open && (
        <nav id="mobile-nav" aria-label="Mobile" className="border-t border-line/50 bg-background lg:hidden">
          <div className="container flex flex-col gap-1 py-4">
            {[...links, ...(user ? [{ to: "/human-coaching", l: t.nav.humanCoaching }, { to: "/profile", l: t.nav.profile }, { to: "/settings", l: t.nav.settings }] : [{ to: "/login", l: t.nav.login }])].map((l) => (
              <NavLink key={l.to} to={l.to} end={l.to === "/"} className={linkCls}>
                {l.l}
              </NavLink>
            ))}
            {user ? (
              <button onClick={doLogout} className={btn("secondary", "mt-3")}>{t.nav.logout}</button>
            ) : (
              <Link to="/signup" className={btn("primary", "mt-3")}>{t.nav.begin}</Link>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}

export function Footer() {
  const { t } = useI18n();
  const { openContact } = useContact();
  return (
    <footer className="no-print mt-auto border-t border-line/60 bg-white/40">
      <div className="container grid gap-10 py-14 md:grid-cols-3">
        <div>
          <p className="font-serif text-xl">{SITE.name}</p>
          <p className="mt-2 text-sm text-muted">{t.footer.tagline}</p>
        </div>
        <div>
          <p className="mb-3 text-sm font-semibold">{t.footer.contact}</p>
          <p className="text-sm text-muted">{coachDisplayName}</p>
          {isEmailConfigured && <p className="text-sm text-muted">{SITE.coachEmail}</p>}
          <button onClick={() => openContact()} className="mt-3 text-sm font-semibold text-accent-strong underline underline-offset-4">
            {t.finalCta.contact}
          </button>
        </div>
        <div className="flex flex-col gap-2 text-sm">
          <Link to="/human-coaching" className="text-foreground/80 hover:text-foreground">{t.nav.humanCoaching}</Link>
          <Link to="/privacy" className="text-foreground/80 hover:text-foreground">{t.footer.privacy}</Link>
          <Link to="/terms" className="text-foreground/80 hover:text-foreground">{t.footer.terms}</Link>
        </div>
      </div>
      <div className="container border-t border-line/50 py-6 text-xs text-muted">
        <p className="mb-2">{t.footer.disclaimer}</p>
        <p>© {new Date().getFullYear()} {SITE.name}. {t.footer.rights}</p>
      </div>
    </footer>
  );
}

export function Layout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main id="main" className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
