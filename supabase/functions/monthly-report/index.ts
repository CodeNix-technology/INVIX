/*
 * Invix — monthly-report Supabase Edge Function
 * ---------------------------------------------------------------------------
 * Sends each signed-in user a last-month performance email (KPIs + top 5
 * clients). Safe to call from pg_cron/pg_net or any external scheduler.
 *
 * Required environment variables (Supabase → Project Settings → Edge
 * Functions → Secrets, or `supabase secrets set ...`):
 *   SUPABASE_URL                - project URL (provided by Supabase)
 *   SUPABASE_SERVICE_ROLE_KEY   - service role key (provided by Supabase)
 *   INVIX_CRON_SECRET           - shared secret callers must send in the
 *                                 `x-invix-cron-secret` request header
 * Optional:
 *   RESEND_API_KEY              - Resend API key; when absent the email body
 *                                 is logged instead of being delivered
 *   REPORT_FROM_EMAIL           - From address, default: Invix <reports@invix.app>
 *
 * Invoke:
 *   curl -X POST "$SUPABASE_URL/functions/v1/monthly-report" \
 *     -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
 *     -H "x-invix-cron-secret: $INVIX_CRON_SECRET"
 *
 * The SQL side (schema.sql) exposes the get_dashboard_overview RPC and the
 * v_client_stats view used below.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-invix-cron-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

type JsonRecord = Record<string, unknown>

const jsonResponse = (body: JsonRecord, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

const asNumber = (value: unknown): number => {
  const n = Number(value ?? 0)
  return Number.isFinite(n) ? n : 0
}

const escapeHtml = (value: unknown): string =>
  String(value ?? '').replace(/[&<>"']/g, (char) => {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }
    return map[char] ?? char
  })

const money = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
})
const formatMoney = (value: unknown): string => money.format(asNumber(value))

const isoDate = (date: Date): string => date.toISOString().slice(0, 10)

/** First and last day of the previous calendar month, in UTC. */
function lastMonthRange(now = new Date()) {
  const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1))
  const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0))
  const label = from.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
  return { from: isoDate(from), to: isoDate(to), label }
}

