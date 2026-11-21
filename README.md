# Invix — Smart Invoices, Made Simple

A production-quality, open-source invoice generator web app: **15 professional templates**, a full customization studio, GST support, UPI QR payments, PDF/PNG/print export, cloud sync via **Supabase**, and offline-first guest mode.

![Invix](public/icons/icon-512.png)

## ✨ Features

- **Invoice Builder** — three-pane layout (form · live preview · customize), drag-to-reorder line items, HSN/SAC, per-line discounts & taxes, extra charges, round-off, multi-currency with locale formatting, amount in words (Indian + international), notes/terms, bank details with auto-generated UPI QR, digital signature (draw/upload/type), company stamp, partial payments, PO numbers, payment terms.
- **15 Templates** — Classic, Modern, Minimal, Corporate, Creative, Elegant, Bold, Gradient, Dark, Compact, Thermal receipt, Freelancer, Agency, GST Tax Invoice, Proforma/Quotation. Every template is data-driven (JSON customization + React component), so adding one is a single registry entry.
- **Customization Studio** — colors + preset palettes, Google fonts, logo size/position, section visibility & ordering, column manager (toggle/rename/reorder HSN, Discount, Tax…), paper size (A4/A5/Letter) & orientation & margins, watermarks, custom labels, table styles, borders & radius. Save designs as **My Templates**, duplicate/rename/delete, export/import as JSON.
- **Export & Sharing** — PDF (paginated), PNG, print, public share links, WhatsApp & email handoff, CSV/Excel/JSON export, recurring invoices, duplicate, quotation → invoice conversion.
- **Cloud (Supabase)** — email + Google auth, full data sync with last-write-wins conflict handling, offline queue, storage-provider abstraction (`upload/download/delete/list`) with Supabase Storage default and local-device fallback (Firebase/S3/Cloudinary/Drive can plug into `registerStorageProvider`).
- **Dashboard & Reports** — KPIs, monthly revenue chart, overdue reminders with mailto/WhatsApp templates, sales by client, monthly sales, tax (GST) summary, receivables aging, cashflow forecast, expenses, goals and an in-app notification center (see [Analytics & Insights](#-analytics--insights)).
- **Extras** — dark/light mode, multi-business profiles, keyboard shortcuts + undo/redo + autosave, English/Tamil/Hindi UI, PWA (installable, offline), SEO landing page, guest mode without login.

## 🚀 Quick start

```bash
npm install
npm run dev          # http://localhost:5173
```

The app works immediately in **offline/guest mode** (data stored in IndexedDB) — no configuration needed.

## ☁️ Supabase setup (cloud sync, auth, storage)

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** and run the contents of [`supabase/schema.sql`](supabase/schema.sql). This creates:
   - tables: `profiles`, `businesses`, `clients`, `items`, `invoices`, `invoice_items`, `payments`, `templates`, `shared_invoices`
   - **Row Level Security** policies (each user only touches their own rows; `shared_invoices` is publicly readable by design)
   - the `invix-files` **storage bucket** with per-user folder policies
   - a trigger that auto-creates a profile on signup
3. Enable **Google OAuth**: Authentication → Providers → Google (add your redirect URL `http://localhost:5173/**` and your production domain).
4. Copy `.env.example` → `.env.local` and fill in:

```env
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR-ANON-KEY
```

5. Restart the dev server. Sign in and hit **Sync now** — everything (invoices, clients, items, businesses, custom templates) pushes to Postgres; logos/stamps/shared PDFs go to Storage under `uid/…` paths.

> The app degrades gracefully: without env vars it stays in guest/offline mode.

## 📊 Analytics & Insights

Two screens turn your invoice data into decisions:

- **`/dashboard`** — the day-to-day command centre: KPI cards, monthly revenue trend, receivables aging, cashflow forecast, expense tracker, goal progress and the notification center.
- **`/analytics`** — deeper breakdowns: sales by month, sales by client, product/service performance, CGST/SGST/IGST tax summary, outstanding receivables and expected cash inflows.

### KPI definitions

| KPI | Definition |
|---|---|
| **Invoiced** | Sum of `total` for invoices in the selected period (quotations excluded). |
| **Collected** | Sum of payments received (`paid`) for those invoices. |
| **Pending** | Sum of `balance` (`total − paid`). |
| **Overdue** | Outstanding balance on invoices whose due date is before today. |
| **Invoices** | Number of invoices in the period. |
| **Avg. invoice value** | Invoiced ÷ invoice count. |
| **Collection rate** | Collected ÷ invoiced × 100. |

The same definitions power both screens, the RPC used by scheduled reports, and the local guest-mode calculations, so numbers never disagree between views.

### Date filter and compare mode

Both screens share a period filter (month / quarter / year / custom range) plus an optional **business** filter for multi-business workspaces. Enable **Compare** to overlay the previous equivalent period and show absolute and percentage deltas for every KPI and chart series.

### Widget customization

Cards and charts can be reordered, resized and hidden from **Customize dashboard**. The layout is saved per user in `dashboard_layouts` when signed in (synced with the rest of your workspace) and stored locally for guests.

### Expenses and goals

- **Expenses** — record category, description, amount, date, business and an optional receipt path in the `expenses` table. Expense totals appear alongside revenue on the dashboard.
- **Goals** — set monthly (`2026-11`) or yearly (`2026`) revenue targets per business in `goals`. Progress rings and the notification center show how close you are to each target.

### Chart exports

Every chart and report table can be exported from its toolbar: charts as **PNG** images and the underlying rows as **CSV** (Excel-compatible). Exports respect the active date/business filters, so what you download matches what you see.

### Notification center

The bell in the app shell collects actionable alerts: overdue and due-soon invoices, partially paid invoices, low collection rate versus the previous period, and goal progress. Notifications are derived from the same views as the dashboard and support the existing mailto/WhatsApp reminder handoff.

### Supabase analytics setup

Analytics objects are created by the same idempotent SQL file as the core schema. Complete these steps once per project:

1. **Run the schema.** In Supabase → **SQL Editor → New query**, paste the full contents of [`supabase/schema.sql`](supabase/schema.sql) and click **Run**. It creates the three new tables (`expenses`, `goals`, `dashboard_layouts`), the invoice `category` / `paid` / `balance` / `tax_total` columns, the reporting views (`v_invoice_facts`, `v_monthly_sales`, `v_client_stats`, `v_product_stats`, `v_tax_summary`, `v_ar_aging`, `v_cashflow`), the materialized views `mv_dashboard_kpis` and `mv_monthly_revenue` (with UNIQUE indexes for `REFRESH ... CONCURRENTLY`), and the functions `refresh_analytics()` and `get_dashboard_overview()`. Re-running the file is safe. If the new views or RPC do not appear immediately, use **Settings → API → Reload schema cache**.
2. **Populate / refresh the materialized views** (optional but recommended):
   ```sql
   select public.refresh_analytics();
   ```
3. **Enable pg_cron (optional).** Database → **Extensions** → install `pg_cron`. The schema file then registers the job `invix-refresh-analytics` (`17 * * * *`) automatically. If `pg_cron` is not installed, the script only emits a NOTICE — nothing fails. Without pg_cron, call `select public.refresh_analytics();` from your own scheduler.
4. **Deploy the monthly-report edge function:**
   ```bash
   supabase functions deploy monthly-report
   ```
   Set its secrets (Supabase → Project Settings → Edge Functions → Secrets, or via CLI):
   ```bash
   supabase secrets set \
     SUPABASE_URL=https://YOUR-PROJECT.supabase.co \
     SUPABASE_SERVICE_ROLE_KEY=YOUR-SERVICE-ROLE-KEY \
     INVIX_CRON_SECRET=YOUR-LONG-RANDOM-SECRET \
     RESEND_API_KEY=YOUR-RESEND-KEY \
     REPORT_FROM_EMAIL="Invix <reports@invix.app>"
   ```
   `RESEND_API_KEY` and `REPORT_FROM_EMAIL` are optional: without `RESEND_API_KEY` the function logs the rendered email payload instead of sending it, which is useful for testing.

   | Variable | Purpose |
   |---|---|
   | `SUPABASE_URL` | Project URL, used with the service-role key to call the RPC and read `profiles` / `v_client_stats`. |
   | `SUPABASE_SERVICE_ROLE_KEY` | Server-side key; bypasses RLS so one scheduled run can report for every user. Never expose it in the browser. |
   | `INVIX_CRON_SECRET` | Shared secret required in the `x-invix-cron-secret` header; requests without it get `401`. |
   | `RESEND_API_KEY` | Resend API key for email delivery (optional). |
   | `REPORT_FROM_EMAIL` | Sender address; defaults to `Invix <reports@invix.app>`. |

5. **Schedule the report** — choose one of:
   - **pg_cron + pg_net** (enable the `pg_net` extension, store secrets in Vault rather than hard-coding them):
     ```sql
     select cron.schedule(
       'invix-monthly-report',
       '0 6 1 * *',
       $$
       select net.http_post(
         url := 'https://YOUR-PROJECT.supabase.co/functions/v1/monthly-report',
         headers := jsonb_build_object(
           'Content-Type', 'application/json',
           'Authorization', 'Bearer YOUR-ANON-KEY',
           'x-invix-cron-secret', 'YOUR-INVIX-CRON-SECRET'
         ),
         body := '{}'::jsonb
       )
       $$
     );
     ```
   - **External cron** (e.g. cron, GitHub Actions, Vercel Cron):
     ```bash
     curl -X POST "https://YOUR-PROJECT.supabase.co/functions/v1/monthly-report" \
       -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
       -H "x-invix-cron-secret: $INVIX_CRON_SECRET"
     ```
   Both run on the 1st of each month and email each profile with last month's KPIs and top five clients.

> Offline/guest mode needs none of this: `/dashboard` and `/analytics` compute the identical KPIs, aging buckets and tax breakdowns locally from IndexedDB. Cloud sync only adds per-user persistence, shared layouts and scheduled email reports.

## 📁 Project structure

```
src/
├── App.jsx                  # routes
├── main.jsx                 # entry + PWA registration
├── i18n/                    # English / Tamil / Hindi
├── store/                   # Zustand: auth, data, builder (undo/redo), ui
├── services/
│   ├── supabase.js          # client from env
│   ├── storage/             # StorageProvider abstraction + Supabase/local providers
│   ├── pdf.js               # html2canvas + jsPDF (PDF/PNG/print/thumbnails)
│   ├── sharing.js           # public share links
│   ├── recurring.js         # weekly/monthly/yearly generation
│   ├── autoSync.js          # offline queue + auto-sync
│   └── db.js                # IndexedDB wrapper (offline-first)
├── utils/                   # currency, words, calc, dates, numbering, csv, QR, validation
├── components/
│   ├── ui/                  # design system (buttons, modals, toasts, color picker…)
│   ├── builder/             # FormPanel, LineItemsEditor, CustomizePanel, PreviewPane
│   └── layout/              # app shell with nav + sync status
├── templates/
│   ├── schema.js            # customization JSON schema + presets
│   ├── shared.jsx           # paper frame, watermark, tables, sections
│   ├── layouts.jsx          # 5 layout engines (band/sidebar/minimal/thermal/GST)
│   └── registry.jsx         # 15 templates + custom template resolution
└── pages/                   # Landing, Auth, Dashboard, Analytics, Invoices, Builder,
                             # Gallery, Preview, Clients, Items, Reports, Settings, Share
supabase/
├── schema.sql               # tables + RLS + buckets + analytics views/RPC (+ seed block)
└── functions/monthly-report/index.ts  # scheduled email digest (Resend)
```

## 🧾 Numbering patterns

`INV-{NNNN}` · `ACME/{YY}/{MM}/{NNNN}` — placeholders `{YYYY} {YY} {MM} {DD} {N…}`; monthly reset happens automatically when the pattern contains `{MM}`.

## 🏗 Build & deploy

```bash
npm run build     # outputs dist/
npm run preview   # local preview of the build
```

**Vercel** — import the repo, framework = Vite, add the two `VITE_SUPABASE_*` env vars.
**Netlify** — build command `npm run build`, publish directory `dist`, add the same env vars.

## ⌨️ Keyboard shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl/⌘ + Z` | Undo (builder) |
| `Ctrl/⌘ + Y` / `Ctrl/⌘ + Shift + Z` | Redo |
| `Ctrl/⌘ + S` | Save draft |

## 🔌 Plugging in another storage provider

```js
import { registerStorageProvider } from '@/services/storage'

registerStorageProvider('s3', (settings) => ({
  name: 's3',
  async upload(path, blob) { /* … */ return { path } },
  async download(path) { /* … */ return blob },
  async getPublicUrl(path) { /* … */ return { data: { publicUrl: url } } },
  async remove(path) {},
  async list(prefix) { return [] },
}))
```

Then pick it in **Settings → Cloud & storage**.

## Credits

- Made by [https://codenix-technology.xyz/](https://codenix-technology.xyz/)
- Elements by Y. GOKUL RAAJ

## License

MIT (open source)
