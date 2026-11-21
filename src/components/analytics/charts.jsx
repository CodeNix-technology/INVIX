import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  ResponsiveContainer, BarChart as RBarChart, Bar, LineChart as RLineChart, Line,
  AreaChart, Area, ComposedChart, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, Brush, ReferenceLine,
} from 'recharts'
import { useUI } from '../../store/ui'
import { CHART_COLORS } from '../../utils/analytics'
import { Card, Button, EmptyState } from '../ui'
import { IconDownload, IconTable, IconFileDown, IconZoomIn, IconRotate, IconGrip, IconPencil, IconX } from '../icons'
import { exportChartPNG, exportChartPDF, exportRowsCSV, exportRowsXLS, exportRowsPDF } from './exportUtils'

export function useChartTheme() {
  const theme = useUI((s) => s.theme)
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'))
  useEffect(() => {
    let mq
    const apply = () => setDark(document.documentElement.classList.contains('dark'))
    apply()
    if (theme === 'system') {
      mq = window.matchMedia('(prefers-color-scheme: dark)')
      mq.addEventListener('change', apply)
    }
    return () => mq?.removeEventListener('change', apply)
  }, [theme])
  return useMemo(() => ({
    dark,
    axis: dark ? '#94a3b8' : '#64748b',
    grid: dark ? 'rgba(148,163,184,0.14)' : 'rgba(100,116,139,0.14)',
    tooltipBg: dark ? '#0f172a' : '#ffffff',
    tooltipText: dark ? '#e2e8f0' : '#0f172a',
    tooltipBorder: dark ? '#334155' : '#e2e8f0',
    surface: dark ? '#0f172a' : '#ffffff',
  }), [dark])
}

const compact = (v, currency = 'INR') => {
  try {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency, notation: 'compact', maximumFractionDigits: 1 }).format(v || 0)
  } catch { return String(v || 0) }
}
const full = (v, currency = 'INR') => {
  try {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(v || 0)
  } catch { return String(v || 0) }
}

export function ChartTooltip({ active, payload, label, currency = 'INR', suffix = '' }) {
  const t = useChartTheme()
  if (!active || !payload?.length) return null
  return (
    <div className="min-w-[150px] rounded-xl border px-3 py-2 text-xs shadow-xl" style={{ background: t.tooltipBg, color: t.tooltipText, borderColor: t.tooltipBorder }}>
      <div className="mb-1 font-bold text-slate-400">{label}</div>
      {payload.filter((p) => p.value != null).map((p) => (
        <div key={p.dataKey || p.name} className="flex items-center justify-between gap-4 py-0.5">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: p.color || p.fill || CHART_COLORS.brand }} />
            {p.name}
          </span>
          <span className="font-bold">{suffix ? `${Number(p.value).toFixed(1)}${suffix}` : full(Number(p.value), currency)}</span>
        </div>
      ))}
    </div>
  )
}

const axisProps = (t) => ({
  stroke: t.axis,
  tick: { fill: t.axis, fontSize: 10 },
  tickLine: false,
  axisLine: false,
})

function ExportMenu({ node, rows, title, currency, label }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])
  return (
    <div className="relative" ref={ref}>
      <Button size="sm" variant="secondary" onClick={() => setOpen((v) => !v)} aria-label={`Export ${label}`}>
        <IconDownload size={13} /> Export
      </Button>
      {open ? (
        <div className="absolute right-0 top-full z-20 mt-1 w-40 overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-xl dark:border-slate-700 dark:bg-slate-900">
          {node ? (
            <>
              <button className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => { exportChartPNG(node.current, `${title}-chart`).catch((e) => useUI.getState().toast(e.message, 'error')); setOpen(false) }}>
                <IconDownload size={13} /> PNG image
              </button>
              <button className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => { exportChartPDF(node.current, title).catch((e) => useUI.getState().toast(e.message, 'error')); setOpen(false) }}>
                <IconFileDown size={13} /> PDF chart
              </button>
            </>
          ) : null}
          {rows?.length ? (
            <>
              <button className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => { try { exportRowsCSV(rows, `${title}-data`); useUI.getState().toast('CSV downloaded', 'success') } catch (e) { useUI.getState().toast(e.message, 'error') } setOpen(false) }}>
                <IconTable size={13} /> CSV data
              </button>
              <button className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => { try { exportRowsXLS(rows, `${title}-data`, title); useUI.getState().toast('Excel file downloaded', 'success') } catch (e) { useUI.getState().toast(e.message, 'error') } setOpen(false) }}>
                <IconTable size={13} /> Excel data
              </button>
              <button className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => { exportRowsPDF(rows, title, currency).catch((e) => useUI.getState().toast(e.message, 'error')); setOpen(false) }}>
                <IconFileDown size={13} /> PDF report
              </button>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

