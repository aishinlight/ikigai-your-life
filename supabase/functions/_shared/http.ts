// Shared HTTP helpers for edge functions.
// Auth is via `Authorization: Bearer <user JWT>` (no cookies), so classic CSRF does not apply.
// CORS is restricted to ALLOWED_ORIGINS (comma-separated) when set.

const allowed = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

export function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  const allowOrigin = allowed.length === 0 ? "*" : allowed.includes(origin) ? origin : allowed[0];
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Expose-Headers": "x-conversation-id",
    Vary: "Origin",
  };
}

export function originAllowed(req: Request): boolean {
  if (allowed.length === 0) return true;
  const origin = req.headers.get("origin");
  return !origin || allowed.includes(origin);
}

export function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), "Content-Type": "application/json" },
  });
}

export function preflight(req: Request): Response | null {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });
  if (req.method !== "POST") return json(req, { error: "Method not allowed" }, 405);
  if (!originAllowed(req)) return json(req, { error: "Origin not allowed" }, 403);
  return null;
}
