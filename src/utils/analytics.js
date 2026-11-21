import { computeTotals, effectiveStatus } from './calc'

/* ==========================================================================
   Invix analytics engine
   Pure functions over the local data model. Every KPI, chart and report is
   derived here so the numbers stay consistent across the whole app.
   ========================================================================== */

export const CHART_COLORS = {
  brand: '#4f46e5', accent: '#14b8a6', success: '#10b981', warning: '#f59e0b',
  danger: '#f43f5e', info: '#3b82f6', violet: '#8b5cf6', slate: '#94a3b8',
}

export const STATUS_COLORS = {
  draft: 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200',
  sent: 'bg-info-100 text-info-700 dark:bg-info-500/15 dark:text-info-200',
  partially: 'bg-warning-100 text-warning-700 dark:bg-warning-500/15 dark:text-warning-200',
  paid: 'bg-success-100 text-success-700 dark:bg-success-500/15 dark:text-success-200',
  overdue: 'bg-danger-100 text-danger-700 dark:bg-danger-500/15 dark:text-danger-200',
}
export const statusLabel = (s) => ({
  draft: 'Draft', sent: 'Sent', partially: 'Partially Paid', paid: 'Paid', overdue: 'Overdue',
}[s] || s)

/* ---------- date helpers ---------- */

const pad = (n) => String(n).padStart(2, '0')
export const isoDay = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const isoMonth = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
const shortMonth = (d) => d.toLocaleDateString('en', { month: 'short' })
const monthLabelFromDate = (d) => d.toLocaleDateString('en', { month: 'short', year: '2-digit' })

export function parseDay(value) {
  if (!value || typeof value !== 'string') return null
  const [y, m, d] = value.slice(0, 10).split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d)
}

const addDaysD = (d, n) => { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() + n); return x }
const startOfMonthD = (d) => new Date(d.getFullYear(), d.getMonth(), 1)
const addMonthsD = (d, n) => new Date(d.getFullYear(), d.getMonth() + n, 1)
const todayD = (now) => new Date(now.getFullYear(), now.getMonth(), now.getDate())
const daysIn = (d) => new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
const mondayOf = (d) => addDaysD(d, -((d.getDay() + 6) % 7))
const sum = (arr, fn) => arr.reduce((s, x) => s + (fn(x) || 0), 0)
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100
const pctChange = (cur, prev) => prev > 0 ? ((cur - prev) / prev) * 100 : (cur > 0 ? 100 : 0)

export const PERIOD_OPTIONS = [
  { id: 'today', label: 'Today' },
  { id: '7d', label: 'Last 7 days' },
  { id: 'thisMonth', label: 'This Month' },
  { id: 'lastMonth', label: 'Last Month' },
  { id: 'thisQuarter', label: 'This Quarter' },
  { id: 'thisFY', label: 'This Financial Year (Apr–Mar)' },
  { id: 'all', label: 'All Time' },
  { id: 'custom', label: 'Custom Range' },
]

/** Resolve a named period into an inclusive YYYY-MM-DD range. */
export function resolvePeriod(id, now = new Date(), custom = {}) {
  const today = todayD(now)
  let from, to, label
  switch (id) {
    case 'today':
      from = to = today; label = 'Today'; break
    case '7d':
      from = addDaysD(today, -6); to = today; label = 'Last 7 days'; break
    case 'lastMonth':
      from = addMonthsD(startOfMonthD(today), -1); to = addDaysD(startOfMonthD(today), -1); label = 'Last Month'; break
    case 'thisQuarter': {
      const q = Math.floor(today.getMonth() / 3)
      from = new Date(today.getFullYear(), q * 3, 1); to = today; label = `Quarter ${q + 1} · ${today.getFullYear()}`; break
    }
    case 'thisFY': {
      const sy = today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1
      from = new Date(sy, 3, 1); to = today; label = `FY ${sy}–${String(sy + 1).slice(2)}`; break
    }
    case 'all':
      from = new Date(2000, 0, 1); to = today; label = 'All Time'; break
    case 'custom': {
      from = parseDay(custom.from) || startOfMonthD(today)
      to = parseDay(custom.to) || today
      label = `${custom.from || isoDay(from)} → ${custom.to || isoDay(to)}`; break
    }
    case 'thisMonth':
    default:
      from = startOfMonthD(today); to = today; label = 'This Month'
  }
  if (from > to) [from, to] = [to, from]
  return { id, from: isoDay(from), to: isoDay(to), label, fromDate: from, toDate: to }
}

