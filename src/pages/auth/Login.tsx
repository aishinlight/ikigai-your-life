import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { safeRedirect } from "@/lib/redirect";
import { useI18n } from "@/i18n";
import { useAuth } from "@/auth/AuthProvider";
import { Button, ErrorNote } from "@/components/ui";
import { AuthShell, Divider, GoogleButton } from "./shared";

export default function Login() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [params] = useSearchParams();
  const next = safeRedirect(params.get("next"));
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  if (user) return <Navigate to={next} replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) return setErr(error.message);
    nav(next, { replace: true });
  };

  return (
    <AuthShell
      title={t.auth.loginTitle}
      sub={t.auth.loginSub}
      footer={<>{t.auth.noAccount} <Link className="font-semibold text-accent-strong underline" to={`/signup?next=${encodeURIComponent(next)}`}>{t.auth.signup}</Link></>}
    >
      <GoogleButton next={next} />
      <Divider />
      <form onSubmit={submit} className="space-y-4" noValidate>
        <div>
          <label className="label" htmlFor="email">{t.auth.email}</label>
          <input id="email" type="email" autoComplete="email" required className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="password">{t.auth.password}</label>
          <input id="password" type="password" autoComplete="current-password" required className="input" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {err && <ErrorNote>{err}</ErrorNote>}
        <Button type="submit" className="w-full" disabled={busy || !email || !password}>{busy ? t.common.loading : t.auth.login}</Button>
        <p className="text-center text-sm"><Link to="/forgot-password" className="text-accent-strong underline underline-offset-4">{t.auth.forgot}</Link></p>
      </form>
    </AuthShell>
  );
}
