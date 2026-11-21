import React, { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useData, DEFAULT_WIDGETS } from '../store/data'
import { useUI } from '../store/ui'
import { formatMoney } from '../utils/currency'
import { formatDate } from '../utils/date'
import { computeTotals, effectiveStatus } from '../utils/calc'
import { RenderInvoice } from '../templates/registry'
import { PERIOD_OPTIONS, STATUS_COLORS, statusLabel } from '../utils/analytics'
import { useAnalytics } from '../hooks/useAnalytics'
import { Draggable, EmptyState, Skeleton } from '../components/ui'
import {
  IconSparkle, IconSettings, IconUsers, IconPlus, IconWallet, IconReceipt,
  IconCheck, IconClock, IconAlert, IconFileText, IconTarget, IconBank,
  IconTrendingUp, IconTrendingDown, IconExternal, IconEye, IconDownload,
  IconSend, IconMail, IconMessage, IconRefresh, IconCalendar, IconGrip,
  IconX, IconArrowRight, IconMore, IconBuilding, IconCheckCircle, IconBell,
  IconChart, IconInvoice, IconInfo, IconChevronRight,
} from '../components/icons'

export { STATUS_COLORS, statusLabel, computeStats, monthlySeries } from '../utils/analytics'

const ROOT = 'relative mx-auto w-full max-w-[1440px] px-4 pb-20 pt-4 sm:px-6 md:pb-6 lg:px-8'

const PERIOD_LABELS = {
  today: 'Today', '7d': '7d', thisMonth: 'This Month', lastMonth: 'Last Month',
  thisQuarter: 'Quarter', thisFY: 'This FY', all: 'All Time', custom: 'Custom',
}

const WIDGET_META = [
  { key: 'kpis', label: 'KPI summary', size: 'lg' },
  { key: 'sales', label: 'Sales overview', size: 'lg' },
  { key: 'status', label: 'Payment status', size: 'sm' },
  { key: 'recent', label: 'Recent invoices', size: 'lg' },
  { key: 'cashflow', label: 'Cash flow forecast', size: 'md' },
  { key: 'topClients', label: 'Top clients', size: 'sm' },
  { key: 'activity', label: 'Activity feed', size: 'sm' },
  { key: 'due', label: 'Action center', size: 'sm' },
]

const ICON_TONES = {
  brand: 'bg-primary-fixed text-primary dark:bg-primary/20 dark:text-primary-fixed-dim',
  slate: 'bg-surface-container text-on-surface-variant dark:bg-slate-800 dark:text-slate-300',
  secondary: 'bg-secondary-fixed text-on-secondary-fixed-variant dark:bg-secondary/20 dark:text-secondary-fixed',
  tertiary: 'bg-surface-container-high text-tertiary dark:bg-slate-800 dark:text-tertiary-fixed-dim',
  danger: 'bg-error-container text-error dark:bg-error/20 dark:text-red-300',
}

const STATUS_TONES = {
  paid: 'bg-secondary-container/50 text-secondary dark:bg-secondary/15 dark:text-secondary-fixed',
  sent: 'bg-surface-container-high text-primary dark:bg-slate-800 dark:text-primary-fixed-dim',
  partially: 'bg-tertiary-fixed/60 text-tertiary dark:bg-cyan-900/30 dark:text-tertiary-fixed-dim',
  draft: 'bg-surface-container text-on-surface-variant dark:bg-slate-800 dark:text-slate-300',
  overdue: 'bg-error-container text-error dark:bg-error/20 dark:text-red-300',
}

const RISK_TONES = {
  Low: 'bg-secondary-container/50 text-secondary dark:bg-secondary/15 dark:text-secondary-fixed',
  Medium: 'bg-surface-container-high text-tertiary dark:bg-slate-800 dark:text-tertiary-fixed-dim',
  High: 'bg-error-container text-error dark:bg-error/20 dark:text-red-300',
}

const NOTIF_ICONS = { alert: IconAlert, clock: IconClock, check: IconCheck }
const NOTIF_TONES = {
  danger: 'bg-error-container text-error dark:bg-error/20 dark:text-red-300',
  warning: 'bg-surface-container-high text-tertiary dark:bg-slate-800 dark:text-tertiary-fixed-dim',
  success: 'bg-secondary-fixed text-on-secondary-fixed-variant dark:bg-secondary/20 dark:text-secondary-fixed',
}

const C = {
  primary: '#3525cd',
  primarySoft: '#4f46e5',
  secondary: '#006a61',
  pending: '#4cd7f6',
  danger: '#ba1a1a',
  bar: '#86f2e4',
}

const num = (v) => Number(v) || 0
const fmt = (v, currency, compact = false) => formatMoney(v, currency, { compact }).replace(/\.00$/, '')
const changeText = (v) => {
  const n = num(v)
  return `${n > 0 ? '+' : n < 0 ? '-' : ''}${Math.abs(n).toFixed(1)}%`
}
const dateValue = (iso) => new Date(`${String(iso).slice(0, 10)}T00:00:00`)
const daysUntil = (iso) => {
  if (!iso) return null
  const today = new Date(); today.setHours(0, 0, 0, 0)
  return Math.round((dateValue(iso) - today) / 86400000)
}
const dayCount = (from, to) => Math.max(1, Math.round((dateValue(to) - dateValue(from)) / 86400000) + 1)
const initials = (name) => String(name || '—').split(/\s+/).slice(0, 2).map((w) => w[0] || '').join('').toUpperCase()

function relativeTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return formatDate(iso)
  const diff = Date.now() - d.getTime()
  const future = diff < 0
  const mins = Math.abs(Math.round(diff / 60000))
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ${future ? 'from now' : 'ago'}`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs}h ${future ? 'from now' : 'ago'}`
  const days = Math.round(hrs / 24)
  if (days < 7) return `${days}d ${future ? 'from now' : 'ago'}`
  return formatDate(iso)
}

function pointsFor(values, width, height, pad = 2) {
  const vals = values.map(num)
  const min = Math.min(...vals), max = Math.max(...vals)
  const denom = max === min ? 1 : max - min
  const span = Math.max(1, vals.length - 1)
  return vals.map((v, i) => ({
    x: pad + (i / span) * (width - pad * 2),
    y: max === min ? height / 2 : height - pad - ((v - min) / denom) * (height - pad * 2),
  }))
}

function smoothPath(points) {
  if (!points.length) return ''
  if (points.length === 1) return `M${points[0].x},${points[0].y}`
  let d = `M${points[0].x},${points[0].y}`
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1], cur = points[i], mid = (prev.x + cur.x) / 2
    d += ` C${mid},${prev.y} ${mid},${cur.y} ${cur.x},${cur.y}`
  }
  return d
}

function linePath(points) {
  return points.map((p, i) => `${i ? 'L' : 'M'}${p.x},${p.y}`).join(' ')
}