/** Derive the compare window for a resolved range. */
export function deriveComparison(range, mode = 'previous') {
  if (!range || mode === 'none') return null
  if (mode === 'lastYear') {
    const f = parseDay(range.from), t = parseDay(range.to)
    const shift = (d) => new Date(d.getFullYear() - 1, d.getMonth(), Math.min(d.getDate(), daysIn(new Date(d.getFullYear() - 1, d.getMonth(), 1))))
    const fy = shift(f), ty = shift(t)
    return { id: 'lastYear', from: isoDay(fy), to: isoDay(ty), label: 'Same period last year', fromDate: fy, toDate: ty }
  }
  const len = Math.round((range.toDate - range.fromDate) / 86400000) + 1
  const pt = addDaysD(range.fromDate, -1)
  const pf = addDaysD(pt, -(len - 1))
  return { id: 'previous', from: isoDay(pf), to: isoDay(pt), label: 'Previous period', fromDate: pf, toDate: pt }
}

export const inRange = (dateStr, range) => !range || (!!dateStr && dateStr >= range.from && dateStr <= range.to)

/** Enrich invoices with totals, status and derived fields. */
export function buildFacts(invoices = [], businessId = null, now = new Date()) {
  const today = todayD(now)
  return (invoices || [])
    .filter((inv) => inv && inv.kind !== 'quotation')
    .filter((inv) => !businessId || (inv.business?.id || null) === businessId)
    .map((inv) => {
      const totals = computeTotals(inv)
      const status = effectiveStatus(inv, totals)
      const dueDate = inv.dueDate || ''
      const due = parseDay(dueDate)
      return {
        invoice: inv, id: inv.id, number: inv.number || '—', status,
        date: inv.issueDate || (inv.createdAt || '').slice(0, 10) || '', dueDate,
        clientId: inv.client?.id || inv.client?.name || 'unknown', clientName: inv.client?.name || 'Unnamed client',
        client: inv.client, currency: inv.currency || 'INR',
        total: totals.total, paid: totals.paid, balance: totals.balance, tax: totals.taxTotal,
        subtotal: totals.subtotal, discount: totals.discountAmount, lines: totals.lines || [],
        taxBreakdown: totals.taxBreakdown || [], totals,
        daysOverdue: status === 'overdue' && due ? Math.max(0, Math.round((today - due) / 86400000)) : 0,
      }
    })
}

/** Flatten all payments with their invoice context. */
export function collectPayments(invoices = [], businessId = null) {
  return (invoices || [])
    .filter((inv) => inv && inv.kind !== 'quotation')
    .filter((inv) => !businessId || (inv.business?.id || null) === businessId)
    .flatMap((inv) => (inv.payments || []).map((p) => ({
      ...p, id: p.id || `${inv.id}-${p.date}`, invoiceId: inv.id, invoiceNumber: inv.number,
      clientId: inv.client?.id || inv.client?.name || 'unknown', clientName: inv.client?.name || 'Unnamed client',
      date: p.date || inv.issueDate || '', method: p.method || 'other', currency: inv.currency || 'INR',
      amount: Number(p.amount) || 0,
    })))
}

const filterPayments = (payments, range) => payments.filter((p) => inRange(p.date, range))

/* ---------- KPI cards ---------- */

function kpiValues(facts, payments) {
  const active = facts.filter((f) => f.status !== 'draft')
  const invoiced = sum(facts, (f) => f.total)
  const revenue = sum(active, (f) => f.total)
  const collected = sum(payments, (p) => p.amount)
  const pending = sum(active.filter((f) => f.balance > 0.009), (f) => f.balance)
  const overdue = sum(active.filter((f) => f.status === 'overdue'), (f) => f.balance)
  const count = active.length
  return {
    invoiced, revenue, collected, pending, overdue, count,
    avg: count ? revenue / count : 0,
    collectionRate: revenue > 0 ? Math.min(100, (collected / revenue) * 100) : 0,
  }
}

