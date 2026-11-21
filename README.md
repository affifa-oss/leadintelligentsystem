# LeadIntel — Lead Intelligence System

Understand, score, categorise and prioritise incoming leads. Raw inquiries become actionable sales opportunities with a score, priority, potential value, service fit, reasoning, next action and follow-up suggestions.

**Stack:** React 19 + TypeScript + Vite + Tailwind CSS 4 (frontend) · Node.js + Express + SQLite (`node:sqlite`, built into Node 22) (backend) · JWT login with bcrypt-hashed passwords · Google Gemini (free) or Claude (Anthropic SDK) for AI features · Nodemailer for email.

## Quick start

Requires **Node.js 22.5 or newer**.

```bash
npm run setup     # installs root, backend and frontend packages
npm run dev       # API on :4000 + web app on :5173 (open http://localhost:5173)
```

Production-style (one server, one URL):

```bash
npm start         # builds the frontend, then the API serves the app at http://localhost:4000
```

With Docker:

```bash
docker build -t leadintel .
docker run -p 4000:4000 -v leadintel-data:/data --env-file backend/.env leadintel
```

On first start the database (`backend/data/leadintel.db`) is created with demo data.

| Demo account (password `demo123`) | Role |
|---|---|
| admin@leadintel.dev | Admin / Sales Manager |
| sara@leadintel.dev · ali@leadintel.dev · hina@leadintel.dev | Sales Employee |

Change the demo passwords (Settings → My profile) before real use.

## Deploy online (Vercel + Render, free)

The web app goes on **Vercel**; the API and database run on **Render** (Vercel cannot keep the SQLite file or run the reminder job). `vercel.json` forwards every `/api` request from Vercel to Render, so it works as one site.

1. **Render (API):** render.com → **New → Blueprint** → choose this GitHub repo. `render.yaml` sets everything up; enter your `GEMINI_API_KEY` (and later `APP_URL`) when asked. Wait until `https://leadintel-api.onrender.com/api/health` shows `{"ok":true}`.
2. If Render gave the service a different address, put that address in `vercel.json` (`destination`) and push.
3. **Vercel (web app):** vercel.com → **Add New → Project** → import this repo → keep the settings from `vercel.json` → **Deploy**.
4. On Render, set `APP_URL` to your Vercel address (used in email links).

Free-plan limits: Render sleeps after ~15 minutes without visitors (first visit takes ~1 minute) and has no persistent disk, so data resets to the demo data after each restart. The Render address also works on its own as the full app. Change the demo passwords before sharing the link widely.

## Configuration (`backend/.env`, all optional)

Copy `backend/.env.example` to `backend/.env`.

