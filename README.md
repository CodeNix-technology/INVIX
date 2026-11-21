# Invix — Smart Invoices, Made Simple

<p align="center">
  <img src="public/invix.png" alt="Invix logo" width="96" />
</p>

<p align="center">
  A production-quality, open-source invoice generator for freelancers, agencies, and small businesses.
</p>

<p align="center">
  <a href="./LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-blue.svg" /></a>
  <img alt="React 18" src="https://img.shields.io/badge/React-18-61dafb?logo=react&logoColor=white" />
  <img alt="Vite 5" src="https://img.shields.io/badge/Vite-5-646cff?logo=vite&logoColor=white" />
  <img alt="Tailwind CSS 3" src="https://img.shields.io/badge/Tailwind_CSS-3-06b6d4?logo=tailwindcss&logoColor=white" />
  <img alt="PWA Ready" src="https://img.shields.io/badge/PWA-ready-5a0fc8" />
</p>

<p align="center">
  <a href="#-features">Features</a> •
  <a href="#-demo--screenshots">Demo</a> •
  <a href="#-quick-start">Quick Start</a> •
  <a href="#%EF%B8%8F-configuration">Configuration</a> •
  <a href="#-deployment">Deployment</a> •
  <a href="#-contributing">Contributing</a> •
  <a href="#-credits">Credits</a> •
  <a href="#-license">License</a>
</p>

---

## Overview

**Invix** is a modern, local-first invoice studio built with React + Vite. It helps you create polished invoices quickly with 15 professional templates, a full customization studio, GST/UPI support, PDF/PNG/print export, and optional Supabase cloud sync. It works offline by default — no account required.

## ✨ Features

### Invoice Builder
- **Three-pane studio**: form, live preview, and customization panel.
- **Line items**: drag-to-reorder, HSN/SAC, per-line discount/tax, units, extra charges, round-off.
- **Billing details**: multi-currency formatting, amount in words (Indian + international), notes/terms, PO number, payment terms.
- **Payments**: bank details, auto-generated UPI QR, partial payments, digital signature (draw/upload/type), company stamp.
- **Workflow**: autosave, undo/redo, duplicate, quotation → invoice conversion, recurring invoices.

### Templates & Customization
- **15 built-in templates**: Classic, Modern, Minimal, Corporate, Creative, Elegant, Bold, Gradient, Dark, Compact, Thermal receipt, Freelancer, Agency, GST Tax Invoice, Proforma/Quotation.
- **Customization Studio**: colors/presets, Google fonts, logo size/position, section visibility/order, column manager, paper size/orientation/margins, watermarks, custom labels, table styles, borders/radius.
- **My Templates**: save designs, duplicate/rename/delete, export/import as JSON.

### Export & Sharing
- **Export**: PDF (paginated), PNG, print.
- **Share**: public share links, WhatsApp/email handoff.
- **Data export**: CSV/Excel/JSON.

### Dashboard, Analytics & Reports
- **KPIs**: invoiced, collected, pending, overdue, invoice count, average invoice value, collection rate.
- **Insights**: monthly revenue trend, sales by client, product/service performance, GST (CGST/SGST/IGST) summary, receivables aging, cashflow forecast.
- **Operations**: expense tracker, goals, notification center, overdue reminders with mailto/WhatsApp templates.
- **Filters**: period (month/quarter/year/custom), business filter, compare with previous period.
- **Exports**: chart PNG and CSV/Excel-compatible data exports respecting active filters.

### Platform & UX
- **Local-first / offline**: IndexedDB guest mode, no login required.
- **Cloud sync (optional)**: Supabase auth, Postgres sync, storage, RLS, offline queue.
- **PWA**: installable, offline support.
- **UI/UX**: dark/light mode, responsive layout, command palette, keyboard shortcuts.
- **i18n**: English, Tamil, Hindi.
- **Multi-business**: manage multiple business profiles.

## 📸 Demo / Screenshots

> Add screenshots or a demo GIF here before publishing.

| Landing | Invoice Builder | Dashboard |
|---|---|---|
| _Add screenshot_ | _Add screenshot_ | _Add screenshot_ |

<!-- Example:
![Landing](docs/screenshots/landing.png)
![Builder](docs/screenshots/builder.png)
![Dashboard](docs/screenshots/dashboard.png)
-->

## 🧰 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, React Router 6 |
| Build Tool | Vite 5 |
| Styling | Tailwind CSS 3 |
| State | Zustand |
| Charts | Recharts |
| PDF/PNG | html2canvas, jsPDF |
| QR | qrcode |
| Backend (optional) | Supabase (Auth, Postgres, Storage, Edge Functions) |
| Storage | IndexedDB (local-first), Supabase Storage / pluggable providers |

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ (recommended: latest LTS)
- **npm** 9+ (or compatible package manager)

### Install & Run