function bucketValues(facts, payments, range, count, metric) {
  if (!range) return []
  const from = range.fromDate, to = range.toDate
  const totalDays = Math.max(1, Math.round((to - from) / 86400000) + 1)
  const step = totalDays / count
  const out = []
  for (let i = 0; i < count; i++) {
    const bFrom = addDaysD(from, Math.floor(i * step))
    const bTo = i === count - 1 ? to : addDaysD(from, Math.floor((i + 1) * step) - 1)
    const a = isoDay(bFrom), b = isoDay(bTo)
    out.push(metric(facts.filter((f) => f.date >= a && f.date <= b), payments.filter((p) => p.date >= a && p.date <= b)))
  }
  return out
}

/**
 * Eight headline KPIs with % change vs the comparison window and sparklines.
 */
export function computeKPIs({ facts = [], payments = [], compareFacts = [], comparePayments = [], range = null, currency = 'INR' }) {
  const cur = kpiValues(facts, payments)
  const prev = kpiValues(compareFacts, comparePayments)
  const sparks = {
    revenue: bucketValues(facts, payments, range, 10, (fs) => sum(fs.filter((f) => f.status !== 'draft'), (f) => f.total)),
    invoiced: bucketValues(facts, payments, range, 10, (fs) => sum(fs, (f) => f.total)),
    paid: bucketValues(facts, payments, range, 10, (_fs, ps) => sum(ps, (p) => p.amount)),
    pending: bucketValues(facts, payments, range, 10, (fs) => sum(fs.filter((f) => f.status !== 'draft' && f.balance > 0), (f) => f.balance)),
    overdue: bucketValues(facts, payments, range, 10, (fs) => sum(fs.filter((f) => f.status === 'overdue'), (f) => f.balance)),
    count: bucketValues(facts, payments, range, 10, (fs) => fs.filter((f) => f.status !== 'draft').length),
    avg: bucketValues(facts, payments, range, 10, (fs) => { const a = fs.filter((f) => f.status !== 'draft'); return a.length ? sum(a, (f) => f.total) / a.length : 0 }),
    rate: bucketValues(facts, payments, range, 10, (fs, ps) => { const r = sum(fs.filter((f) => f.status !== 'draft'), (f) => f.total); return r ? Math.min(100, sum(ps, (p) => p.amount) / r * 100) : 0 }),
  }
  const defs = [
    { key: 'revenue', label: 'Total Revenue', icon: 'trend', color: 'brand', value: cur.revenue, prev: prev.revenue, format: 'money', hint: 'Value of issued (non-draft) invoices' },
    { key: 'invoiced', label: 'Total Invoiced', icon: 'invoice', color: 'info', value: cur.invoiced, prev: prev.invoiced, format: 'money', hint: 'All invoices created in the period' },
    { key: 'paid', label: 'Paid', icon: 'check', color: 'success', value: cur.collected, prev: prev.collected, format: 'money', hint: 'Payments received in the period' },
    { key: 'pending', label: 'Pending', icon: 'clock', color: 'warning', value: cur.pending, prev: prev.pending, format: 'money', lowerBetter: true, hint: 'Unpaid balance on issued invoices' },
    { key: 'overdue', label: 'Overdue', icon: 'alert', color: 'danger', value: cur.overdue, prev: prev.overdue, format: 'money', lowerBetter: true, hint: 'Balance past its due date' },
    { key: 'count', label: 'Invoices Count', icon: 'file', color: 'violet', value: cur.count, prev: prev.count, format: 'number', hint: 'Number of issued invoices' },
    { key: 'avg', label: 'Average Invoice Value', icon: 'wallet', color: 'accent', value: cur.avg, prev: prev.avg, format: 'money', hint: 'Revenue ÷ invoice count' },
    { key: 'rate', label: 'Collection Rate', icon: 'percent', color: 'slate', value: cur.collectionRate, prev: prev.collectionRate, format: 'percent', hint: 'Collected ÷ revenue (capped at 100%)' },
  ]
  const cards = defs.map((d) => {
    const change = round2(pctChange(d.value, d.prev))
    const good = d.lowerBetter ? change < 0 : change > 0
    return {
      ...d, change, good, neutral: Math.abs(change) < 0.05, spark: sparks[d.key] || [],
      formatted: d.format === 'money' ? d.value : d.format === 'percent' ? `${d.value.toFixed(1)}%` : Math.round(d.value).toLocaleString('en-IN'),
    }
  })
  return { cards, metrics: cur, previous: prev }
}

