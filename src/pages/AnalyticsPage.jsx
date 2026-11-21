import React, { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useData, emptyExpense } from '../store/data'
import { useUI } from '../store/ui'
import { useAnalytics } from '../hooks/useAnalytics'
import { PERIOD_OPTIONS, CHART_COLORS } from '../utils/analytics'
import { EXPENSE_CATEGORIES } from '../utils/analyticsExtras'
import { formatMoney, currencySymbol } from '../utils/currency'
import { formatDate } from '../utils/date'
import { readFileAsDataURL } from '../utils/files'
import {
  Modal, ConfirmModal, Input, Select, Textarea, EmptyState,
} from '../components/ui'
import {
  IconChart, IconUsers, IconPackage, IconWallet, IconTarget, IconSparkle,
  IconAlert, IconCheck, IconCheckCircle, IconClock, IconSend, IconPlus,
  IconTrash, IconPencil, IconDownload, IconTable, IconFileDown, IconPercent,
  IconReceipt, IconBell, IconArrowRight, IconTrendingUp, IconTrendingDown,
  IconTag, IconChevronDown, IconCalendar, IconFilter, IconRotate, IconZoomIn,
  IconPrinter, IconInfo, IconX,
} from '../components/icons'
import {
  DonutChart, AgingChart, CashflowChart, TaxChart, RankedBars,
} from '../components/analytics/charts'
import { exportRowsCSV, exportRowsXLS, exportRowsPDF } from '../components/analytics/exportUtils'

const TABS = [
  { id: 'sales', label: 'Sales & Revenue', icon: IconChart },
  { id: 'clients', label: 'Clients & Retention', icon: IconUsers },
  { id: 'products', label: 'Products & Catalog', icon: IconPackage },
  { id: 'payments', label: 'Payments & Receivables', icon: IconWallet },
  { id: 'tax', label: 'Tax & Expenses (GSTR-1)', icon: IconReceipt },
  { id: 'goals', label: 'Goals & Forecasts', icon: IconTarget },
]
const GRANULARITIES = [
  { value: 'daily', label: 'Daily' }, { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' }, { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
]

const CARD = 'rounded-xl bg-surface-container-lowest shadow-sm dark:bg-slate-900'
const MUTED = 'text-on-surface-variant dark:text-slate-400'
const TITLE = 'text-on-surface dark:text-slate-100'
const PRIMARY = 'text-primary dark:text-primary-fixed-dim'
const SECONDARY = 'text-secondary dark:text-secondary-fixed-dim'
const SUBTLE = 'bg-surface-container-low dark:bg-slate-800/60'
const CHIP = 'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-label-caps text-label-caps'
const BTN = 'inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 font-label-ui text-label-ui transition-colors'
const BTN_LIGHT = `${BTN} bg-surface-container-low text-on-surface hover:bg-surface-container dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700`
const BTN_PRIMARY = `${BTN} bg-primary text-on-primary shadow-sm hover:opacity-95 dark:bg-primary dark:text-on-primary`
const TH = 'px-3 py-2.5 text-left font-label-caps text-label-caps uppercase tracking-wider text-on-surface-variant dark:text-slate-400'
const TD = 'px-3 py-2.5 font-body-sm text-body-sm text-on-surface dark:text-slate-200'

const TONES = {
  success: 'bg-secondary-container/50 text-on-secondary-fixed-variant dark:bg-secondary/20 dark:text-secondary-fixed-dim',
  warning: 'bg-warning-100 text-warning-700 dark:bg-warning-500/15 dark:text-warning-300',
  danger: 'bg-error-container text-on-error-container dark:bg-error/20 dark:text-error-container',
  info: 'bg-tertiary-container/20 text-tertiary dark:bg-tertiary/25 dark:text-tertiary-fixed',
  brand: 'bg-primary-container/15 text-primary dark:bg-primary/25 dark:text-primary-fixed-dim',
  accent: 'bg-secondary-container/40 text-on-secondary-fixed-variant dark:bg-secondary/20 dark:text-secondary-fixed',
  neutral: 'bg-surface-container-high text-on-surface-variant dark:bg-slate-800 dark:text-slate-300',
}
const BAR_TONES = {
  success: 'bg-secondary dark:bg-secondary-fixed-dim',
  warning: 'bg-warning-500 dark:bg-warning-400',
  danger: 'bg-error dark:bg-error-container',
  info: 'bg-tertiary dark:bg-tertiary-fixed-dim',
  brand: 'bg-primary dark:bg-primary-fixed-dim',
  accent: 'bg-secondary dark:bg-secondary-fixed',
  neutral: 'bg-outline dark:bg-slate-500',
}

const compactMoney = (v, currency = 'INR') => {
  const n = Number(v) || 0
  const sign = n < 0 ? '-' : ''
  const abs = Math.abs(n)
  const s = currencySymbol(currency)
  if (abs >= 10000000) return `${sign}${s}${(abs / 10000000).toFixed(2)} Cr`
  if (abs >= 100000) return `${sign}${s}${(abs / 100000).toFixed(2)}L`
  if (abs >= 1000) return `${sign}${s}${(abs / 1000).toFixed(1)}K`
  return `${sign}${s}${Math.round(abs).toLocaleString('en-IN')}`
}
const lakhMoney = (v, currency = 'INR') => {
  const abs = Math.abs(Number(v) || 0)
  const s = currencySymbol(currency)
  return abs >= 10000000 ? `${s}${(abs / 10000000).toFixed(2)} Cr` : `${s}${(abs / 100000).toFixed(2)} Lakhs`
}
const pctText = (v) => `${Number(v) > 0 ? '+' : ''}${(Number(v) || 0).toFixed(1)}%`
const safePct = (v) => Math.max(0, Math.min(100, Number(v) || 0))

function Panel({ children, className = '', ...rest }) {
  return <section className={`${CARD} ${className}`} {...rest}>{children}</section>
}

function PanelHead({ title, subtitle, icon: IconComp, children }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          {IconComp ? <IconComp size={18} className={PRIMARY} /> : null}
          <h2 className={`font-headline-sm text-headline-sm font-bold ${TITLE}`}>{title}</h2>
        </div>
        {subtitle ? <p className={`mt-0.5 font-body-sm text-body-sm ${MUTED}`}>{subtitle}</p> : null}
      </div>
      {children ? <div className="flex flex-wrap items-center gap-2">{children}</div> : null}
    </div>
  )
}

function KpiTile({ label, value, sub, badge, badgeIcon: BadgeIcon, tone = 'brand', progress }) {
  return (
    <div className={`relative overflow-hidden ${CARD} p-4 transition-shadow hover:shadow-md`}>
      {tone === 'brand' ? <div className="pointer-events-none absolute -bottom-6 -right-6 h-24 w-24 rounded-full bg-primary/5 dark:bg-primary/10" /> : null}
      <div className="relative flex items-start justify-between gap-2">
        <span className={`font-label-caps text-label-caps uppercase tracking-wider ${MUTED}`}>{label}</span>
        {badge ? (
          <span className={`${CHIP} font-bold ${TONES[tone] || TONES.brand}`}>
            {BadgeIcon ? <BadgeIcon size={12} /> : null}{badge}
          </span>
        ) : null}
      </div>
      <div className="relative mt-2.5">
        <div className={`font-financial-display text-financial-display font-bold ${TITLE}`}>{value}</div>
        {sub ? <div className="mt-1 flex flex-wrap items-center justify-between gap-2">{sub}</div> : null}
      </div>
      {progress != null ? (
        <div className="relative mt-3 h-1.5 w-full overflow-hidden rounded-full bg-surface-container-low dark:bg-slate-800">
          <div className={`h-full rounded-full ${BAR_TONES[tone] || BAR_TONES.brand}`} style={{ width: `${safePct(progress)}%` }} />
        </div>
      ) : null}
    </div>
  )
}

function ExportButtons({ rows, filename, title, currency = 'INR' }) {
  const toast = useUI((s) => s.toast)
  if (!rows?.length) return null
  const run = (fn, msg) => {
    try { fn(); toast(msg, 'success') } catch (e) { toast(e.message || 'Export failed', 'error') }
  }
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <button type="button" className={BTN_LIGHT} onClick={() => run(() => exportRowsCSV(rows, filename), 'CSV downloaded')}><IconTable size={14} /> CSV</button>
      <button type="button" className={BTN_LIGHT} onClick={() => run(() => exportRowsXLS(rows, filename, title), 'Excel file downloaded')}><IconDownload size={14} /> XLS</button>
      <button type="button" className={BTN_LIGHT} onClick={() => exportRowsPDF(rows, title, currency).catch((e) => toast(e.message || 'Export failed', 'error'))}><IconFileDown size={14} /> PDF</button>
    </div>
  )
}