function Sparkline({ data = [], className = 'text-primary' }) {
  const points = pointsFor(data.length ? data : [0, 0], 100, 28)
  const path = smoothPath(points)
  return (
    <svg className={`h-7 w-24 shrink-0 ${className}`} viewBox="0 0 100 28" fill="none" preserveAspectRatio="none" aria-hidden="true">
      <path d={`${path} L100,28 L0,28 Z`} fill="currentColor" fillOpacity="0.1" />
      <path d={path} stroke="currentColor" strokeWidth="2" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

function Panel({ className = '', children, ...rest }) {
  return (
    <section className={`rounded-xl bg-surface-container-lowest shadow-sm ring-1 ring-surface-container/70 dark:bg-slate-900 dark:ring-slate-800 ${className}`} {...rest}>
      {children}
    </section>
  )
}

function PanelHeading({ title, subtitle, icon: IconComp, action }) {
  return (
    <div className="flex flex-col gap-3 border-b border-surface-container pb-3 dark:border-slate-800 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 items-start gap-2.5">
        {IconComp ? (
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-container-low text-primary dark:bg-slate-800 dark:text-primary-fixed-dim">
            <IconComp size={17} />
          </span>
        ) : null}
        <div className="min-w-0">
          <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface dark:text-slate-100">{title}</h3>
          {subtitle ? <p className="font-body-sm text-body-sm text-on-surface-variant dark:text-slate-400">{subtitle}</p> : null}
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}

function SegButton({ active = false, onClick, children, title, className = '' }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 font-label-ui text-label-ui transition-colors ${
        active
          ? 'bg-surface-container-lowest font-semibold text-primary shadow-xs dark:bg-slate-800 dark:text-primary-fixed-dim'
          : 'text-on-surface-variant hover:text-on-surface dark:text-slate-400 dark:hover:text-slate-100'
      } ${className}`}
    >
      {children}
    </button>
  )
}

function Toggle({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${checked ? 'bg-primary dark:bg-primary-container' : 'bg-surface-container-highest dark:bg-slate-700'}`}
    >
      <span className={`absolute left-0.5 h-4 w-4 rounded-full bg-surface-container-lowest shadow-sm transition-transform dark:bg-slate-100 ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
    </button>
  )
}

function ChangeBadge({ card, className = '' }) {
  const change = card?.change || 0
  const Trend = change >= 0 ? IconTrendingUp : IconTrendingDown
  const tone = card?.neutral
    ? 'bg-surface-container text-on-surface-variant dark:bg-slate-800 dark:text-slate-400'
    : card?.good
      ? 'bg-secondary-container/50 text-secondary dark:bg-secondary/15 dark:text-secondary-fixed'
      : 'bg-error-container/40 text-error dark:bg-error/15 dark:text-red-300'
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-label-caps text-label-caps ${tone} ${className}`}>
      <Trend size={12} /> {changeText(change)}
    </span>
  )
}

function KpiTile({ label, value, secondary, icon: IconComp = IconChart, tone = 'slate', danger = false, tag, hint, children }) {
  return (
    <article
      title={hint}
      className={`group flex min-h-[150px] flex-col justify-between rounded-xl bg-surface-container-lowest p-4 shadow-sm transition-all hover:shadow-md dark:bg-slate-900 ${danger ? 'ring-1 ring-error/20 dark:ring-error/30' : ''}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={`font-label-caps text-label-caps uppercase tracking-wider ${danger ? 'text-error dark:text-red-300' : 'text-on-surface-variant dark:text-slate-400'}`}>{label}</span>
            {tag ? <span className="rounded-full bg-error-container px-1.5 py-0.5 font-label-caps text-[9px] font-bold text-on-error-container dark:bg-error/20 dark:text-red-300">{tag}</span> : null}
          </div>
          <div className={`font-financial-display text-financial-display tracking-tight ${danger ? 'text-error dark:text-red-300' : 'text-on-surface dark:text-slate-100'}`}>{value}</div>
          {secondary ? <div className="font-financial-tabular text-financial-tabular text-on-surface-variant dark:text-slate-400">{secondary}</div> : null}
        </div>
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-transform group-hover:scale-105 ${ICON_TONES[tone] || ICON_TONES.slate}`}>
          <IconComp size={20} />
        </span>
      </div>
      {children ? <div className="mt-3 flex flex-wrap items-end justify-between gap-2">{children}</div> : null}
    </article>
  )
}

function KpiSection({ a, currency, cards, draftFacts, draftValue, overdueFacts, compareLabel, onRemind }) {
  const revenue = cards.find((c) => c.key === 'revenue')
  const count = cards.find((c) => c.key === 'count')
  const paid = cards.find((c) => c.key === 'paid')
  const pending = cards.find((c) => c.key === 'pending')
  const overdue = cards.find((c) => c.key === 'overdue')
  const rate = cards.find((c) => c.key === 'rate')
  const rateValue = num(rate?.value)
  const tax = a.tax.totals

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <KpiTile label="Total Net Revenue" value={fmt(revenue?.value, currency)} icon={IconWallet} tone="brand" hint={revenue?.hint}>
        <ChangeBadge card={revenue} />
        <Sparkline data={revenue?.spark} className="text-primary dark:text-primary-fixed-dim" />
      </KpiTile>

      <KpiTile label="Invoices Issued" value={count?.formatted || Math.round(num(count?.value)).toLocaleString('en-IN')} secondary="issued" icon={IconReceipt} tone="slate" hint={count?.hint}>
        <ChangeBadge card={count} />
        <Sparkline data={count?.spark} className="text-on-surface-variant dark:text-slate-400" />
      </KpiTile>

      <KpiTile label="Realized Collections" value={fmt(paid?.value, currency)} icon={IconCheck} tone="secondary" hint={paid?.hint}>
        <ChangeBadge card={paid} />
        <Sparkline data={paid?.spark} className="text-secondary dark:text-secondary-fixed" />
      </KpiTile>

      <KpiTile label="Awaiting Settlement" value={fmt(pending?.value, currency)} icon={IconClock} tone="tertiary" hint={pending?.hint}>
        <span className="inline-flex items-center gap-1 rounded-full bg-surface-container px-2 py-0.5 font-label-caps text-label-caps text-on-surface-variant dark:bg-slate-800 dark:text-slate-400">
          <span className="h-1.5 w-1.5 rounded-full bg-tertiary dark:bg-tertiary-fixed-dim" />
          {Math.round(num(count?.value))} invoices active
        </span>
        <span className="font-body-sm text-body-sm text-on-surface-variant dark:text-slate-400">{overdueFacts.length} need attention</span>
      </KpiTile>

      <KpiTile label="Overdue" tag="Action Needed" value={fmt(overdue?.value, currency)} icon={IconAlert} tone="danger" danger hint={overdue?.hint}>
        <span className="inline-flex items-center gap-1.5 font-body-sm text-body-sm text-on-surface-variant dark:text-slate-400">
          <IconBell size={15} className="text-error dark:text-red-300" />
          <strong className="font-semibold text-on-surface dark:text-slate-100">{overdueFacts.length} invoices</strong>
        </span>
        {overdueFacts.length ? (
          <button type="button" onClick={() => onRemind(overdueFacts[0])} className="font-label-caps text-label-caps uppercase text-primary hover:underline dark:text-primary-fixed-dim">
            Send Reminders
          </button>
        ) : (
          <span className="font-label-caps text-label-caps uppercase text-secondary dark:text-secondary-fixed">All clear</span>
        )}
      </KpiTile>

      <KpiTile label="Draft Invoices" value={String(draftFacts.length)} secondary={`(${fmt(draftValue, currency, true)})`} icon={IconFileText} tone="slate" hint="Invoices not yet issued">
        <span className="font-body-sm text-body-sm text-on-surface-variant dark:text-slate-400">Awaiting review</span>
        <Link to="/invoices" className="inline-flex items-center gap-1 font-label-caps text-label-caps uppercase font-semibold text-primary hover:underline dark:text-primary-fixed-dim">
          Open drafts <IconArrowRight size={12} />
        </Link>
      </KpiTile>

      <KpiTile label="Collection Rate" value={`${rateValue.toFixed(1)}%`} icon={IconTarget} tone="secondary" hint={rate?.hint}>
        <div className="w-full">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-container dark:bg-slate-800">
            <div className="h-full rounded-full bg-secondary transition-all duration-700 dark:bg-secondary-fixed" style={{ width: `${Math.min(100, rateValue)}%` }} />
          </div>
          <div className="mt-1.5 flex items-center justify-between font-label-caps text-[10px] text-on-surface-variant dark:text-slate-400">
            <span className="font-bold text-secondary dark:text-secondary-fixed">{changeText(rate?.change)} efficiency</span>
            <span className="truncate">vs {compareLabel}</span>
          </div>
        </div>
      </KpiTile>

      <KpiTile label="Net GST Realized" value={fmt(tax.tax, currency)} icon={IconBank} tone="slate" hint="CGST + SGST + IGST realized in the ledger">
        <div className="flex w-full items-center justify-between gap-1 rounded-md bg-surface-container-low px-2 py-1 font-financial-tabular text-[11px] text-on-surface-variant dark:bg-slate-800/60 dark:text-slate-400">
          <span><b className="font-medium text-on-surface dark:text-slate-100">CGST</b> {fmt(tax.cgst, currency, true)}</span>
          <span><b className="font-medium text-on-surface dark:text-slate-100">SGST</b> {fmt(tax.sgst, currency, true)}</span>
          <span className="text-primary dark:text-primary-fixed-dim"><b className="font-medium">IGST</b> {fmt(tax.igst, currency, true)}</span>
        </div>
      </KpiTile>
    </div>
  )
}

