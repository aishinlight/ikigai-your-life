import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useI18n } from "@/i18n";
import { callFunction } from "@/lib/api";
import { collectExport, downloadJson } from "@/lib/exportData";
import { supabase } from "@/lib/supabase";
import { Button, ErrorNote, Notice, PageHeader } from "@/components/ui";

export default function Settings() {
  const { t } = useI18n();
  const nav = useNavigate();
  const [exp, setExp] = useState<{ busy: boolean; ok: boolean; err: string }>({ busy: false, ok: false, err: "" });
  const [typed, setTyped] = useState("");
  const [del, setDel] = useState<{ busy: boolean; err: string }>({ busy: false, err: "" });

  const doExport = async () => {
    setExp({ busy: true, ok: false, err: "" });
    try {
      const data = await collectExport();
      downloadJson(data, `ikigai-your-life-export-${new Date().toISOString().slice(0, 10)}.json`);
      setExp({ busy: false, ok: true, err: "" });
    } catch (e) {
      setExp({ busy: false, ok: false, err: e instanceof Error ? e.message : String(e) });
    }
  };

  const doDelete = async () => {
    if (typed !== "DELETE") return;
    setDel({ busy: true, err: "" });
    try {
      await callFunction<{ deleted: boolean }>("delete-account", { confirm: "DELETE" });
      // The user no longer exists server-side; just clear the local session.
      await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
      nav("/?deleted=1", { replace: true });
    } catch (e) {
      setDel({ busy: false, err: e instanceof Error ? e.message : String(e) });
    }
  };

  return (
    <div className="container max-w-2xl py-12 md:py-16">
      <PageHeader title={t.settings.title} />
      <div className="space-y-6">
        <section className="card p-7" aria-labelledby="exp">
          <h2 id="exp" className="text-xl">{t.settings.exportTitle}</h2>
          <p className="mt-2 text-sm text-muted">{t.settings.exportBody}</p>
          <Button className="mt-5" variant="secondary" onClick={doExport} disabled={exp.busy}>{exp.busy ? t.common.loading : t.settings.exportBtn}</Button>
          {exp.ok && <div className="mt-4"><Notice>{t.settings.exportDone}</Notice></div>}
          {exp.err && <div className="mt-4"><ErrorNote>{t.settings.exportFailed} {exp.err}</ErrorNote></div>}
        </section>

        <section className="card p-7" aria-labelledby="share">
          <h2 id="share" className="text-xl">{t.settings.sharingTitle}</h2>
          <p className="mt-2 text-sm text-foreground/80">{t.settings.sharingBody}</p>
        </section>

        <section className="card p-7" aria-labelledby="legal">
          <h2 id="legal" className="text-xl">{t.settings.legal}</h2>
          <p className="mt-2 flex gap-4 text-sm">
            <Link to="/privacy" className="underline">{t.footer.privacy}</Link>
            <Link to="/terms" className="underline">{t.footer.terms}</Link>
          </p>
        </section>

        <section className="rounded-card border border-danger/30 bg-danger/5 p-7" aria-labelledby="del">
          <h2 id="del" className="text-xl text-danger">{t.settings.deleteTitle}</h2>
          <p className="mt-2 text-sm text-foreground/80">{t.settings.deleteBody}</p>
          <label htmlFor="del-confirm" className="label mt-5">{t.settings.deleteType}</label>
          <input id="del-confirm" className="input" autoComplete="off" value={typed} onChange={(e) => setTyped(e.target.value)} />
          <Button className="mt-4" variant="danger" onClick={doDelete} disabled={typed !== "DELETE" || del.busy}>{del.busy ? t.settings.deleting : t.settings.deleteBtn}</Button>
          {del.err && <div className="mt-4"><ErrorNote>{t.settings.deleteFailed} {del.err}</ErrorNote></div>}
        </section>
      </div>
    </div>
  );
}
