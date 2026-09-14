# Eunio Direct — Direct Sales Engine MVP

One goal: generate **one genuinely qualified direct lead** for Eunio Services for Steel.

Pages: `/` home · `/dashboard` funnel metrics · `/accounts` target companies (+ CSV import + AI prompt builder) · `/pipeline` deals kanban · `/products` catalogue.

Stack: Vite + React + Tailwind · Supabase (Postgres + magic-link login, free tier) · GitHub Pages (free hosting via Actions). Zero running cost.

## Setup (once, ~20 min)

### 1. Supabase
1. Create a project at supabase.com (free tier).
2. SQL Editor → paste `supabase/schema.sql` → Run.
3. Authentication → Providers → Email: keep **Magic Link** on. Optionally turn off "Enable sign ups" after your team has logged in once, so strangers can't create accounts.
4. Authentication → URL Configuration → Site URL = `https://<user>.github.io/eunio-direct/`. Add `http://localhost:5173` to Redirect URLs for local dev.
5. Project Settings → API → copy **Project URL** and **anon public** key.

### 2. GitHub Pages
1. Repo → Settings → Pages → Source: **GitHub Actions**.
2. Repo → Settings → Secrets and variables → Actions → **Variables** tab → add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (the publishable key — public by design).
3. Push to `main` (or Actions → "Deploy to GitHub Pages" → Run). Site: `https://<user>.github.io/eunio-direct/`.
4. Open the site, enter your email, click the magic link. Done.

### Local dev
```bash
cp .env.example .env   # fill in values
npm install
npm run dev
npm test               # metrics self-check
```

## How the team uses it
1. **Accounts** → "Find with AI" builds a prompt → paste into Claude.ai / Gemini → save the CSV it returns → "Import CSV". Or "+ Add account". Imported rows land as *unverified* with next action "Verify".
2. Open an account → add contacts → log calls (auto-moves Target → Contacted).
3. Real requirement? "+ New requirement" → account becomes Qualified, deal opens on **Pipeline**.
4. Move deal through Requirement → RFQ → Quotation → Negotiation → Won/Lost. Every open deal must have a next action + date.
5. **Dashboard** shows the funnel and what's due today.

## Product specs
`products` table is seeded with names + grades Eunio confirmed. Sizes/thicknesses/finishes are empty on purpose — fill them from the real spec sheet on the Products page.
