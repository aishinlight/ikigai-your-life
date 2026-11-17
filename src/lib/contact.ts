import { SITE, isEmailConfigured, isWhatsAppConfigured } from "@/config/site";
import type { Dict } from "@/i18n/en";

type Templates = Dict["contact"]["templates"];

/** mailto: link with service-specific (or generic) prefilled subject/body. Null when email not configured. */
export function buildMailto(tpl: Templates, service?: string): string | null {
  if (!isEmailConfigured) return null;
  const subject = service ? tpl.subject(service) : tpl.genericSubject;
  const parts = [`subject=${encodeURIComponent(subject)}`];
  if (service) parts.push(`body=${encodeURIComponent(tpl.body(service))}`);
  return `mailto:${SITE.coachEmail}?${parts.join("&")}`;
}

/** https://wa.me/<number>?text=… Null when the WhatsApp number is not configured. */
export function buildWhatsApp(tpl: Templates, service?: string): string | null {
  if (!isWhatsAppConfigured) return null;
  const text = service ? tpl.wa(service) : tpl.genericWa;
  return `https://wa.me/${SITE.whatsappNumber}?text=${encodeURIComponent(text)}`;
}