/* ---------- revenue series ---------- */

export function monthlyAnalytics(facts = [], payments = [], monthsBack = 12, now = new Date()) {
  const buckets = new Map()
  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = isoMonth(d)
    buckets.set(key, { key, label: monthLabelFromDate(d), invoiced: 0, collected: 0, pending: 0, count: 0, tax: 0, priorYear: 0 })
  }
  for (const f of facts) {
    const b = buckets.get((f.date || '').slice(0, 7))
    if (!b || f.status === 'draft') continue
    b.invoiced += f.total; b.count += 1; b.tax += f.tax
    if (f.balance > 0.009) b.pending += f.balance
  }
  for (const p of payments) {
    const b = buckets.get((p.date || '').slice(0, 7))
    if (b) b.collected += p.amount
  }
  const series = [...buckets.values()]
  for (const b of series) {
    const [y, m] = b.key.split('-').map(Number)
    const lyKey = `${y - 1}-${pad(m)}`
    const ly = buckets.get(lyKey)
    b.priorYear = ly ? ly.invoiced : 0
  }
  return series
}

/** Legacy shape used by the basic Reports page. */
export function monthlySeries(data, monthsBack = 12) {
  const invoices = data?.invoices || []
  return monthlyAnalytics(buildFacts(invoices), collectPayments(invoices), monthsBack).map((m) => ({ key: m.key, value: m.invoiced }))
}

export function computeStats(data) {
  const invoices = data?.invoices || []
  const m = computeKPIs({ facts: buildFacts(invoices), payments: collectPayments(invoices), range: null }).metrics
  return { totalInvoiced: m.revenue, paid: m.collected, pending: m.pending, overdue: m.overdue }
}

const bucketKeyFor = (dateStr, granularity) => {
  const d = parseDay(dateStr)
  if (!d) return ''
  switch (granularity) {
    case 'daily': return isoDay(d)
    case 'weekly': return isoDay(mondayOf(d))
    case 'quarterly': return `${d.getFullYear()}-Q${Math.floor(d.getMonth() / 3) + 1}`
    case 'yearly': return String(d.getFullYear())
    default: return isoMonth(d)
  }
}

function bucketLabel(key, granularity) {
  if (!key) return ''
  if (granularity === 'daily') { const d = parseDay(key); return d ? `${d.getDate()} ${shortMonth(d)}` : key }
  if (granularity === 'weekly') { const d = parseDay(key); return d ? `Wk ${d.getDate()}/${d.getMonth() + 1}` : key }
  if (granularity === 'quarterly') { const [y, q] = key.split('-'); return `${q} '${y.slice(2)}` }
  return key
}

/** Daily / weekly / monthly / quarterly / yearly revenue trend. */
export function trendAnalytics(facts = [], payments = [], granularity = 'monthly', periods = 12, now = new Date()) {
  const today = todayD(now)
  const keys = []
  for (let i = periods - 1; i >= 0; i--) {
    let d
    if (granularity === 'daily') d = addDaysD(today, -i)
    else if (granularity === 'weekly') d = addDaysD(mondayOf(today), -i * 7)
    else if (granularity === 'quarterly') d = new Date(today.getFullYear(), today.getMonth() - i * 3, 1)
    else if (granularity === 'yearly') d = new Date(today.getFullYear() - i, 0, 1)
    else d = new Date(today.getFullYear(), today.getMonth() - i, 1)
    keys.push(bucketKeyFor(isoDay(d), granularity))
  }
  const buckets = new Map(keys.map((k) => [k, { key: k, label: bucketLabel(k, granularity), invoiced: 0, collected: 0, pending: 0, count: 0 }]))
  for (const f of facts) {
    const b = buckets.get(bucketKeyFor(f.date, granularity))
    if (!b || f.status === 'draft') continue
    b.invoiced += f.total; b.count += 1
    if (f.balance > 0.009) b.pending += f.balance
  }
  for (const p of payments) {
    const b = buckets.get(bucketKeyFor(p.date, granularity))
    if (b) b.collected += p.amount
  }
  return [...buckets.values()]
}

