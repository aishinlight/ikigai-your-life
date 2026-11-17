/**
 * Only allow same-origin, path-only redirects (e.g. "/map?x=1").
 * Rejects absolute URLs, protocol-relative ("//evil.com"), backslash tricks and auth pages.
 */
export function safeRedirect(target: string | null | undefined, fallback = "/dashboard"): string {
  if (!target || typeof target !== "string") return fallback;
  if (!target.startsWith("/") || target.startsWith("//") || target.includes("\\")) return fallback;
  if (/[\u0000-\u001f]/.test(target)) return fallback;
  try {
    const u = new URL(target, "http://same.origin");
    if (u.origin !== "http://same.origin") return fallback;
    if (["/login", "/signup", "/forgot-password", "/reset-password"].includes(u.pathname)) return fallback;
    return u.pathname + u.search + u.hash;
  } catch {
    return fallback;
  }
}