function buildHtml(
  label: string,
  from: string,
  to: string,
  overview: JsonRecord | null,
  clients: JsonRecord[],
): string {
  const kpis: Array<[string, string]> = [
    ['Invoiced', formatMoney(overview?.invoiced)],
    ['Collected', formatMoney(overview?.paid)],
    ['Pending', formatMoney(overview?.pending)],
    ['Overdue', formatMoney(overview?.overdue)],
    ['Invoices', String(asNumber(overview?.invoice_count))],
    ['Avg. invoice', formatMoney(overview?.avg_invoice_value)],
    ['Collection rate', `${asNumber(overview?.collection_rate).toFixed(1)}%`],
  ]

  const kpiHtml = kpis
    .map(
      ([name, value]) =>
        `<div style="flex:1 1 30%;min-width:150px;padding:14px;border:1px solid #e2e8f0;border-radius:10px;">
           <div style="font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:.04em;">${escapeHtml(name)}</div>
           <div style="font-size:20px;font-weight:700;color:#0f172a;margin-top:6px;">${escapeHtml(value)}</div>
         </div>`,
    )
    .join('')

  const rows = clients.length
    ? clients
        .map(
          (client) => `<tr>
            <td style="padding:10px;border-bottom:1px solid #e2e8f0;">${escapeHtml(client.client_name || 'Unnamed client')}</td>
            <td style="padding:10px;border-bottom:1px solid #e2e8f0;text-align:right;">${formatMoney(client.revenue)}</td>
            <td style="padding:10px;border-bottom:1px solid #e2e8f0;text-align:right;">${formatMoney(client.outstanding)}</td>
            <td style="padding:10px;border-bottom:1px solid #e2e8f0;text-align:right;">${asNumber(client.invoice_count)}</td>
          </tr>`,
        )
        .join('')
    : `<tr><td colspan="4" style="padding:14px;text-align:center;color:#64748b;">No client activity in this period.</td></tr>`

  return `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f8fafc;font-family:Inter,Arial,sans-serif;color:#0f172a;">
    <div style="max-width:680px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e2e8f0;">
      <div style="padding:22px 24px;background:#0f172a;color:#ffffff;">
        <div style="font-size:20px;font-weight:800;letter-spacing:-.02em;">Invix</div>
        <div style="font-size:13px;color:#cbd5e1;margin-top:4px;">Monthly performance report · ${escapeHtml(label)}</div>
      </div>
      <div style="padding:24px;">
        <p style="margin:0 0 18px;font-size:14px;color:#475569;">
          Here is your invoice summary for <strong>${escapeHtml(from)}</strong> to <strong>${escapeHtml(to)}</strong>.
        </p>
        <div style="display:flex;flex-wrap:wrap;gap:10px;">${kpiHtml}</div>
        <h2 style="font-size:16px;margin:28px 0 10px;">Top clients</h2>
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead>
            <tr style="background:#f1f5f9;text-align:left;">
              <th style="padding:10px;">Client</th>
              <th style="padding:10px;text-align:right;">Revenue</th>
              <th style="padding:10px;text-align:right;">Outstanding</th>
              <th style="padding:10px;text-align:right;">Invoices</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <p style="margin:24px 0 0;font-size:12px;color:#94a3b8;">
          Generated automatically by Invix. Open your dashboard for the full breakdown.
        </p>
      </div>
    </div>
  </body>
</html>`
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed; use POST' }, 405)
  }

  const cronSecret = Deno.env.get('INVIX_CRON_SECRET')
  if (!cronSecret) {
    return jsonResponse({ error: 'INVIX_CRON_SECRET is not configured' }, 500)
  }
  if (req.headers.get('x-invix-cron-secret') !== cronSecret) {
    return jsonResponse({ error: 'Unauthorized' }, 401)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse(
      { error: 'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured' },
      500,
    )
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const resendKey = Deno.env.get('RESEND_API_KEY')
  const fromEmail = Deno.env.get('REPORT_FROM_EMAIL') || 'Invix <reports@invix.app>'
  const { from, to, label } = lastMonthRange()

  try {
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, name')
      .not('email', 'is', null)

    if (profileError) {
      console.error('[monthly-report] profile query failed:', profileError.message)
      return jsonResponse({ error: profileError.message }, 500)
    }

    let sent = 0
    let logged = 0
    let skipped = 0
    const errors: Array<{ user_id: string; error: string }> = []

    for (const profile of profiles ?? []) {
      if (!profile.email) {
        skipped += 1
        continue
      }

      try {
        const [overviewResult, clientsResult] = await Promise.all([
          supabase.rpc('get_dashboard_overview', {
            p_user: profile.id,
            p_from: from,
            p_to: to,
          }),
          supabase
            .from('v_client_stats')
            .select('client_id, client_name, revenue, outstanding, invoice_count')
            .eq('user_id', profile.id)
            .order('revenue', { ascending: false })
            .limit(5),
        ])

        if (overviewResult.error) throw overviewResult.error
        if (clientsResult.error) throw clientsResult.error

        const overview = (overviewResult.data ?? {}) as JsonRecord
        const clients = (clientsResult.data ?? []) as JsonRecord[]
        const html = buildHtml(label, from, to, overview, clients)
        const payload = {
          from: fromEmail,
          to: [profile.email],
          subject: `Your Invix report for ${label}`,
          html,
        }

        if (resendKey) {
          const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${resendKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          })
          if (!response.ok) {
            throw new Error(`Resend returned ${response.status}: ${await response.text()}`)
          }
          sent += 1
        } else {
          console.log(
            `[monthly-report] RESEND_API_KEY not set; payload for ${profile.email}:`,
            JSON.stringify(payload),
          )
          logged += 1
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        console.error(`[monthly-report] failed for ${profile.id}:`, message)
        errors.push({ user_id: profile.id, error: message })
      }
    }

    return jsonResponse({
      ok: true,
      month: label,
      from,
      to,
      recipients: (profiles ?? []).length,
      sent,
      logged,
      skipped,
      errors,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[monthly-report] unexpected error:', message)
    return jsonResponse({ error: message }, 500)
  }
})
