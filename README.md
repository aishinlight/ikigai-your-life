# Ikigai Your Life

A bilingual (EN / UA) hybrid self-discovery web app: AI-guided Ikigai reflection based on
Mieko Kamiya's needs for ikigai, plus personal contact with a human coach (Olesia Aishin).

**Stack:** React 18 + Vite + TypeScript + Tailwind · Supabase (Postgres, Auth, Row-Level Security,
Edge Functions) · Claude (Anthropic API) for the AI guide. This is the same stack Lovable generates.

## What's inside

| Area | Where |
|---|---|
| Editable contact config (coach name, email, WhatsApp) | `src/config/site.ts` (+ `VITE_WHATSAPP_NUMBER`) |
| All texts EN / UA | `src/i18n/en.ts`, `src/i18n/uk.ts` |
| Kamiya's 7 needs + 4 AI modules | `src/lib/kamiya.ts` |
| Database schema + RLS | `supabase/migrations/20261117000000_init.sql` |
| AI chat (streaming), reflections, directions, account deletion | `supabase/functions/*` |
| Tests | `tests/backend.mjs`, `tests/e2e.mjs`, `src/**/__tests__` |

Routes — public: `/`, `/human-coaching`, `/login`, `/signup`, `/forgot-password`, `/reset-password`,
`/privacy`, `/terms` (`/book-session` → `/human-coaching`). Private: `/onboarding`, `/dashboard`,
`/profile`, `/coaching`, `/explore/:area`, `/map`, `/action-plan`, `/journal`, `/settings`.

Not built (by design): bookings, scheduling, payments, prices, automated emails, coach inbox,
coach/admin access to conversations or journals, data sharing.

## Owner setup checklist

1. **Supabase project** — create one at supabase.com (free tier is fine), then:
   ```bash
   npx supabase link --project-ref YOUR_REF
   npx supabase db push
   npx supabase functions deploy
   ```
2. **AI key** — create an Anthropic API key (console.anthropic.com) and store it server-side only:
   ```bash
   npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-... ALLOWED_ORIGINS=https://your-site
   ```
3. **Auth settings** (Supabase dashboard → Authentication):
   - Site URL = your published URL; add `https://your-site/**` to Redirect URLs.
   - Keep "Confirm email" ON. Configure custom SMTP for production email volume.
   - **Google login (optional):** enable the Google provider with your Google Cloud OAuth client.
     Until then the app shows "Google sign-in is not configured yet" instead of a fake button.
4. **Frontend env** — copy `.env.example` to `.env.local` (or set them in your host):
   `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_WHATSAPP_NUMBER`, `VITE_SITE_ORIGIN`.
   **WhatsApp stays disabled until a number is set.**
5. **Legal pages** — replace the placeholders in `src/pages/Legal.tsx` with a real Privacy Policy
   and Terms (Supabase + Anthropic are data processors). The placeholders are *not* legal compliance.
6. **Ukrainian copy** — have a native speaker review `src/i18n/uk.ts`.
7. **Deploy** — any static host (Netlify, Vercel, Cloudflare Pages) with SPA fallback to `index.html`.
   Build: `npm run build`, output `dist/`. Do not publish before steps 2–5 are done.

### Coach/admin role (only if ever needed)
Signup always creates a `client` role. Elevated roles are granted manually with a verified UUID:
```sql
insert into public.user_roles (user_id, role) values ('<verified-user-uuid>', 'coach');
```
No policy gives coaches/admins access to other users' conversations or journals.

## Local development
```bash
npm install
npx supabase start            # needs Docker
npx supabase functions serve --env-file supabase/functions/.env
npm run dev                   # http://localhost:8080
```

## Tests
```bash
npm test                                          # unit tests (contact links, redirects, translations)
SUPABASE_ANON_KEY=... node tests/backend.mjs      # auth, RLS, edge functions, export, deletion
node tests/e2e.mjs                                # full UI flow in Chromium (needs Playwright)
```
