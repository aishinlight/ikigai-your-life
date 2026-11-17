import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { Mail, MessageCircle } from "lucide-react";
import { Dialog, ExtButton } from "./ui";
import { useI18n } from "@/i18n";
import { buildMailto, buildWhatsApp } from "@/lib/contact";
import { coachDisplayName } from "@/config/site";

type Ctx = { openContact: (service?: string) => void };
const ContactCtx = createContext<Ctx | null>(null);

export function ContactProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ open: boolean; service?: string }>({ open: false });
  const openContact = useCallback((service?: string) => setState({ open: true, service }), []);
  const close = useCallback(() => setState((s) => ({ ...s, open: false })), []);
  return (
    <ContactCtx.Provider value={{ openContact }}>
      {children}
      <ContactDialog open={state.open} service={state.service} onClose={close} />
    </ContactCtx.Provider>
  );
}

export function useContact() {
  const ctx = useContext(ContactCtx);
  if (!ctx) throw new Error("useContact must be used inside ContactProvider");
  return ctx;
}

/** "Contact Your Coach" dialog. No login, no booking record — just prefilled links. */
export function ContactDialog({ open, service, onClose }: { open: boolean; service?: string; onClose: () => void }) {
  const { t } = useI18n();
  const mail = buildMailto(t.contact.templates, service);
  const wa = buildWhatsApp(t.contact.templates, service);
  return (
    <Dialog open={open} onClose={onClose} title={t.contact.title} closeLabel={t.nav.close}>
      <p className="mb-1 text-sm text-muted">{coachDisplayName}</p>
      {service && (
        <p className="mb-4 inline-block rounded-full bg-lavender px-3 py-1 text-sm">
          {t.contact.service}: <strong className="font-semibold">{service}</strong>
        </p>
      )}
      <p className="mb-6 text-foreground/85">{t.contact.explain}</p>
      <div className="flex flex-col gap-3">
        {mail ? (
          <ExtButton href={mail} data-testid="contact-email">
            <Mail className="h-4 w-4" aria-hidden /> {t.contact.email}
          </ExtButton>
        ) : (
          <DisabledAction label={t.contact.email} reason={t.contact.disabled} />
        )}
        {wa ? (
          <ExtButton href={wa} target="_blank" rel="noopener noreferrer" variant="secondary" data-testid="contact-whatsapp">
            <MessageCircle className="h-4 w-4" aria-hidden /> {t.contact.whatsapp}
          </ExtButton>
        ) : (
          <DisabledAction label={t.contact.whatsapp} reason={t.contact.disabled} />
        )}
      </div>
      <p className="mt-5 text-xs text-muted">{t.contact.notice}</p>
    </Dialog>
  );
}

function DisabledAction({ label, reason }: { label: string; reason: string }) {
  return (
    <div>
      <button disabled aria-disabled="true" className="inline-flex min-h-[44px] w-full cursor-not-allowed items-center justify-center rounded-full border border-dashed border-line px-6 py-3 text-sm font-semibold text-muted">
        {label}
      </button>
      <p className="mt-1 text-center text-xs text-muted">{reason}</p>
    </div>
  );
}