| Setting | Enables |
|---|---|
| `GEMINI_API_KEY` | **Free** AI-written inquiry summaries and follow-up drafts with Google Gemini (key from [aistudio.google.com](https://aistudio.google.com), no card needed; free-tier rate limits apply). Optional `GEMINI_MODEL` (default `gemini-3.5-flash-lite`). Without any AI key: built-in templates |
| `ANTHROPIC_API_KEY` | Paid alternative: Claude-written summaries and drafts (optional `AI_MODEL`, default `claude-opus-5-5`). If both keys are set Gemini is used unless `AI_PROVIDER=claude` |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | Real email delivery for follow-up reminders and password reset (without it: emails are kept in Settings → Email → Outbox) |
| `APP_URL` | Links inside emails |
| `PAGESPEED_API_KEY` | Reliable Google Lighthouse performance scores (works without a key on a small shared quota) |
| `JWT_SECRET` | Fixed token-signing secret (otherwise generated and stored) |

HubSpot token, webhook URL, lead-capture API key and the service catalogue are managed in the app (Admin).

## Project brief → implementation

| Requirement | Where / how |
|---|---|
| **Inputs**: company info, website, industry, size, location, inquiry, budget, timeline, existing technology, required services | Add/Edit Lead form, **CSV import** (Leads → Import), website form capture. Validated in the browser **and** on the server |
| **Outputs**: score, priority, potential value, service fit, reasoning, next action, follow-up suggestions | Rule-based engine `frontend/src/lib/intelligence.ts`, shared by frontend (live preview) and backend |
| Service recommendation | **Admin-editable service catalogue** (Services page): name, starting price, keywords, industries. Changes re-score all leads |
| Automatic website analysis | `backend/src/websiteAnalyzer.ts`: visits the site (HTTPS, response time, page size, SEO tags, mobile viewport, technology signatures) + **Google Lighthouse** performance via PageSpeed Insights |
| **Company profile & history** | The analyser also reads the About page, footer copyright years, social links and contact email, and the domain's history in the **Internet Archive** (online since, years active). AI (Gemini / Claude) then writes a profile: overview, what they do, products, customers, location, history timeline, website purpose, SEO in plain words and how we can help. Template profile without an AI key |
| Industry classification · buying intent · service fit | `classifyIndustry()`, `detectBuyingIntent()`, `scoreServiceFit()` |
| Duplicate detection | Same email, phone, company domain or company name (`frontend/src/lib/duplicates.ts`) |
| Lead history | Every change is logged on the server and shown per lead and globally |
| **AI inquiry summary & AI follow-up message** (FR-13) | Lead page → *AI inquiry summary* and *Draft message* (email or WhatsApp, opens in the mail app / WhatsApp). Google Gemini (free tier) or Claude `claude-opus-5-5`; template mode without a key or if the AI call fails |
| **Email notifications** | Automatic reminder emails for follow-ups due within the hour (every 5 min) + password-reset emails; outbox in Settings |
| **CRM integration** | Lead-capture API (website forms → leads), signed **webhooks** (Zapier/Make/n8n → Zoho, Salesforce, Sheets…), **HubSpot** push (manual or automatic) |
| Dashboards, reports, follow-up reminders | Dashboard, Analytics & Reports (CSV export), Follow-ups page + bell |
| Roles, login, forgot password | Admin vs Sales Employee enforced **on the server**; self-service password reset by email |

### Scoring (0–100)

Budget 25 · Timeline 15 · Urgency 10 · Company size 15 · Service fit 15 · Buying intent 15 · Data completeness 5.
Priority: **High ≥ 80**, **Medium ≥ 55**, otherwise Low (Admin can change thresholds).

## Tests

```bash
npm test          # 49 tests: scoring, intent, duplicates, validation, CSV, Gemini AI, website profile + API (auth, roles, import, AI, services, capture, security)
npm run check     # typecheck + tests + lint + production build
```

API tests run the real app against a temporary database.

## API overview (`/api`)

| Method | Path | Who |
|---|---|---|
| POST | `/auth/login`, `/auth/forgot`, `/auth/reset` · GET `/auth/me` | public / signed in |
| GET | `/bootstrap` (role-filtered data), `/status` | signed in |
| POST/PUT/DELETE | `/leads`, `/leads/:id` · POST `/leads/import` | create/import: all · edit: owner/admin · delete: admin |
| PATCH | `/leads/:id/status`, `/notes` · `/assign` | owner/admin · admin |
| POST | `/leads/:id/website-analysis`, `/website-analysis` | signed in |
| POST | `/leads/:id/ai-summary`, `/leads/:id/ai-draft`, `/leads/:id/hubspot` | signed in / owner |
| POST/PATCH/DELETE | `/follow-ups…` | owner/admin |
| POST/PUT/DELETE | `/services`, `/services/:id` | admin |
| POST/PUT | `/users…` | admin (self for own profile/password) |
| GET/PUT/POST | `/settings/scoring`, `/settings/email…`, `/settings/crm…`, `/settings/integration…`, `/settings/reminders/run`, `/settings/reset-demo` | admin |
| POST | `/public/leads` (header `x-api-key`) | external forms / systems |

## Security notes

- bcrypt password hashes; signed JWTs (12 h); secrets only from env or the database, never in code; HubSpot token never sent back to the browser.
- Roles checked on the server for every request.
- Website analysis blocks local/private addresses and non-standard ports, re-checks redirects, with timeouts and a size limit.
- Lead-capture API: API key (constant-time compare) + rate limit. Forgot-password: rate limit, single-use hashed tokens (30 min), same answer for unknown emails.
- Webhooks are signed (`x-leadintel-signature: sha256=…`). AI prompts treat client text as data.

## Known limits

- The service catalogue ships with sample services. **Replace them with your company's real services and prices** on the Services page.
- Zoho and Salesforce are reached through the webhook (e.g. Zapier); only HubSpot has a built-in connector. CRM sync is one-way (LeadIntel → CRM).
- JavaScript-only websites return little HTML, so the analyser flags results as limited.
- Hosting online (Render, Railway, a VPS…) needs your own account. Use the Dockerfile.

## Structure

```
backend/
  src/app.ts, server.ts   Express app (also serves frontend/dist) and startup
  src/db.ts               SQLite tables (users, leads, follow-ups, history, services, outbox, settings)
  src/auth.ts             JWT + role rules
  src/routes/api.ts       app API · src/routes/capture.ts public lead-capture API
  src/ai.ts               Gemini / Claude summaries and drafts with template fallback
  src/mailer.ts, reminders.ts   email + reminder job
  src/integrations.ts     webhooks + HubSpot
  src/websiteAnalyzer.ts  real website analysis + PageSpeed
  test/                   automated tests
frontend/
  src/lib/                intelligence engine, validation, duplicates, CSV, API client
  src/store/              DataProvider (calls the API)
  src/pages/              one file per screen
  src/components/         layout, UI kit, lead widgets, settings panels
```
