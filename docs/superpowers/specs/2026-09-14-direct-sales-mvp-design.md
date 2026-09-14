# Eunio Direct Sales Engine — MVP design

Date: 2026-09-14. Approved verbally ("build one then we'll see").

## Goal
Prove Eunio can generate one qualified direct lead. Not a SaaS.

## Decisions
- Users: small trusted team (2–5), shared data. Supabase magic-link login; RLS = any authenticated user has full access.
- Lead source: manual + CSV + AI prompt builder (user pastes prompt into Claude.ai/Gemini, imports returned CSV). Zero API cost. All imported rows flagged `verified=false`. (2026-09-14: replaced Claude API function — no API budget.)
- Pages: Home, Dashboard, Accounts, Pipeline, Products. RFQ/quote details are fields on the opportunity, not separate pages.
- Stack: Vite + React + Tailwind v4, Supabase free tier, GitHub Pages (public repo). No custom domain yet.

## Data model
See `supabase/schema.sql`. Funnel = `accounts.status` (target→contacted→qualified) + `opportunities.stage` (requirement→rfq→quotation→negotiation→won/lost→repeat). Dashboard metrics derived from those two columns (`src/lib/metrics.ts`, tested).

## Rules enforced in UI
- Open deal must have next action + date.
- Lost deal must have a reason.
- Logging a call/email/visit auto-advances Target → Contacted and stamps `last_activity`.
- Creating a requirement marks the account Qualified.

## Deferred (add when needed)
- Per-user ownership / roles.
- Email/WhatsApp sending.
- Quotation PDF generation.
- Repeat-order reminders beyond a next-action date.
- Server-side AI discovery (Claude API + web search) when there is API budget — old implementation in git history.
