# Analytics & Reports

Invix includes dashboard and analytics views for understanding invoice performance.

## Screens

- **Dashboard (`/dashboard`)**: day-to-day overview, KPIs, trends, reminders, notifications.
- **Analytics (`/analytics`)**: deeper breakdowns by period/client/product/tax/receivables/cashflow.
- **Reports (`/reports`)**: reporting and exports (as implemented in app).

## KPI Definitions

| KPI | Definition |
|---|---|
| Invoiced | Sum of invoice totals in selected period (quotations excluded) |
| Collected | Payments received for invoices in scope |
| Pending | Outstanding balance (`total - paid`) |
| Overdue | Outstanding balance where due date is before today |
| Invoices | Number of invoices in period |
| Avg. invoice value | Invoiced ÷ invoice count |
| Collection rate | Collected ÷ invoiced × 100 |

## Filters & Compare

- Period filter: month/quarter/year/custom range
- Business filter for multi-business workspaces
- Compare mode: compare with previous equivalent period and show deltas

## Analytics Features

- Monthly revenue trend
- Sales by client
- Product/service performance
- Tax summary (CGST/SGST/IGST)
- Receivables aging
- Cashflow forecast
- Expense tracker
- Goals/targets
- Notification center

## Exports

- Chart exports as PNG
- Data/table exports as CSV/Excel-compatible files
- Exports respect active filters

## Local vs Cloud

- **Local/guest mode**: analytics computed locally from IndexedDB.
- **Supabase mode**: can persist layouts/sync data and support scheduled reports/functions.

## Scheduled Monthly Report (Optional)

Supabase Edge Function: `supabase/functions/monthly-report/index.ts`

Requires secure server-side secrets and scheduling (pg_cron/pg_net or external cron). See [Supabase Setup](./Supabase-Setup.md).