function SalesChart({ data, currency, onDrill }) {
  const rows = data || []
  if (!rows.length) return null
  const max = Math.max(1, ...rows.flatMap((m) => [num(m.invoiced), num(m.collected), num(m.priorYear)])) * 1.08
  const x = (i) => (rows.length === 1 ? 385 : 70 + (i / (rows.length - 1)) * 630)
  const y = (v) => 210 - (num(v) / max) * 180
  const seriesPath = (key) => smoothPath(rows.map((m, i) => ({ x: x(i), y: y(m[key]) })))
  const firstX = x(0), lastX = x(rows.length - 1)
  const invoicedPath = seriesPath('invoiced')
  const collectedPath = seriesPath('collected')
  const priorPath = seriesPath('priorYear')
  const ticks = [1, 0.75, 0.5, 0.25, 0]
  const labelStep = Math.max(1, Math.ceil(rows.length / 7))
  const labels = rows.map((m, i) => ({ m, i })).filter(({ i }) => i === 0 || i === rows.length - 1 || i % labelStep === 0)
  const barsStart = Math.max(0, rows.length - 3)

  return (
    <div className="relative mt-2 h-64 w-full">
      <svg className="h-full w-full" viewBox="0 0 760 240" fill="none" preserveAspectRatio="none" role="img" aria-label="Sales and collections monthly chart">
        <defs>
          <linearGradient id="invixSalesPrimary" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={C.primary} stopOpacity="0.25" />
            <stop offset="100%" stopColor={C.primary} stopOpacity="0" />
          </linearGradient>
          <linearGradient id="invixSalesSecondary" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={C.secondary} stopOpacity="0.2" />
            <stop offset="100%" stopColor={C.secondary} stopOpacity="0" />
          </linearGradient>
        </defs>

        {ticks.map((f) => (
          <g key={f}>
            <line x1="40" x2="740" y1={210 - f * 180} y2={210 - f * 180} strokeDasharray={f ? '3 3' : undefined} strokeWidth="1" className="stroke-surface-container dark:stroke-slate-800" />
            <text x="32" y={(210 - f * 180) + 4} textAnchor="end" fontSize="10" className="fill-outline-variant font-label-caps dark:fill-slate-500">{fmt(max * f, currency, true)}</text>
          </g>
        ))}

        <path d={priorPath} stroke={C.primary} strokeOpacity="0.45" strokeDasharray="4 4" strokeWidth="2" fill="none" />
        <path d={`${invoicedPath} L${lastX},210 L${firstX},210 Z`} fill="url(#invixSalesPrimary)" />
        <path d={invoicedPath} stroke={C.primary} strokeWidth="2.5" strokeLinecap="round" fill="none" />
        <path d={`${collectedPath} L${lastX},210 L${firstX},210 Z`} fill="url(#invixSalesSecondary)" />
        <path d={collectedPath} stroke={C.secondary} strokeWidth="2" strokeLinecap="round" fill="none" />

        {rows.slice(barsStart).map((m, j) => {
          const i = barsStart + j
          const barX = x(i)
          return (
            <g key={`bar-${m.key}`} className="cursor-pointer" onClick={() => onDrill({ key: m.key, label: m.label })}>
              <rect x={barX - 15} y={y(m.invoiced)} width="10" height={Math.max(0, 210 - y(m.invoiced))} rx="3" fill={C.primarySoft} fillOpacity="0.2" />
              <rect x={barX + 3} y={y(m.collected)} width="10" height={Math.max(0, 210 - y(m.collected))} rx="3" fill={C.bar} fillOpacity="0.9" />
            </g>
          )
        })}

        {rows.map((m, i) => (
          <circle
            key={`dot-${m.key}`}
            cx={x(i)}
            cy={y(m.invoiced)}
            r={i === rows.length - 1 ? 4.5 : 3}
            fill={C.primary}
            stroke="#ffffff"
            strokeWidth="2"
            className="cursor-pointer"
            onClick={() => onDrill({ key: m.key, label: m.label })}
          />
        ))}
        {rows.map((m, i) => (
          <circle
            key={`dot-pay-${m.key}`}
            cx={x(i)}
            cy={y(m.collected)}
            r={i === rows.length - 1 ? 4.5 : 3}
            fill={C.secondary}
            stroke="#ffffff"
            strokeWidth="2"
            className="cursor-pointer"
            onClick={() => onDrill({ key: m.key, label: m.label })}
          />
        ))}

        {labels.map(({ m, i }) => (
          <text key={`label-${m.key}`} x={x(i)} y="228" textAnchor="middle" fontSize="11" className={i === rows.length - 1 ? 'fill-on-surface font-semibold dark:fill-slate-100' : 'fill-outline-variant dark:fill-slate-500'}>
            {m.label}
          </text>
        ))}
      </svg>
    </div>
  )
}