```bash
# 1. Clone the repository
git clone https://github.com/CodeNix-technology/INVIX.git
cd INVIX

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

> Invix works immediately in **offline/guest mode** (IndexedDB). No Supabase configuration is required for local use.

## ⚙️ Configuration

### Environment Variables

Create `.env.local` from `.env.example`:

```bash
cp .env.example .env.local
```

| Variable | Required | Description |
|---|---:|---|
| `VITE_SUPABASE_URL` | Optional | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Optional | Supabase anon/public key |

Example:

```env
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR-ANON-KEY
```

> If these are not set, the app stays in local/offline mode gracefully.

### Supabase Setup (Optional)

1. Create a project at [supabase.com](https://supabase.com).
2. In **SQL Editor**, run [`supabase/schema.sql`](supabase/schema.sql). This creates:
   - Tables: `profiles`, `businesses`, `clients`, `items`, `invoices`, `invoice_items`, `payments`, `templates`, `shared_invoices`, `expenses`, `goals`, `dashboard_layouts`
   - Row Level Security (RLS) policies
   - `invix-files` storage bucket with per-user policies
   - Profile auto-create trigger on signup
   - Analytics views/RPC/materialized views and refresh helpers
3. Enable **Google OAuth** (optional): Authentication → Providers → Google. Add redirect URLs for local/dev/prod.
4. Add env vars to `.env.local` and restart dev server.
5. Sign in and use **Sync now** in the app.

#### Analytics Refresh (Optional)

```sql
select public.refresh_analytics();
```

For scheduled refresh/reporting, see the detailed notes in [`supabase/schema.sql`](supabase/schema.sql) and [`supabase/functions/monthly-report/index.ts`](supabase/functions/monthly-report/index.ts).

## 📜 Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Create production build in `dist/` |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Placeholder lint script (configure as needed) |

## 📁 Project Structure

```text
.
├── public/                  # Static assets, manifest, icons, service worker
├── src/
│   ├── components/          # UI, layout, builder, analytics components
│   ├── hooks/               # Custom hooks
│   ├── i18n/                # Localization (en/ta/hi)
│   ├── pages/               # Route pages (Landing, Dashboard, Builder, etc.)
│   ├── services/            # PDF, Supabase, storage, sync, sharing, DB
│   ├── store/               # Zustand stores (auth, data, builder, ui)
│   ├── styles/              # Global styles
│   ├── templates/           # Invoice template registry/layouts/schema
│   └── utils/               # Calculations, dates, currency, validation, words
├── supabase/
│   ├── schema.sql           # Database schema, RLS, analytics SQL
│   └── functions/           # Edge functions (monthly report)
├── .env.example
├── package.json
├── tailwind.config.js
└── vite.config.js
```

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl/⌘ + K` | Open command palette |
| `Ctrl/⌘ + Z` | Undo (builder) |
| `Ctrl/⌘ + Y` / `Ctrl/⌘ + Shift + Z` | Redo (builder) |
| `Ctrl/⌘ + S` | Save draft (builder) |

## ☁️ Deployment

### Vercel

1. Import the repository into Vercel.
2. Framework preset: **Vite**.
3. Build command: `npm run build`
4. Output directory: `dist`
5. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` if using Supabase.

### Netlify

1. Import the repository into Netlify.
2. Build command: `npm run build`
3. Publish directory: `dist`
4. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` if using Supabase.

## 🔌 Storage Provider Extension

Invix includes a storage-provider abstraction. You can register custom providers (S3, Cloudinary, Firebase, etc.):

```js
import { registerStorageProvider } from '@/services/storage'

registerStorageProvider('s3', (settings) => ({
  name: 's3',
  async upload(path, blob) { /* ... */ return { path } },
  async download(path) { /* ... */ return blob },
  async getPublicUrl(path) { /* ... */ return { data: { publicUrl: url } } },
  async remove(path) { /* ... */ },
  async list(prefix) { return [] },
}))
```

Then select the provider in **Settings → Cloud & storage**.

## 🤝 Contributing

Contributions are welcome! To contribute:

1. **Fork** the repository.
2. **Create a branch**: `git checkout -b feat/your-feature-name`
3. **Make changes** and test locally (`npm run dev`, `npm run build`).
4. **Commit** with a clear message: `git commit -m "feat: add ..."`
5. **Push** and open a **Pull Request**.

### Contribution Guidelines

- Keep changes focused and well-scoped.
- Follow the existing code style and project structure.
- Avoid breaking offline/local-first behavior.
- Test light/dark mode and responsive layouts for UI changes.
- Update documentation when adding/changing features or config.

## 🐛 Bug Reports & Feature Requests

- Use **GitHub Issues** for bugs and feature requests.
- For bugs, include: steps to reproduce, expected behavior, actual behavior, screenshots/logs, and environment details (browser, OS, Node version).
- For feature requests, describe the use case and expected outcome.

## 🔒 Security

If you discover a security vulnerability, please **do not** open a public issue immediately. Instead, report it privately to the maintainers/owners through a secure channel, then disclose responsibly after a fix is available.

## Credits

- **Made by:** [https://codenix-technology.xyz/](https://codenix-technology.xyz/)
- **Elements by:** Y. GOKUL RAAJ

## License

This project is licensed under the [MIT License](./LICENSE).

---
