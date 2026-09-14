# Vividium Direct — Direct Sales Engine MVP

One goal: generate **one genuinely qualified direct lead** for Vividium Steel.

Pages: `/` home · `/dashboard` funnel metrics · `/accounts` target companies (+ CSV import + AI discovery) · `/pipeline` deals kanban · `/products` catalogue.

Stack: Vite + React + Tailwind · Supabase (Postgres + magic-link login) · Netlify (hosting + one serverless function that calls Claude for account discovery).

## Setup (once, ~20 min)

### 1. Supabase
1. Create a project at supabase.com (free tier).
2. SQL Editor → paste `supabase/schema.sql` → Run.
3. Authentication → Providers → Email: keep **Magic Link** on. Optionally turn off "Enable sign ups" after your team has logged in once, so strangers can't create accounts.
4. Authentication → URL Configuration → Site URL = your Netlify URL (e.g. `https://vividium-direct.netlify.app`). Add `http://localhost:5173` to Redirect URLs for local dev.
5. Project Settings → API → copy **Project URL** and **anon public** key.

### 2. Anthropic
Get an API key at console.anthropic.com. Used only by the "Find with AI" button.

### 3. Netlify
1. Push this folder to a GitHub repo, import it in Netlify. Build settings are in `netlify.toml`.
2. Site configuration → Environment variables → add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `ANTHROPIC_API_KEY`
3. Deploy. Open the site, enter your email, click the magic link. Done.

### Local dev
```bash
cp .env.example .env   # fill in values
npm install
npx netlify dev        # runs Vite + the discover function together
npm test               # metrics self-check
```

## How the team uses it
1. **Accounts** → "Find with AI" (industry + city) or "Import CSV" or "+ Add account". AI results land as *unverified* with next action "Verify".
2. Open an account → add contacts → log calls (auto-moves Target → Contacted).
3. Real requirement? "+ New requirement" → account becomes Qualified, deal opens on **Pipeline**.
4. Move deal through Requirement → RFQ → Quotation → Negotiation → Won/Lost. Every open deal must have a next action + date.
5. **Dashboard** shows the funnel and what's due today.

## Product specs
`products` table is seeded with names + grades Vividium confirmed. Sizes/thicknesses/finishes are empty on purpose — fill them from the real spec sheet on the Products page.