function SalesPanel({ monthly, currency, cards, onDrill }) {
  const [zoom, setZoom] = useState(12)
  const rows = useMemo(() => monthly.slice(-zoom), [monthly, zoom])
  const priorTotal = rows.reduce((s, m) => s + num(m.priorYear), 0)
  const highest = monthly.reduce((best, m) => (!best || num(m.invoiced) > num(best.invoiced) ? m : best), null)
  const paid = cards.find((c) => c.key === 'paid')
  const legend = [
    { label: 'Invoiced', value: cards.find((c) => c.key === 'invoiced')?.value, color: 'bg-primary dark:bg-primary-container' },
    { label: 'Collected', value: paid?.value, color: 'bg-secondary dark:bg-secondary-fixed' },
    { label: 'Pending', value: cards.find((c) => c.key === 'pending')?.value, color: 'bg-tertiary-fixed-dim' },
    { label: 'Prior Period', value: priorTotal, color: 'bg-outline-variant dark:bg-slate-600' },
  ]

  return (
    <Panel className="flex h-full flex-col justify-between p-5">
      <PanelHeading
        title="Sales & Collections Overview"
        subtitle="Monthly velocity against prior-period benchmarks"
        action={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <div className="inline-flex rounded-lg bg-surface-container p-0.5 dark:bg-slate-800">
              {[[1, '1M'], [3, '3M'], [6, '6M'], [12, '1Y']].map(([value, label]) => (
                <SegButton key={value} active={zoom === value} onClick={() => setZoom(value)} className="px-2">{label}</SegButton>
              ))}
            </div>
            <button
              type="button"
              title="Open detailed breakdown"
              onClick={() => onDrill({ key: rows[rows.length - 1]?.key || '', label: rows[rows.length - 1]?.label || 'Sales' })}
              className="rounded-lg p-1.5 text-on-surface-variant transition-colors hover:bg-surface-container hover:text-primary dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-primary-fixed-dim"
            >
              <IconExternal size={18} />
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-2.5 py-4 sm:grid-cols-4">
        {legend.map((item) => (
          <div key={item.label} className="flex items-center gap-2.5 rounded-lg bg-surface-container-low p-2.5 dark:bg-slate-800/60">
            <span className={`h-3 w-3 shrink-0 rounded-sm ${item.color}`} />
            <div className="min-w-0">
              <div className="font-label-caps text-[10px] uppercase text-on-surface-variant dark:text-slate-400">{item.label}</div>
              <div className="truncate font-financial-tabular text-financial-tabular font-bold text-on-surface dark:text-slate-100">{fmt(item.value, currency, true)}</div>
            </div>
          </div>
        ))}
      </div>

      {rows.some((m) => num(m.invoiced) || num(m.collected)) ? (
        <SalesChart data={rows} currency={currency} onDrill={onDrill} />
      ) : (
        <EmptyState icon={IconChart} title="No sales in this view" description="Try another period or create an invoice to populate the chart." />
      )}

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-surface-container pt-3 font-body-sm text-body-sm text-on-surface-variant dark:border-slate-800 dark:text-slate-400">
        <span>Highest intake: <strong className="font-semibold text-on-surface dark:text-slate-100">{highest ? `${highest.label} (${fmt(highest.invoiced, currency, true)})` : '—'}</strong></span>
        <span className="inline-flex items-center gap-1 font-medium text-secondary dark:text-secondary-fixed">
          <IconCheck size={16} /> {paid ? `${changeText(paid.change)} collection change` : 'No comparison data'}
        </span>
      </div>
    </Panel>
  )
}

function StatusDonut({ items, total, count, currency, onSegment }) {
  const circumference = 2 * Math.PI * 46
  let offset = 0
  return (
    <div className="relative my-6 flex items-center justify-center">
      <svg className="h-48 w-48 -rotate-90" viewBox="0 0 120 120" role="img" aria-label="Payment status distribution">
        <circle cx="60" cy="60" r="46" fill="none" strokeWidth="12" className="stroke-surface-container dark:stroke-slate-800" />
        {items.map((item) => {
          const length = total > 0 ? (num(item.value) / total) * circumference : 0
          const start = offset
          offset += length
          return (
            <circle
              key={item.name}
              cx="60"
              cy="60"
              r="46"
              fill="none"
              stroke={item.hex}
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={`${length} ${circumference - length}`}
              strokeDashoffset={-start}
              className="cursor-pointer transition-opacity hover:opacity-80"
              onClick={() => onSegment(item)}
            />
          )
        })}
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-label-caps text-[10px] uppercase tracking-wider text-on-surface-variant dark:text-slate-400">Gross Total</span>
        <span className="font-financial-display text-financial-display font-bold text-on-surface dark:text-slate-100">{fmt(total, currency, true)}</span>
        <span className="font-label-caps text-[10px] font-semibold text-secondary dark:text-secondary-fixed">{count} invoices</span>
      </div>
    </div>
  )
}

function StatusPanel({ receivables, currency, invoiceCount, onDrill }) {
  const raw = receivables.status || []
  const paid = raw.find((s) => s.name === 'Paid')
  const overdue = raw.find((s) => s.name === 'Overdue')
  const pendingValue = raw.filter((s) => s.name === 'Partial' || s.name === 'Unpaid').reduce((s, x) => s + num(x.value), 0)
  const items = [
    ...(num(paid?.value) ? [{ name: 'Paid / Settled', value: num(paid.value), hex: C.secondary, dot: 'bg-secondary dark:bg-secondary-fixed', tone: 'text-secondary dark:text-secondary-fixed' }] : []),
    ...(pendingValue ? [{ name: 'Pending / Due', value: pendingValue, hex: C.pending, dot: 'bg-tertiary-fixed-dim', tone: 'text-on-surface dark:text-slate-100' }] : []),
    ...(num(overdue?.value) ? [{ name: 'Overdue', value: num(overdue.value), hex: C.danger, dot: 'bg-error', tone: 'text-error dark:text-red-300' }] : []),
  ]
  const total = items.reduce((s, x) => s + x.value, 0)
  const aging = (receivables.aging || []).filter((b) => num(b.amount) > 0)

  return (
    <Panel className="flex h-full flex-col justify-between p-5">
      <PanelHeading
        title="Payment Status"
        subtitle="Breakdown of gross book receivables"
        action={
          <Link to="/analytics?tab=payments" className="rounded-lg p-1.5 text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface dark:hover:bg-slate-800 dark:hover:text-slate-100" title="Payment analytics">
            <IconMore size={18} />
          </Link>
        }
      />
      {items.length ? <StatusDonut items={items} total={total} count={invoiceCount} currency={currency} onSegment={(item) => onDrill({ label: item.name, value: item.value })} /> : (
        <EmptyState icon={IconInvoice} title="No receivables yet" description="Issued invoices will be grouped by settlement status here." />
      )}
      <div className="space-y-2.5">
        {items.map((item) => (
          <button key={item.name} type="button" onClick={() => onDrill({ label: item.name, value: item.value })} className="flex w-full items-center justify-between rounded-lg bg-surface-container-low p-2 text-left transition-colors hover:bg-surface-container dark:bg-slate-800/60 dark:hover:bg-slate-800">
            <span className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${item.dot}`} />
              <span className={`font-body-md text-body-md font-medium ${item.tone}`}>{item.name}</span>
            </span>
            <span className="text-right">
              <span className={`font-financial-tabular text-financial-tabular font-semibold ${item.tone}`}>{fmt(item.value, currency)}</span>
              <span className="ml-1.5 font-label-caps text-[11px] text-on-surface-variant dark:text-slate-400">{total ? ((item.value / total) * 100).toFixed(1) : '0.0'}%</span>
            </span>
          </button>
        ))}
      </div>
      {aging.length ? (
        <div className="mt-3 grid grid-cols-2 gap-2">
          {aging.map((bucket) => (
            <div key={bucket.key} className="rounded-lg bg-surface-container-low px-2 py-1.5 dark:bg-slate-800/60">
              <div className="font-label-caps text-[9px] uppercase text-on-surface-variant dark:text-slate-400">{bucket.label}</div>
              <div className="font-financial-tabular text-[11px] font-bold text-on-surface dark:text-slate-100">{fmt(bucket.amount, currency, true)} · {bucket.count}</div>
            </div>
          ))}
        </div>
      ) : null}
      <Link to="/analytics?tab=payments" className="mt-4 w-full rounded-lg bg-surface-container py-2 text-center font-label-ui text-label-ui font-semibold text-primary transition-colors hover:bg-surface-container-high dark:bg-slate-800 dark:text-primary-fixed-dim dark:hover:bg-slate-700">
        View Aging Schedule
      </Link>
    </Panel>
  )
}

function RecentInvoicesPanel({ invoices, currency, onRemind }) {
  const [filter, setFilter] = useState('all')
  const rows = useMemo(() => invoices.map((inv) => {
    const totals = computeTotals(inv)
    const status = effectiveStatus(inv, totals)
    const days = daysUntil(inv.dueDate)
    return { inv, totals, status, daysOverdue: status === 'overdue' && days !== null && days < 0 ? -days : 0 }
  }), [invoices])
  const visible = rows.filter((r) => {
    if (filter === 'all') return true
    if (filter === 'paid') return r.status === 'paid'
    if (filter === 'overdue') return r.status === 'overdue'
    return ['sent', 'partially', 'draft'].includes(r.status)
  })

  return (
    <Panel className="flex h-full flex-col justify-between p-5">
      <PanelHeading
        title="Recent Invoices"
        subtitle="Live ledger of issued billings and receipt confirmations"
        action={
          <div className="inline-flex rounded-lg bg-surface-container p-0.5 dark:bg-slate-800">
            {[['all', 'All'], ['paid', 'Paid'], ['pending', 'Pending'], ['overdue', 'Overdue']].map(([id, label]) => (
              <SegButton key={id} active={filter === id} onClick={() => setFilter(id)} className={id === 'overdue' ? 'hover:text-error' : ''}>{label}</SegButton>
            ))}
          </div>
        }
      />
      {visible.length ? (
        <div className="mt-2 overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-surface-container-low font-label-caps text-label-caps uppercase text-on-surface-variant dark:bg-slate-800/60 dark:text-slate-400">
                <th className="rounded-l-lg px-3 py-2.5">Invoice</th>
                <th className="px-3 py-2.5">Client</th>
                <th className="px-3 py-2.5">Date</th>
                <th className="px-3 py-2.5 text-right">Amount</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="rounded-r-lg px-3 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container font-body-sm text-body-sm dark:divide-slate-800">
              {visible.map(({ inv, totals, status, daysOverdue }) => (
                <tr key={inv.id} className="group transition-colors hover:bg-surface-container-low/60 dark:hover:bg-slate-800/40">
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <span className={`flex h-7 w-7 items-center justify-center rounded ${status === 'overdue' ? 'bg-error-container/60 text-error dark:bg-error/20 dark:text-red-300' : 'bg-primary-fixed text-primary dark:bg-primary/20 dark:text-primary-fixed-dim'}`}>
                        <IconInvoice size={14} />
                      </span>
                      <span className="font-financial-tabular font-bold text-on-surface dark:text-slate-100">{inv.number || '—'}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-surface-container-high font-bold text-[10px] text-primary dark:bg-slate-800 dark:text-primary-fixed-dim">{initials(inv.client?.name)}</span>
                      <span className="max-w-[130px] truncate font-medium text-on-surface dark:text-slate-100">{inv.client?.name || 'Unnamed client'}</span>
                    </div>
                  </td>
                  <td className={`whitespace-nowrap px-3 py-3 ${status === 'overdue' ? 'font-medium text-error dark:text-red-300' : 'text-on-surface-variant dark:text-slate-400'}`}>
                    {status === 'overdue' ? `${daysOverdue}d overdue` : formatDate(inv.issueDate)}
                  </td>
                  <td className="px-3 py-3 text-right">
                    <div className={`font-financial-tabular font-bold ${status === 'overdue' ? 'text-error dark:text-red-300' : 'text-on-surface dark:text-slate-100'}`}>{fmt(totals.total, inv.currency || currency)}</div>
                    <span className="font-label-caps text-[9px] text-on-surface-variant dark:text-slate-400">{status === 'paid' ? 'Settled' : status === 'overdue' ? 'Past due' : 'Open balance'}</span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-label-caps text-[10px] font-semibold ${STATUS_TONES[status] || STATUS_TONES.sent}`}>
                      <span className="h-1.5 w-1.5 rounded-full bg-current" /> {statusLabel(status)}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {status === 'overdue' ? (
                        <button type="button" onClick={() => onRemind({ ...inv, clientName: inv.client?.name, client: inv.client, balance: totals.balance, number: inv.number, dueDate: inv.dueDate })} className={`rounded-lg px-2 py-0.5 font-label-caps text-[10px] font-semibold ${STATUS_TONES.overdue}`}>
                          Remind
                        </button>
                      ) : (
                        <Link to={`/builder/${inv.id}`} title="Download / open invoice" className="rounded p-1 text-on-surface-variant transition-colors hover:bg-surface-container hover:text-primary dark:hover:bg-slate-800 dark:hover:text-primary-fixed-dim">
                          <IconDownload size={15} />
                        </Link>
                      )}
                      <Link to={`/builder/${inv.id}`} title="View details" className="rounded p-1 text-on-surface-variant transition-colors hover:bg-surface-container hover:text-primary dark:hover:bg-slate-800 dark:hover:text-primary-fixed-dim">
                        <IconEye size={15} />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState icon={IconInvoice} title="No invoices in this view" description="Create an invoice or choose a different status filter." action={<Link to="/builder" className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 font-label-ui text-label-ui font-semibold text-on-primary dark:bg-primary-container"><IconPlus size={14} /> Create Invoice</Link>} />
      )}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-surface-container pt-3 dark:border-slate-800">
        <span className="font-body-sm text-body-sm text-on-surface-variant dark:text-slate-400">Showing latest {visible.length} of {invoices.length} entries</span>
        <Link to="/invoices" className="inline-flex items-center gap-1 font-label-ui text-label-ui font-semibold text-primary hover:underline dark:text-primary-fixed-dim">
          Go to Invoices Ledger <IconArrowRight size={15} />
        </Link>
      </div>
    </Panel>
  )
}

function CashflowChart({ data, currency, onDrill }) {
  const rows = data || []
  if (!rows.length) return null
  let running = 0
  const values = rows.map((c) => (running += num(c.expected)))
  const max = Math.max(1, ...values) * 1.1
  const x = (i) => (rows.length === 1 ? 210 : 10 + (i / (rows.length - 1)) * 400)
  const y = (v) => 140 - (num(v) / max) * 120
  const mid = values.map((v, i) => ({ x: x(i), y: y(v) }))
  const upper = mid.map((p) => ({ x: p.x, y: Math.max(8, p.y - 20) }))
  const lower = [...mid].reverse().map((p) => ({ x: p.x, y: Math.min(150, p.y + 20) }))
  const band = `${linePath(upper)} ${lower.map((p) => `L${p.x},${p.y}`).join(' ')} Z`
  const milestones = rows.map((c, i) => ({ ...c, i })).sort((a, b) => num(b.expected) - num(a.expected)).slice(0, 2)

  return (
    <div className="relative my-4 h-44 w-full">
      <svg className="h-full w-full" viewBox="0 0 420 160" fill="none" preserveAspectRatio="none" role="img" aria-label="Eight week projected cash flow">
        <path d={band} fill={C.bar} fillOpacity="0.25" />
        {[140, 90, 40].map((gy) => <line key={gy} x1="10" x2="410" y1={gy} y2={gy} strokeWidth="1" strokeDasharray={gy === 140 ? undefined : '2 2'} className="stroke-surface-container dark:stroke-slate-800" />)}
        <line x1={x(0)} x2={x(0)} y1="15" y2="150" strokeWidth="1" strokeDasharray="2 2" className="stroke-outline-variant dark:stroke-slate-600" />
        <text x={x(0) + 5} y="26" fontSize="9" fontWeight="600" className="fill-secondary dark:fill-secondary-fixed">Today</text>
        <path d={smoothPath(mid)} stroke={C.secondary} strokeWidth="2.5" strokeLinecap="round" fill="none" />
        {milestones.map((c) => (
          <circle
            key={`pin-${c.key}`}
            cx={x(c.i)}
            cy={y(values[c.i])}
            r="4"
            fill={c.expected >= Math.max(...rows.map((r) => num(r.expected))) ? C.primary : C.secondary}
            className="cursor-pointer"
            onClick={() => onDrill({ label: `Cash flow · ${c.label}`, expected: c.expected })}
          />
        ))}
      </svg>
      <div className="flex justify-between px-1 font-label-caps text-[9px] text-on-surface-variant dark:text-slate-400">
        {rows.map((c, i) => (
          <span key={c.key} className={i === 0 ? 'font-bold text-primary dark:text-primary-fixed-dim' : ''}>{i === 0 ? `${c.label} (Now)` : c.label}</span>
        ))}
      </div>
    </div>
  )
}

function CashflowPanel({ cashflow, currency, onDrill }) {
  const total = cashflow.reduce((s, c) => s + num(c.expected), 0)
  const hasData = cashflow.some((c) => num(c.expected) > 0)
  const milestones = [...cashflow].sort((a, b) => num(b.expected) - num(a.expected)).slice(0, 2)

  return (
    <Panel className="flex h-full flex-col justify-between p-5">
      <PanelHeading
        title="Cash Flow Forecast"
        subtitle={`${cashflow.length}-week expected receipts and payout milestones`}
        action={
          <div className="text-right">
            <div className="font-financial-tabular text-financial-tabular font-bold text-secondary dark:text-secondary-fixed">+{fmt(total, currency, true)}</div>
            <span className="font-label-caps text-[9px] uppercase text-on-surface-variant dark:text-slate-400">Projected receipts</span>
          </div>
        }
      />
      {hasData ? <CashflowChart data={cashflow} currency={currency} onDrill={onDrill} /> : (
        <EmptyState icon={IconChart} title="No forecast available" description="Add due dates to your open invoices to project incoming cash." />
      )}
      <div className="mt-2 space-y-2">
        {milestones.map((c, i) => (
          <button key={c.key} type="button" onClick={() => onDrill({ label: `Cash flow · ${c.label}`, expected: c.expected })} className="flex w-full items-center justify-between rounded-lg bg-surface-container-low p-2.5 text-left transition-colors hover:bg-surface-container dark:bg-slate-800/60 dark:hover:bg-slate-800">
            <span className="flex items-center gap-2">
              {i === 0 ? <IconCheckCircle size={18} className="text-primary dark:text-primary-fixed-dim" /> : <IconCalendar size={18} className="text-secondary dark:text-secondary-fixed" />}
              <span>
                <span className="block font-body-sm text-body-sm font-medium text-on-surface dark:text-slate-100">Expected receipts · {c.label}</span>
                <span className="block font-label-caps text-[10px] text-on-surface-variant dark:text-slate-400">{i === 0 ? 'Highest projected week' : 'Next projected week'}</span>
              </span>
            </span>
            <span className="font-financial-tabular text-financial-tabular font-bold text-secondary dark:text-secondary-fixed">+{fmt(c.expected, currency)}</span>
          </button>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-surface-container pt-3 font-body-sm text-body-sm text-on-surface-variant dark:border-slate-800 dark:text-slate-400">
        <span>Based on {cashflow.filter((c) => num(c.expected) > 0).length} weeks with scheduled receipts</span>
        <Link to="/analytics?tab=payments" className="font-label-ui text-label-ui font-semibold text-primary hover:underline dark:text-primary-fixed-dim">Adjust Scenarios</Link>
      </div>
    </Panel>
  )
}

function TopClientsPanel({ clients, totalClients, currency, onDrill }) {
  const top = clients.slice(0, 4)
  const max = Math.max(1, ...top.map((c) => num(c.revenue)))

  return (
    <Panel className="flex h-full flex-col justify-between p-5">
      <PanelHeading
        title="Top Clients"
        subtitle="Ranked by billed volume and payment health"
        icon={IconBuilding}
      />
      {top.length ? (
        <div className="my-4 space-y-4">
          {top.map((client, i) => (
            <button key={client.id || client.name} type="button" onClick={() => onDrill({ label: client.name, revenue: client.revenue })} className="block w-full text-left">
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span className={`w-4 shrink-0 font-label-caps text-[11px] font-bold ${i === 0 ? 'text-primary dark:text-primary-fixed-dim' : 'text-on-surface-variant dark:text-slate-400'}`}>#{i + 1}</span>
                  <span className="truncate font-body-md text-body-md font-semibold text-on-surface dark:text-slate-100">{client.name}</span>
                  <span className={`shrink-0 rounded px-1.5 py-0.5 font-label-caps text-[9px] ${RISK_TONES[client.riskLabel] || RISK_TONES.Low}`}>{client.riskLabel || 'Low'}</span>
                </div>
                <span className="shrink-0 font-financial-tabular text-financial-tabular font-bold text-on-surface dark:text-slate-100">{fmt(client.revenue, currency, true)}</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-surface-container dark:bg-slate-800">
                <div className={`h-full rounded-full ${i === 0 ? 'bg-primary dark:bg-primary-container' : i === 1 ? 'bg-secondary dark:bg-secondary-fixed' : i === 2 ? 'bg-tertiary-container dark:bg-slate-600' : 'bg-tertiary dark:bg-tertiary-fixed-dim'}`} style={{ width: `${Math.max(2, (num(client.revenue) / max) * 100)}%` }} />
              </div>
            </button>
          ))}
        </div>
      ) : (
        <EmptyState icon={IconUsers} title="No clients yet" description="Add clients and issue invoices to see the top accounts here." />
      )}
      <Link to="/analytics?tab=clients" className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-surface-container py-2 font-label-ui text-label-ui text-on-surface transition-colors hover:bg-surface-container-high dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700">
        Directory Analysis ({totalClients} Clients) <IconChevronRight size={15} />
      </Link>
    </Panel>
  )
}

function ActivityPanel({ facts, payments, notifications, currency }) {
  const events = useMemo(() => {
    const fromNotifications = (notifications || []).map((n) => {
      const IconComp = NOTIF_ICONS[n.icon] || IconBell
      return {
        id: n.id,
        icon: IconComp,
        tone: NOTIF_TONES[n.type] || NOTIF_TONES.success,
        title: n.title,
        text: n.text,
        date: n.date,
      }
    })
    if (fromNotifications.length) return fromNotifications.slice(0, 5)
    return [
      ...facts.slice(-6).map((f) => ({
        id: `inv-${f.id}`, icon: IconInvoice, tone: NOTIF_TONES.warning,
        title: `${f.number} issued`, text: `${f.clientName} · ${fmt(f.total, f.currency || currency)}`, date: f.date,
      })),
      ...payments.slice(-6).map((p) => ({
        id: `pay-${p.id}`, icon: IconCheck, tone: NOTIF_TONES.success,
        title: 'Payment received', text: `${p.clientName} · ${fmt(p.amount, p.currency || currency)}`, date: p.date,
      })),
    ].sort((a, b) => String(b.date || '').localeCompare(String(a.date || ''))).slice(0, 5)
  }, [facts, payments, notifications, currency])

  return (
    <Panel className="flex h-full flex-col justify-between p-5">
      <PanelHeading
        title="Activity Feed"
        subtitle="Real-time ledger events and portal logs"
        action={<span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-secondary opacity-75" /><span className="relative inline-flex h-2 w-2 rounded-full bg-secondary" /></span>}
      />
      {events.length ? (
        <div className="relative my-4 space-y-4 pl-6">
          <div className="absolute bottom-2 left-[9px] top-2 w-px bg-surface-container dark:bg-slate-800" />
          {events.map((event) => {
            const IconComp = event.icon
            return (
              <div key={event.id} className="relative">
                <span className={`absolute -left-6 top-0.5 flex h-6 w-6 items-center justify-center rounded-full ring-4 ring-surface-container-lowest dark:ring-slate-900 ${event.tone}`}>
                  <IconComp size={11} />
                </span>
                <div className="font-body-sm text-body-sm font-semibold text-on-surface dark:text-slate-100">{event.title}</div>
                <p className="truncate font-body-sm text-body-sm text-on-surface-variant dark:text-slate-400">{event.text}</p>
                <span className="font-label-caps text-[9px] text-on-surface-variant dark:text-slate-500">{relativeTime(event.date)}</span>
              </div>
            )
          })}
        </div>
      ) : (
        <EmptyState icon={IconSparkle} title="No recent activity" description="Ledger events and receipt confirmations will appear here." />
      )}
      <Link to="/analytics?tab=payments" className="w-full text-center font-label-ui text-label-ui font-semibold text-primary hover:underline dark:text-primary-fixed-dim">View Complete Audit Log</Link>
    </Panel>
  )
}

function ActionCenterPanel({ overdue, dueSoon, currency, remindersEnabled, onRemind }) {
  const rows = [...overdue.slice(0, 2), ...dueSoon.filter((f) => !overdue.some((o) => o.id === f.id)).slice(0, 1)]
  const alertCount = new Set([...overdue, ...dueSoon].map((f) => f.id)).size

  return (
    <Panel id="action-center" className="flex h-full flex-col justify-between p-5">
      <PanelHeading
        title="Action Center"
        subtitle={`${alertCount} accounts requiring intervention`}
        icon={IconAlert}
        action={<span className="rounded-full bg-error-container px-2 py-0.5 font-label-caps text-[10px] font-bold text-error dark:bg-error/20 dark:text-red-300">{alertCount} alerts</span>}
      />
      {rows.length ? (
        <div className="my-4 space-y-3">
          {rows.map((fact) => {
            const isOverdue = fact.status === 'overdue' || num(fact.daysOverdue) > 0
            const days = daysUntil(fact.dueDate)
            const label = isOverdue
              ? `${num(fact.daysOverdue)} days overdue`
              : days === 0 ? 'Due today' : days === 1 ? 'Due tomorrow' : `Due in ${Math.max(0, days)} days`
            return (
              <div key={fact.id} className={`space-y-2 rounded-xl p-3 ${isOverdue ? 'border-l-4 border-error bg-error-container/20 dark:bg-error/10' : 'bg-surface-container dark:bg-slate-800/60'}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate font-body-sm text-body-sm font-bold text-on-surface dark:text-slate-100">{fact.clientName}</div>
                    <div className={`font-label-caps text-[10px] font-semibold ${isOverdue ? 'text-error dark:text-red-300' : 'text-tertiary dark:text-tertiary-fixed-dim'}`}>{label} · {fact.number}</div>
                  </div>
                  <span className={`shrink-0 font-financial-tabular text-financial-tabular font-bold ${isOverdue ? 'text-error dark:text-red-300' : 'text-on-surface dark:text-slate-100'}`}>{fmt(fact.balance, fact.currency || currency)}</span>
                </div>
                <div className="flex items-center gap-2">
                  {isOverdue ? (
                    <>
                      <button type="button" onClick={() => onRemind(fact, 'whatsapp')} className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-surface-container-lowest px-2 py-1.5 font-label-ui text-[11px] font-semibold text-on-surface shadow-xs transition-colors hover:bg-surface-container dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800">
                        <IconMessage size={14} className="text-secondary dark:text-secondary-fixed" /> WhatsApp
                      </button>
                      <button type="button" onClick={() => onRemind(fact, 'email')} className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-surface-container-lowest px-2 py-1.5 font-label-ui text-[11px] font-semibold text-on-surface shadow-xs transition-colors hover:bg-surface-container dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800">
                        <IconMail size={14} className="text-primary dark:text-primary-fixed-dim" /> Email Notice
                      </button>
                    </>
                  ) : (
                    <button type="button" onClick={() => onRemind(fact, 'auto')} className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-surface-container-lowest px-2 py-1.5 font-label-ui text-[11px] font-medium text-on-surface shadow-xs transition-colors hover:bg-surface-container-high dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800">
                      <IconSend size={14} /> Send Gentle Courtesy Reminder
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <EmptyState icon={IconCheck} title="All caught up" description="No overdue or upcoming payments need action right now." />
      )}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-surface-container pt-3 dark:border-slate-800">
        <span className="font-body-sm text-[11px] text-on-surface-variant dark:text-slate-400">Auto-dunning sequence: <strong className={remindersEnabled ? 'text-secondary dark:text-secondary-fixed' : 'text-outline'}>{remindersEnabled ? 'Active' : 'Paused'}</strong></span>
        <Link to="/settings" className="font-label-caps text-label-caps uppercase text-primary hover:underline dark:text-primary-fixed-dim">Settings</Link>
      </div>
    </Panel>
  )
}

function sendReminder(fact, currency, toast, channel = 'auto') {
  const totals = computeTotals(fact.invoice || fact)
  const amount = fmt(totals.balance, fact.currency || currency)
  const number = fact.number || 'invoice'
  const subject = encodeURIComponent(`Reminder: overdue invoice ${number}`)
  const body = encodeURIComponent(
    `Hi ${fact.clientName || ''},\n\nThis is a friendly reminder that invoice ${number} (due ${formatDate(fact.dueDate)}) for ${amount} is now overdue.\n\nPlease arrange payment at your earliest convenience.\n\nThanks,${fact.client?.business?.name ? `\n${fact.client.business.name}` : ''}`
  )
  const useWhatsapp = channel === 'whatsapp' || (channel === 'auto' && !fact.client?.email)
  if (useWhatsapp) {
    window.open(`https://wa.me/?text=${encodeURIComponent(`Reminder: invoice ${number} is overdue. Amount due: ${amount}`)}`, '_blank', 'noopener,noreferrer')
    toast(channel === 'auto' ? 'No email on file — opened WhatsApp' : 'Opening WhatsApp with the reminder', channel === 'auto' ? 'warn' : 'info')
    return
  }
  if (fact.client?.email) {
    window.location.href = `mailto:${fact.client.email}?subject=${subject}&body=${body}`
    toast('Opening your email app with the reminder', 'info')
  } else {
    window.open(`https://wa.me/?text=${encodeURIComponent(`Reminder: invoice ${number} is overdue. Amount due: ${amount}`)}`, '_blank', 'noopener,noreferrer')
    toast('Opening WhatsApp with the reminder', 'info')
  }
}

function CustomizeModal({ open, onClose, widgets, onChange }) {
  if (!open) return null
  const toggle = (key) => {
    const hidden = widgets.hidden.includes(key) ? widgets.hidden.filter((k) => k !== key) : [...widgets.hidden, key]
    onChange({ hidden })
  }
  const setSize = (key, size) => onChange({ sizes: { ...(widgets.sizes || {}), [key]: size } })
  const reorder = (from, to) => {
    const order = [...widgets.order]
    const [moved] = order.splice(from, 1)
    order.splice(to, 0, moved)
    onChange({ order })
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label="Customize dashboard">
      <div className="absolute inset-0 bg-inverse-surface/40 backdrop-blur-xs dark:bg-slate-950/60" onClick={onClose} />
      <aside className="relative flex h-full w-full max-w-[380px] flex-col bg-surface-container-lowest shadow-2xl dark:bg-slate-900">
        <div className="flex items-center justify-between gap-3 border-b border-surface-container p-5 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <IconSettings size={22} className="text-primary dark:text-primary-fixed-dim" />
            <div>
              <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface dark:text-slate-100">Customize Canvas</h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant dark:text-slate-400">Personalize metrics, density and charts</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close customization" className="rounded-lg p-1.5 text-on-surface-variant hover:bg-surface-container dark:hover:bg-slate-800"><IconX size={20} /></button>
        </div>
        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          <div className="space-y-3">
            <span className="font-label-caps text-label-caps uppercase tracking-wider text-on-surface-variant dark:text-slate-400">Visible Widgets</span>
            <div className="space-y-2">
              {widgets.order.map((key, index) => {
                const meta = WIDGET_META.find((w) => w.key === key)
                const hidden = widgets.hidden.includes(key)
                return (
                  <Draggable key={key} index={index} onReorder={reorder} className="flex flex-wrap items-center gap-3 rounded-lg bg-surface-container-low p-2.5 dark:bg-slate-800/60">
                    <IconGrip size={15} className="shrink-0 cursor-grab text-outline dark:text-slate-500" />
                    <span className="min-w-[120px] flex-1 font-body-md text-body-md font-medium text-on-surface dark:text-slate-100">{meta?.label || key}</span>
                    <select
                      value={widgets.sizes?.[key] || meta?.size || 'md'}
                      onChange={(e) => setSize(key, e.target.value)}
                      aria-label={`${meta?.label || key} width`}
                      className="rounded-md border border-outline-variant bg-surface-container-lowest px-2 py-1 font-label-ui text-label-ui text-on-surface dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    >
                      <option value="sm">Narrow</option>
                      <option value="md">Medium</option>
                      <option value="lg">Full width</option>
                    </select>
                    <Toggle checked={!hidden} onChange={() => toggle(key)} label={`Show ${meta?.label || key}`} />
                  </Draggable>
                )
              })}
            </div>
          </div>
          <div className="flex items-start gap-2.5 rounded-lg bg-surface-container-low p-3 dark:bg-slate-800/60">
            <IconInfo size={20} className="mt-0.5 shrink-0 text-primary dark:text-primary-fixed-dim" />
            <p className="font-body-sm text-body-sm leading-relaxed text-on-surface-variant dark:text-slate-400">Custom widget configurations are saved automatically to your workspace profile.</p>
          </div>
        </div>
        <div className="flex items-center gap-3 border-t border-surface-container p-5 dark:border-slate-800">
          <button type="button" onClick={() => onChange({ order: [...DEFAULT_WIDGETS.order], hidden: [], sizes: {} })} className="flex-1 rounded-lg bg-surface-container py-2 font-label-ui text-label-ui font-semibold text-on-surface hover:bg-surface-container-high dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700">Reset</button>
          <button type="button" onClick={onClose} className="flex-1 rounded-lg bg-primary py-2 font-label-ui text-label-ui font-semibold text-on-primary shadow-sm hover:bg-on-primary-fixed-variant dark:bg-primary-container dark:text-on-primary">Save View</button>
        </div>
      </aside>
    </div>
  )
}

function DrillModal({ data, onClose, currency }) {
  const invoices = useData((s) => s.invoices)
  if (!data) return null
  const key = data.key || ''
  const matches = invoices.filter((inv) => inv.kind !== 'quotation' && ((inv.issueDate || '').slice(0, 7) === key || data.label === inv.number))
  const metrics = Object.entries(data).filter(([, v]) => typeof v === 'number' && Number.isFinite(v))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={`Details for ${data.label || key}`}>
      <div className="absolute inset-0 bg-inverse-surface/40 backdrop-blur-xs dark:bg-slate-950/60" onClick={onClose} />
      <div className="relative max-h-[88vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-surface-container-lowest p-6 shadow-2xl dark:bg-slate-900">
        <div className="flex items-start justify-between gap-3 border-b border-surface-container pb-3 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <IconChart size={20} className="text-primary dark:text-primary-fixed-dim" />
            <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface dark:text-slate-100">Details · {data.label || key}</h3>
          </div>
          <button type="button" onClick={onClose} aria-label="Close details" className="rounded-lg p-1.5 text-on-surface-variant hover:bg-surface-container dark:hover:bg-slate-800"><IconX size={18} /></button>
        </div>
        {matches.length ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left">
              <thead className="font-label-caps text-label-caps uppercase text-on-surface-variant dark:text-slate-400"><tr><th className="p-2">Invoice</th><th className="p-2">Client</th><th className="p-2">Date</th><th className="p-2">Status</th><th className="p-2 text-right">Amount</th></tr></thead>
              <tbody className="divide-y divide-surface-container dark:divide-slate-800">
                {matches.map((inv) => {
                  const totals = computeTotals(inv)
                  const st = effectiveStatus(inv, totals)
                  return (
                    <tr key={inv.id} className="hover:bg-surface-container-low dark:hover:bg-slate-800/40">
                      <td className="p-2"><Link to={`/builder/${inv.id}`} onClick={onClose} className="font-semibold text-primary hover:underline dark:text-primary-fixed-dim">{inv.number}</Link></td>
                      <td className="p-2 font-body-sm text-body-sm text-on-surface dark:text-slate-200">{inv.client?.name || '—'}</td>
                      <td className="p-2 font-body-sm text-body-sm text-on-surface-variant dark:text-slate-400">{formatDate(inv.issueDate)}</td>
                      <td className="p-2"><span className={`inline-flex rounded-full px-2 py-0.5 font-label-caps text-label-caps ${STATUS_TONES[st] || STATUS_TONES.sent}`}>{statusLabel(st)}</span></td>
                      <td className="p-2 text-right font-financial-tabular text-financial-tabular font-bold text-on-surface dark:text-slate-100">{fmt(totals.total, inv.currency || currency)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : metrics.length ? (
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {metrics.map(([k, v]) => (
              <div key={k} className="rounded-xl bg-surface-container-low p-3 dark:bg-slate-800/60">
                <div className="font-label-caps text-label-caps uppercase text-on-surface-variant dark:text-slate-400">{k}</div>
                <div className="font-financial-display text-financial-display text-on-surface dark:text-slate-100">{fmt(v, currency)}</div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 font-body-md text-body-md text-on-surface-variant dark:text-slate-400">No detailed records match this view.</p>
        )}
        <div className="mt-5 flex justify-end">
          <button type="button" onClick={onClose} className="rounded-lg bg-surface-container px-4 py-2 font-label-ui text-label-ui font-semibold text-on-surface hover:bg-surface-container-high dark:bg-slate-800 dark:text-slate-100">Close</button>
        </div>
      </div>
    </div>
  )
}

export function MiniThumb({ invoice, w = 40 }) {
  const data = useData()
  return (
    <div className="shrink-0 overflow-hidden rounded-md border border-outline-variant bg-surface-container-lowest dark:border-slate-700 dark:bg-slate-900" style={{ width: w, height: w * 1.35 }}>
      <div style={{ transform: `scale(${w / 794})`, transformOrigin: 'top left', width: 794 }}>
        <RenderInvoice invoice={invoice} customTemplates={data.customTemplates} />
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const loaded = useData((s) => s.loaded)
  const invoices = useData((s) => s.invoices)
  const widgets = useData((s) => s.widgets)
  const setWidgets = useData((s) => s.setWidgets)
  const currency = useData((s) => s.settings.currency) || 'INR'
  const remindersEnabled = useData((s) => s.settings.remindersEnabled)
  const toast = useUI((s) => s.toast)
  const [periodId, setPeriodId] = useState('thisMonth')
  const [compareMode, setCompareMode] = useState('previous')
  const [compareTarget, setCompareTarget] = useState('previous')
  const [custom, setCustom] = useState({ from: '', to: '' })
  const [scope, setScope] = useState('all')
  const [customize, setCustomize] = useState(false)
  const [drill, setDrill] = useState(null)

  const a = useAnalytics({ periodId, compareMode, custom })
  const facts = scope === 'range' ? a.facts : a.allFacts
  const payments = scope === 'range' ? a.payments : a.allPayments
  const draftFacts = useMemo(
    () => invoices.filter((inv) => inv.kind !== 'quotation' && effectiveStatus(inv, computeTotals(inv)) === 'draft'),
    [invoices]
  )
  const draftValue = draftFacts.reduce((s, inv) => s + num(computeTotals(inv).total), 0)
  const recent = useMemo(
    () => invoices
      .filter((inv) => inv.kind !== 'quotation')
      .sort((x, y) => new Date(y.updatedAt || y.createdAt || 0) - new Date(x.updatedAt || x.createdAt || 0))
      .slice(0, 6),
    [invoices]
  )

  if (!loaded) {
    return (
      <div className={ROOT}>
        <Skeleton className="h-8 w-56" />
        <Skeleton className="mt-3 h-4 w-full max-w-xl" />
        <Skeleton className="mt-5 h-16 w-full" />
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-36" />)}
        </div>
        <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-12">
          <Skeleton className="h-80 lg:col-span-8" />
          <Skeleton className="h-80 lg:col-span-4" />
        </div>
      </div>
    )
  }

  const dueSoon = a.allFacts
    .filter((f) => f.status !== 'paid' && f.status !== 'draft' && num(f.balance) > 0.009 && f.dueDate)
    .filter((f) => {
      const days = daysUntil(f.dueDate)
      return days !== null && days <= 14
    })
    .sort((x, y) => String(x.dueDate || '').localeCompare(String(y.dueDate || '')))
    .slice(0, 6)
  const overdueFacts = a.allFacts.filter((f) => f.status === 'overdue' && num(f.daysOverdue) > 0).sort((x, y) => num(y.daysOverdue) - num(x.daysOverdue))
  const remind = (fact, channel = 'auto') => sendReminder(fact, fact.currency || currency, toast, channel)
  const compareLabel = compareMode === 'none'
    ? 'no comparison'
    : a.compare?.label || (compareMode === 'lastYear' ? 'last year' : 'previous period')
  const liveQuarter = Math.floor(new Date().getMonth() / 3) + 1
  const rangeDays = dayCount(a.range.from, a.range.to)

  const reorder = (from, to) => {
    const order = [...widgets.order]
    const [moved] = order.splice(from, 1)
    order.splice(to, 0, moved)
    setWidgets({ order })
  }

  const activeOrder = widgets.order.filter((k) => !widgets.hidden.includes(k))
  const activeSet = new Set(activeOrder)
  const ordered = (keys) => keys.filter((k) => activeSet.has(k)).sort((x, y) => widgets.order.indexOf(x) - widgets.order.indexOf(y))
  const slot = (key, fallbackSpan, content) => {
    if (!activeSet.has(key)) return null
    const size = widgets.sizes?.[key]
    const span = size === 'sm' ? 'col-span-12 lg:col-span-4'
      : size === 'md' ? 'col-span-12 lg:col-span-6'
        : size === 'lg' ? 'col-span-12'
          : fallbackSpan
    return (
      <Draggable key={key} index={Math.max(0, widgets.order.indexOf(key))} onReorder={reorder} className={`${span} min-w-0`}>
        {content}
      </Draggable>
    )
  }

  const renderWidget = (key) => {
    if (key === 'kpis') return <KpiSection a={a} currency={currency} cards={a.kpis.cards} draftFacts={draftFacts} draftValue={draftValue} overdueFacts={overdueFacts} compareLabel={compareLabel} onRemind={remind} />
    if (key === 'sales') return <SalesPanel monthly={a.monthly} currency={currency} cards={a.kpis.cards} onDrill={setDrill} />
    if (key === 'status') return <StatusPanel receivables={a.receivables} currency={currency} invoiceCount={num(a.kpis.cards.find((c) => c.key === 'count')?.value)} onDrill={setDrill} />
    if (key === 'recent') return <RecentInvoicesPanel invoices={recent} currency={currency} onRemind={remind} />
    if (key === 'cashflow') return <CashflowPanel cashflow={a.receivables.cashflow} currency={currency} onDrill={setDrill} />
    if (key === 'topClients') return <TopClientsPanel clients={a.clients.top} totalClients={a.clients.totalClients} currency={currency} onDrill={setDrill} />
    if (key === 'activity') return <ActivityPanel facts={facts} payments={payments} notifications={a.notifications} currency={currency} />
    if (key === 'due') return <ActionCenterPanel overdue={overdueFacts} dueSoon={dueSoon} currency={currency} remindersEnabled={remindersEnabled} onRemind={remind} />
    return null
  }

  const kpiKeys = ordered(['kpis'])
  const visualKeys = ordered(['sales', 'status'])
  const ledgerKeys = ordered(['recent', 'cashflow'])
  const bottomKeys = ordered(['topClients', 'activity', 'due'])
  const trioSpan = bottomKeys.length === 3 ? 'md:col-span-6 lg:col-span-4' : bottomKeys.length === 2 ? 'md:col-span-6 lg:col-span-6' : 'col-span-12'

  const refresh = () => {
    useData.getState().loadLocal()
    toast('Dashboard refreshed from local data', 'success')
  }

  return (
    <div className={ROOT}>
      <div aria-hidden="true" className="pointer-events-none absolute -top-10 left-1/4 h-44 w-96 rounded-full bg-gradient-to-r from-primary/10 via-secondary/10 to-transparent blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute right-12 top-2 h-32 w-64 rounded-full bg-secondary-container/20 blur-2xl dark:bg-secondary/10" />

      <header className="relative flex flex-col gap-5 pb-6 pt-2 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-surface-container-high px-2.5 py-0.5 font-label-caps text-label-caps uppercase tracking-wider text-primary dark:bg-slate-800 dark:text-primary-fixed-dim">
            <IconSparkle size={14} /> Business Overview &amp; Metrics
          </div>
          <div className="flex flex-wrap items-baseline gap-3">
            <h1 className="font-headline-xl text-headline-xl tracking-tight text-on-surface dark:text-slate-100">Dashboard</h1>
            <span className="hidden items-center gap-1 rounded-md bg-secondary/10 px-2 py-0.5 font-label-caps text-label-caps text-secondary dark:bg-secondary/20 dark:text-secondary-fixed sm:inline-flex">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-secondary dark:bg-secondary-fixed" /> LIVE AUDIT Q{liveQuarter}
            </span>
          </div>
          <p className="max-w-xl font-body-md text-body-md text-on-surface-variant dark:text-slate-400">A clear view of revenue, collections, and what needs immediate operational attention.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button type="button" onClick={() => setCustomize(true)} className="inline-flex items-center gap-2 rounded-lg bg-surface-container-lowest px-3.5 py-2 font-label-ui text-label-ui text-on-surface shadow-sm transition-all hover:bg-surface-container-low dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800">
            <IconSettings size={18} className="text-on-surface-variant dark:text-slate-400" /> Customize
          </button>
          <Link to="/clients" className="inline-flex items-center gap-2 rounded-lg bg-surface-container-high px-3.5 py-2 font-label-ui text-label-ui font-semibold text-primary transition-all hover:bg-surface-container-highest dark:bg-slate-800 dark:text-primary-fixed-dim dark:hover:bg-slate-700">
            <IconUsers size={18} /> Add Client
          </Link>
          <Link to="/builder" className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 font-label-ui text-label-ui font-semibold text-on-primary shadow-md shadow-primary/25 transition-all hover:bg-on-primary-fixed-variant active:scale-[0.98] dark:bg-primary-container dark:text-on-primary">
            <IconPlus size={18} /> New Invoice
          </Link>
        </div>
      </header>

      <section className="relative mb-5 rounded-xl bg-surface-container-lowest p-2.5 shadow-sm dark:bg-slate-900 sm:p-3">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex flex-wrap items-center rounded-lg bg-surface-container p-1 dark:bg-slate-800">
              {PERIOD_OPTIONS.map((p) => (
                <SegButton key={p.id} active={periodId === p.id} onClick={() => setPeriodId(p.id)}>
                  {PERIOD_LABELS[p.id] || p.label}
                  {p.id === 'custom' ? <IconCalendar size={13} /> : null}
                </SegButton>
              ))}
            </div>
            <div className="mx-0.5 hidden h-5 w-px bg-surface-container-highest dark:bg-slate-700 sm:block" />
            <div className="inline-flex items-center gap-1.5 rounded-lg bg-surface-container-low px-3 py-1.5 font-body-sm text-body-sm text-on-surface dark:bg-slate-800/60 dark:text-slate-100">
              <IconCalendar size={16} className="text-primary dark:text-primary-fixed-dim" />
              <span className="font-medium">{formatDate(a.range.from)} – {formatDate(a.range.to)}</span>
              <span className="rounded bg-surface-container px-1 font-label-caps text-label-caps uppercase text-on-surface-variant dark:bg-slate-700 dark:text-slate-300">{rangeDays} days</span>
            </div>
            {periodId === 'custom' ? (
              <>
                <label className="inline-flex items-center gap-1.5 rounded-lg bg-surface-container-low px-2 py-1.5 font-body-sm text-body-sm text-on-surface-variant dark:bg-slate-800/60 dark:text-slate-400">
                  From <input type="date" value={custom.from} onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))} className="bg-transparent font-financial-tabular text-on-surface outline-none dark:text-slate-100" />
                </label>
                <label className="inline-flex items-center gap-1.5 rounded-lg bg-surface-container-low px-2 py-1.5 font-body-sm text-body-sm text-on-surface-variant dark:bg-slate-800/60 dark:text-slate-400">
                  To <input type="date" value={custom.to} onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))} className="bg-transparent font-financial-tabular text-on-surface outline-none dark:text-slate-100" />
                </label>
              </>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 xl:justify-end">
            <div className="inline-flex items-center gap-2">
              <Toggle checked={compareMode !== 'none'} onChange={(checked) => setCompareMode(checked ? compareTarget : 'none')} label="Compare periods" />
              <span className="font-body-sm text-body-sm text-on-surface-variant dark:text-slate-400">Compare: vs {compareMode === 'none' ? 'No Comparison' : compareTarget === 'lastYear' ? 'Previous Year' : 'Previous Period'}</span>
              {compareMode !== 'none' ? (
                <select
                  value={compareTarget}
                  onChange={(e) => { setCompareTarget(e.target.value); setCompareMode(e.target.value) }}
                  aria-label="Comparison baseline"
                  className="rounded-md bg-transparent font-label-ui text-label-ui font-semibold text-primary outline-none dark:text-primary-fixed-dim"
                >
                  <option value="previous">Previous period</option>
                  <option value="lastYear">Same period last year</option>
                </select>
              ) : null}
            </div>
            <div className="hidden h-5 w-px bg-surface-container-highest dark:bg-slate-700 sm:block" />
            <div className="inline-flex items-center gap-2">
              <div className="inline-flex rounded-lg bg-surface-container p-0.5 dark:bg-slate-800">
                <SegButton active={scope === 'range'} onClick={() => setScope('range')} className="px-2.5 text-[11px]">Selected Period</SegButton>
                <SegButton active={scope === 'all'} onClick={() => setScope('all')} className="px-2.5 text-[11px]">All Records</SegButton>
              </div>
              <button type="button" onClick={refresh} title="Quick Refresh" aria-label="Quick refresh" className="rounded-lg p-1.5 text-on-surface-variant transition-colors hover:bg-surface-container hover:text-primary dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-primary-fixed-dim">
                <IconRefresh size={18} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {kpiKeys.length ? (
        <section className="mb-5">{slot('kpis', 'col-span-12', renderWidget('kpis'))}</section>
      ) : null}

      {visualKeys.length ? (
        <section className="mb-5 grid grid-cols-1 gap-5 lg:grid-cols-12">
          {visualKeys.map((key) => slot(key, visualKeys.length === 2 ? (key === 'sales' ? 'lg:col-span-8' : 'lg:col-span-4') : 'lg:col-span-12', renderWidget(key)))}
        </section>
      ) : null}

      {ledgerKeys.length ? (
        <section className="mb-5 grid grid-cols-1 gap-5 lg:grid-cols-12">
          {ledgerKeys.map((key) => slot(key, ledgerKeys.length === 2 ? (key === 'recent' ? 'lg:col-span-7' : 'lg:col-span-5') : 'lg:col-span-12', renderWidget(key)))}
        </section>
      ) : null}

      {bottomKeys.length ? (
        <section className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-12">
          {bottomKeys.map((key) => slot(key, trioSpan, renderWidget(key)))}
        </section>
      ) : null}

      {!activeOrder.length ? (
        <EmptyState icon={IconSettings} title="No widgets enabled" description="Choose the widgets you want to see on your dashboard." action={<button type="button" onClick={() => setCustomize(true)} className="rounded-lg bg-primary px-4 py-2 font-label-ui text-label-ui font-semibold text-on-primary dark:bg-primary-container">Customize widgets</button>} />
      ) : null}

      <CustomizeModal open={customize} onClose={() => setCustomize(false)} widgets={widgets} onChange={setWidgets} />
      <DrillModal data={drill} onClose={() => setDrill(null)} currency={currency} />
    </div>
  )
}
