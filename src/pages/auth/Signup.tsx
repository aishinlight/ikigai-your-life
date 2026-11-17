import { useState, type FormEvent } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { appUrl, safeRedirect } from "@/lib/redirect";
import { useI18n } from "@/i18n";
import { useAuth } from "@/auth/AuthProvider";
import { Button, ErrorNote, Notice } from "@/components/ui";
import { AuthShell, Divider, GoogleButton } from "./shared";

export default function Signup() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [params] = useSearchParams();
  const next = safeRedirect(params.get("next"), "/onboarding");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [sentTo, setSentTo] = useState("");

  if (user) return <Navigate to={next} replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr("");
    if (password.length < 8) return setErr(t.auth.tooShort);
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { full_name: name.trim() },
        emailRedirectTo: appUrl(next),
      },
    });
    setBusy(false);
    if (error) return setErr(error.message);
    // If confirmations are disabled the user is signed in immediately and <Navigate> handles it.
    if (!data.session) setSentTo(email.trim());
  };

  if (sentTo)
    return (
      <AuthShell title={t.auth.checkEmail} sub="">
        <Notice>{t.auth.checkEmailBody(sentTo)}</Notice>
        <p className="mt-6 text-center text-sm"><Link className="font-semibold text-accent-strong underline" to="/login">{t.auth.login}</Link></p>
      </AuthShell>
    );

  return (
    <AuthShell
      title={t.auth.signupTitle}
      sub={t.auth.signupSub}
      footer={<>{t.auth.haveAccount} <Link className="font-semibold text-accent-strong underline" to={`/login?next=${encodeURIComponent(next)}`}>{t.auth.login}</Link></>}
    >
      <GoogleButton next={next} />
      <Divider />
      <form onSubmit={submit} className="space-y-4" noValidate>
        <div>
          <label className="label" htmlFor="name">{t.auth.name}</label>
          <input id="name" autoComplete="name" className="input" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="email">{t.auth.email}</label>
          <input id="email" type="email" autoComplete="email" required className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="password">{t.auth.password}</label>
          <input id="password" type="password" autoComplete="new-password" required minLength={8} aria-describedby="pw-hint" className="input" value={password} onChange={(e) => setPassword(e.target.value)} />
          <p id="pw-hint" className="mt-1 text-xs text-muted">{t.auth.passwordHint}</p>
        </div>
        {err && <ErrorNote>{err}</ErrorNote>}
        <Button type="submit" className="w-full" disabled={busy || !email || !password}>{busy ? t.common.loading : t.auth.signup}</Button>
        <p className="text-center text-xs text-muted">
          {t.auth.agree.split(/(Terms|Privacy Policy|Умовами|Політикою конфіденційності)/).map((p, i) =>
            /Terms|Умовами/.test(p) ? <Link key={i} to="/terms" className="underline">{p}</Link>
            : /Privacy Policy|Політикою/.test(p) ? <Link key={i} to="/privacy" className="underline">{p}</Link>
            : p)}
        </p>
      </form>
    </AuthShell>
  );
}
