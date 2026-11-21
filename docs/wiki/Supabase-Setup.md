# Supabase Setup

Supabase is optional. Invix works in local/offline mode without it.

## 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a project.
2. Get your project URL and anon key from Project Settings → API.

## 2. Configure Environment

Copy `.env.example` to `.env.local`:

```env
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR-ANON-KEY
```

Restart the dev server after changes.

## 3. Run Schema SQL

Open Supabase **SQL Editor** and run:

- [`supabase/schema.sql`](../../supabase/schema.sql)

This sets up (idempotent where designed):

- Core tables: `profiles`, `businesses`, `clients`, `items`, `invoices`, `invoice_items`, `payments`, `templates`, `shared_invoices`
- Analytics tables: `expenses`, `goals`, `dashboard_layouts`
- RLS policies
- Storage bucket: `invix-files` and policies
- Profile auto-create trigger on signup
- Analytics views/RPC/materialized views/refresh helpers

If views/RPC don't appear immediately, use **Settings → API → Reload schema cache** in Supabase.

## 4. Authentication (Optional)

Enable providers in Supabase Authentication settings:

- Email auth
- Google OAuth (optional)

For Google OAuth, configure redirect URLs for local and production, e.g.:

- `http://localhost:5173/**`
- `https://your-domain.com/**`

## 5. Storage

The schema creates the `invix-files` bucket. The app uses a storage-provider abstraction:

- Default cloud: Supabase Storage
- Local fallback: device/local handling
- Custom providers: can be registered via `registerStorageProvider`

## 6. Analytics Refresh / Scheduled Reports (Optional)

Refresh materialized views manually:

```sql
select public.refresh_analytics();
```

For scheduled email reports, deploy:

```bash
supabase functions deploy monthly-report
```

Set required function secrets (see README / function source for details):

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `INVIX_CRON_SECRET`
- `RESEND_API_KEY` (optional)
- `REPORT_FROM_EMAIL` (optional)

## Security Notes

- Never commit `.env.local` or secret keys.
- Only `VITE_` public env vars should be exposed to frontend.
- `SUPABASE_SERVICE_ROLE_KEY` must be used only in secure server/edge contexts, never in browser code.
- RLS policies are critical — review before production use.
