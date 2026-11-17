import { describe, expect, it, vi } from "vitest";

describe("contact links", () => {
  it("builds the exact service email with encoded subject and body", async () => {
    vi.resetModules();
    const { buildMailto } = await import("../contact");
    const { default: en } = await import("../../i18n/en");
    const href = buildMailto(en.contact.templates, "Personal Ikigai Session")!;
    expect(href.startsWith("mailto:aishin.light@gmail.com?")).toBe(true);
    const q = new URLSearchParams(href.split("?")[1]);
    expect(q.get("subject")).toBe("Coaching Session Request – Personal Ikigai Session");
    expect(q.get("body")).toBe(
      "Hello,\n\nI would like to request a coaching session: Personal Ikigai Session.\n\nPlease let me know how we can proceed.\n\nThank you!",
    );
    expect(href).toContain("%0A"); // newlines encoded via encodeURIComponent
  });

  it("uses the generic subject when no service is given", async () => {
    const { buildMailto } = await import("../contact");
    const { default: en } = await import("../../i18n/en");
    const q = new URLSearchParams(buildMailto(en.contact.templates)!.split("?")[1]);
    expect(q.get("subject")).toBe("Ikigai Coaching Inquiry");
  });

  it("disables WhatsApp until a valid number is configured", async () => {
    vi.resetModules();
    vi.stubEnv("VITE_WHATSAPP_NUMBER", "");
    const { buildWhatsApp } = await import("../contact");
    const { default: en } = await import("../../i18n/en");
    expect(buildWhatsApp(en.contact.templates, "X")).toBeNull();
    vi.unstubAllEnvs();
  });

  it("builds the wa.me link with the exact service text", async () => {
    vi.resetModules();
    vi.stubEnv("VITE_WHATSAPP_NUMBER", "380501234567");
    const { buildWhatsApp } = await import("../contact");
    const { default: en } = await import("../../i18n/en");
    const href = buildWhatsApp(en.contact.templates, "Human Design Session")!;
    expect(href.startsWith("https://wa.me/380501234567?text=")).toBe(true);
    expect(decodeURIComponent(href.split("text=")[1])).toBe(
      "Hello! I would like to request a coaching session: Human Design Session.\n\nCould you please share more information?",
    );
    vi.unstubAllEnvs();
  });

  it("rejects malformed WhatsApp numbers", async () => {
    vi.resetModules();
    vi.stubEnv("VITE_WHATSAPP_NUMBER", "+380 50 123");
    const { buildWhatsApp } = await import("../contact");
    const { default: en } = await import("../../i18n/en");
    expect(buildWhatsApp(en.contact.templates, "X")).toBeNull();
    vi.unstubAllEnvs();
  });
});