export function cumulativeSeries(series = []) {
  let c = 0
  return series.map((d) => ({ key: d.key, label: d.label, cumulative: round2(c += d.invoiced) }))
}

export function salesHighlights(monthly = [], facts = []) {
  const withData = monthly.filter((m) => m.invoiced > 0)
  const best = withData.reduce((a, b) => (!a || b.invoiced > a.invoiced ? b : a), null)
  const worst = withData.reduce((a, b) => (!a || b.invoiced < a.invoiced ? b : a), null)
  const last = monthly[monthly.length - 1], prev = monthly[monthly.length - 2]
  const biggest = [...facts].filter((f) => f.status !== 'draft').sort((a, b) => b.total - a.total)[0] || null
  const dayMap = new Map()
  for (const f of facts) {
    if (f.status === 'draft' || !f.date) continue
    dayMap.set(f.date, (dayMap.get(f.date) || 0) + f.total)
  }
  const topDay = [...dayMap.entries()].sort((a, b) => b[1] - a[1])[0] || null
  return {
    best, worst, biggest,
    momGrowth: round2(prev && prev.invoiced > 0 ? ((last.invoiced - prev.invoiced) / prev.invoiced) * 100 : 0),
    topDay: topDay ? { date: topDay[0], amount: topDay[1] } : null,
  }
}

export function forecastSeries(monthly = [], count = 3) {
  if (!monthly.length) return []
  const vals = monthly.slice(-6).map((m) => m.invoiced)
  const last3 = vals.slice(-3)
  const ma = sum(last3, (v) => v) / last3.length
  const slope = last3.length > 1 ? (last3[last3.length - 1] - last3[0]) / (last3.length - 1) : 0
  const [y, m] = monthly[monthly.length - 1].key.split('-').map(Number)
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(y, m - 1 + i + 1, 1)
    const base = Math.max(0, ma + slope * (i + 1))
    return { key: isoMonth(d), label: monthLabelFromDate(d), forecast: Math.round(base), low: Math.round(base * 0.88), high: Math.round(base * 1.12) }
  })
}

/** Financial-year (Apr–Mar) quarter breakdown. */
export function fySummary(facts = [], payments = [], fyStartYear, now = new Date()) {
  const sy = fyStartYear ?? (now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1)
  const start = new Date(sy, 3, 1), end = new Date(sy + 1, 2, 31)
  const quarters = ['Q1', 'Q2', 'Q3', 'Q4'].map((label, i) => ({
    label, period: ['Apr–Jun', 'Jul–Sep', 'Oct–Dec', 'Jan–Mar'][i], invoiced: 0, collected: 0, count: 0,
  }))
  const qIndex = (d) => (d.getMonth() >= 3 && d.getMonth() <= 5 ? 0 : d.getMonth() >= 6 && d.getMonth() <= 8 ? 1 : d.getMonth() >= 9 && d.getMonth() <= 11 ? 2 : 3)
  for (const f of facts) {
    if (f.status === 'draft') continue
    const d = parseDay(f.date)
    if (!d || d < start || d > end) continue
    const q = quarters[qIndex(d)]; q.invoiced += f.total; q.count += 1
  }
  for (const p of payments) {
    const d = parseDay(p.date)
    if (!d || d < start || d > end) continue
    quarters[qIndex(d)].collected += p.amount
  }
  return {
    label: `FY ${sy}–${String(sy + 1).slice(2)}`, quarters,
    total: round2(sum(quarters, (q) => q.invoiced)), collected: round2(sum(quarters, (q) => q.collected)),
  }
}

/* ---------- client analytics ---------- */

