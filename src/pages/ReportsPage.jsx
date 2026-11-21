import React, { useMemo, useState } from 'react'
import { useData } from '../store/data'
import { computeTotals, effectiveStatus } from '../utils/calc'
import { formatMoney } from '../utils/currency'
import { monthKey, monthLabel, formatDate } from '../utils/date'
import { Card, Button, Tabs, Select, Badge } from '../components/ui'
import { IconDownload } from '../components/icons'
import { exportCSV, exportXLS } from '../utils/files'
import { toast } from '../store/ui'
import { computeStats, monthlySeries, STATUS_COLORS, statusLabel } from './DashboardPage'
import { generateRecurring } from '../services/recurring'

const TABS = [
  { id: 'sales', label: 'Sales by client' },
  { id: 'monthly', label: 'Monthly sales' },
  { id: 'tax', label: 'Tax summary' },
  { id: 'recurring', label: 'Recurring' },
]

export default function ReportsPage() {
  const data = useData()
  const [tab, setTab] = useState('sales')
  const [year, setYear] = useState(new Date().getFullYear())

  const invoices = useMemo(
    () => data.invoices.filter((inv) => inv.kind !== 'quotation' && (inv.issueDate || '').startsWith(String(year))),
    [data.invoices, year]
  )
  const years = useMemo(() => {
    const set = new Set(data.invoices.map((i) => (i.issueDate || '').slice(0, 4)).filter(Boolean))
    set.add(String(new Date().getFullYear()))
    return [...set].sort().reverse()
  }, [data.invoices])

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4 lg:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">Reports</h1>
          <p className="text-sm text-slate-500">Sales, taxes and recurring invoices</p>
        </div>
        <div className="flex gap-2">
          <Select options={years.map((y) => ({ value: y, label: y }))} value={String(year)} onChange={(e) => setYear(Number(e.target.value))} aria-label="Report year" />
          <Button variant="secondary" size="sm" onClick={() => exportCSV(data.invoices.map((inv) => ({ ...reportRow(inv) })), `invix-report-${year}`)}><IconDownload size={13} /> Export data</Button>
        </div>
      </header>

      <Tabs tabs={TABS} active={tab} onChange={setTab} className="w-fit" />

      {tab === 'sales' ? <SalesByClient invoices={invoices} currency={data.settings.currency} /> : null}
      {tab === 'monthly' ? <MonthlySales invoices={invoices} currency={data.settings.currency} year={year} /> : null}
      {tab === 'tax' ? <TaxSummary invoices={invoices} currency={data.settings.currency} /> : null}
      {tab === 'recurring' ? <RecurringTab /> : null}
    </div>
  )
}

function reportRow(inv) {
  const t = computeTotals(inv)
  const st = effectiveStatus(inv, t)
  return {
    Number: inv.number,
    Client: inv.client?.name || '',
    Date: inv.issueDate,
    Status: statusLabel(st),
    Subtotal: t.subtotal.toFixed(2),
    Tax: t.taxTotal.toFixed(2),
    Total: t.total.toFixed(2),
    Paid: t.paid.toFixed(2),
    Balance: t.balance.toFixed(2),
    Currency: inv.currency,
  }
}

