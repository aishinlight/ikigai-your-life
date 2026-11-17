/**
 * Central, editable site configuration.
 * Every contact action (hero, contact dialog, footer, print reports, service dialogs)
 * reads from here. Leave a value empty ("") to keep that contact action disabled.
 *
 * WHATSAPP_NUMBER: country code + digits only, no "+", spaces or punctuation (e.g. "380501234567").
 */
export const SITE = {
  name: "Ikigai Your Life",
  coachName: "Olesia Aishin",
  coachEmail: "aishin.light@gmail.com",
  whatsappNumber: (import.meta.env.VITE_WHATSAPP_NUMBER as string | undefined) ?? "",
  origin: (import.meta.env.VITE_SITE_ORIGIN as string | undefined) ?? "",
} as const;

export const coachDisplayName = SITE.coachName.trim() || "Your Coach";

/** Valid WhatsApp number = 7–15 digits only. */
export const isWhatsAppConfigured = /^\d{7,15}$/.test(SITE.whatsappNumber);
export const isEmailConfigured = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(SITE.coachEmail);