function DrillModal({ data, onClose, currency }) {
  if (!data) return null
  const rows = Object.entries(data).filter(([, v]) => v != null && typeof v !== 'object' && !Array.isArray(v))
  return (
    <Modal open onClose={onClose} title={`Details · ${data.label || data.name || data.number || 'Selection'}`} wide>
      <div className="grid gap-2 sm:grid-cols-2">
        {rows.map(([k, v]) => (
          <div key={k} className={`rounded-xl ${SUBTLE} p-3`}>
            <div className={`font-label-caps text-label-caps capitalize ${MUTED}`}>{k.replace(/([A-Z])/g, ' $1')}</div>
            <div className={`mt-0.5 font-financial-tabular text-financial-tabular font-bold ${TITLE}`}>
              {typeof v === 'number' && /amount|value|revenue|total|paid|pending|invoiced|collected|balance|tax|count|days|price|forecast|low|high|outstanding|pct/i.test(k) ? formatMoney(v, currency) : String(v)}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  )
}

function SalesAreaChart({ data = [], currency = 'INR', hidden = [], zoom = false, onDrill }) {
  const [hover, setHover] = useState(null)
  const points = zoom ? data.slice(-6) : data
  if (!points.length) return <div className={`flex h-full items-center justify-center font-body-sm text-body-sm ${MUTED}`}>No activity in this view yet.</div>

  const W = 900, H = 260, top = 18, bottom = 216, left = 48, right = 864
  const maxVal = Math.max(1, ...points.flatMap((p) => [p.invoiced || 0, p.collected || 0, p.pending || 0, p.priorYear || 0]))
  const yMax = maxVal * 1.12
  const x = (i) => (points.length === 1 ? (left + right) / 2 : left + (i * (right - left)) / (points.length - 1))
  const y = (v) => bottom - (Math.max(0, Number(v) || 0) / yMax) * (bottom - top)
  const line = (key) => points.map((p, i) => `${i ? 'L' : 'M'} ${x(i).toFixed(1)},${y(p[key] || 0).toFixed(1)}`).join(' ')
  const area = (key) => `${line(key)} L ${x(points.length - 1).toFixed(1)},${bottom} L ${x(0).toFixed(1)},${bottom} Z`
  const show = (key) => !hidden.includes(key)
  const colWidth = (right - left) / points.length
  const peakIndex = points.reduce((best, p, i) => (p.invoiced > (points[best]?.invoiced || 0) ? i : best), 0)
  const visible = [
    show('invoiced') ? { key: 'invoiced', label: 'Invoiced', color: '#3525cd' } : null,
    show('collected') ? { key: 'collected', label: 'Collected', color: '#006a61' } : null,
    show('pending') ? { key: 'pending', label: 'Pending', color: '#00505f' } : null,
    show('priorYear') ? { key: 'priorYear', label: 'Prior FY', color: '#777587' } : null,
  ].filter(Boolean)
  const hovered = hover == null ? null : points[hover]
  const tipHeight = hovered ? 22 + visible.length * 16 : 0
  const tipX = hover == null ? 0 : Math.max(left, Math.min(x(hover) - 66, right - 138))

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-full w-full overflow-visible" role="img" aria-label="Invoiced, collected and prior year monthly trend">
      <defs>
        <linearGradient id="kl-invoiced" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3525cd" stopOpacity="0.32" />
          <stop offset="100%" stopColor="#3525cd" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="kl-collected" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#006a61" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#006a61" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[1, 0.75, 0.5, 0.25, 0].map((f) => (
        <g key={f}>
          <line x1={left} x2={right} y1={y(yMax * f)} y2={y(yMax * f)} className="stroke-outline-variant dark:stroke-slate-700" strokeDasharray="3 4" />
          <text x={left - 8} y={y(yMax * f) + 3} textAnchor="end" fontSize="10" className="fill-outline dark:fill-slate-500">{compactMoney(yMax * f, currency)}</text>
        </g>
      ))}
      {show('invoiced') ? <path d={area('invoiced')} fill="url(#kl-invoiced)" /> : null}
      {show('collected') ? <path d={area('collected')} fill="url(#kl-collected)" /> : null}
      {show('pending') ? <path d={line('pending')} fill="none" className="stroke-tertiary dark:stroke-tertiary-fixed-dim" strokeWidth="2" strokeDasharray="6 4" /> : null}
      {show('priorYear') ? <path d={line('priorYear')} fill="none" className="stroke-outline dark:stroke-slate-500" strokeWidth="2" strokeDasharray="5 5" /> : null}
      {show('invoiced') ? <path d={line('invoiced')} fill="none" className="stroke-primary dark:stroke-primary-fixed-dim" strokeWidth="3" strokeLinecap="round" /> : null}
      {show('collected') ? <path d={line('collected')} fill="none" className="stroke-secondary dark:stroke-secondary-fixed" strokeWidth="3" strokeLinecap="round" /> : null}
      {points.map((p, i) => (
        <g key={p.key || i}>
          {show('invoiced') ? <circle cx={x(i)} cy={y(p.invoiced)} r={hover === i ? 6 : 4.5} className="fill-primary stroke-surface-container-lowest dark:fill-primary-fixed-dim dark:stroke-slate-900" strokeWidth="2" /> : null}
          {show('collected') ? <circle cx={x(i)} cy={y(p.collected)} r={hover === i ? 5 : 4} className="fill-secondary stroke-surface-container-lowest dark:fill-secondary-fixed dark:stroke-slate-900" strokeWidth="2" /> : null}
          <rect x={x(i) - colWidth / 2} y={top} width={colWidth} height={bottom - top} fill="transparent" className="cursor-pointer" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onClick={() => onDrill?.(p)} />
        </g>
      ))}
      {points.map((p, i) => (
        <text key={`l-${p.key || i}`} x={x(i)} y={bottom + 20} textAnchor="middle" fontSize="10" className={i === peakIndex || i === points.length - 1 ? 'fill-primary dark:fill-primary-fixed-dim font-bold' : 'fill-on-surface-variant dark:fill-slate-400'}>
          {p.label}
        </text>
      ))}
      {hovered ? (
        <g transform={`translate(${tipX}, ${Math.max(0, y(hovered.invoiced || hovered.collected || 0) - tipHeight - 10)})`} pointerEvents="none">
          <rect width="138" height={tipHeight} rx="6" fill="#131b2e" opacity="0.94" />
          <text x="8" y="15" fill="#eef0ff" fontSize="10" fontWeight="700">{hovered.label}</text>
          {visible.map((s, i) => (
            <text key={s.key} x="8" y={30 + i * 16} fill={s.key === 'collected' ? '#89f5e7' : '#ffffff'} fontSize="10">{s.label}: {compactMoney(hovered[s.key], currency)}</text>
          ))}
        </g>
      ) : null}
    </svg>
  )
}
function SeasonalBars({ data = [], currency = 'INR' }) {
  const bars = data.slice(-6)
  if (!bars.length) return <EmptyState icon={IconChart} title="No trend data" description="Revenue activity will appear here as invoices are issued." />
  const left = 12, right = 388, top = 18, bottom = 150
  const width = right - left
  const slot = width / bars.length
  const max = Math.max(1, ...bars.map((b) => b.invoiced || 0))
  const sma = bars.map((_, i) => {
    const slice = bars.slice(Math.max(0, i - 2), i + 1)
    return slice.reduce((s, b) => s + (b.invoiced || 0), 0) / slice.length
  })
  const peak = bars.reduce((best, b, i) => (b.invoiced > (bars[best]?.invoiced || 0) ? i : best), 0)
  const smaPoints = sma.map((v, i) => `${left + slot * (i + 0.5)},${bottom - (v / max) * (bottom - top - 22)}`).join(' ')
  return (
    <svg viewBox="0 0 400 190" preserveAspectRatio="none" className="h-full w-full" role="img" aria-label="Seasonal velocity with moving average">
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <line key={f} x1={left} x2={right} y1={bottom - f * (bottom - top - 22)} y2={bottom - f * (bottom - top - 22)} className="stroke-outline-variant dark:stroke-slate-700" strokeDasharray="3 4" />
      ))}
      {bars.map((b, i) => {
        const h = Math.max(2, ((b.invoiced || 0) / max) * (bottom - top - 22))
        const bx = left + slot * i + slot * 0.2
        const bw = slot * 0.6
        return (
          <g key={b.key || i}>
            <text x={bx + bw / 2} y={bottom - h - 6} textAnchor="middle" fontSize="9" className={i === peak ? 'fill-secondary dark:fill-secondary-fixed-dim font-bold' : 'fill-outline dark:fill-slate-500'}>{compactMoney(b.invoiced, currency)}</text>
            <rect x={bx} y={bottom - h} width={bw} height={h} rx="3" className={i === peak ? 'fill-secondary dark:fill-secondary-fixed' : 'fill-primary/25 dark:fill-primary/40'} />
            <text x={bx + bw / 2} y={bottom + 16} textAnchor="middle" fontSize="9" className={i === peak ? 'fill-secondary dark:fill-secondary-fixed-dim font-bold' : 'fill-on-surface-variant dark:fill-slate-400'}>{b.label}</text>
          </g>
        )
      })}
      <polyline points={smaPoints} fill="none" className="stroke-error dark:stroke-error-container" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function CumulativeTrajectory({ cumulative = [], forecast = [], target = 0, currency = 'INR' }) {
  if (!cumulative.length) return <EmptyState icon={IconChart} title="No cumulative data" description="Billed totals will appear once invoices are issued." />
  const left = 20, right = 380, top = 12, bottom = 112
  const last = cumulative[cumulative.length - 1]?.cumulative || 0
  const projected = last + forecast.reduce((s, f) => s + (f.forecast || 0), 0)
  const max = Math.max(1, target || 0, projected, last)
  const x = (i) => (cumulative.length === 1 ? (left + right) / 2 : left + (i * (right - left)) / (cumulative.length - 1))
  const y = (v) => bottom - (Math.max(0, Number(v) || 0) / max) * (bottom - top)
  const path = cumulative.map((c, i) => `${i ? 'L' : 'M'} ${x(i).toFixed(1)},${y(c.cumulative).toFixed(1)}`).join(' ')
  const pct = target > 0 ? (last / target) * 100 : 0
  return (
    <div className="flex h-full flex-col justify-between">
      <div className="flex flex-wrap items-center justify-between gap-2 font-label-caps text-label-caps text-outline dark:text-slate-500">
        <span>Target pacing · {compactMoney(target, currency)} milestone</span>
        <span>Projected · {compactMoney(projected, currency)}</span>
      </div>
      <svg viewBox="0 0 400 130" preserveAspectRatio="none" className="h-36 w-full" role="img" aria-label="Cumulative revenue against target">
        <line x1={left} x2={right} y1={bottom} y2={top} className="stroke-outline-variant dark:stroke-slate-600" strokeWidth="2" strokeDasharray="4 4" />
        <path d={path} fill="none" className="stroke-primary dark:stroke-primary-fixed-dim" strokeWidth="3.5" strokeLinecap="round" />
        <path d={`M ${x(cumulative.length - 1).toFixed(1)},${y(last).toFixed(1)} L ${right},${y(projected).toFixed(1)}`} fill="none" className="stroke-secondary-fixed dark:stroke-secondary-fixed-dim" strokeWidth="2.5" strokeDasharray="4 4" />
        <circle cx={x(cumulative.length - 1)} cy={y(last)} r="5" className="fill-primary stroke-surface-container-lowest dark:fill-primary-fixed-dim dark:stroke-slate-900" strokeWidth="2" />
      </svg>
      <div className="flex w-full items-center gap-1 overflow-hidden rounded-full bg-surface-container-high p-0.5 dark:bg-slate-800">
        <div className="h-full rounded-full bg-primary dark:bg-primary-fixed-dim transition-all" style={{ width: `${safePct(pct)}%` }} />
        <div className="h-full rounded-full bg-secondary-container/80 opacity-70 dark:bg-secondary/60" style={{ width: `${safePct(Math.max(0, 100 - pct) * 0.35)}%` }} />
      </div>
    </div>
  )
}

