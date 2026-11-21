-- ============================================================================
-- Invix — Supabase schema
-- Run this in the Supabase SQL editor (Dashboard → SQL → New query → paste → Run)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Extensions & helpers
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- profiles (extends auth.users)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  email text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- auto-create a profile row on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name, email)
  values (new.id, new.raw_user_meta_data->>'name', new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- businesses (multi-business profiles per user)
-- ---------------------------------------------------------------------------
create table if not exists public.businesses (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  legal_name text,
  address text,
  city text,
  state text,
  state_code text,
  pincode text,
  country text,
  tax_id text,
  email text,
  phone text,
  website text,
  logo text,                -- storage path or data URL
  bank_details jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists businesses_user_idx on public.businesses(user_id);

-- ---------------------------------------------------------------------------
-- clients (address book)
-- ---------------------------------------------------------------------------
create table if not exists public.clients (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  address text,
  city text,
  state text,
  state_code text,
  pincode text,
  email text,
  phone text,
  gstin text,
  notes text,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists clients_user_idx on public.clients(user_id);

-- ---------------------------------------------------------------------------
-- items (product/service catalog)
-- ---------------------------------------------------------------------------
create table if not exists public.items (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  hsn text,
  unit text default 'Nos',
  rate numeric(12,2) not null default 0,
  tax_rate numeric(5,2) not null default 0,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists items_user_idx on public.items(user_id);

-- ---------------------------------------------------------------------------
-- invoices (header + JSON payload snapshot for offline-first rendering)
-- ---------------------------------------------------------------------------
create table if not exists public.invoices (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  business_id uuid references public.businesses(id) on delete set null,
  client_id uuid references public.clients(id) on delete set null,
  number text not null,
  status text not null default 'draft' check (status in ('draft','sent','paid','partially','overdue')),
  kind text not null default 'invoice' check (kind in ('invoice','quotation')),
  template_id text,
  customization jsonb,
  currency text not null default 'INR',
  issue_date date,
  due_date date,
  total numeric(14,2),
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists invoices_user_idx on public.invoices(user_id);
create index if not exists invoices_status_idx on public.invoices(user_id, status);
create index if not exists invoices_number_idx on public.invoices(user_id, number);

-- ---------------------------------------------------------------------------
-- invoice_items (normalized line items)
-- ---------------------------------------------------------------------------
create table if not exists public.invoice_items (
  id uuid primary key,
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  description text,
  hsn text,
  quantity numeric(12,3) not null default 1,
  unit text,
  rate numeric(12,2) not null default 0,
  discount_type text not null default 'percent' check (discount_type in ('percent','flat')),
  discount_value numeric(12,2) not null default 0,
  tax_rate numeric(5,2) not null default 0,
  tax_name text,
  position integer not null default 0
);
create index if not exists invoice_items_invoice_idx on public.invoice_items(invoice_id);

-- ---------------------------------------------------------------------------
-- payments (partial payments per invoice)
-- ---------------------------------------------------------------------------
create table if not exists public.payments (
  id uuid primary key,
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null default current_date,
  amount numeric(12,2) not null default 0,
  method text default 'bank',
  note text,
  created_at timestamptz not null default now()
);
create index if not exists payments_invoice_idx on public.payments(invoice_id);

-- ---------------------------------------------------------------------------
-- templates (user's saved "My Templates")
-- ---------------------------------------------------------------------------
create table if not exists public.templates (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  based_on text,
  customization jsonb,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists templates_user_idx on public.templates(user_id);

-- ---------------------------------------------------------------------------
-- shared_invoices (public read-only share links)
-- ---------------------------------------------------------------------------
create table if not exists public.shared_invoices (
  share_id text primary key,
  user_id uuid references auth.users(id) on delete cascade,
  invoice_id uuid references public.invoices(id) on delete set null,
  number text,
  currency text default 'INR',
  total numeric(14,2),
  status text,
  pdf_path text,
  pdf_url text,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ===========================================================================
-- ROW LEVEL SECURITY
-- ===========================================================================
alter table public.profiles        enable row level security;
alter table public.businesses      enable row level security;
alter table public.clients         enable row level security;
alter table public.items           enable row level security;
alter table public.invoices        enable row level security;
alter table public.invoice_items   enable row level security;
alter table public.payments        enable row level security;
alter table public.templates       enable row level security;
alter table public.shared_invoices enable row level security;

-- profiles: self only
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
drop policy if exists "profiles_upsert_own" on public.profiles;
create policy "profiles_upsert_own" on public.profiles for insert with check (auth.uid() = id);
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

-- helper pattern applied to all private tables
drop policy if exists "own_select" on public.businesses;
create policy "own_select" on public.businesses for select using (auth.uid() = user_id);
drop policy if exists "own_insert" on public.businesses;
create policy "own_insert" on public.businesses for insert with check (auth.uid() = user_id);
drop policy if exists "own_update" on public.businesses;
create policy "own_update" on public.businesses for update using (auth.uid() = user_id);
drop policy if exists "own_delete" on public.businesses;
create policy "own_delete" on public.businesses for delete using (auth.uid() = user_id);

drop policy if exists "own_select" on public.clients;
create policy "own_select" on public.clients for select using (auth.uid() = user_id);
drop policy if exists "own_insert" on public.clients;
create policy "own_insert" on public.clients for insert with check (auth.uid() = user_id);
drop policy if exists "own_update" on public.clients;
create policy "own_update" on public.clients for update using (auth.uid() = user_id);
drop policy if exists "own_delete" on public.clients;
create policy "own_delete" on public.clients for delete using (auth.uid() = user_id);

drop policy if exists "own_select" on public.items;
create policy "own_select" on public.items for select using (auth.uid() = user_id);
drop policy if exists "own_insert" on public.items;
create policy "own_insert" on public.items for insert with check (auth.uid() = user_id);
drop policy if exists "own_update" on public.items;
create policy "own_update" on public.items for update using (auth.uid() = user_id);
drop policy if exists "own_delete" on public.items;
create policy "own_delete" on public.items for delete using (auth.uid() = user_id);

drop policy if exists "own_select" on public.invoices;
create policy "own_select" on public.invoices for select using (auth.uid() = user_id);
drop policy if exists "own_insert" on public.invoices;
create policy "own_insert" on public.invoices for insert with check (auth.uid() = user_id);
drop policy if exists "own_update" on public.invoices;
create policy "own_update" on public.invoices for update using (auth.uid() = user_id);
drop policy if exists "own_delete" on public.invoices;
create policy "own_delete" on public.invoices for delete using (auth.uid() = user_id);

drop policy if exists "own_select" on public.invoice_items;
create policy "own_select" on public.invoice_items for select using (auth.uid() = user_id);
drop policy if exists "own_insert" on public.invoice_items;
create policy "own_insert" on public.invoice_items for insert with check (auth.uid() = user_id);
drop policy if exists "own_update" on public.invoice_items;
create policy "own_update" on public.invoice_items for update using (auth.uid() = user_id);
drop policy if exists "own_delete" on public.invoice_items;
create policy "own_delete" on public.invoice_items for delete using (auth.uid() = user_id);

drop policy if exists "own_select" on public.payments;
create policy "own_select" on public.payments for select using (auth.uid() = user_id);
drop policy if exists "own_insert" on public.payments;
create policy "own_insert" on public.payments for insert with check (auth.uid() = user_id);
drop policy if exists "own_update" on public.payments;
create policy "own_update" on public.payments for update using (auth.uid() = user_id);
drop policy if exists "own_delete" on public.payments;
create policy "own_delete" on public.payments for delete using (auth.uid() = user_id);

drop policy if exists "own_select" on public.templates;
create policy "own_select" on public.templates for select using (auth.uid() = user_id);
drop policy if exists "own_insert" on public.templates;
create policy "own_insert" on public.templates for insert with check (auth.uid() = user_id);
drop policy if exists "own_update" on public.templates;
create policy "own_update" on public.templates for update using (auth.uid() = user_id);
drop policy if exists "own_delete" on public.templates;
create policy "own_delete" on public.templates for delete using (auth.uid() = user_id);

-- shared_invoices: owner manages, anyone (anon included) can read
drop policy if exists "shared_select_owner" on public.shared_invoices;
create policy "shared_select_owner" on public.shared_invoices for select using (auth.uid() = user_id);
drop policy if exists "shared_select_anon" on public.shared_invoices;
create policy "shared_select_anon" on public.shared_invoices for select to anon using (true);
drop policy if exists "shared_insert_owner" on public.shared_invoices;
create policy "shared_insert_owner" on public.shared_invoices for insert with check (auth.uid() = user_id);
drop policy if exists "shared_update_owner" on public.shared_invoices;
create policy "shared_update_owner" on public.shared_invoices for update using (auth.uid() = user_id);
drop policy if exists "shared_delete_owner" on public.shared_invoices;
create policy "shared_delete_owner" on public.shared_invoices for delete using (auth.uid() = user_id);

-- ===========================================================================
-- STORAGE BUCKETS
-- Files: logos, signatures, stamps, shared PDFs
-- ===========================================================================
insert into storage.buckets (id, name, public)
values ('invix-files', 'invix-files', true)
on conflict (id) do update set public = true;

-- Anyone can READ (public bucket → public URLs for share pages / logos)
drop policy if exists "invix_files_public_read" on storage.objects;
create policy "invix_files_public_read" on storage.objects for select
  using (bucket_id = 'invix-files');

-- Authenticated users can upload/delete only inside their own folder: uid/...
drop policy if exists "invix_files_owner_upload" on storage.objects;
create policy "invix_files_owner_upload" on storage.objects for insert
  with check (bucket_id = 'invix-files' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "invix_files_owner_update" on storage.objects;
create policy "invix_files_owner_update" on storage.objects for update
  using (bucket_id = 'invix-files' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "invix_files_owner_delete" on storage.objects;
create policy "invix_files_owner_delete" on storage.objects for delete
  using (bucket_id = 'invix-files' and auth.uid()::text = (storage.foldername(name))[1]);

-- ===========================================================================
-- Seed data (optional demo rows for the signed-in user; replace the UUID)
-- To use: register in the app, find your id with:
--   select id, email from auth.users;
-- then run the block below with that UUID.
-- ===========================================================================
-- with u as (select 'REPLACE-WITH-YOUR-USER-UUID'::uuid as uid)
-- insert into public.businesses (id, user_id, name, legal_name, address, city, state, state_code, pincode, tax_id, email, phone, website, bank_details)
-- select gen_random_uuid(), u.uid, 'Acme Design Studio', 'Acme Design Studio LLP', '221 Anna Salai', 'Chennai', 'Tamil Nadu', '33', '600002',
--        '33AAECA1234C1ZV', 'billing@acmedesign.in', '+91 98400 12345', 'https://acmedesign.in',
--        jsonb_build_object('bankName','HDFC Bank','accountName','Acme Design Studio LLP','accountNumber','50100234567890','ifsc','HDFC0000123','upiId','acmedesign@hdfcbank')
-- from u;
--
-- insert into public.clients (id, user_id, name, address, city, state, state_code, pincode, email, phone, gstin)
-- select gen_random_uuid(), u.uid, 'Bright Retail Pvt Ltd', '48 MG Road', 'Bengaluru', 'Karnataka', '29', '560001', 'accounts@brightretail.in', '+91 98450 67890', '29AABCB5678D1Z2' from u
-- union all
-- select gen_random_uuid(), u.uid, 'Nova Technologies', '9 Tech Park Drive', 'Chennai', 'Tamil Nadu', '33', '600096', 'ap@novatech.io', '+91 96000 11111', '33AACCN9012E1Z5' from u;
--
-- insert into public.items (id, user_id, name, description, hsn, unit, rate, tax_rate)
-- select gen_random_uuid(), u.uid, 'Brand Identity Design', 'Logo, palette, typography, brand guidelines', '998383', 'Job', 35000, 18 from u
-- union all select gen_random_uuid(), u.uid, 'Website Development', '5-page responsive marketing website', '998314', 'Job', 85000, 18 from u
-- union all select gen_random_uuid(), u.uid, 'UI/UX Consulting', 'On-site product consulting (hourly)', '998313', 'Hrs', 2500, 18 from u;

-- ============================================================================
-- ANALYTICS EXTENSION
-- ----------------------------------------------------------------------------
-- Idempotent. Adds:
--   * columns used by the current sync mappers (items.category, invoice money
--     columns paid / balance / tax_total)
--   * expenses, goals, dashboard_layouts (RLS scoped to auth.uid())
--   * reporting views over invoices / payments / JSON payload snapshots
--   * refreshable materialized views + refresh_analytics()
--   * get_dashboard_overview() RPC used by the app and the monthly-report edge
--     function, plus optional pg_cron scheduling
--
-- JSONB keys written by src/store/data.js (invoiceToRow -> invoices.data):
--   issueDate, dueDate, currency, status, total, paid, balance, tax_total,
--   client: { name, stateCode, ... }, items: [{ description, quantity, rate,
--   discountType ('percent'|'flat'), discountValue, taxRate, taxName }],
--   taxScheme ('gst'|'vat'|'custom'|'none'), taxMode ('exclusive'|'inclusive'),
--   taxBreakdown: [{ name, amount }] where name is e.g. 'CGST@9', 'SGST@9',
--   'IGST@18', 'VAT@18' (see src/utils/calc.js computeTotals).
-- The columns on invoices are authoritative when present; the JSON snapshot is
-- only a fallback so older rows still produce correct figures.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Mapper-facing columns (safe to re-run)
-- ---------------------------------------------------------------------------
alter table public.items add column if not exists category text;

-- invoiceToRow now sends these columns; nullable so the views can still fall
-- back to invoices.data / payments for rows written by older app versions.
alter table public.invoices add column if not exists paid numeric(14,2);
alter table public.invoices add column if not exists balance numeric(14,2);
alter table public.invoices add column if not exists tax_total numeric(14,2);

-- ---------------------------------------------------------------------------
-- 2. expenses
-- ---------------------------------------------------------------------------
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  business_id uuid references public.businesses(id) on delete set null,
  category text not null,
  description text,
  amount numeric(14,2) not null check (amount >= 0),
  expense_date date not null default current_date,
  receipt_path text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists expenses_user_idx on public.expenses(user_id);
create index if not exists expenses_business_idx on public.expenses(business_id);
create index if not exists expenses_date_idx on public.expenses(expense_date);

alter table public.expenses enable row level security;
-- service_role bypasses RLS by design; no extra policy is required for it.
drop policy if exists "expenses_select_own" on public.expenses;
create policy "expenses_select_own" on public.expenses for select using (auth.uid() = user_id);
drop policy if exists "expenses_insert_own" on public.expenses;
create policy "expenses_insert_own" on public.expenses for insert with check (auth.uid() = user_id);
drop policy if exists "expenses_update_own" on public.expenses;
create policy "expenses_update_own" on public.expenses for update using (auth.uid() = user_id);
drop policy if exists "expenses_delete_own" on public.expenses;
create policy "expenses_delete_own" on public.expenses for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 3. goals (monthly / yearly revenue targets)
-- ---------------------------------------------------------------------------
create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  business_id uuid references public.businesses(id) on delete cascade,
  period_type text not null check (period_type in ('monthly','yearly')),
  period_key text not null,             -- '2026-11' for monthly, '2026' for yearly
  target numeric(14,2) not null check (target >= 0),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, business_id, period_type, period_key)
);
create index if not exists goals_user_idx on public.goals(user_id);

alter table public.goals enable row level security;
drop policy if exists "goals_select_own" on public.goals;
create policy "goals_select_own" on public.goals for select using (auth.uid() = user_id);
drop policy if exists "goals_insert_own" on public.goals;
create policy "goals_insert_own" on public.goals for insert with check (auth.uid() = user_id);
drop policy if exists "goals_update_own" on public.goals;
create policy "goals_update_own" on public.goals for update using (auth.uid() = user_id);
drop policy if exists "goals_delete_own" on public.goals;
create policy "goals_delete_own" on public.goals for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 4. dashboard_layouts (per-user widget order/visibility)
-- ---------------------------------------------------------------------------
create table if not exists public.dashboard_layouts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  layout jsonb not null default '[]'::jsonb,
  updated_at timestamptz default now()
);

alter table public.dashboard_layouts enable row level security;
drop policy if exists "dashboard_layouts_select_own" on public.dashboard_layouts;
create policy "dashboard_layouts_select_own" on public.dashboard_layouts for select using (auth.uid() = user_id);
drop policy if exists "dashboard_layouts_insert_own" on public.dashboard_layouts;
create policy "dashboard_layouts_insert_own" on public.dashboard_layouts for insert with check (auth.uid() = user_id);
drop policy if exists "dashboard_layouts_update_own" on public.dashboard_layouts;
create policy "dashboard_layouts_update_own" on public.dashboard_layouts for update using (auth.uid() = user_id);
drop policy if exists "dashboard_layouts_delete_own" on public.dashboard_layouts;
create policy "dashboard_layouts_delete_own" on public.dashboard_layouts for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 5. Small helper: net line value, mirroring calc.js lineNet() (percent/flat
--    discount, then back out an inclusive tax when taxMode = 'inclusive').
-- ---------------------------------------------------------------------------
create or replace function public.invix_line_net(p_line jsonb, p_tax_mode text default 'exclusive')
returns numeric
language sql
immutable
strict
set search_path = public
as $$
  with v as (
    select
      coalesce((p_line->>'quantity')::numeric, 0) as qty,
      coalesce((p_line->>'rate')::numeric, 0) as rate,
      coalesce((p_line->>'taxRate')::numeric, 0) as tax_rate,
      coalesce((p_line->>'discountValue')::numeric, 0) as disc
  )
  select round(
    greatest(
      (case
         when coalesce(p_line->>'discountType', 'percent') = 'percent'
           then v.qty * v.rate * (1 - v.disc / 100.0)
         else v.qty * v.rate - v.disc
       end) / (case when p_tax_mode = 'inclusive' then 1 + v.tax_rate / 100.0 else 1 end),
      0),
    2)
  from v;
$$;
grant execute on function public.invix_line_net(jsonb, text) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 6. Flattened invoice facts (single source for all analytic views)
-- ---------------------------------------------------------------------------
create or replace view public.v_invoice_facts as
with base as (
  select
    i.id,
    i.user_id,
    i.business_id,
    i.client_id,
    i.number,
    coalesce(i.status, i.data->>'status', 'draft') as status,
    coalesce(i.kind, 'invoice') as kind,
    coalesce(i.currency, i.data->>'currency', 'INR') as currency,
    coalesce(i.issue_date, nullif(i.data->>'issueDate', '')::date) as issue_date,
    coalesce(i.due_date, nullif(i.data->>'dueDate', '')::date) as due_date,
    i.data,
    i.balance as balance_raw,
    coalesce(i.total, (i.data->>'total')::numeric, 0)::numeric(14,2) as total,
    coalesce(
      i.paid,
      (i.data->>'paid')::numeric,
      (select sum(p.amount) from public.payments p where p.invoice_id = i.id),
      0
    )::numeric(14,2) as paid,
    coalesce(i.tax_total, (i.data->>'tax_total')::numeric, 0)::numeric(14,2) as tax_total
  from public.invoices i
),
tax_extract as (
  select
    b.id,
    coalesce(sum(case when upper(tb.elem->>'name') like 'CGST@%' then coalesce((tb.elem->>'amount')::numeric, 0) else 0 end), 0)::numeric(14,2) as cgst,
    coalesce(sum(case when upper(tb.elem->>'name') like 'SGST@%' then coalesce((tb.elem->>'amount')::numeric, 0) else 0 end), 0)::numeric(14,2) as sgst,
    coalesce(sum(case when upper(tb.elem->>'name') like 'IGST@%' then coalesce((tb.elem->>'amount')::numeric, 0) else 0 end), 0)::numeric(14,2) as igst,
    coalesce(sum(case when upper(tb.elem->>'name') like 'CGST@%' or upper(tb.elem->>'name') like 'SGST@%' or upper(tb.elem->>'name') like 'IGST@%' then 0 else coalesce((tb.elem->>'amount')::numeric, 0) end), 0)::numeric(14,2) as other_tax
  from base b
  cross join lateral jsonb_array_elements(
    case when jsonb_typeof(b.data->'taxBreakdown') = 'array' then b.data->'taxBreakdown' else '[]'::jsonb end
  ) as tb(elem)
  group by b.id
)
select
  b.id,
  b.user_id,
  b.business_id,
  b.client_id,
  b.number,
  b.status,
  b.kind,
  b.currency,
  b.issue_date,
  b.due_date,
  b.total,
  b.paid,
  coalesce(b.balance_raw, (b.data->>'balance')::numeric, b.total - b.paid, 0)::numeric(14,2) as balance,
  b.tax_total,
  b.data->'client'->>'name' as client_name,
  coalesce(t.cgst, 0)::numeric(14,2) as cgst,
  coalesce(t.sgst, 0)::numeric(14,2) as sgst,
  coalesce(t.igst, 0)::numeric(14,2) as igst,
  coalesce(t.other_tax, 0)::numeric(14,2) as other_tax,
  b.data->'taxBreakdown' as tax_breakdown
from base b
left join tax_extract t on t.id = b.id;
alter view public.v_invoice_facts set (security_invoker = true);
grant select on public.v_invoice_facts to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 7. Reporting views
-- ---------------------------------------------------------------------------
create or replace view public.v_monthly_sales as
select
  user_id,
  date_trunc('month', coalesce(issue_date, current_date))::date as month,
  coalesce(sum(total), 0)::numeric(14,2) as invoiced,
  coalesce(sum(paid), 0)::numeric(14,2) as collected,
  coalesce(sum(balance), 0)::numeric(14,2) as pending,
  count(*)::bigint as invoice_count
from public.v_invoice_facts
where kind <> 'quotation'
group by user_id, date_trunc('month', coalesce(issue_date, current_date));
alter view public.v_monthly_sales set (security_invoker = true);
grant select on public.v_monthly_sales to authenticated, service_role;

create or replace view public.v_client_stats as
with pay as (
  select
    p.invoice_id,
    p.user_id,
    avg((p.date - f.issue_date)::numeric) as days_to_paid
  from public.payments p
  join public.v_invoice_facts f on f.id = p.invoice_id and f.user_id = p.user_id
  where f.issue_date is not null
  group by p.invoice_id, p.user_id
)
select
  f.user_id,
  f.client_id,
  max(f.client_name) as client_name,
  coalesce(sum(f.total), 0)::numeric(14,2) as revenue,
  coalesce(sum(f.balance), 0)::numeric(14,2) as outstanding,
  count(*)::bigint as invoice_count,
  max(f.issue_date) as last_invoice_date,
  coalesce(round(avg(p.days_to_paid), 1), 0)::numeric(12,1) as avg_days_to_paid
from public.v_invoice_facts f
left join pay p on p.invoice_id = f.id and p.user_id = f.user_id
where f.kind <> 'quotation' and f.client_id is not null
group by f.user_id, f.client_id;
alter view public.v_client_stats set (security_invoker = true);
grant select on public.v_client_stats to authenticated, service_role;

create or replace view public.v_product_stats as
select
  i.user_id,
  nullif(btrim(it.elem->>'description'), '') as description,
  coalesce(sum(public.invix_line_net(it.elem, coalesce(i.data->>'taxMode', 'exclusive'))), 0)::numeric(14,2) as revenue,
  coalesce(sum((it.elem->>'quantity')::numeric), 0)::numeric(14,3) as qty,
  count(distinct i.id)::bigint as invoice_count
from public.invoices i
cross join lateral jsonb_array_elements(
  case when jsonb_typeof(i.data->'items') = 'array' then i.data->'items' else '[]'::jsonb end
) as it(elem)
where i.kind <> 'quotation' and nullif(btrim(it.elem->>'description'), '') is not null
group by i.user_id, nullif(btrim(it.elem->>'description'), '');
alter view public.v_product_stats set (security_invoker = true);
grant select on public.v_product_stats to authenticated, service_role;

-- taxBreakdown is an array of { name, amount }. Names follow 'CGST@<rate>',
-- 'SGST@<rate>', 'IGST@<rate>' (GST) or 'VAT@<rate>' / 'Tax@<rate>' /
-- '<custom>@<rate>'. We classify via a LATERAL jsonb_array_elements() and
-- treat anything that is not CGST/SGST/IGST as 'other_tax'. Taxable value is
-- rebuilt from data->'items' with invix_line_net() (net of discounts and of
-- inclusive tax), grouped by the same user/month as the tax rows.
create or replace view public.v_tax_summary as
with tax_lines as (
  select
    i.user_id,
    date_trunc('month', coalesce(i.issue_date, nullif(i.data->>'issueDate', '')::date, current_date))::date as month,
    case
      when upper(tb.elem->>'name') like 'CGST@%' then 'cgst'
      when upper(tb.elem->>'name') like 'SGST@%' then 'sgst'
      when upper(tb.elem->>'name') like 'IGST@%' then 'igst'
      else 'other_tax'
    end as tax_kind,
    coalesce((tb.elem->>'amount')::numeric, 0) as amount
  from public.invoices i
  cross join lateral jsonb_array_elements(
    case when jsonb_typeof(i.data->'taxBreakdown') = 'array' then i.data->'taxBreakdown' else '[]'::jsonb end
  ) as tb(elem)
  where i.kind <> 'quotation'
),
taxable_lines as (
  select
    i.user_id,
    date_trunc('month', coalesce(i.issue_date, nullif(i.data->>'issueDate', '')::date, current_date))::date as month,
    coalesce(sum(public.invix_line_net(it.elem, coalesce(i.data->>'taxMode', 'exclusive'))), 0)::numeric(14,2) as taxable_value
  from public.invoices i
  cross join lateral jsonb_array_elements(
    case when jsonb_typeof(i.data->'items') = 'array' then i.data->'items' else '[]'::jsonb end
  ) as it(elem)
  where i.kind <> 'quotation'
  group by 1, 2
),
months as (
  select user_id, month from tax_lines
  union
  select user_id, month from taxable_lines
)
select
  m.user_id,
  m.month,
  coalesce(sum(case when t.tax_kind = 'cgst' then t.amount else 0 end), 0)::numeric(14,2) as cgst,
  coalesce(sum(case when t.tax_kind = 'sgst' then t.amount else 0 end), 0)::numeric(14,2) as sgst,
  coalesce(sum(case when t.tax_kind = 'igst' then t.amount else 0 end), 0)::numeric(14,2) as igst,
  coalesce(sum(case when t.tax_kind = 'other_tax' then t.amount else 0 end), 0)::numeric(14,2) as other_tax,
  coalesce(max(tl.taxable_value), 0)::numeric(14,2) as taxable_value
from months m
left join tax_lines t on t.user_id = m.user_id and t.month = m.month
left join taxable_lines tl on tl.user_id = m.user_id and tl.month = m.month
group by m.user_id, m.month;
alter view public.v_tax_summary set (security_invoker = true);
grant select on public.v_tax_summary to authenticated, service_role;

-- Receivables aging. 'not_due' is kept alongside the four overdue buckets so
-- the full outstanding balance is visible; filter to the four buckets in the
-- UI when a strict overdue report is needed.
create or replace view public.v_ar_aging as
select
  f.id as invoice_id,
  f.user_id,
  f.client_id,
  f.client_name,
  f.number,
  f.currency,
  f.issue_date,
  f.due_date,
  f.balance::numeric(14,2) as balance,
  greatest(current_date - f.due_date, 0)::integer as days_overdue,
  case
    when f.due_date is null or f.due_date >= current_date then 'not_due'
    when current_date - f.due_date <= 30 then '0-30'
    when current_date - f.due_date <= 60 then '31-60'
    when current_date - f.due_date <= 90 then '61-90'
    else '90+'
  end as aging_bucket
from public.v_invoice_facts f
where f.kind <> 'quotation' and f.balance > 0;
alter view public.v_ar_aging set (security_invoker = true);
grant select on public.v_ar_aging to authenticated, service_role;

create or replace view public.v_cashflow as
select
  user_id,
  date_trunc('month', due_date)::date as month,
  date_trunc('week', due_date)::date as week,
  coalesce(sum(balance), 0)::numeric(14,2) as expected_incoming,
  count(*)::bigint as invoice_count
from public.v_invoice_facts
where kind <> 'quotation' and balance > 0 and due_date is not null
group by user_id, date_trunc('month', due_date), date_trunc('week', due_date);
alter view public.v_cashflow set (security_invoker = true);
grant select on public.v_cashflow to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 8. Materialized views (UNIQUE indexes make CONCURRENTLY refreshes possible)
-- ---------------------------------------------------------------------------
create materialized view if not exists public.mv_dashboard_kpis as
select
  f.user_id,
  coalesce(sum(f.total), 0)::numeric(14,2) as invoiced,
  coalesce(sum(f.paid), 0)::numeric(14,2) as paid,
  coalesce(sum(f.balance), 0)::numeric(14,2) as pending,
  coalesce(sum(case when f.balance > 0 and f.due_date < current_date then f.balance else 0 end), 0)::numeric(14,2) as overdue,
  count(*)::bigint as invoice_count,
  coalesce(round(avg(f.total), 2), 0)::numeric(14,2) as avg_invoice_value,
  coalesce(round(case when sum(f.total) > 0 then sum(f.paid) / sum(f.total) * 100 else 0 end, 2), 0)::numeric(14,2) as collection_rate
from public.v_invoice_facts f
where f.kind <> 'quotation'
group by f.user_id
with no data;
create unique index if not exists mv_dashboard_kpis_user_uq on public.mv_dashboard_kpis(user_id);
grant select on public.mv_dashboard_kpis to authenticated, service_role;

create materialized view if not exists public.mv_monthly_revenue as
select
  user_id,
  date_trunc('month', coalesce(issue_date, current_date))::date as month,
  coalesce(sum(total), 0)::numeric(14,2) as invoiced,
  coalesce(sum(paid), 0)::numeric(14,2) as collected,
  coalesce(sum(balance), 0)::numeric(14,2) as pending,
  count(*)::bigint as invoice_count
from public.v_invoice_facts
where kind <> 'quotation'
group by user_id, date_trunc('month', coalesce(issue_date, current_date))
with no data;
create unique index if not exists mv_monthly_revenue_user_month_uq on public.mv_monthly_revenue(user_id, month);
grant select on public.mv_monthly_revenue to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 9. Refresh routine (first call populates unpopulated views without
--    CONCURRENTLY, subsequent calls refresh concurrently)
-- ---------------------------------------------------------------------------
create or replace function public.refresh_analytics()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce((select ispopulated from pg_matviews where schemaname = 'public' and matviewname = 'mv_dashboard_kpis'), false) then
    refresh materialized view concurrently public.mv_dashboard_kpis;
  else
    refresh materialized view public.mv_dashboard_kpis;
  end if;

  if coalesce((select ispopulated from pg_matviews where schemaname = 'public' and matviewname = 'mv_monthly_revenue'), false) then
    refresh materialized view concurrently public.mv_monthly_revenue;
  else
    refresh materialized view public.mv_monthly_revenue;
  end if;
end;
$$;
revoke all on function public.refresh_analytics() from public, anon;
grant execute on function public.refresh_analytics() to authenticated, service_role;

-- Run once after installing to populate both materialized views:
-- select public.refresh_analytics();

-- ---------------------------------------------------------------------------
-- 10. Dashboard overview RPC (single jsonb object; used by app + edge function)
-- ---------------------------------------------------------------------------
drop function if exists public.get_dashboard_overview(uuid, date, date, uuid);
create or replace function public.get_dashboard_overview(
  p_user uuid,
  p_from date default null,
  p_to date default null,
  p_business uuid default null
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'invoiced', coalesce(sum(f.total), 0)::numeric(14,2),
    'paid', coalesce(sum(f.paid), 0)::numeric(14,2),
    'pending', coalesce(sum(f.balance), 0)::numeric(14,2),
    'overdue', coalesce(sum(case when f.balance > 0 and f.due_date < current_date then f.balance else 0 end), 0)::numeric(14,2),
    'invoice_count', count(*)::bigint,
    'avg_invoice_value', coalesce(round(avg(f.total), 2), 0)::numeric(14,2),
    'collection_rate', coalesce(round(case when sum(f.total) > 0 then sum(f.paid) / sum(f.total) * 100 else 0 end, 2), 0)::numeric(10,2)
  )
  from public.v_invoice_facts f
  where f.user_id = p_user
    and f.kind <> 'quotation'
    and (p_from is null or coalesce(f.issue_date, current_date) >= p_from)
    and (p_to is null or coalesce(f.issue_date, current_date) <= p_to)
    and (p_business is null or f.business_id = p_business);
$$;
revoke all on function public.get_dashboard_overview(uuid, date, date, uuid) from public, anon;
grant execute on function public.get_dashboard_overview(uuid, date, date, uuid) to authenticated, service_role;
grant select, insert, update, delete on public.expenses, public.goals, public.dashboard_layouts to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 11. Optional pg_cron scheduling (never fails when the extension is absent)
-- ---------------------------------------------------------------------------
do $cron$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    if not exists (select 1 from cron.job where jobname = 'invix-refresh-analytics') then
      perform cron.schedule('invix-refresh-analytics', '17 * * * *', $$select public.refresh_analytics()$$);
    end if;
  else
    raise notice 'pg_cron is not installed: analytics materialized views will not auto-refresh. Enable it in Extensions, then run: select public.refresh_analytics(); or call the monthly-report edge function from an external scheduler.';
  end if;
end
$cron$;
