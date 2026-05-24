# Agent Guide

## 📦 Tech Stack & Architecture
- **Stack**: Next.js 14 (App Router), Supabase, TypeScript, Tailwind CSS.
- **Database**: Supabase with tables `gyms`, `members`, `payments`.
- **Connectivity**: Local Supabase (port 54321) is accessed via a Next.js reverse proxy at `/supabase-api/` (defined in `next.config.mjs`).
- **Environment**: Use `NEXT_PUBLIC_SUPABASE_URL_CODESPACES` when running in GitHub Codespaces.

## 🛠 Key Commands
- `npm run dev`: Start development server.
- `npx supabase start`: Start local Supabase instance.
- `npm run seed:test`: Seed test users via `scripts/seedTestUser.js`.

## 🧠 Domain Logic & Quirks
- **Timezones**: All dates must be handled using IST (UTC+5:30) via `getISTDate()`.
- **Member Balances**: `members` table includes `advance_balance` for pre-payments.
- **Payment Flow**: Every member action affecting dues (`handleAddMember`, `handleRenew`, `handleClearDue`) must log a corresponding entry in the `payments` table.
- **UI State**: Dashboard navigation is managed via `viewMode` state (`home` | `expiring` | `dues` | `all`).
- **Exports**: CSV exports are implemented client-side as Blobs with an Excel-compatible BOM.

## 🚩 Critical Files
- `app/page.tsx`: Core business logic and UI.
- `lib/supabaseClient.ts`: Dynamic proxy-aware Supabase client.
- `supabase/schema.sql`: Schema and RLS policies.
- `next.config.mjs`: API rewrites for local Supabase.