function SalesByClient({ invoices, currency }) {
  const byClient = useMemo(() => {
    const map = new Map()
    for (const inv of invoices) {
      const name = inv.client?.name || '—'
      const t = computeTotals(inv)
      const cur = map.get(name) || { name, count: 0, invoiced: 0, paid: 0, outstanding: 0 }
      cur.count++
      cur.invoiced += t.total
      cur.paid += t.paid
      cur.outstanding += Math.max(t.balance, 0)
      map.set(name, cur)
    }
    return [...map.values()].sort((a, b) => b.invoiced - a.invoiced)
  }, [invoices])

  const exportRows = byClient.map((c) => ({ Client: c.name, Invoices: c.count, Invoiced: c.invoiced.toFixed(2), Paid: c.paid.toFixed(2), Outstanding: c.outstanding.toFixed(2) }))

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-bold">Sales by client</h3>
          <Button size="sm" variant="secondary" onClick={() => { exportCSV(exportRows, 'sales-by-client'); toast('Report exported', 'success') }}><IconDownload size={13} /> CSV</Button>
      </div>
      {byClient.length === 0 ? <p className="py-6 text-center text-sm text-slate-400">No invoices this year.</p> : (
        <table className="w-full text-sm">
          <thead><tr className="border-b border-slate-200 text-left text-xs text-slate-400 dark:border-slate-800"><th className="py-2">Client</th><th className="py-2">Invoices</th><th className="py-2 text-right">Invoiced</th><th className="py-2 text-right">Paid</th><th className="py-2 text-right">Outstanding</th></tr></thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {byClient.map((c) => (
              <tr key={c.name}>
                <td className="py-2 font-semibold">{c.name}</td>
                <td className="py-2 text-slate-500">{c.count}</td>
                <td className="py-2 text-right">{formatMoney(c.invoiced, currency)}</td>
                <td className="py-2 text-right text-emerald-600">{formatMoney(c.paid, currency)}</td>
                <td className="py-2 text-right text-amber-600">{c.outstanding ? formatMoney(c.outstanding, currency) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  )
}

function MonthlySales({ invoices, currency, year }) {
  const rows = useMemo(() => {
    const map = new Map([...Array(12)].map((_, i) => [i, { invoiced: 0, paid: 0, count: 0 }]))
    for (const inv of invoices) {
      const m = Number((inv.issueDate || '').slice(5, 7)) - 1
      if (!map.has(m)) continue
      const t = computeTotals(inv)
      const cell = map.get(m)
      cell.count++
      cell.invoiced += t.total
      cell.paid += t.paid
    }
    return [...map.entries()].map(([m, v]) => ({ m, ...v }))
  }, [invoices])

  const max = Math.max(...rows.map((r) => r.invoiced), 1)

  return (
    <Card className="p-4">
      <h3 className="mb-3 text-sm font-bold">Monthly sales — {year}</h3>
      <div className="space-y-1.5">
        {rows.map((r) => (
          <div key={r.m} className="flex items-center gap-3 text-xs">
            <span className="w-10 font-semibold text-slate-500">{monthLabel(`${year}-${String(r.m + 1).padStart(2, '0')}`)}</span>
            <div className="h-4 flex-1 overflow-hidden rounded bg-slate-100 dark:bg-slate-800">
              <div className="h-full rounded bg-gradient-to-r from-brand-500 to-brand-400" style={{ width: `${(r.invoiced / max) * 100}%` }} />
            </div>
            <span className="w-24 text-right font-bold">{formatMoney(r.invoiced, currency)}</span>
            <span className="w-10 text-right text-slate-400">{r.count} inv</span>
          </div>
        ))}
      </div>
    </Card>
  )
}

function TaxSummary({ invoices, currency }) {
  const rows = useMemo(() => {
    const map = new Map()
    for (const inv of invoices) {
      const t = computeTotals(inv)
      const period = monthKey(inv.issueDate)
      for (const tax of t.taxBreakdown) {
        const key = `${period}|${tax.name}`
        const cur = map.get(key) || { period, name: tax.name, taxable: 0, tax: 0 }
        cur.taxable += t.subtotal
        cur.tax += tax.amount
        map.set(key, cur)
      }
    }
    return [...map.values()].sort((a, b) => b.period.localeCompare(a.period))
  }, [invoices])

  const totalTax = rows.reduce((s, r) => s + r.tax, 0)

  const rowsExport = rows.map((r) => ({ Period: r.period, Tax: r.name, TaxableValue: r.taxable.toFixed(2), TaxAmount: r.tax.toFixed(2) }))

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-bold">GST / Tax summary</h3>
        <div className="flex gap-2">
          <Badge color="bg-brand-100 text-brand-700">Total tax: {formatMoney(totalTax, currency)}</Badge>
            <Button size="sm" variant="secondary" onClick={() => { exportCSV(rowsExport, 'tax-summary'); toast('Tax report exported', 'success') }}><IconDownload size={13} /> CSV</Button>
        </div>
      </div>
      {rows.length === 0 ? <p className="py-6 text-center text-sm text-slate-400">No taxable invoices this year.</p> : (
        <table className="w-full text-sm">
          <thead><tr className="border-b border-slate-200 text-left text-xs text-slate-400 dark:border-slate-800"><th className="py-2">Period</th><th className="py-2">Tax head</th><th className="py-2 text-right">Taxable value</th><th className="py-2 text-right">Tax amount</th></tr></thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {rows.map((r, i) => (
              <tr key={i}>
                <td className="py-2">{monthLabel(r.period)}</td>
                <td className="py-2 font-semibold">{r.name}</td>
                <td className="py-2 text-right">{formatMoney(r.taxable, currency)}</td>
                <td className="py-2 text-right">{formatMoney(r.tax, currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  )
}

function RecurringTab() {
  const data = useData()
  const recurring = data.invoices.filter((i) => i.recurring && i.recurring !== 'none')
  const next = generateRecurring(data)

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-bold">Recurring invoices</h3>
        {next.length ? (
          <Button size="sm" onClick={() => { next.forEach((inv) => data.saveInvoice(inv)); toast(`${next.length} recurring invoice(s) generated`, 'success') }}>
            Generate {next.length} due now
          </Button>
        ) : null}
      </div>
      {recurring.length === 0 ? <p className="py-6 text-center text-sm text-slate-400">No recurring invoices. Set a frequency on any invoice's “Recurring” field.</p> : (
        <table className="w-full text-sm">
          <thead><tr className="border-b border-slate-200 text-left text-xs text-slate-400 dark:border-slate-800"><th className="py-2">Invoice</th><th className="py-2">Client</th><th className="py-2">Frequency</th><th className="py-2">Last issued</th></tr></thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {recurring.map((inv) => (
              <tr key={inv.id}>
                <td className="py-2 font-semibold">{inv.number}</td>
                <td className="py-2">{inv.client?.name}</td>
                <td className="py-2"><Badge>{inv.recurring}</Badge></td>
                <td className="py-2 text-slate-500">{formatDate(inv.issueDate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  )
}