export function clientAnalytics(facts = [], payments = []) {
  const map = new Map()
  const get = (id) => {
    if (!map.has(id)) map.set(id, {
      id, name: '', revenue: 0, outstanding: 0, overdue: 0, count: 0,
      paidCount: 0, paymentDays: [], lateCount: 0, firstDate: '', lastDate: '',
    })
    return map.get(id)
  }
  for (const f of facts) {
    if (f.status === 'draft') continue
    const c = get(f.clientId)
    c.name = f.clientName
    c.revenue += f.total
    if (f.balance > 0.009) c.outstanding += f.balance
    if (f.status === 'overdue') { c.overdue += f.balance; c.lateCount += 1 }
    if (f.status === 'paid') c.paidCount += 1
    c.count += 1
    if (!c.firstDate || f.date < c.firstDate) c.firstDate = f.date
    if (!c.lastDate || f.date > c.lastDate) c.lastDate = f.date
  }
  const byInvoice = new Map(facts.map((f) => [f.id, f]))
  for (const p of payments) {
    const f = byInvoice.get(p.invoiceId)
    if (!f) continue
    const c = get(f.clientId)
    const a = parseDay(p.date), b = parseDay(f.date)
    if (a && b) {
      const days = Math.max(0, Math.round((a - b) / 86400000))
      if (Number.isFinite(days)) c.paymentDays.push(days)
    }
    if (f.dueDate && p.date > f.dueDate) c.lateCount += 1
  }
  const list = [...map.values()].map((c) => {
    const avgDays = c.paymentDays.length ? c.paymentDays.reduce((a, b) => a + b, 0) / c.paymentDays.length : null
    let risk = 0
    if (c.outstanding > 0) risk += 20
    risk += Math.min(40, (c.overdue / (c.revenue || 1)) * 60)
    if (avgDays && avgDays > 30) risk += 15
    if (c.lateCount > 0) risk += Math.min(15, c.lateCount * 5)
    risk = Math.min(100, Math.round(risk))
    return {
      ...c, avgDays: avgDays == null ? null : round2(avgDays), risk,
      riskLabel: risk >= 60 ? 'High' : risk >= 30 ? 'Medium' : 'Low',
      lifetimeValue: c.revenue, type: c.count > 1 ? 'Repeat' : 'New',
    }
  }).sort((a, b) => b.revenue - a.revenue)
  return {
    list, top: list.slice(0, 10),
    newCount: list.filter((c) => c.type === 'New').length,
    repeatCount: list.filter((c) => c.type === 'Repeat').length,
    atRisk: list.filter((c) => c.risk >= 60).length,
    totalClients: list.length,
  }
}

/* ---------- product / service analytics ---------- */

export function productAnalytics(facts = [], catalog = []) {
  const catMap = new Map((catalog || []).map((i) => [i.name, i.category || 'Other']))
  const map = new Map()
  for (const f of facts) {
    if (f.status === 'draft') continue
    for (const line of f.lines) {
      const name = line.description || 'Unnamed item'
      if (!map.has(name)) map.set(name, { name, revenue: 0, qty: 0, count: 0, discount: 0, tax: 0, category: catMap.get(name) || 'Other' })
      const p = map.get(name)
      p.revenue += line.net || 0
      p.qty += Number(line.quantity) || 0
      p.discount += line.discount || 0
      p.tax += line.taxAmount || 0
      p.count += 1
    }
  }
  const list = [...map.values()].sort((a, b) => b.revenue - a.revenue).map((p) => ({ ...p, revenue: round2(p.revenue), avgPrice: p.qty ? round2(p.revenue / p.qty) : 0 }))
  const catMap2 = new Map()
  for (const p of list) catMap2.set(p.category, (catMap2.get(p.category) || 0) + p.revenue)
  const categories = [...catMap2.entries()].map(([name, value]) => ({ name, value: round2(value) })).sort((a, b) => b.value - a.value)
  const totalRev = sum(list, (p) => p.revenue)
  const totalQty = sum(list, (p) => p.qty)
  const totalDiscount = sum(list, (p) => p.discount)
  return {
    list, top: list.slice(0, 10), categories,
    avgPrice: totalQty ? round2(totalRev / totalQty) : 0,
    totalDiscount: round2(totalDiscount),
    discountPct: round2(totalRev + totalDiscount > 0 ? (totalDiscount / (totalRev + totalDiscount)) * 100 : 0),
  }
}

/* ---------- payment & receivables analytics ---------- */

const PAYMENT_METHODS = [
  { id: 'upi', label: 'UPI', color: CHART_COLORS.brand },
  { id: 'bank', label: 'Bank Transfer', color: CHART_COLORS.accent },
  { id: 'cash', label: 'Cash', color: CHART_COLORS.success },
  { id: 'card', label: 'Card', color: CHART_COLORS.warning },
  { id: 'cheque', label: 'Cheque', color: CHART_COLORS.violet },
  { id: 'other', label: 'Other', color: CHART_COLORS.slate },
]

