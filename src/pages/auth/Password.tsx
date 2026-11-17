import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useI18n } from "@/i18n";
import { useAuth } from "@/auth/AuthProvider";
import { Button, ErrorNote, Notice, PageSkeleton } from "@/components/ui";
import { AuthShell } from "./shared";

export function ForgotPassword() {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [sent, setSent] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (error) return setErr(error.message);
    setSent(true);
  };
  return (
    <AuthShell title={t.auth.forgotTitle} sub={t.auth.forgotSub} footer={<Link to="/login" className="underline">{t.auth.login}</Link>}>
      {sent ? (
        <Notice>{t.auth.linkSent}</Notice>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label" htmlFor="email">{t.auth.email}</label>
            <input id="email" type="email" autoComplete="email" required className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          {err && <ErrorNote>{err}</ErrorNote>}
          <Button type="submit" className="w-full" disabled={busy || !email}>{busy ? t.common.loading : t.auth.sendLink}</Button>
        </form>
      )}
    </AuthShell>
  );
}

export function ResetPassword() {
  const { t } = useI18n();
  const { session, loading } = useAuth();
  const nav = useNavigate();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);
  const [waited, setWaited] = useState(false);
  // give the PKCE code exchange a moment before declaring the link invalid
  useEffect(() => { const id = setTimeout(() => setWaited(true), 1500); return () => clearTimeout(id); }, []);

  if (loading || (!session && !waited)) return <PageSkeleton />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr("");
    if (pw.length < 8) return setErr(t.auth.tooShort);
    if (pw !== pw2) return setErr(t.auth.mismatch);
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) return setErr(error.message);
    setDone(true);
    setTimeout(() => nav("/dashboard", { replace: true }), 1200);
  };

  return (
    <AuthShell title={t.auth.resetTitle} sub={t.auth.resetSub}>
      {!session ? (
        <>
          <ErrorNote>{t.auth.resetInvalid}</ErrorNote>
          <p className="mt-6 text-center text-sm"><Link to="/forgot-password" className="underline">{t.auth.forgotTitle}</Link></p>
        </>
      ) : done ? (
        <Notice>{t.auth.passwordUpdated}</Notice>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label" htmlFor="pw">{t.auth.password}</label>
            <input id="pw" type="password" autoComplete="new-password" className="input" value={pw} onChange={(e) => setPw(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="pw2">{t.auth.confirmPassword}</label>
            <input id="pw2" type="password" autoComplete="new-password" className="input" value={pw2} onChange={(e) => setPw2(e.target.value)} />
          </div>
          {err && <ErrorNote>{err}</ErrorNote>}
          <Button type="submit" className="w-full" disabled={busy}>{busy ? t.common.saving : t.auth.updatePassword}</Button>
        </form>
      )}
    </AuthShell>
  );
}