function SalesTab({ a, currency, granularity, onDrill, changeTab }) {
  const toast = useUI((s) => s.toast)
  const [hidden, setHidden] = useState([])
  const [zoom, setZoom] = useState(false)
  const toggle = (key) => setHidden((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]))
  const h = a.highlights
  const positive = a.monthly.filter((m) => m.invoiced > 0).map((m) => m.invoiced).sort((x, y) => x - y)
  const median = positive.length ? (positive.length % 2 ? positive[(positive.length - 1) / 2] : (positive[positive.length / 2 - 1] + positive[positive.length / 2]) / 2) : 0
  const lastM = a.monthly[a.monthly.length - 1]
  const prevM = a.monthly[a.monthly.length - 2]
  const momDelta = lastM && prevM ? lastM.invoiced - prevM.invoiced : 0
  const topDayCount = h.topDay ? a.allFacts.filter((f) => f.date === h.topDay.date && f.status !== 'draft').length : 0
  const gross = a.monthly.reduce((s, m) => s + (m.invoiced || 0), 0)
  const yearlyGoal = a.goals.find((g) => g.periodType === 'yearly' && String(g.periodKey) === String(new Date().getFullYear()))
  const target = yearlyGoal?.target || a.fy.total || gross || 1
  const lastCumulative = a.cumulative[a.cumulative.length - 1]?.cumulative || 0
  const projectedYear = lastCumulative + a.forecast.reduce((s, f) => s + (f.forecast || 0), 0)

  const monthlyRows = a.monthly.map((m) => ({ Month: m.label, Invoiced: m.invoiced, Collected: m.collected, Pending: m.pending, 'Last year': m.priorYear, Tax: m.tax, Invoices: m.count }))
  const trendRows = a.trend.map((t) => ({ Period: t.label, Invoiced: t.invoiced, Collected: t.collected, Pending: t.pending, Invoices: t.count }))
  const cumulativeRows = a.cumulative.map((c) => ({ Month: c.label, 'Cumulative revenue': c.cumulative }))
  const forecastRows = a.forecast.map((f) => ({ Month: f.label, Forecast: f.forecast, Lower: f.low, Upper: f.high }))
  const fyRows = a.fy.quarters.map((q) => ({ Quarter: q.label, Period: q.period, Invoiced: q.invoiced, Collected: q.collected, Invoices: q.count }))
  const legend = [
    { key: 'invoiced', label: 'Invoiced', dot: 'bg-primary dark:bg-primary-fixed-dim' },
    { key: 'collected', label: 'Collected cash', dot: 'bg-secondary dark:bg-secondary-fixed-dim' },
    { key: 'pending', label: 'Pending', dot: 'bg-tertiary dark:bg-tertiary-fixed-dim' },
    { key: 'priorYear', label: 'Prior FY', dot: 'bg-outline dark:bg-slate-500' },
  ]

  const nowMonth = new Date().getMonth()
  const currentQ = nowMonth >= 3 && nowMonth <= 5 ? 1 : nowMonth >= 6 && nowMonth <= 8 ? 2 : nowMonth >= 9 && nowMonth <= 11 ? 3 : 4
  const maxQuarter = Math.max(1, ...a.fy.quarters.map((q) => q.invoiced || 0))

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile
          label="Peak month" tone="success" badge={h.best ? 'Peak velocity' : 'No data'} badgeIcon={IconSparkle}
          value={h.best ? lakhMoney(h.best.invoiced, currency) : '—'}
          sub={<><span className={`font-label-ui text-label-ui font-semibold ${PRIMARY}`}>{h.best?.label || '—'}</span><span className="font-body-sm text-body-sm text-secondary dark:text-secondary-fixed">{median > 0 && h.best ? pctText(((h.best.invoiced - median) / median) * 100) : '—'} vs median</span></>}
          progress={100}
        />
        <KpiTile
          label="Lean month" tone="neutral" badge="Seasonal low"
          value={h.worst ? lakhMoney(h.worst.invoiced, currency) : '—'}
          sub={<><span className={`font-label-ui text-label-ui font-semibold ${MUTED}`}>{h.worst?.label || '—'}</span><span className="font-body-sm text-body-sm text-error dark:text-error-container">{median > 0 && h.worst ? pctText(((h.worst.invoiced - median) / median) * 100) : '—'} vs median</span></>}
          progress={h.best?.invoiced ? (h.worst.invoiced / h.best.invoiced) * 100 : 0}
        />
        <KpiTile
          label="MoM acceleration" tone={h.momGrowth >= 0 ? 'success' : 'danger'} badge={h.momGrowth >= 0 ? 'Healthy' : 'Cooling'} badgeIcon={h.momGrowth >= 0 ? IconTrendingUp : IconTrendingDown}
          value={<span className={h.momGrowth >= 0 ? SECONDARY : 'text-error dark:text-error-container'}>{pctText(h.momGrowth)} MoM</span>}
          sub={<><span className={`font-body-sm text-body-sm ${MUTED}`}>{lastM?.label || '—'} vs {prevM?.label || '—'}</span><span className="font-financial-tabular text-financial-tabular font-semibold text-on-surface dark:text-slate-100">{compactMoney(momDelta, currency)} delta</span></>}
          progress={Math.abs(h.momGrowth) * 4}
        />
        <KpiTile
          label="Highest single day" tone="brand" badge="High-ticket closure"
          value={h.topDay ? lakhMoney(h.topDay.amount, currency) : '—'}
          sub={<><span className={`font-label-ui text-label-ui font-semibold ${PRIMARY}`}>{h.topDay ? formatDate(h.topDay.date) : '—'}</span><span className={`font-body-sm text-body-sm ${MUTED}`}>{topDayCount} invoices settled</span></>}
          progress={h.best?.invoiced ? (h.topDay.amount / h.best.invoiced) * 100 : 0}
        />
      </div>

      <Panel className="p-4 sm:p-5">
        <PanelHead
          icon={IconChart}
          title="Monthly Invoiced vs Collected vs Prior Year"
          subtitle="Realized cash collection against generated billables with an automated prior-fiscal baseline."
        >
          <div className="flex flex-wrap items-center gap-3">
            {legend.map((s) => (
              <button key={s.key} type="button" onClick={() => toggle(s.key)} className={`inline-flex items-center gap-1.5 font-label-ui text-label-ui transition-opacity ${TITLE} ${hidden.includes(s.key) ? 'opacity-40' : ''}`} aria-pressed={!hidden.includes(s.key)}>
                <span className={`h-2.5 w-2.5 rounded-full ${s.dot}`} />{s.label}
              </button>
            ))}
            <span className="h-4 w-px bg-surface-container-high dark:bg-slate-700" />
            <span className={`rounded ${SUBTLE} px-2.5 py-1 font-body-sm text-body-sm ${MUTED}`}>Gross total: <b className={TITLE}>{compactMoney(gross, currency)}</b></span>
            <button type="button" className={BTN_LIGHT} onClick={() => setZoom((v) => !v)} title={zoom ? 'Reset zoom' : 'Zoom to recent months'}>
              {zoom ? <IconRotate size={14} /> : <IconZoomIn size={14} />} {zoom ? 'Reset' : 'Zoom'}
            </button>
            <ExportButtons rows={monthlyRows} filename="monthly-sales" title="Monthly sales" currency={currency} />
          </div>
        </PanelHead>
        <div className="mt-4 h-[320px] w-full rounded-xl bg-surface-container-low/40 p-3 dark:bg-slate-800/30">
          <SalesAreaChart data={a.monthly} currency={currency} hidden={hidden} zoom={zoom} onDrill={onDrill} />
        </div>
      </Panel>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Panel className="p-4 sm:p-5">
          <PanelHead icon={IconChart} title="Seasonal velocity & moving average" subtitle={`Cycle volatility smoothed against a trailing 3-${granularity} baseline.`}>
            <span className={`${CHIP} font-bold ${TONES.accent}`}>3-period SMA</span>
          </PanelHead>
          <div className="mt-3 h-56 w-full rounded-xl bg-surface-container-low/50 p-3 dark:bg-slate-800/30">
            <SeasonalBars data={a.trend} currency={currency} />
          </div>
          <div className={`flex flex-wrap items-center justify-between gap-2 pt-2 font-body-sm text-body-sm ${MUTED}`}>
            <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm bg-primary dark:bg-primary-fixed-dim" />{granularity.charAt(0).toUpperCase() + granularity.slice(1)} intake <span className="ml-2 h-0.5 w-3 bg-error dark:bg-error-container" />3-period SMA</span>
            <button type="button" onClick={() => changeTab('products')} className={`font-semibold ${PRIMARY}`}>Inspect drivers <IconArrowRight size={13} className="inline" /></button>
          </div>
          <div className="mt-2"><ExportButtons rows={trendRows} filename={`${granularity}-trend`} title={`${granularity} trend`} currency={currency} /></div>
        </Panel>

        <Panel className="p-4 sm:p-5">
          <PanelHead icon={IconTarget} title="Cumulative trajectory vs annual target" subtitle="Billed-to-date run rate against the active annual milestone.">
            <div className="text-right">
              <div className={`font-financial-tabular text-financial-tabular font-bold ${PRIMARY}`}>{compactMoney(lastCumulative, currency)} / {compactMoney(target, currency)}</div>
              <div className={`font-label-caps text-label-caps font-semibold ${SECONDARY}`}>{target > 0 ? ((lastCumulative / target) * 100).toFixed(1) : '0.0'}% of target achieved</div>
            </div>
          </PanelHead>
          <div className="mt-3 h-56 w-full rounded-xl bg-surface-container-low/50 p-3 dark:bg-slate-800/30">
            <CumulativeTrajectory cumulative={a.cumulative} forecast={a.forecast} target={target} currency={currency} />
          </div>
          <div className={`flex flex-wrap items-center justify-between gap-2 pt-2 font-body-sm text-body-sm ${MUTED}`}>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-primary dark:bg-primary-fixed-dim" />Billed to date: {compactMoney(lastCumulative, currency)}</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-secondary dark:bg-secondary-fixed-dim" />Projected year-end: {compactMoney(projectedYear, currency)}</span>
          </div>
          <div className="mt-2"><ExportButtons rows={cumulativeRows} filename="cumulative-revenue" title="Cumulative revenue" currency={currency} /></div>
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <Panel className="p-4 sm:p-5 lg:col-span-7">
          <div className="flex items-start justify-between gap-3 p-1.5">
            <div className="flex items-start gap-2">
              <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${TONES.accent}`}><IconSparkle size={19} /></span>
              <div>
                <h3 className={`font-headline-sm text-headline-sm font-bold ${TITLE}`}>3-month cash flow forecast</h3>
                <p className={`font-body-sm text-body-sm ${MUTED}`}>Moving-average projection with monthly confidence bands.</p>
              </div>
            </div>
            <span className={`${CHIP} font-bold ${TONES.brand}`}>{a.forecast.length ? 'Live model' : 'Awaiting data'}</span>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {a.forecast.map((f, i) => {
              const band = f.forecast ? ((f.high - f.low) / f.forecast) * 100 : 100
              const strong = band <= 20
              return (
                <div key={f.key} className={`flex flex-col justify-between rounded-lg ${SUBTLE} p-3 ${i === 2 ? 'border-l-2 border-secondary dark:border-secondary-fixed' : i === 1 ? 'border-l-2 border-primary-container' : 'border-l-2 border-primary'}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className={`font-label-ui text-label-ui font-semibold ${TITLE}`}>{f.label}</span>
                    <span className={`rounded bg-surface-container px-1.5 py-0.5 font-label-caps text-[10px] ${MUTED} dark:bg-slate-700`}>T+{i + 1} Mo</span>
                  </div>
                  <div className="mt-2">
                    <div className={`font-financial-tabular text-financial-tabular text-lg font-bold ${TITLE}`}>{lakhMoney(f.forecast, currency)}</div>
                    <div className={`font-body-sm text-body-sm ${MUTED}`}>Band: {compactMoney(f.low, currency)} – {compactMoney(f.high, currency)}</div>
                  </div>
                  <div className={`mt-2 flex items-center gap-1 text-[11px] font-medium ${strong ? SECONDARY : MUTED}`}>
                    {strong ? <IconCheckCircle size={13} /> : <IconInfo size={13} />}{strong ? 'Tight confidence band' : 'Model estimate'}
                  </div>
                </div>
              )
            })}
          </div>
          <div className={`mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-surface-container-low/60 p-3.5 dark:bg-slate-800/40`}>
            <div className="flex items-center gap-3">
              <IconSparkle size={22} className={PRIMARY} />
              <div>
                <div className={`font-label-ui text-label-ui font-bold ${TITLE}`}>Executive scenario analysis</div>
                <div className={`font-body-sm text-body-sm ${MUTED}`}>Projected year-end billing: {compactMoney(projectedYear, currency)} against a {compactMoney(target, currency)} milestone.</div>
              </div>
            </div>
            <button type="button" className={BTN_LIGHT} onClick={() => toast(`Scenario range: ${compactMoney(lastCumulative, currency)} to ${compactMoney(projectedYear, currency)}`, 'info')}>Run scenario</button>
          </div>
          <div className="mt-2"><ExportButtons rows={forecastRows} filename="cash-flow-forecast" title="Cash flow forecast" currency={currency} /></div>
        </Panel>

        <Panel className="p-4 sm:p-5 lg:col-span-5">
          <PanelHead icon={IconChart} title={`${a.fy.label} quarterly breakdown`} subtitle="Audited performance and collection efficiency.">
            <IconInfo size={18} className="text-outline dark:text-slate-500" />
          </PanelHead>
          <div className="mt-4 space-y-3">
            {a.fy.quarters.map((q, i) => {
              const closed = i + 1 <= currentQ
              const ratio = q.invoiced ? (q.collected / q.invoiced) * 100 : 0
              return (
                <button key={q.label} type="button" onClick={() => onDrill?.(q)} className={`w-full rounded-lg ${closed ? SUBTLE : 'bg-surface-container-high/40 dark:bg-slate-800/40'} p-3 text-left transition-colors hover:bg-surface-container dark:hover:bg-slate-800`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className={`font-label-ui text-label-ui font-bold ${closed ? TITLE : PRIMARY}`}>{q.label} ({q.period})</span>
                    <span className="flex items-center gap-2">
                      <span className={`font-financial-tabular text-financial-tabular font-bold ${closed ? TITLE : PRIMARY}`}>{lakhMoney(q.invoiced, currency)}</span>
                      <span className={`${CHIP} ${closed ? TONES.success : TONES.brand}`}>{closed ? 'Closed' : 'Projected'}</span>
                    </span>
                  </div>
                  <div className={`flex items-center justify-between pt-1 font-body-sm text-body-sm ${MUTED}`}>
                    <span>Collection ratio: <b className={TITLE}>{ratio.toFixed(1)}%</b></span>
                    <span>{q.count} invoices</span>
                  </div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-container-high dark:bg-slate-800">
                    <div className={`h-full rounded-full ${closed ? 'bg-primary dark:bg-primary-fixed-dim' : 'bg-primary-container dark:bg-primary-fixed-dim'}`} style={{ width: `${(q.invoiced / maxQuarter) * 100}%` }} />
                  </div>
                </button>
              )
            })}
          </div>
          <div className="mt-2"><ExportButtons rows={fyRows} filename="quarterly-performance" title="Quarterly performance" currency={currency} /></div>
        </Panel>
      </div>

      <Panel className="p-4 sm:p-5">
        <PanelHead icon={IconWallet} title="Outstanding receivables aging & exposure matrix" subtitle="Bucket monitoring for DSO reduction and bad-debt mitigation.">
          <span className={`${CHIP} font-bold ${TONES.danger}`}>Total at risk: {compactMoney(a.receivables.aging.slice(2).reduce((s, b) => s + b.amount, 0), currency)}</span>
          <button type="button" className={`inline-flex items-center gap-1 font-label-ui text-label-ui font-semibold ${PRIMARY}`} onClick={() => changeTab('payments')}>Open receivables ledger <IconArrowRight size={15} /></button>
        </PanelHead>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-4">
          {a.receivables.aging.map((b, i) => {
            const risk = i === 0 ? { label: 'Low risk', tone: 'success', note: 'Within collection window' } : i === 1 ? { label: 'Normal', tone: 'brand', note: 'Reminders scheduled' } : i === 2 ? { label: 'Warning', tone: 'warning', note: 'Follow-up recommended' } : { label: 'Overdue', tone: 'danger', note: 'Provision recommended' }
            const share = a.receivables.totalOutstanding ? (b.amount / a.receivables.totalOutstanding) * 100 : 0
            return (
              <div key={b.key} className={`flex flex-col gap-3 rounded-xl ${SUBTLE} p-3.5`}>
                <div className="flex items-center justify-between gap-2">
                  <span className={`font-label-ui text-label-ui font-semibold ${TITLE}`}>{b.label}</span>
                  <span className={`${CHIP} font-semibold ${TONES[risk.tone]}`}><span className={`h-1.5 w-1.5 rounded-full ${BAR_TONES[risk.tone]}`} />{risk.label}</span>
                </div>
                <div>
                  <div className={`font-financial-tabular text-financial-tabular text-xl font-bold ${i === 3 ? 'text-error dark:text-error-container' : TITLE}`}>{formatMoney(b.amount, currency)}</div>
                  <div className={`font-body-sm text-body-sm ${MUTED}`}>{b.count} invoice{b.count === 1 ? '' : 's'} active</div>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-surface-container-high dark:bg-slate-800"><div className={`h-full rounded-full ${BAR_TONES[risk.tone]}`} style={{ width: `${safePct(share)}%` }} /></div>
                <span className={`text-[11px] ${i >= 2 ? 'text-error dark:text-error-container' : MUTED}`}>{risk.note}</span>
              </div>
            )
          })}
        </div>
        <div className="mt-2"><ExportButtons rows={a.receivables.aging.map((b) => ({ Bucket: b.label, Outstanding: b.amount, Invoices: b.count }))} filename="receivables-aging" title="Receivables aging" currency={currency} /></div>
      </Panel>
    </div>
  )
}
function ClientsTab({ a, currency, onDrill }) {
  const rows = a.clients.top.map((c) => ({
    Client: c.name, Revenue: c.revenue, Outstanding: c.outstanding,
    'Avg payment days': c.avgDays ?? '—', Type: c.type, 'Lifetime value': c.lifetimeValue,
    Invoices: c.count, 'Risk score': c.risk,
  }))
  const riskTone = (risk) => (risk >= 60 ? 'danger' : risk >= 30 ? 'warning' : 'success')
  return (
    <div className="space-y-5">
      <PanelHead icon={IconUsers} title="Client analytics" subtitle="Who drives revenue, who owes you money, and where the risk sits.">
        <ExportButtons rows={rows} filename="client-analytics" title="Client analytics" currency={currency} />
      </PanelHead>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile label="Total clients" value={a.clients.totalClients} sub={<span className={MUTED}>With invoices in this period</span>} badge="Active" badgeIcon={IconUsers} tone="brand" />
        <KpiTile label="New clients" value={a.clients.newCount} sub={<span className={MUTED}>First invoice in this period</span>} badge="Acquired" badgeIcon={IconSparkle} tone="accent" />
        <KpiTile label="Repeat clients" value={a.clients.repeatCount} sub={<span className={MUTED}>More than one invoice</span>} badge="Retained" badgeIcon={IconCheck} tone="info" />
        <KpiTile label="At-risk clients" value={a.clients.atRisk} sub={<span className={MUTED}>Risk score 60 or above</span>} badge="Review" badgeIcon={IconAlert} tone="danger" />
      </div>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Panel className="p-4 sm:p-5">
          <PanelHead icon={IconChart} title="Top 10 clients by revenue" subtitle="Select a bar to inspect the client." />
          <div className="mt-3 h-[280px]"><RankedBars items={a.clients.top.slice(0, 10).map((c) => ({ name: c.name, value: c.revenue, risk: c.riskLabel }))} valueKey="value" currency={currency} accentKey="risk" onDrill={onDrill} /></div>
        </Panel>
        <Panel className="p-4 sm:p-5">
          <PanelHead icon={IconUsers} title="New vs repeat clients" subtitle="Client mix for the selected period." />
          <div className="mt-3 h-[280px]"><DonutChart data={[{ name: 'New', value: a.clients.newCount, color: CHART_COLORS.accent }, { name: 'Repeat', value: a.clients.repeatCount, color: CHART_COLORS.brand }]} valueKey="value" centerLabel="Clients" suffix="" onDrill={onDrill} /></div>
        </Panel>
      </div>
      <Panel className="overflow-hidden">
        <div className="border-b border-outline-variant px-4 py-3 dark:border-slate-800">
          <h3 className={`font-headline-sm text-headline-sm font-bold ${TITLE}`}>Client scorecard</h3>
          <p className={`font-body-sm text-body-sm ${MUTED}`}>Lifetime value, receivables and payment behaviour</p>
        </div>
        {!a.clients.list.length ? <EmptyState icon={IconUsers} title="No clients yet" description="Create an invoice to start building client insights." /> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left">
              <thead className={SUBTLE}><tr><th className={TH}>Client</th><th className={`${TH} text-right`}>Revenue</th><th className={`${TH} text-right`}>Outstanding</th><th className={`${TH} text-right`}>Avg days</th><th className={TH}>Type</th><th className={`${TH} text-right`}>LTV</th><th className={`${TH} text-right`}>Risk</th></tr></thead>
              <tbody className="divide-y divide-outline-variant dark:divide-slate-800">
                {a.clients.list.map((c) => (
                  <tr key={c.id} className="transition-colors hover:bg-surface-container-low/60 dark:hover:bg-slate-800/40">
                    <td className={`${TD} font-semibold`}>{c.name}</td>
                    <td className={`${TD} text-right font-bold`}>{formatMoney(c.revenue, currency)}</td>
                    <td className={`${TD} text-right text-warning-700 dark:text-warning-300`}>{formatMoney(c.outstanding, currency)}</td>
                    <td className={`${TD} text-right`}>{c.avgDays == null ? '—' : `${c.avgDays}d`}</td>
                    <td className={TD}><span className={`${CHIP} ${c.type === 'Repeat' ? TONES.brand : TONES.accent}`}>{c.type}</span></td>
                    <td className={`${TD} text-right`}>{formatMoney(c.lifetimeValue, currency)}</td>
                    <td className={`${TD} text-right`}><span className={`${CHIP} ${TONES[riskTone(c.risk)]}`}>{c.risk} · {c.riskLabel}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  )
}

function ProductsTab({ a, currency, onDrill }) {
  const rows = a.products.top.map((p) => ({
    Item: p.name, Category: p.category, Revenue: p.revenue, Quantity: p.qty,
    'Average price': p.avgPrice, Discount: p.discount, Tax: p.tax, Lines: p.count,
  }))
  const top = a.products.top[0]
  const units = a.products.list.reduce((s, p) => s + p.qty, 0)
  return (
    <div className="space-y-5">
      <PanelHead icon={IconPackage} title="Product & service analytics" subtitle="Best sellers, category mix, pricing and discount impact.">
        <ExportButtons rows={rows} filename="product-analytics" title="Product analytics" currency={currency} />
      </PanelHead>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile label="Average selling price" value={formatMoney(a.products.avgPrice, currency)} sub={<span className={MUTED}>Revenue ÷ units sold</span>} badge="ASP" badgeIcon={IconTag} tone="brand" />
        <KpiTile label="Discount impact" value={formatMoney(a.products.totalDiscount, currency)} sub={<span className={MUTED}>{a.products.discountPct.toFixed(1)}% of gross line value</span>} badge="Concession" badgeIcon={IconPercent} tone="warning" />
        <KpiTile label="Top seller" value={top ? top.name : '—'} sub={<span className={MUTED}>{top ? formatMoney(top.revenue, currency) : 'No data yet'}</span>} badge="Front runner" badgeIcon={IconSparkle} tone="success" />
        <KpiTile label="Units sold" value={units.toLocaleString('en-IN')} sub={<span className={MUTED}>Across all issued invoices</span>} badge="Volume" badgeIcon={IconChart} tone="accent" />
      </div>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Panel className="p-4 sm:p-5">
          <PanelHead icon={IconChart} title="Top-selling items by revenue" subtitle="Select a bar to inspect the item." />
          <div className="mt-3 h-[280px]"><RankedBars items={a.products.top.slice(0, 10).map((p) => ({ name: p.name, value: p.revenue, cat: p.category }))} valueKey="value" currency={currency} accentKey="cat" onDrill={onDrill} /></div>
        </Panel>
        <Panel className="p-4 sm:p-5">
          <PanelHead icon={IconChart} title="Top-selling items by quantity" subtitle="Units or jobs sold in this period." />
          <div className="mt-3 h-[280px]"><RankedBars items={[...a.products.top].sort((x, y) => y.qty - x.qty).slice(0, 10).map((p) => ({ name: p.name, value: p.qty, cat: p.category }))} valueKey="value" suffix="" onDrill={onDrill} /></div>
        </Panel>
      </div>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Panel className="p-4 sm:p-5">
          <PanelHead icon={IconChart} title="Category mix" subtitle="Revenue share by item category." />
          <div className="mt-3 h-[250px]"><DonutChart data={a.products.categories.map((c, i) => ({ ...c, color: [CHART_COLORS.brand, CHART_COLORS.accent, CHART_COLORS.success, CHART_COLORS.warning, CHART_COLORS.violet, CHART_COLORS.info][i % 6] }))} valueKey="value" centerLabel="Revenue" onDrill={onDrill} /></div>
        </Panel>
        <Panel className="overflow-hidden lg:col-span-2">
          <div className="border-b border-outline-variant px-4 py-3 dark:border-slate-800">
            <h3 className={`font-headline-sm text-headline-sm font-bold ${TITLE}`}>Item performance</h3>
            <p className={`font-body-sm text-body-sm ${MUTED}`}>Revenue, quantity, pricing and discounts</p>
          </div>
          {!a.products.list.length ? <EmptyState icon={IconPackage} title="No items sold yet" description="Add line items to an invoice to see product analytics." /> : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left">
                <thead className={SUBTLE}><tr><th className={TH}>Item</th><th className={TH}>Category</th><th className={`${TH} text-right`}>Revenue</th><th className={`${TH} text-right`}>Qty</th><th className={`${TH} text-right`}>Avg price</th><th className={`${TH} text-right`}>Discount</th></tr></thead>
                <tbody className="divide-y divide-outline-variant dark:divide-slate-800">
                  {a.products.list.slice(0, 15).map((p, i) => (
                    <tr key={`${p.name}-${i}`} className="transition-colors hover:bg-surface-container-low/60 dark:hover:bg-slate-800/40">
                      <td className={`${TD} font-semibold`}>{p.name}</td>
                      <td className={MUTED}>{p.category}</td>
                      <td className={`${TD} text-right font-bold`}>{formatMoney(p.revenue, currency)}</td>
                      <td className={`${TD} text-right`}>{p.qty}</td>
                      <td className={`${TD} text-right`}>{formatMoney(p.avgPrice, currency)}</td>
                      <td className={`${TD} text-right text-warning-700 dark:text-warning-300`}>{formatMoney(p.discount, currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>
    </div>
  )
}

function sendPaymentReminder(fact, currency, toast) {
  const totals = fact.invoice ? fact.totals : null
  const amount = totals ? totals.balance : fact.balance
  const subject = encodeURIComponent(`Reminder: overdue invoice ${fact.number}`)
  const body = encodeURIComponent(
    `Hi ${fact.clientName || ''},\n\nThis is a friendly reminder that invoice ${fact.number} (due ${formatDate(fact.dueDate)}) for ${formatMoney(amount, currency)} is now overdue.\n\nPlease arrange payment at your earliest convenience.\n\nThanks,\n${fact.invoice?.business?.name || 'Your business'}`
  )
  if (fact.client?.email) {
    window.location.href = `mailto:${fact.client.email}?subject=${subject}&body=${body}`
    toast('Opening your email app with the reminder', 'info')
  } else {
    window.open(`https://wa.me/?text=${encodeURIComponent(`Reminder: invoice ${fact.number} is overdue. Amount due: ${formatMoney(amount, currency)}`)}`, '_blank', 'noopener,noreferrer')
  }
}

function PaymentsTab({ a, currency, onDrill }) {
  const toast = useUI((s) => s.toast)
  const r = a.receivables
  const agingRows = r.aging.map((b) => ({ Bucket: b.label, Outstanding: b.amount, Invoices: b.count }))
  const statusRows = r.status.filter((s) => s.value > 0).map((s) => ({ Status: s.name, Value: s.value, Invoices: s.count }))
  const methodRows = r.methods.map((m) => ({ Method: m.label, Collected: m.value, Payments: m.count }))
  const cashflowRows = r.cashflow.map((c) => ({ Week: c.label, 'Expected in': c.expected }))
  const alertRows = r.alerts.map((f) => ({ Invoice: f.number, Client: f.clientName, 'Days overdue': f.daysOverdue, Balance: f.balance, 'Due date': f.dueDate }))
  return (
    <div className="space-y-5">
      <PanelHead icon={IconWallet} title="Payments & receivables" subtitle="Aging, collection performance, cash flow and overdue follow-ups.">
        <ExportButtons rows={[...agingRows, ...statusRows, ...methodRows]} filename="payments-analytics" title="Payments analytics" currency={currency} />
      </PanelHead>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile label="Total outstanding" value={formatMoney(r.totalOutstanding, currency)} sub={<span className={MUTED}>Across all issued invoices</span>} badge="Open AR" badgeIcon={IconWallet} tone="warning" />
        <KpiTile label="Average days to paid" value={r.avgDaysToPaid == null ? '—' : `${r.avgDaysToPaid}d`} sub={<span className={MUTED}>From invoice date to payment</span>} badge="DSO" badgeIcon={IconClock} tone="brand" />
        <KpiTile label="On-time payments" value={`${r.onTimeRate.toFixed(0)}%`} sub={<span className={MUTED}>{r.onTime} on time · {r.late} late</span>} badge="Punctuality" badgeIcon={IconCheck} tone={r.onTimeRate >= 70 ? 'success' : 'warning'} progress={r.onTimeRate} />
        <KpiTile label="Overdue invoices" value={r.alerts.length} sub={<span className={MUTED}>Shown in the follow-up list</span>} badge="Attention" badgeIcon={IconAlert} tone="danger" />
      </div>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Panel className="p-4 sm:p-5">
          <PanelHead icon={IconChart} title="AR aging" subtitle="Outstanding balance by days past due." />
          <div className="mt-3 h-[260px]"><AgingChart data={r.aging} currency={currency} onDrill={onDrill} /></div>
          <div className="mt-2"><ExportButtons rows={agingRows} filename="ar-aging" title="AR aging" currency={currency} /></div>
        </Panel>
        <Panel className="p-4 sm:p-5">
          <PanelHead icon={IconChart} title="Payment status" subtitle="Value of invoices by current state." />
          <div className="mt-3 h-[260px]"><DonutChart data={r.status.filter((s) => s.value > 0).map((s) => ({ ...s }))} valueKey="value" nameKey="name" centerLabel="Value" onDrill={onDrill} /></div>
        </Panel>
      </div>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Panel className="p-4 sm:p-5">
          <PanelHead icon={IconWallet} title="Payment methods" subtitle="How your customers pay." />
          <div className="mt-3 h-[260px]"><DonutChart data={r.methods.map((m) => ({ name: m.label, value: m.value, color: m.color }))} valueKey="value" centerLabel="Collected" onDrill={onDrill} /></div>
          <div className="mt-2"><ExportButtons rows={methodRows} filename="payment-methods" title="Payment methods" currency={currency} /></div>
        </Panel>
        <Panel className="p-4 sm:p-5">
          <PanelHead icon={IconChart} title="Cash flow by week" subtitle="Expected receipts over the next 8 weeks." />
          <div className="mt-3 h-[260px]">{r.cashflow.some((c) => c.expected) ? <CashflowChart data={r.cashflow} currency={currency} /> : <EmptyState icon={IconChart} title="No expected receipts" description="Add invoice due dates to build a cash-flow outlook." />}</div>
          <div className="mt-2"><ExportButtons rows={cashflowRows} filename="cash-flow-weeks" title="Weekly cash flow" currency={currency} /></div>
        </Panel>
      </div>
      <Panel className="overflow-hidden">
        <div className={`flex flex-wrap items-center justify-between gap-2 border-b border-error/20 px-4 py-3 dark:border-error/20`}>
          <div>
            <h3 className="flex items-center gap-2 font-headline-sm text-headline-sm font-bold text-error dark:text-error-container"><IconAlert size={16} /> Overdue alerts</h3>
            <p className={`font-body-sm text-body-sm ${MUTED}`}>One-click reminders open your email app or WhatsApp.</p>
          </div>
          <ExportButtons rows={alertRows} filename="overdue-alerts" title="Overdue alerts" currency={currency} />
        </div>
        {!r.alerts.length ? <EmptyState icon={IconCheck} title="No overdue invoices" description="Every issued invoice is either paid or not yet due." /> : (
          <div className="divide-y divide-outline-variant dark:divide-slate-800">
            {r.alerts.map((f) => (
              <div key={f.id} className="flex flex-wrap items-center gap-3 p-3">
                <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${TONES.danger}`}><IconAlert size={15} /></span>
                <div className="min-w-0 flex-1">
                  <div className={`truncate font-label-ui text-label-ui font-semibold ${TITLE}`}>{f.clientName} <span className={`font-normal ${MUTED}`}>· {f.number}</span></div>
                  <div className={`font-body-sm text-body-sm ${MUTED}`}>Due {formatDate(f.dueDate)} · {f.daysOverdue} days late</div>
                </div>
                <span className="font-financial-tabular text-financial-tabular font-bold text-error dark:text-error-container">{formatMoney(f.balance, currency)}</span>
                <button type="button" className={BTN_LIGHT} onClick={() => sendPaymentReminder(f, currency, toast)}><IconSend size={14} /> Send reminder</button>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  )
}
function ExpenseModal({ form, setForm, onClose, onSave, onError }) {
  if (!form) return null
  const upload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const receipt = await readFileAsDataURL(file)
      setForm((f) => ({ ...f, receipt }))
    } catch { onError?.('Could not read that receipt file') }
  }
  return (
    <Modal open onClose={onClose} title={form.editing ? 'Edit expense' : 'Add expense'}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Select label="Category" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} options={EXPENSE_CATEGORIES.map((c) => ({ value: c, label: c }))} />
        <Input label="Amount" type="number" min="0" step="0.01" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} />
        <Input label="Date" type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
        <label className="block">
          <span className={`mb-1 block font-label-ui text-label-ui font-semibold ${MUTED}`}>Receipt (optional)</span>
          <input type="file" accept="image/*,application/pdf" onChange={upload} className={`w-full font-body-sm text-body-sm ${MUTED} file:mr-2 file:rounded-lg file:border-0 file:bg-primary-container/15 file:px-2 file:py-1.5 file:text-primary dark:file:bg-primary/25 dark:file:text-primary-fixed-dim`} />
          {form.receipt ? <span className="mt-1 block text-[11px] text-success-600 dark:text-success-300">Receipt attached</span> : null}
        </label>
        <Textarea label="Description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={2} className="sm:col-span-2" placeholder="What was this spend for?" />
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" className={BTN_LIGHT} onClick={onClose}>Cancel</button>
        <button type="button" className={BTN_PRIMARY} onClick={onSave}><IconCheck size={14} /> Save expense</button>
      </div>
    </Modal>
  )
}

function TaxExpensesTab({ a, currency, onDrill }) {
  const expenses = useData((s) => s.expenses)
  const saveExpense = useData((s) => s.saveExpense)
  const deleteExpense = useData((s) => s.deleteExpense)
  const toast = useUI((s) => s.toast)
  const [form, setForm] = useState(null)
  const [confirmId, setConfirmId] = useState(null)
  const tax = a.tax
  const exp = a.expense

  const monthRows = tax.months.map((m) => ({ Month: m.label, Taxable: m.taxable, CGST: m.cgst, SGST: m.sgst, IGST: m.igst, 'Total tax': m.tax }))
  const slabRows = tax.slabs.map((s) => ({ 'Tax rate': `${s.rate}%`, Taxable: s.taxable, Tax: s.tax, Lines: s.count }))
  const quarterRows = tax.quarterly.map((q) => ({ Quarter: q.label, Taxable: q.taxable, CGST: q.cgst, SGST: q.sgst, IGST: q.igst, Tax: q.tax }))
  const categoryRows = exp.categories.map((c) => ({ Category: c.name, Amount: c.value }))
  const expenseRows = expenses.map((e) => ({ Date: e.date, Category: e.category, Description: e.description || '—', Amount: e.amount, Receipt: e.receipt ? 'Attached' : 'None' }))
  const pl = [
    { label: 'Revenue (invoiced)', value: exp.revenue, kind: 'income' },
    ...exp.categories.map((c) => ({ label: c.name, value: -c.value, kind: 'expense' })),
    { label: 'Net profit', value: exp.profit, kind: exp.profit >= 0 ? 'total-good' : 'total-bad' },
  ]

  const save = () => {
    if (!form) return
    const amount = Number(form.amount)
    if (!Number.isFinite(amount) || amount <= 0) { toast('Enter an expense amount above zero', 'error'); return }
    if (!form.date) { toast('Choose an expense date', 'error'); return }
    saveExpense({ ...form, amount, category: form.category || 'Other', receipt: form.receipt || '' })
    setForm(null)
    toast('Expense saved', 'success')
  }

  return (
    <div className="space-y-5">
      <PanelHead icon={IconReceipt} title="GST, profit & expenses" subtitle="Tax liability, filing-ready exports and a live profit & loss view.">
        <ExportButtons rows={tax.gstr1} filename="gstr-1" title="GSTR-1" currency={currency} />
      </PanelHead>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile label="Total tax collected" value={formatMoney(tax.totals.tax, currency)} sub={<span className={MUTED}>{formatMoney(tax.totals.cgst, currency)} CGST · {formatMoney(tax.totals.sgst, currency)} SGST</span>} badge="GST" badgeIcon={IconReceipt} tone="brand" />
        <KpiTile label="IGST" value={formatMoney(tax.totals.igst, currency)} sub={<span className={MUTED}>Inter-state tax</span>} badge="Inter-state" badgeIcon={IconChart} tone="accent" />
        <KpiTile label="Expenses this period" value={formatMoney(exp.total, currency)} sub={<span className={MUTED}>{exp.count} entries recorded</span>} badge="Spend" badgeIcon={IconWallet} tone="warning" />
        <KpiTile label="Net profit" value={formatMoney(exp.profit, currency)} sub={<span className={MUTED}>{exp.margin.toFixed(1)}% margin on {formatMoney(exp.revenue, currency)}</span>} badge="Net" badgeIcon={IconTarget} tone={exp.profit >= 0 ? 'success' : 'danger'} />
      </div>

      <Panel className="p-4 sm:p-5">
        <PanelHead icon={IconChart} title="GST collection trend" subtitle="CGST + SGST + IGST over the last 12 months.">
          <ExportButtons rows={monthRows} filename="gst-collection-trend" title="GST collection trend" currency={currency} />
        </PanelHead>
        <div className="mt-3 h-[280px]">{tax.totals.tax ? <TaxChart data={tax.months} currency={currency} onDrill={onDrill} /> : <EmptyState icon={IconReceipt} title="No tax data" description="Tax totals appear once invoices are issued." />}</div>
      </Panel>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Panel className="overflow-hidden">
          <div className="border-b border-outline-variant px-4 py-3 dark:border-slate-800">
            <h3 className={`font-headline-sm text-headline-sm font-bold ${TITLE}`}>Tax slabs</h3>
            <p className={`font-body-sm text-body-sm ${MUTED}`}>Taxable value and tax by GST rate</p>
          </div>
          {!slabRows.length ? <EmptyState icon={IconReceipt} title="No taxable lines" description="Add items with a tax rate to see slab breakdowns." /> : (
            <div className="overflow-x-auto"><table className="w-full min-w-[420px] text-left">
              <thead className={SUBTLE}><tr><th className={TH}>Rate</th><th className={`${TH} text-right`}>Taxable</th><th className={`${TH} text-right`}>Tax</th><th className={`${TH} text-right`}>Lines</th></tr></thead>
              <tbody className="divide-y divide-outline-variant dark:divide-slate-800">{slabRows.map((r) => (
                <tr key={r['Tax rate']} className="hover:bg-surface-container-low/60 dark:hover:bg-slate-800/40"><td className={`${TD} font-bold ${PRIMARY}`}>{r['Tax rate']}</td><td className={`${TD} text-right`}>{formatMoney(r.Taxable, currency)}</td><td className={`${TD} text-right font-bold`}>{formatMoney(r.Tax, currency)}</td><td className={`${TD} text-right ${MUTED}`}>{r.Lines}</td></tr>
              ))}</tbody>
            </table></div>
          )}
        </Panel>
        <Panel className="overflow-hidden">
          <div className="border-b border-outline-variant px-4 py-3 dark:border-slate-800">
            <h3 className={`font-headline-sm text-headline-sm font-bold ${TITLE}`}>Quarterly summary</h3>
            <p className={`font-body-sm text-body-sm ${MUTED}`}>Handy for GSTR-1 filing and review</p>
          </div>
          {!quarterRows.length ? <EmptyState icon={IconChart} title="No tax data" description="Tax totals will appear once invoices are issued." /> : (
            <div className="overflow-x-auto"><table className="w-full min-w-[480px] text-left">
              <thead className={SUBTLE}><tr><th className={TH}>Quarter</th><th className={`${TH} text-right`}>Taxable</th><th className={`${TH} text-right`}>CGST</th><th className={`${TH} text-right`}>SGST</th><th className={`${TH} text-right`}>IGST</th></tr></thead>
              <tbody className="divide-y divide-outline-variant dark:divide-slate-800">{quarterRows.map((r) => (
                <tr key={r.Quarter} className="hover:bg-surface-container-low/60 dark:hover:bg-slate-800/40"><td className={`${TD} font-semibold`}>{r.Quarter}</td><td className={`${TD} text-right`}>{formatMoney(r.Taxable, currency)}</td><td className={`${TD} text-right`}>{formatMoney(r.CGST, currency)}</td><td className={`${TD} text-right`}>{formatMoney(r.SGST, currency)}</td><td className={`${TD} text-right`}>{formatMoney(r.IGST, currency)}</td></tr>
              ))}</tbody>
            </table></div>
          )}
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Panel className="overflow-hidden lg:col-span-2">
          <div className="border-b border-outline-variant px-4 py-3 dark:border-slate-800">
            <h3 className={`font-headline-sm text-headline-sm font-bold ${TITLE}`}>Profit & loss</h3>
            <p className={`font-body-sm text-body-sm ${MUTED}`}>Invoiced revenue minus recorded expenses for this period</p>
          </div>
          <div className="divide-y divide-outline-variant dark:divide-slate-800">
            {pl.map((r) => (
              <div key={r.label} className={`flex items-center justify-between gap-3 px-4 py-2.5 font-body-sm text-body-sm ${r.kind === 'total-good' ? 'bg-secondary-container/30 font-bold text-on-secondary-fixed-variant dark:bg-secondary/15 dark:text-secondary-fixed' : r.kind === 'total-bad' ? 'bg-error-container/50 font-bold text-on-error-container dark:bg-error/15 dark:text-error-container' : ''}`}>
                <span className={r.kind === 'expense' ? `pl-4 ${MUTED}` : TITLE}>{r.label}</span>
                <span className={`font-financial-tabular text-financial-tabular font-bold ${r.kind === 'expense' ? 'text-error dark:text-error-container' : ''}`}>{formatMoney(r.value, currency)}</span>
              </div>
            ))}
          </div>
          <div className={`border-t border-outline-variant px-4 py-2 text-[11px] ${MUTED} dark:border-slate-800`}>Collected so far: {formatMoney(exp.collected, currency)} · Margin: {exp.margin.toFixed(1)}%</div>
        </Panel>
        <Panel className="p-4 sm:p-5">
          <PanelHead icon={IconWallet} title="Expense mix" subtitle="Where your money goes." />
          <div className="mt-3 h-[250px]"><DonutChart data={exp.categories.map((c, i) => ({ ...c, color: [CHART_COLORS.warning, CHART_COLORS.danger, CHART_COLORS.info, CHART_COLORS.violet, CHART_COLORS.accent, CHART_COLORS.brand, CHART_COLORS.slate][i % 7] }))} centerLabel="Spent" currency={currency} /></div>
          <div className="mt-2"><ExportButtons rows={categoryRows} filename="expense-mix" title="Expense mix" currency={currency} /></div>
        </Panel>
      </div>

      <Panel className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-outline-variant px-4 py-3 dark:border-slate-800">
          <div><h3 className={`font-headline-sm text-headline-sm font-bold ${TITLE}`}>Expense ledger</h3><p className={`font-body-sm text-body-sm ${MUTED}`}>Track every business cost in one place</p></div>
          <div className="flex flex-wrap items-center gap-2">
            <ExportButtons rows={expenseRows} filename="expenses" title="Expenses" currency={currency} />
            <button type="button" className={BTN_PRIMARY} onClick={() => setForm({ ...emptyExpense(), editing: false })}><IconPlus size={14} /> Add expense</button>
          </div>
        </div>
        {!expenses.length ? <EmptyState icon={IconReceipt} title="No expenses recorded" description="Add your first expense to see profit and category insights." action={<button type="button" className={BTN_PRIMARY} onClick={() => setForm({ ...emptyExpense(), editing: false })}><IconPlus size={13} /> Add expense</button>} /> : (
          <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left">
            <thead className={SUBTLE}><tr><th className={TH}>Date</th><th className={TH}>Category</th><th className={TH}>Description</th><th className={`${TH} text-right`}>Amount</th><th className={TH}>Receipt</th><th className={`${TH} text-right`}>Actions</th></tr></thead>
            <tbody className="divide-y divide-outline-variant dark:divide-slate-800">{expenses.map((e) => (
              <tr key={e.id} className="hover:bg-surface-container-low/60 dark:hover:bg-slate-800/40">
                <td className={`${TD} ${MUTED}`}>{formatDate(e.date)}</td>
                <td className={TD}><span className={`${CHIP} ${TONES.info}`}>{e.category}</span></td>
                <td className={TD}>{e.description || <span className={MUTED}>—</span>}</td>
                <td className={`${TD} text-right font-bold`}>{formatMoney(e.amount, currency)}</td>
                <td className={TD}>{e.receipt ? <a href={e.receipt} target="_blank" rel="noreferrer" className={`font-semibold ${PRIMARY} hover:underline`}>View</a> : <span className={MUTED}>—</span>}</td>
                <td className={`${TD} text-right`}><div className="flex justify-end gap-1"><button type="button" onClick={() => setForm({ ...e, editing: true })} aria-label="Edit expense" className={`rounded p-1 ${MUTED} hover:bg-surface-container dark:hover:bg-slate-800`}><IconPencil size={14} /></button><button type="button" onClick={() => setConfirmId(e.id)} aria-label="Delete expense" className="rounded p-1 text-error hover:bg-error-container/40 dark:hover:bg-error/15"><IconTrash size={14} /></button></div></td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </Panel>

      <ExpenseModal form={form} setForm={setForm} onClose={() => setForm(null)} onSave={save} onError={(msg) => toast(msg, 'error')} />
      <ConfirmModal open={!!confirmId} onClose={() => setConfirmId(null)} title="Delete expense?" message="This expense will be removed from your profit and tax reports." onConfirm={() => { deleteExpense(confirmId); setConfirmId(null); toast('Expense deleted', 'success') }} />
    </div>
  )
}
const INSIGHT_ICONS = {
  trend: IconTrendingUp, alert: IconAlert, users: IconUsers,
  clock: IconClock, target: IconTarget, wallet: IconWallet, chart: IconChart,
}

function GoalTile({ goal, currency, onEdit, onDelete }) {
  const pct = safePct(goal.pct)
  const behind = goal.status === 'behind'
  return (
    <div className={`${CARD} p-4`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className={`font-label-ui text-label-ui font-bold capitalize ${TITLE}`}>{goal.periodType} target</div>
          <div className={`font-body-sm text-body-sm ${MUTED}`}>{goal.periodKey}</div>
        </div>
        <div className="flex items-center gap-1">
          <span className={`${CHIP} font-bold ${behind ? TONES.danger : TONES.success}`}>{behind ? 'Behind' : 'On track'}</span>
          <button type="button" onClick={() => onEdit(goal)} aria-label="Edit target" className={`rounded p-1 ${MUTED} hover:bg-surface-container dark:hover:bg-slate-800`}><IconPencil size={13} /></button>
          <button type="button" onClick={() => onDelete(goal)} aria-label="Delete target" className="rounded p-1 text-error hover:bg-error-container/40 dark:hover:bg-error/15"><IconX size={13} /></button>
        </div>
      </div>
      <div className={`mt-3 font-financial-display text-financial-display font-bold ${TITLE}`}>{formatMoney(goal.actual, currency)} <span className={`font-body-sm text-body-sm font-medium ${MUTED}`}>/ {formatMoney(goal.target, currency)}</span></div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-surface-container-high dark:bg-slate-800">
        <div className={`h-full rounded-full ${behind ? 'bg-gradient-to-r from-warning-500 to-error' : 'bg-gradient-to-r from-primary to-secondary dark:from-primary-fixed-dim dark:to-secondary-fixed'}`} style={{ width: `${pct}%` }} />
      </div>
      <div className={`mt-1.5 text-right font-body-sm text-body-sm font-semibold ${MUTED}`}>{pct.toFixed(0)}% complete</div>
    </div>
  )
}

function GoalModal({ form, setForm, onClose, onSave }) {
  const now = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  const monthly = form?.periodType === 'monthly'
  const options = monthly
    ? Array.from({ length: 12 }, (_, i) => { const d = new Date(now.getFullYear(), now.getMonth() - i, 1); const v = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; return { value: v, label: new Date(d.getFullYear(), d.getMonth(), 1).toLocaleDateString('en', { month: 'long', year: 'numeric' }) } })
    : Array.from({ length: 4 }, (_, i) => { const v = String(now.getFullYear() - i); return { value: v, label: v } })
  if (!form) return null
  const setType = (periodType) => setForm((f) => ({ ...f, periodType, periodKey: periodType === 'monthly' ? `${now.getFullYear()}-${pad(now.getMonth() + 1)}` : String(now.getFullYear()) }))
  return (
    <Modal open onClose={onClose} title={form.editing ? 'Edit target' : 'New revenue target'}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Select label="Period" value={form.periodType} onChange={(e) => setType(e.target.value)} options={[{ value: 'monthly', label: 'Monthly' }, { value: 'yearly', label: 'Yearly' }]} />
        <Select label="Period key" value={form.periodKey} onChange={(e) => setForm((f) => ({ ...f, periodKey: e.target.value }))} options={options} />
        <Input label="Revenue target" type="number" min="1" step="1" value={form.target} onChange={(e) => setForm((f) => ({ ...f, target: e.target.value }))} className="sm:col-span-2" placeholder="e.g. 500000" />
      </div>
      <p className={`mt-3 text-[11px] ${MUTED}`}>Progress is measured from issued invoices and updates automatically as you invoice and collect.</p>
      <div className="mt-4 flex justify-end gap-2"><button type="button" className={BTN_LIGHT} onClick={onClose}>Cancel</button><button type="button" className={BTN_PRIMARY} onClick={onSave}><IconCheck size={14} /> Save target</button></div>
    </Modal>
  )
}

function GoalsTab({ a, currency }) {
  const goals = useData((s) => s.goals)
  const saveGoal = useData((s) => s.saveGoal)
  const deleteGoal = useData((s) => s.deleteGoal)
  const toast = useUI((s) => s.toast)
  const [form, setForm] = useState(null)
  const [confirmId, setConfirmId] = useState(null)
  const now = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  const openNew = () => setForm({ id: '', periodType: 'monthly', periodKey: `${now.getFullYear()}-${pad(now.getMonth() + 1)}`, target: '', editing: false })
  const openEdit = (g) => setForm({ ...g, editing: true })
  const save = () => {
    if (!form) return
    const target = Number(form.target)
    if (!Number.isFinite(target) || target <= 0) { toast('Enter a target greater than zero', 'error'); return }
    if (!form.periodKey) { toast('Choose a period', 'error'); return }
    const id = form.id || globalThis.crypto?.randomUUID?.() || `goal-${Date.now()}`
    saveGoal({ ...form, id, target })
    setForm(null)
    toast('Target saved', 'success')
  }
  const onTrack = a.goals.filter((g) => g.status === 'on-track').length
  const behind = a.goals.length - onTrack

  return (
    <div className="space-y-5">
      <PanelHead icon={IconTarget} title="Targets & insights" subtitle="Set revenue goals and get actionable signals from your business data.">
        <button type="button" className={BTN_PRIMARY} onClick={openNew}><IconPlus size={14} /> New target</button>
      </PanelHead>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile label="Active targets" value={a.goals.length} sub={<span className={MUTED}>Monthly and yearly goals</span>} badge="Live" badgeIcon={IconTarget} tone="brand" />
        <KpiTile label="On track" value={onTrack} sub={<span className={MUTED}>Pace is on schedule</span>} badge="Healthy" badgeIcon={IconCheck} tone="success" />
        <KpiTile label="Behind" value={behind} sub={<span className={MUTED}>Need a push this period</span>} badge="Attention" badgeIcon={IconAlert} tone="danger" />
        <KpiTile label="Smart insights" value={a.insights.length} sub={<span className={MUTED}>Generated from your data</span>} badge="Signals" badgeIcon={IconSparkle} tone="accent" />
      </div>
      {!a.goals.length ? <EmptyState icon={IconTarget} title="No targets yet" description="Set a monthly or yearly revenue target to track progress automatically." action={<button type="button" className={BTN_PRIMARY} onClick={openNew}><IconPlus size={14} /> Set your first target</button>} /> : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{a.goals.map((g) => <GoalTile key={g.id} goal={g} currency={currency} onEdit={openEdit} onDelete={(goal) => setConfirmId(goal.id)} />)}</div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Panel className="overflow-hidden">
          <div className="border-b border-outline-variant px-4 py-3 dark:border-slate-800">
            <h3 className={`flex items-center gap-2 font-headline-sm text-headline-sm font-bold ${TITLE}`}><IconSparkle size={17} className={PRIMARY} /> Smart insights</h3>
            <p className={`font-body-sm text-body-sm ${MUTED}`}>Signals generated from your current data</p>
          </div>
          {!a.insights.length ? <EmptyState icon={IconSparkle} title="No insights yet" description="Add invoices and targets to unlock tailored insights." /> : (
            <div className="divide-y divide-outline-variant dark:divide-slate-800">
              {a.insights.map((i) => {
                const I = INSIGHT_ICONS[i.icon] || IconSparkle
                return (
                  <div key={i.id} className="flex items-start gap-3 p-3.5">
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${TONES[i.tone] || TONES.info}`}><I size={15} /></span>
                    <div className="min-w-0 flex-1"><div className={`font-label-ui text-label-ui font-bold ${TITLE}`}>{i.title}</div><p className={`font-body-sm text-body-sm ${MUTED}`}>{i.text}</p></div>
                    {i.link ? <Link to={i.link}><button type="button" aria-label="Open insight" className={`rounded p-1 ${MUTED} hover:bg-surface-container dark:hover:bg-slate-800`}><IconArrowRight size={15} /></button></Link> : null}
                  </div>
                )
              })}
            </div>
          )}
        </Panel>
        <Panel className="overflow-hidden">
          <div className="border-b border-outline-variant px-4 py-3 dark:border-slate-800">
            <h3 className={`flex items-center gap-2 font-headline-sm text-headline-sm font-bold ${TITLE}`}><IconBell size={17} className="text-tertiary dark:text-tertiary-fixed" /> Notifications</h3>
            <p className={`font-body-sm text-body-sm ${MUTED}`}>Overdue, due soon and recent payments</p>
          </div>
          {!a.notifications.length ? <EmptyState icon={IconBell} title="You're all caught up" description="Payment reminders and receipts will appear here." /> : (
            <div className="max-h-[420px] divide-y divide-outline-variant overflow-y-auto dark:divide-slate-800">
              {a.notifications.map((n) => {
                const I = INSIGHT_ICONS[n.icon] || IconBell
                return (
                  <Link key={n.id} to={n.href || '/analytics?tab=payments'} className="flex items-start gap-3 p-3.5 transition-colors hover:bg-surface-container-low/60 dark:hover:bg-slate-800/40">
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${TONES[n.type] || TONES.info}`}><I size={14} /></span>
                    <div className="min-w-0 flex-1"><div className={`font-label-ui text-label-ui font-semibold ${TITLE}`}>{n.title}</div><p className={`truncate font-body-sm text-body-sm ${MUTED}`}>{n.text}</p></div>
                    <span className={`shrink-0 text-[10px] ${MUTED}`}>{formatDate(n.date)}</span>
                  </Link>
                )
              })}
            </div>
          )}
        </Panel>
      </div>

      <Panel className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div><h3 className={`font-headline-sm text-headline-sm font-bold ${TITLE}`}>Scheduled monthly report</h3><p className={`mt-0.5 font-body-sm text-body-sm ${MUTED}`}>Deploy <code className="rounded bg-surface-container px-1 py-0.5 text-[11px] dark:bg-slate-800">supabase/functions/monthly-report</code> and enable pg_cron to email a sales summary on the 1st of every month.</p></div>
        <span className={`${CHIP} font-bold ${TONES.accent}`}>Edge function ready</span>
      </Panel>

      <GoalModal form={form} setForm={setForm} onClose={() => setForm(null)} onSave={save} />
      <ConfirmModal open={!!confirmId} onClose={() => setConfirmId(null)} title="Delete target?" message="Progress history for this target will be removed." onConfirm={() => { deleteGoal(confirmId); setConfirmId(null); toast('Target deleted', 'success') }} />
    </div>
  )
}

function buildDossierRows(a) {
  const blank = () => ({ Section: null, Period: null, Invoiced: null, Collected: null, Pending: null, Forecast: null, Lower: null, Upper: null, Outstanding: null, Invoices: null })
  return [
    ...a.monthly.map((m) => ({ ...blank(), Section: 'Monthly', Period: m.label, Invoiced: m.invoiced, Collected: m.collected, Pending: m.pending, Invoices: m.count })),
    ...a.forecast.map((f) => ({ ...blank(), Section: 'Forecast', Period: f.label, Forecast: f.forecast, Lower: f.low, Upper: f.high })),
    ...a.fy.quarters.map((q) => ({ ...blank(), Section: 'Quarter', Period: `${q.label} ${q.period}`, Invoiced: q.invoiced, Collected: q.collected, Invoices: q.count })),
    ...a.receivables.aging.map((b) => ({ ...blank(), Section: 'Aging', Period: b.label, Outstanding: b.amount, Invoices: b.count })),
  ]
}

function StickyExportBar({ a, currency }) {
  const toast = useUI((s) => s.toast)
  const rows = buildDossierRows(a)
  const run = (fn, msg) => {
    try { fn(); toast(msg, 'success') } catch (e) { toast(e.message || 'Export failed', 'error') }
  }
  return (
    <div className="sticky bottom-3 z-30 w-full rounded-xl border border-outline-variant bg-surface-container-lowest/95 p-3.5 shadow-xl backdrop-blur-md dark:border-slate-700 dark:bg-slate-900/95">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="hidden h-2.5 w-2.5 rounded-full bg-secondary animate-pulse sm:block dark:bg-secondary-fixed" />
          <div>
            <span className={`font-label-ui text-label-ui font-bold ${TITLE}`}>Dossier readiness: live ledger synced</span>
            <span className={`ml-2 hidden font-body-sm text-body-sm ${MUTED} md:inline`}>GSTR-1, payment feeds and receivables included.</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className={BTN_LIGHT} onClick={() => window.print()}><IconPrinter size={15} /> Print summary</button>
          <button type="button" className={BTN_LIGHT} onClick={() => run(() => exportRowsXLS(rows, 'analytics-dossier', 'Analytics BI Dossier'), 'Excel raw data downloaded')}><IconTable size={15} /> Excel raw data</button>
          <button type="button" className={BTN_PRIMARY} onClick={() => exportRowsPDF(rows, 'Analytics BI Dossier', currency).catch((e) => toast(e.message || 'Export failed', 'error'))}><IconDownload size={15} /> Generate audit pack</button>
        </div>
      </div>
    </div>
  )
}

export default function AnalyticsPage() {
  const [params, setParams] = useSearchParams()
  const tabParam = params.get('tab')
  const tab = TABS.some((t) => t.id === tabParam) ? tabParam : 'sales'
  const [periodId, setPeriodId] = useState('thisMonth')
  const [compareMode, setCompareMode] = useState('previous')
  const [custom, setCustom] = useState({ from: '', to: '' })
  const [datesOpen, setDatesOpen] = useState(false)
  const [granularity, setGranularity] = useState('monthly')
  const [drill, setDrill] = useState(null)
  const toast = useUI((s) => s.toast)
  const a = useAnalytics({ periodId, compareMode, custom, granularity, periods: 18 })
  const currency = a.currency

  const changeTab = (id) => setParams(id === 'sales' ? {} : { tab: id }, { replace: true })
  const resetFilters = () => {
    setPeriodId('thisMonth'); setCompareMode('previous'); setCustom({ from: '', to: '' })
    setGranularity('monthly'); setDatesOpen(false)
    toast('Analytics filters reset', 'info')
  }
  const exportDossier = (format) => {
    const rows = buildDossierRows(a)
    try {
      if (format === 'CSV') { exportRowsCSV(rows, 'analytics-dossier'); toast('CSV dossier downloaded', 'success') }
      else if (format === 'XLS') { exportRowsXLS(rows, 'analytics-dossier', 'Analytics BI Dossier'); toast('Excel dossier downloaded', 'success') }
      else { exportRowsPDF(rows, 'Analytics BI Dossier', currency).catch((e) => toast(e.message || 'Export failed', 'error')) }
    } catch (e) { toast(e.message || 'Export failed', 'error') }
  }

  const selectClass = `appearance-none rounded-lg bg-surface-container-low py-1.5 pl-8 pr-8 font-label-ui text-label-ui text-on-surface hover:bg-surface-container focus:outline-none dark:bg-slate-800 dark:text-slate-100`

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-5 px-4 pb-20 pt-4 sm:px-6 md:pb-6 lg:px-8">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span className={`${CHIP} uppercase tracking-widest ${TONES.brand}`}><span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse dark:bg-primary-fixed-dim" />Business Intelligence &amp; Financial Health</span>
            <span className="h-1 w-1 rounded-full bg-outline-variant dark:bg-slate-600" />
            <span className={`flex items-center gap-1 font-body-sm text-body-sm ${MUTED}`}><IconCheck size={14} className="text-secondary dark:text-secondary-fixed" /> Real-time ledger sync</span>
          </div>
          <h1 className={`font-headline-lg text-headline-lg font-bold tracking-tight ${TITLE}`}>Analytics &amp; Insights</h1>
          <p className={`mt-0.5 font-body-md text-body-md ${MUTED}`}>Revenue, clients, products, cash flow, tax and goals in one unified intelligence dashboard.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Link to="/reports" className={BTN_LIGHT}><IconFileDown size={17} className={MUTED} /> Classic reports</Link>
          <div className="inline-flex items-center rounded-lg bg-surface-container-high p-1 dark:bg-slate-800">
            <button type="button" className={`${BTN} bg-primary-container text-on-primary shadow-sm hover:opacity-95 dark:bg-primary dark:text-on-primary`} onClick={() => exportDossier('PDF')}><IconDownload size={16} /> Export BI dossier</button>
            <div className="ml-1 flex items-center">
              {['CSV', 'XLS', 'PDF'].map((f) => (
                <button key={f} type="button" title={`${f} dossier`} onClick={() => exportDossier(f)} className={`rounded px-2 py-1.5 font-label-caps text-label-caps ${MUTED} transition-colors hover:bg-surface-container hover:text-on-surface dark:hover:bg-slate-700 dark:hover:text-slate-100`}>{f}</button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <div className={`${CARD} flex flex-col gap-3 p-3 xl:flex-row xl:items-center xl:justify-between`}>
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <IconCalendar size={17} className={`pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 ${PRIMARY}`} />
            <select aria-label="Period" value={periodId} onChange={(e) => setPeriodId(e.target.value)} className={selectClass}>
              {PERIOD_OPTIONS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
            <IconChevronDown size={15} className={`pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 ${MUTED}`} />
          </div>
          <div className="relative">
            <button type="button" onClick={() => setDatesOpen((v) => !v)} className={`flex items-center gap-1.5 rounded-lg bg-surface-container-low px-3 py-1.5 font-label-ui text-label-ui ${MUTED} transition-colors hover:bg-surface-container hover:text-on-surface dark:bg-slate-800 dark:hover:bg-slate-700`}>
              <IconFilter size={15} /> {formatDate(a.range.from)} – {formatDate(a.range.to)}
            </button>
            {datesOpen ? (
              <div className={`absolute left-0 top-full z-40 mt-2 flex flex-wrap items-end gap-2 rounded-xl ${CARD} border border-outline-variant p-3 dark:border-slate-700`}>
                <Input label="From" type="date" value={custom.from} onChange={(e) => { setCustom((c) => ({ ...c, from: e.target.value })); setPeriodId('custom') }} className="w-36" />
                <Input label="To" type="date" value={custom.to} onChange={(e) => { setCustom((c) => ({ ...c, to: e.target.value })); setPeriodId('custom') }} className="w-36" />
                <button type="button" className={BTN_LIGHT} onClick={() => setDatesOpen(false)}>Done</button>
              </div>
            ) : null}
          </div>
          <div className="relative">
            <span className={`pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 font-body-sm text-body-sm text-outline`}>vs</span>
            <select aria-label="Compare" value={compareMode} onChange={(e) => setCompareMode(e.target.value)} className={`${selectClass} pl-7`}>
              <option value="none">No comparison</option>
              <option value="previous">Previous period</option>
              <option value="lastYear">Same period last year</option>
            </select>
            <IconChevronDown size={15} className={`pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 ${MUTED}`} />
          </div>
          <span className={`hidden sm:inline-flex ${CHIP} ${TONES.success}`}><span className="h-1.5 w-1.5 rounded-full bg-secondary dark:bg-secondary-fixed" /> Audited ledger mode</span>
        </div>
        <div className="flex items-center justify-between gap-2 sm:justify-end">
          <span className={`hidden font-label-caps text-label-caps uppercase tracking-wider ${MUTED} md:inline`}>Granularity:</span>
          <div className={`inline-flex rounded-lg bg-surface-container-low p-0.5 dark:bg-slate-800`}>
            {GRANULARITIES.map((g) => (
              <button key={g.value} type="button" onClick={() => setGranularity(g.value)} className={`rounded px-2.5 py-1 font-label-ui text-label-ui transition-all ${granularity === g.value ? `bg-surface-container-lowest font-semibold text-primary shadow-sm dark:bg-slate-900 dark:text-primary-fixed-dim` : `${MUTED} hover:text-on-surface dark:hover:text-slate-100`}`}>{g.label}</button>
            ))}
          </div>
          <button type="button" title="Reset filters" aria-label="Reset filters" onClick={resetFilters} className={`rounded-lg bg-surface-container-low p-1.5 transition-colors hover:bg-surface-container dark:bg-slate-800 dark:hover:bg-slate-700 ${MUTED}`}><IconRotate size={17} /></button>
        </div>
      </div>

      <nav className="flex items-center gap-1 overflow-x-auto pb-1" aria-label="Analytics sections">
        {TABS.map((t) => {
          const active = tab === t.id
          return (
            <button key={t.id} type="button" onClick={() => changeTab(t.id)} aria-current={active ? 'page' : undefined} className={`flex shrink-0 items-center gap-2 rounded-lg px-4 py-2.5 font-label-ui text-label-ui transition-colors ${active ? `${BTN} bg-primary text-on-primary font-semibold shadow-sm dark:bg-primary dark:text-on-primary` : `${BTN} ${CARD} ${MUTED} hover:text-on-surface dark:hover:text-slate-100`}`}>
              <t.icon size={18} /> {t.label}
            </button>
          )
        })}
      </nav>

      {tab === 'sales' ? <SalesTab a={a} currency={currency} granularity={granularity} onDrill={setDrill} changeTab={changeTab} /> : null}
      {tab === 'clients' ? <ClientsTab a={a} currency={currency} onDrill={setDrill} /> : null}
      {tab === 'products' ? <ProductsTab a={a} currency={currency} onDrill={setDrill} /> : null}
      {tab === 'payments' ? <PaymentsTab a={a} currency={currency} onDrill={setDrill} /> : null}
      {tab === 'tax' ? <TaxExpensesTab a={a} currency={currency} onDrill={setDrill} /> : null}
      {tab === 'goals' ? <GoalsTab a={a} currency={currency} /> : null}

      <StickyExportBar a={a} currency={currency} />
      <DrillModal data={drill} onClose={() => setDrill(null)} currency={currency} />
    </div>
  )
}