export function paymentAnalytics(facts = [], payments = [], now = new Date()) {
  const today = todayD(now)
  const aging = [
    { key: '0-30', label: '0–30 days', amount: 0, count: 0, color: CHART_COLORS.success },
    { key: '31-60', label: '31–60 days', amount: 0, count: 0, color: CHART_COLORS.warning },
    { key: '61-90', label: '61–90 days', amount: 0, count: 0, color: '#f97316' },
    { key: '90+', label: '90+ days', amount: 0, count: 0, color: CHART_COLORS.danger },
  ]
  for (const f of facts) {
    if (f.status === 'draft' || f.balance <= 0.009) continue
    const due = parseDay(f.dueDate || f.date) || today
    const days = Math.round((today - due) / 86400000)
    const b = aging[days <= 30 ? 0 : days <= 60 ? 1 : days <= 90 ? 2 : 3]
    b.amount += f.balance; b.count += 1
  }
  for (const b of aging) b.amount = round2(b.amount)

  const statusGroups = { paid: { value: 0, count: 0 }, partially: { value: 0, count: 0 }, unpaid: { value: 0, count: 0 }, overdue: { value: 0, count: 0 } }
  for (const f of facts) {
    if (f.status === 'draft') continue
    const g = statusGroups[f.status] || statusGroups.unpaid
    g.value += f.status === 'paid' ? f.total : f.balance
    g.count += 1
  }
  const status = [
    { name: 'Paid', ...statusGroups.paid, color: CHART_COLORS.success },
    { name: 'Partial', ...statusGroups.partially, color: CHART_COLORS.warning },
    { name: 'Unpaid', ...statusGroups.unpaid, color: CHART_COLORS.info },
    { name: 'Overdue', ...statusGroups.overdue, color: CHART_COLORS.danger },
  ].map((s) => ({ ...s, value: round2(s.value) }))

  const methodMap = new Map(PAYMENT_METHODS.map((m) => [m.id, { ...m, value: 0, count: 0 }]))
  for (const p of payments) {
    const m = methodMap.get(p.method) || methodMap.get('other')
    m.value += p.amount; m.count += 1
  }
  const methods = [...methodMap.values()].filter((m) => m.count > 0).map((m) => ({ ...m, value: round2(m.value) }))

  const byInvoice = new Map(facts.map((f) => [f.id, f]))
  const paidDays = []
  let onTime = 0, late = 0
  for (const p of payments) {
    const f = byInvoice.get(p.invoiceId)
    if (f && f.status === 'paid') {
      const a = parseDay(p.date), b = parseDay(f.date)
      if (a && b) paidDays.push(Math.max(0, Math.round((a - b) / 86400000)))
    }
    if (f?.dueDate) { if (p.date <= f.dueDate) onTime += 1; else late += 1 }
  }
  const avgDaysToPaid = paidDays.length ? round2(paidDays.reduce((a, b) => a + b, 0) / paidDays.length) : null
  const totalPayments = onTime + late

  const cashflow = []
  for (let i = 0; i < 8; i++) {
    const ws = addDaysD(today, i * 7 - ((today.getDay() + 6) % 7))
    const we = addDaysD(ws, 6)
    const expected = sum(facts.filter((f) => {
      if (f.status === 'draft' || f.balance <= 0.009 || !f.dueDate) return false
      const d = parseDay(f.dueDate)
      return d && d >= ws && d <= we
    }), (f) => f.balance)
    cashflow.push({ key: isoDay(ws), label: `${ws.getDate()}/${ws.getMonth() + 1}`, expected: round2(expected) })
  }

  const alerts = facts.filter((f) => f.status === 'overdue' && f.daysOverdue > 0)
    .sort((a, b) => b.daysOverdue - a.daysOverdue).slice(0, 12)

  return {
    aging, status, methods, avgDaysToPaid, onTime, late,
    onTimeRate: totalPayments ? round2((onTime / totalPayments) * 100) : 0,
    cashflow, alerts,
    totalOutstanding: round2(sum(facts.filter((f) => f.status !== 'draft' && f.balance > 0), (f) => f.balance)),
  }
}

