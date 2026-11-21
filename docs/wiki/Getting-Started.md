# Getting Started

This guide helps you run Invix locally and understand the basic workflow.

## Prerequisites

- **Node.js** 18+ (LTS recommended)
- **npm** 9+
- Git (for cloning)

## Installation

```bash
git clone https://github.com/CodeNix-technology/INVIX.git
cd INVIX
npm install
npm run dev
```

Open: [http://localhost:5173](http://localhost:5173)

## Local-First Mode

Invix works out of the box in **offline/guest mode**:

- No Supabase setup required
- No account/sign-in required
- Data is stored locally in IndexedDB
- You can create invoices, clients, items, templates, and exports immediately

## Optional Cloud Sync

If you want auth/cloud sync/storage, configure Supabase:

1. Copy `.env.example` to `.env.local`
2. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
3. Run `supabase/schema.sql` in your Supabase SQL Editor
4. Restart the dev server

See [Supabase Setup](./Supabase-Setup.md) for details.

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Build production app to `dist/` |
| `npm run preview` | Preview the production build |

## First Invoice Workflow

1. Open **Builder** (`/builder`).
2. Add business/client details.
3. Add line items, taxes, discounts, notes, terms.
4. Choose a template and customize styling in the Customize panel.
5. Preview live.
6. Export as **PDF/PNG/Print**, or save/share.

## Project Structure (High Level)

```text
src/
  components/   UI, layout, builder, analytics
  pages/        Route pages
  services/     PDF, db, supabase, storage, sync, sharing
  store/        Zustand stores
  templates/    Template registry/layouts/schema
  utils/        Currency, date, calc, validation, words
supabase/       SQL schema and edge functions
public/         PWA assets, icons, manifest
```
