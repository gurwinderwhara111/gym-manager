# gym-manager

A Supabase-first Next.js app designed for local Indian gyms.

## Setup

1. Install dependencies

```bash
npm install
```

2. Start local Supabase

```bash
npx supabase start
```

3. Copy environment variables

```bash
cp .env.example .env.local
```

4. Start the app

```bash
npm run dev
```

## How it works

- `app/` contains the Next.js app router.
- `lib/supabaseClient.ts` exports the Supabase JS client.
- `supabase/schema.sql` defines the tables and RLS policies.
- `.env.local` configures the local Supabase endpoint and key.

## Local Supabase

This project uses local Supabase development so you can test RLS and auth immediately. It is the correct path for a paid multi-tenant product.

> If you are using GitHub Codespaces, the app runs in a remote browser context. Set `NEXT_PUBLIC_SUPABASE_URL_CODESPACES` to your forwarded Supabase port URL and keep `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321` for local dev.
>
> Example:
> - `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321`
> - `NEXT_PUBLIC_SUPABASE_URL_CODESPACES=https://<your-codespace>-54321.app.github.dev`
>
## Migration to production

When you deploy, update `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to your Supabase project values.

## What is implemented

- Supabase auth login flow
- Admin gym creation
- Member list with expiring / pending dues filtering
- 1-click WhatsApp message generation
- 1-click renew button
- 15-day trial lockout logic
- Supabase row-level security schema