/* ---------- GST / tax analytics ---------- */

export function taxAnalytics(facts = [], monthsBack = 12, now = new Date()) {
  const months = Array.from({ length: monthsBack }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (monthsBack - 1 - i), 1)
    return { key: isoMonth(d), label: monthLabelFromDate(d), cgst: 0, sgst: 0, igst: 0, taxable: 0, tax: 0 }
  })
  const monthMap = new Map(months.map((m) => [m.key, m]))
  const slabs = [5, 12, 18, 28].map((rate) => ({ rate, taxable: 0, tax: 0, count: 0 }))
  const otherSlab = { rate: 0, taxable: 0, tax: 0, count: 0 }
  const totals = { cgst: 0, sgst: 0, igst: 0, taxable: 0, tax: 0 }

  for (const f of facts) {
    if (f.status === 'draft' || !f.date) continue
    const m = monthMap.get(f.date.slice(0, 7))
    const parts = { cgst: 0, sgst: 0, igst: 0 }
    for (const b of f.taxBreakdown) {
      if (b.name.startsWith('CGST')) parts.cgst += b.amount
      else if (b.name.startsWith('SGST')) parts.sgst += b.amount
      else if (b.name.startsWith('IGST')) parts.igst += b.amount
    }
    const tax = parts.cgst + parts.sgst + parts.igst
    totals.cgst += parts.cgst; totals.sgst += parts.sgst; totals.igst += parts.igst
    totals.tax += tax; totals.taxable += f.subtotal
    if (m) { m.cgst += parts.cgst; m.sgst += parts.sgst; m.igst += parts.igst; m.tax += tax; m.taxable += f.subtotal }
    for (const line of f.lines) {
      const r = Number(line.taxRate) || 0
      const s = slabs.find((x) => x.rate === r) || otherSlab
      s.taxable += line.net || 0; s.tax += line.taxAmount || 0; s.count += 1
    }
  }
  Object.keys(totals).forEach((k) => { totals[k] = round2(totals[k]) })
  months.forEach((m) => { m.cgst = round2(m.cgst); m.sgst = round2(m.sgst); m.igst = round2(m.igst); m.tax = round2(m.tax); m.taxable = round2(m.taxable) })

  const qBuckets = new Map()
  for (const m of months) {
    const [y, mo] = m.key.split('-').map(Number)
    const key = `${y}-Q${Math.floor((mo - 1) / 3) + 1}`
    if (!qBuckets.has(key)) qBuckets.set(key, { key, label: `Q${Math.floor((mo - 1) / 3) + 1} '${String(y).slice(2)}`, cgst: 0, sgst: 0, igst: 0, taxable: 0, tax: 0 })
    const q = qBuckets.get(key)
    q.cgst += m.cgst; q.sgst += m.sgst; q.igst += m.igst; q.taxable += m.taxable; q.tax += m.tax
  }

  const gstr1 = facts.filter((f) => f.status !== 'draft').map((f) => {
    const parts = { cgst: 0, sgst: 0, igst: 0 }
    for (const b of f.taxBreakdown) {
      if (b.name.startsWith('CGST')) parts.cgst += b.amount
      else if (b.name.startsWith('SGST')) parts.sgst += b.amount
      else if (b.name.startsWith('IGST')) parts.igst += b.amount
    }
    return {
      'Invoice No': f.number, 'Date': f.date, 'Customer': f.clientName,
      'GSTIN': f.client?.gstin || '', 'HSN/SAC': [...new Set(f.lines.map((l) => l.hsn).filter(Boolean))].join(', '),
      'Taxable Value': round2(f.subtotal), 'Tax Rate %': [...new Set(f.lines.map((l) => l.taxRate).filter(Boolean))].join(', '),
      'CGST': round2(parts.cgst), 'SGST': round2(parts.sgst), 'IGST': round2(parts.igst),
      'Total Tax': round2(parts.cgst + parts.sgst + parts.igst), 'Invoice Total': round2(f.total),
    }
  })

  return { months, quarterly: [...qBuckets.values()], slabs: [...slabs, otherSlab].filter((s) => s.count > 0), totals, gstr1 }
}

/* Expenses, goals, insights and notifications live in ./analyticsExtras.js */