/** Card wrapper with title, legend toggle, zoom, drill-down hint and exports. */
export function ChartCard({ title, subtitle, children, rows, currency = 'INR', actions, series = [], onToggle, onReset, onDrill, empty, className = '' }) {
  const node = useRef(null)
  const [zoom, setZoom] = useState(false)
  const [hidden, setHidden] = useState([])
  const toggle = (key) => {
    setHidden((prev) => prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key])
    onToggle?.(key)
  }
  return (
    <Card className={`panel p-4 ${className}`}>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">{title}</h3>
          {subtitle ? <p className="mt-0.5 text-[11px] text-slate-400">{subtitle}</p> : null}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {actions}
          {series.length ? (
            <div className="hidden items-center gap-1 sm:flex">
              {series.map((s) => (
                <button key={s.key} onClick={() => toggle(s.key)} title={`Toggle ${s.label}`} className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-semibold transition-opacity ${hidden.includes(s.key) ? 'border-slate-200 opacity-40 dark:border-slate-700' : 'border-transparent'}`}>
                  <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                  {s.label}
                </button>
              ))}
            </div>
          ) : null}
          <Button size="sm" variant={zoom ? 'primary' : 'secondary'} onClick={() => setZoom((v) => !v)} aria-label="Toggle chart zoom" title="Toggle zoom brush"><IconZoomIn size={13} /></Button>
          {onReset ? <Button size="sm" variant="secondary" onClick={onReset} aria-label="Reset chart zoom"><IconRotate size={13} /></Button> : null}
          <ExportMenu node={node} rows={rows} title={title} currency={currency} label={title} />
        </div>
      </div>
      {hidden.length && series.length ? (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {hidden.map((k) => (
            <button key={k} onClick={() => toggle(k)} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500 dark:bg-slate-800">
              {series.find((s) => s.key === k)?.label || k} hidden <IconX size={10} />
            </button>
          ))}
        </div>
      ) : null}
      <div ref={node} className="h-[260px] w-full min-w-0">
        {empty ? <EmptyState icon={IconGrip} title="No data yet" description="Charts will appear once you have activity in this period." /> : typeof children === 'function' ? children({ hidden, zoom, onDrill }) : children}
      </div>
    </Card>
  )
}

export function Sparkline({ data = [], color = CHART_COLORS.brand, height = 38 }) {
  const t = useChartTheme()
  const points = data.map((v, i) => ({ i, v }))
  if (!points.length) return <div style={{ height }} />
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RLineChart data={points} margin={{ top: 2, right: 1, bottom: 2, left: 1 }}>
        <Line type="monotone" dataKey="v" stroke={color} strokeWidth={1.8} dot={false} isAnimationActive={false} />
        <YAxis hide domain={['dataMin', 'dataMax']} />
        <XAxis hide dataKey="i" />
      </RLineChart>
    </ResponsiveContainer>
  )
}

const commonMargin = { top: 10, right: 12, left: 2, bottom: 4 }

export function RevenueChart({ data = [], currency = 'INR', onDrill, hidden = [], zoom = false }) {
  const t = useChartTheme()
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data} margin={commonMargin} onClick={(e) => onDrill?.(e?.activePayload?.[0]?.payload)}>
        <CartesianGrid stroke={t.grid} vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="label" {...axisProps(t)} interval="preserveStartEnd" minTickGap={18} />
        <YAxis {...axisProps(t)} width={48} tickFormatter={(v) => compact(v, currency)} />
        <Tooltip content={<ChartTooltip currency={currency} />} cursor={{ fill: t.dark ? 'rgba(148,163,184,.08)' : 'rgba(79,70,229,.05)' }} />
        <Legend wrapperStyle={{ fontSize: 10, color: t.axis }} iconType="circle" iconSize={7} />
        {!hidden.includes('invoiced') ? <Bar dataKey="invoiced" name="Invoiced" fill={CHART_COLORS.brand} radius={[5, 5, 0, 0]} maxBarSize={34} /> : null}
        {!hidden.includes('collected') ? <Line type="monotone" dataKey="collected" name="Collected" stroke={CHART_COLORS.success} strokeWidth={2.4} dot={false} /> : null}
        {!hidden.includes('pending') ? <Line type="monotone" dataKey="pending" name="Pending" stroke={CHART_COLORS.warning} strokeWidth={2} dot={false} /> : null}
        {!hidden.includes('priorYear') ? <Line type="monotone" dataKey="priorYear" name="Last year" stroke={CHART_COLORS.slate} strokeWidth={1.6} strokeDasharray="5 4" dot={false} /> : null}
        {zoom ? <Brush dataKey="label" height={22} stroke={CHART_COLORS.brand} travellerWidth={7} /> : null}
      </ComposedChart>
    </ResponsiveContainer>
  )
}

export function TrendChart({ data = [], currency = 'INR', hidden = [], zoom = false, onDrill }) {
  const t = useChartTheme()
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={commonMargin} onClick={(e) => onDrill?.(e?.activePayload?.[0]?.payload)}>
        <defs>
          <linearGradient id="gradInvoiced" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={CHART_COLORS.brand} stopOpacity={0.32} /><stop offset="100%" stopColor={CHART_COLORS.brand} stopOpacity={0.01} /></linearGradient>
          <linearGradient id="gradCollected" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={CHART_COLORS.accent} stopOpacity={0.25} /><stop offset="100%" stopColor={CHART_COLORS.accent} stopOpacity={0.01} /></linearGradient>
        </defs>
        <CartesianGrid stroke={t.grid} vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="label" {...axisProps(t)} minTickGap={16} />
        <YAxis {...axisProps(t)} width={48} tickFormatter={(v) => compact(v, currency)} />
        <Tooltip content={<ChartTooltip currency={currency} />} />
        <Legend wrapperStyle={{ fontSize: 10, color: t.axis }} iconType="circle" iconSize={7} />
        {!hidden.includes('invoiced') ? <Area type="monotone" dataKey="invoiced" name="Revenue" stroke={CHART_COLORS.brand} fill="url(#gradInvoiced)" strokeWidth={2.4} /> : null}
        {!hidden.includes('collected') ? <Area type="monotone" dataKey="collected" name="Collected" stroke={CHART_COLORS.accent} fill="url(#gradCollected)" strokeWidth={2.2} /> : null}
        {!hidden.includes('pending') ? <Line type="monotone" dataKey="pending" name="Pending" stroke={CHART_COLORS.warning} strokeWidth={1.8} dot={false} /> : null}
        {zoom ? <Brush dataKey="label" height={22} stroke={CHART_COLORS.brand} travellerWidth={7} /> : null}
      </AreaChart>
    </ResponsiveContainer>
  )
}

export function CumulativeChart({ data = [], currency = 'INR', hidden = [], zoom = false }) {
  const t = useChartTheme()
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={commonMargin}>
        <defs><linearGradient id="gradCumulative" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={CHART_COLORS.violet} stopOpacity={0.3} /><stop offset="100%" stopColor={CHART_COLORS.violet} stopOpacity={0} /></linearGradient></defs>
        <CartesianGrid stroke={t.grid} vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="label" {...axisProps(t)} minTickGap={18} />
        <YAxis {...axisProps(t)} width={48} tickFormatter={(v) => compact(v, currency)} />
        <Tooltip content={<ChartTooltip currency={currency} />} />
        <Area type="monotone" dataKey="cumulative" name="Cumulative revenue" stroke={CHART_COLORS.violet} fill="url(#gradCumulative)" strokeWidth={2.4} />
        {zoom ? <Brush dataKey="label" height={22} stroke={CHART_COLORS.brand} travellerWidth={7} /> : null}
      </AreaChart>
    </ResponsiveContainer>
  )
}

export function ForecastChart({ actual = [], forecast = [], currency = 'INR', hidden = [], zoom = false }) {
  const t = useChartTheme()
  const data = [
    ...actual.map((m) => ({ label: m.label, actual: m.invoiced, forecast: null, low: null, high: null })),
    ...forecast.map((f) => ({ label: f.label, actual: null, forecast: f.forecast, low: f.low, high: f.high })),
  ]
  if (actual.length) data[actual.length - 1].forecast = actual[actual.length - 1].invoiced
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data} margin={commonMargin}>
        <CartesianGrid stroke={t.grid} vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="label" {...axisProps(t)} minTickGap={16} />
        <YAxis {...axisProps(t)} width={48} tickFormatter={(v) => compact(v, currency)} />
        <Tooltip content={<ChartTooltip currency={currency} />} />
        <Legend wrapperStyle={{ fontSize: 10, color: t.axis }} iconType="circle" iconSize={7} />
        <Bar dataKey="actual" name="Actual" fill={CHART_COLORS.brand} radius={[4, 4, 0, 0]} maxBarSize={28} />
        <Line type="monotone" dataKey="high" name="Upper estimate" stroke={CHART_COLORS.slate} strokeDasharray="3 3" strokeWidth={1.2} dot={false} />
        <Line type="monotone" dataKey="forecast" name="Forecast" stroke={CHART_COLORS.accent} strokeWidth={2.6} strokeDasharray="6 3" dot={{ r: 3 }} />
        <Line type="monotone" dataKey="low" name="Lower estimate" stroke={CHART_COLORS.slate} strokeDasharray="3 3" strokeWidth={1.2} dot={false} />
        {zoom ? <Brush dataKey="label" height={22} stroke={CHART_COLORS.brand} travellerWidth={7} /> : null}
      </ComposedChart>
    </ResponsiveContainer>
  )
}

export function DonutChart({ data = [], currency = 'INR', valueKey = 'value', nameKey = 'name', centerLabel = 'Total', suffix = null, onDrill, colors = [CHART_COLORS.brand, CHART_COLORS.accent, CHART_COLORS.success, CHART_COLORS.warning, CHART_COLORS.danger, CHART_COLORS.violet, CHART_COLORS.info, CHART_COLORS.slate] }) {
  const t = useChartTheme()
  const total = data.reduce((s, d) => s + (Number(d[valueKey]) || 0), 0)
  if (!data.length || total <= 0) return <EmptyState icon={IconGrip} title="No data yet" description="There is nothing to display for this breakdown." />
  return (
    <div className="flex h-full flex-col items-center gap-3 sm:flex-row">
      <div className="relative h-[190px] w-full max-w-[230px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart onClick={(e) => onDrill?.(e?.activePayload?.[0]?.payload)}>
            <Pie data={data} dataKey={valueKey} nameKey={nameKey} innerRadius="62%" outerRadius="92%" paddingAngle={2} stroke="none">
              {data.map((d, i) => <Cell key={`${d[nameKey]}-${i}`} fill={d.color || colors[i % colors.length]} />)}
            </Pie>
            <Tooltip content={<ChartTooltip currency={currency} />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{centerLabel}</span>
          <span className="text-base font-extrabold text-slate-800 dark:text-slate-100">{suffix != null ? `${total.toLocaleString('en-IN')}${suffix}` : compact(total, currency)}</span>
        </div>
      </div>
      <div className="grid w-full min-w-0 flex-1 grid-cols-1 gap-1.5 sm:grid-cols-2">
        {data.map((d, i) => (
          <button key={`${d[nameKey]}-${i}`} onClick={() => onDrill?.(d)} className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-[11px] hover:bg-slate-100 dark:hover:bg-slate-800">
            <span className="flex min-w-0 items-center gap-1.5 text-slate-500 dark:text-slate-400">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: d.color || colors[i % colors.length] }} />
              <span className="truncate">{d[nameKey]}</span>
            </span>
            <span className="font-bold text-slate-700 dark:text-slate-200">{((d[valueKey] / total) * 100).toFixed(0)}%</span>
          </button>
        ))}
      </div>
      <span className="sr-only" style={{ color: t.axis }} />
    </div>
  )
}

export function CashflowChart({ data = [], currency = 'INR', hidden = [], zoom = false }) {
  const t = useChartTheme()
  return (
    <ResponsiveContainer width="100%" height="100%">
      <RBarChart data={data} margin={commonMargin}>
        <CartesianGrid stroke={t.grid} vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="label" {...axisProps(t)} />
        <YAxis {...axisProps(t)} width={48} tickFormatter={(v) => compact(v, currency)} />
        <Tooltip content={<ChartTooltip currency={currency} />} />
        <Legend wrapperStyle={{ fontSize: 10, color: t.axis }} iconType="circle" iconSize={7} />
        <Bar dataKey="expected" name="Expected in" fill={CHART_COLORS.accent} radius={[5, 5, 0, 0]} maxBarSize={40} />
      </RBarChart>
    </ResponsiveContainer>
  )
}

export function TaxChart({ data = [], currency = 'INR', hidden = [], zoom = false, onDrill }) {
  const t = useChartTheme()
  return (
    <ResponsiveContainer width="100%" height="100%">
      <RBarChart data={data} margin={commonMargin} onClick={(e) => onDrill?.(e?.activePayload?.[0]?.payload)}>
        <CartesianGrid stroke={t.grid} vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="label" {...axisProps(t)} minTickGap={14} />
        <YAxis {...axisProps(t)} width={48} tickFormatter={(v) => compact(v, currency)} />
        <Tooltip content={<ChartTooltip currency={currency} />} />
        <Legend wrapperStyle={{ fontSize: 10, color: t.axis }} iconType="circle" iconSize={7} />
        {!hidden.includes('cgst') ? <Bar dataKey="cgst" name="CGST" stackId="tax" fill={CHART_COLORS.brand} maxBarSize={32} /> : null}
        {!hidden.includes('sgst') ? <Bar dataKey="sgst" name="SGST" stackId="tax" fill={CHART_COLORS.accent} maxBarSize={32} /> : null}
        {!hidden.includes('igst') ? <Bar dataKey="igst" name="IGST" stackId="tax" fill={CHART_COLORS.violet} radius={[4, 4, 0, 0]} maxBarSize={32} /> : null}
        {zoom ? <Brush dataKey="label" height={22} stroke={CHART_COLORS.brand} travellerWidth={7} /> : null}
      </RBarChart>
    </ResponsiveContainer>
  )
}

export function AgingChart({ data = [], currency = 'INR', onDrill }) {
  const t = useChartTheme()
  return (
    <ResponsiveContainer width="100%" height="100%">
      <RBarChart data={data} layout="vertical" margin={{ top: 4, right: 20, left: 4, bottom: 4 }} onClick={(e) => onDrill?.(e?.activePayload?.[0]?.payload)}>
        <CartesianGrid stroke={t.grid} horizontal={false} strokeDasharray="3 3" />
        <XAxis type="number" {...axisProps(t)} tickFormatter={(v) => compact(v, currency)} />
        <YAxis type="category" dataKey="label" {...axisProps(t)} width={72} />
        <Tooltip content={<ChartTooltip currency={currency} />} cursor={{ fill: t.dark ? 'rgba(148,163,184,.08)' : 'rgba(79,70,229,.05)' }} />
        <Bar dataKey="amount" name="Outstanding" radius={[0, 6, 6, 0]} maxBarSize={26}>
          {data.map((d, i) => <Cell key={d.key} fill={d.color || [CHART_COLORS.success, CHART_COLORS.warning, '#f97316', CHART_COLORS.danger][i]} />)}
        </Bar>
      </RBarChart>
    </ResponsiveContainer>
  )
}

export function FYChart({ quarters = [], currency = 'INR', onDrill }) {
  const t = useChartTheme()
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={quarters} margin={commonMargin} onClick={(e) => onDrill?.(e?.activePayload?.[0]?.payload)}>
        <CartesianGrid stroke={t.grid} vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="label" {...axisProps(t)} />
        <YAxis {...axisProps(t)} width={48} tickFormatter={(v) => compact(v, currency)} />
        <Tooltip content={<ChartTooltip currency={currency} />} />
        <Legend wrapperStyle={{ fontSize: 10, color: t.axis }} iconType="circle" iconSize={7} />
        <Bar dataKey="invoiced" name="Invoiced" fill={CHART_COLORS.brand} radius={[5, 5, 0, 0]} maxBarSize={42} />
        <Line type="monotone" dataKey="collected" name="Collected" stroke={CHART_COLORS.success} strokeWidth={2.4} dot={{ r: 3 }} />
      </ComposedChart>
    </ResponsiveContainer>
  )
}

/** Lightweight ranked bars — used for clients, products and risk scores. */
export function RankedBars({ items = [], currency = 'INR', valueKey = 'value', labelKey = 'name', onDrill, accentKey, suffix = null }) {
  const max = Math.max(...items.map((i) => Math.abs(Number(i[valueKey]) || 0)), 1)
  if (!items.length) return <EmptyState icon={IconGrip} title="No data yet" description="Nothing to rank for this period." />
  return (
    <div className="flex h-full flex-col justify-center gap-2.5 overflow-y-auto py-1">
      {items.map((it, i) => {
        const val = Number(it[valueKey]) || 0
        return (
          <button key={`${it[labelKey]}-${i}`} onClick={() => onDrill?.(it)} className="group text-left">
            <div className="mb-1 flex items-center justify-between gap-3 text-[11px]">
              <span className="flex min-w-0 items-center gap-2 text-slate-500 dark:text-slate-400">
                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded bg-slate-100 text-[9px] font-bold text-slate-500 dark:bg-slate-800">{i + 1}</span>
                <span className="truncate font-medium text-slate-700 dark:text-slate-200">{it[labelKey]}</span>
                {accentKey && it[accentKey] != null ? <span className="shrink-0 text-[10px] text-slate-400">{it[accentKey]}</span> : null}
              </span>
              <span className="shrink-0 font-bold text-slate-700 dark:text-slate-100">{suffix != null ? `${val.toLocaleString('en-IN')}${suffix}` : full(val, currency)}</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-accent-500 transition-all group-hover:from-brand-600" style={{ width: `${Math.max(2, (Math.abs(val) / max) * 100)}%` }} />
            </div>
          </button>
        )
      })}
    </div>
  )
}

export function GoalCard({ goal, currency = 'INR', onEdit, onDelete }) {
  const pct = Math.min(100, Number(goal.pct) || 0)
  const behind = goal.status === 'behind'
  return (
    <div className="panel-hover rounded-xl border border-slate-200 p-3.5 dark:border-slate-800">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-sm font-bold capitalize">{goal.periodType} target</div>
          <div className="text-[11px] text-slate-400">{goal.periodKey}</div>
        </div>
        <div className="flex items-center gap-1">
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${behind ? 'bg-danger-100 text-danger-700 dark:bg-danger-500/15 dark:text-danger-300' : 'bg-success-100 text-success-700 dark:bg-success-500/15 dark:text-success-300'}`}>
            {behind ? 'Behind' : 'On track'}
          </span>
          {onEdit ? <button onClick={() => onEdit(goal)} aria-label="Edit target" className="rounded p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><IconPencil size={13} /></button> : null}
          {onDelete ? <button onClick={() => onDelete(goal)} aria-label="Delete target" className="rounded p-1 text-danger-500 hover:bg-danger-50 dark:hover:bg-danger-500/10"><IconX size={13} /></button> : null}
        </div>
      </div>
      <div className="mt-3 text-lg font-extrabold text-slate-800 dark:text-slate-100">{full(goal.actual, currency)} <span className="text-xs font-medium text-slate-400">/ {full(goal.target, currency)}</span></div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div className={`h-full rounded-full ${behind ? 'bg-gradient-to-r from-warning-400 to-danger-500' : 'bg-gradient-to-r from-brand-500 to-accent-500'}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-1.5 text-right text-[11px] font-semibold text-slate-500">{pct.toFixed(0)}% complete</div>
    </div>
  )
}

