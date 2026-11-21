import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData, emptyClient } from '../store/data'
import { computeTotals, effectiveStatus } from '../utils/calc'
import { formatMoney } from '../utils/currency'
import { addDays, daysBetween, formatDate, todayISO } from '../utils/date'
import { Badge, ConfirmModal, Input, Modal, Select, Textarea } from '../components/ui'
import {
  IconAlert, IconBell, IconBuilding, IconCalendar, IconCheckCircle, IconChevronDown,
  IconChevronLeft, IconChevronRight, IconClock, IconCopy, IconDownload, IconEye,
  IconFileText, IconFilter, IconInvoice, IconPencil, IconPercent, IconPlus, IconPrinter,
  IconReceipt, IconRefresh, IconSearch, IconSend, IconShare, IconSortAsc, IconTable,
  IconTrash, IconUpload, IconWallet, IconX,
} from '../components/icons'
import { STATUS_COLORS, statusLabel } from './DashboardPage'
import { downloadBlob, exportCSV, exportJSON, exportXLS, readFileAsText } from '../utils/files'
import { uid } from '../utils/id'
import { toast } from '../store/ui'
import { invoiceBlob } from '../services/pdf'
import { RenderInvoice } from '../templates/registry'
import { isSupabaseConfigured } from '../services/supabase'

const STATUS_TABS = [
  { id: 'all', label: 'All' },
  { id: 'draft', label: 'Draft' },
  { id: 'sent', label: 'Sent' },
  { id: 'partially', label: 'Partially Paid' },
  { id: 'paid', label: 'Paid' },
  { id: 'overdue', label: 'Overdue' },
]

const CHIP_STYLES = {
  draft: 'bg-surface-container-high text-on-surface-variant dark:bg-slate-700 dark:text-slate-300',
  sent: 'bg-info-100 text-info-700 dark:bg-info-500/15 dark:text-info-200',
  partially: 'bg-warning-100 text-warning-700 dark:bg-warning-500/15 dark:text-warning-200',
  paid: 'bg-success-100 text-success-700 dark:bg-success-500/15 dark:text-success-300',
  overdue: 'bg-danger-100 text-danger-700 dark:bg-danger-500/15 dark:text-danger-200',
}

const DOT_STYLES = {
  draft: 'bg-outline dark:bg-slate-400',
  sent: 'bg-info-500',
  partially: 'bg-warning-500',
  paid: 'bg-success-500',
  overdue: 'bg-danger-500 animate-pulse',
}

const TILE_STYLES = {
  draft: 'bg-surface-container-high text-outline dark:bg-slate-700 dark:text-slate-300',
  sent: 'bg-surface-container text-on-surface-variant dark:bg-slate-700 dark:text-slate-300',
  partially: 'bg-secondary-fixed/40 text-secondary dark:bg-slate-700 dark:text-secondary-fixed-dim',
  paid: 'bg-primary-fixed text-primary dark:bg-primary/20 dark:text-primary-fixed-dim',
  overdue: 'bg-error-container text-error dark:bg-danger-500/15 dark:text-danger-300',
}

const money = (amount, currency) => formatMoney(amount, currency, { compact: true })

function tileIcon(st, kind) {
  if (st === 'overdue') return IconAlert
  if (st === 'partially') return IconPercent
  if (st === 'draft') return IconFileText
  if (kind === 'quotation') return IconFileText
  return IconReceipt
}

function ActionIcon({ icon: TIcon, label, onClick, disabled = false, tone = '' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={`rounded-lg p-1.5 text-on-surface-variant transition-colors hover:bg-surface-container disabled:opacity-40 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-100 ${tone}`}
    >
      <TIcon size={17} />
    </button>
  )
}

function FilterSelect({ icon: TIcon, label, value, onChange, options, className = '' }) {
  return (
    <div className={`relative ${className}`}>
      <TIcon size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant dark:text-slate-400" />
      <select
        value={value}
        onChange={onChange}
        aria-label={label}
        className="h-10 w-full appearance-none rounded-xl bg-surface-container-lowest pl-9 pr-8 font-label-ui text-label-ui text-on-surface shadow-sm outline-none focus:ring-2 focus:ring-primary/20 dark:bg-slate-900 dark:text-slate-100"
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <IconChevronDown size={15} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-outline" />
    </div>
  )
}

function pageList(current, total) {
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1)
  const set = new Set([1, total, current - 1, current, current + 1])
  const sorted = [...set].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b)
  const out = []
  sorted.forEach((p, i) => {
    if (i && p - sorted[i - 1] > 1) out.push('...')
    out.push(p)
  })
  return out
}

/* ---------- CSV import (writes through the store's saveInvoice) ---------- */

function parseCSV(text) {
  const rows = []
  let row = []
  let cell = ''
  let quoted = false
  const src = text.replace(/^\uFEFF/, '')
  for (let i = 0; i < src.length; i += 1) {
    const c = src[i]
    if (quoted) {
      if (c === '"') {
        if (src[i + 1] === '"') { cell += '"'; i += 1 } else quoted = false
      } else cell += c
    } else if (c === '"') quoted = true
    else if (c === ',') { row.push(cell); cell = '' }
    else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = '' }
    else if (c !== '\r') cell += c
  }
  if (cell || row.length) { row.push(cell); rows.push(row) }
  const headers = (rows.shift() || []).map((h) => h.trim().toLowerCase().replace(/\s+/g, ' '))
  return rows
    .filter((r) => r.some((v) => v && v.trim()))
    .map((r) => Object.fromEntries(headers.map((h, i) => [h, (r[i] || '').trim()])))
}

const pick = (row, keys) => keys.map((k) => row[k]).find((v) => v !== undefined && v !== '') || ''
const num = (v) => {
  const n = Number(String(v || '').replace(/[₹$,\s]/g, ''))
  return Number.isFinite(n) ? n : 0
}

function csvStatus(raw, paid, balance, dueDate) {
  const v = String(raw || '').toLowerCase().trim()
  if (v.includes('draft')) return 'draft'
  if (v.includes('overdue')) return 'overdue'
  if (v.includes('part')) return 'partially'
  if (v.includes('paid') || v.includes('clear')) return 'paid'
  if (paid > 0 && balance > 0) return 'partially'
  if (paid > 0) return 'paid'
  if (dueDate && new Date(dueDate) < new Date(todayISO())) return 'overdue'
  return 'sent'
}

function csvToInvoice(row, data) {
  const number = pick(row, ['number', 'invoice', 'invoice #', 'invoice no', 'invoice number'])
  const clientName = pick(row, ['client', 'client name', 'clientname', 'customer'])
  const gstin = pick(row, ['gstin', 'gst no', 'gst number', 'tax id'])
  const issueDate = pick(row, ['issue date', 'issuedate', 'date', 'invoice date']) || todayISO()
  const dueDate = pick(row, ['due date', 'duedate'])
  const terms = num(pick(row, ['payment terms', 'terms'])) || 15
  const subtotalIn = num(pick(row, ['subtotal', 'net amount', 'base amount']))
  const tax = num(pick(row, ['tax', 'tax amount', 'gst', 'gst amount', 'igst', 'cgst+sgst']))
  const total = num(pick(row, ['total', 'amount', 'grand total', 'invoice total', 'total amount'])) || subtotalIn + tax
  const subtotal = subtotalIn || Math.max(total - tax, 0)
  const balance = num(pick(row, ['balance', 'amount due', 'balance due']))
  const paid = num(pick(row, ['paid', 'amount paid', 'amount received'])) || (balance ? Math.max(total - balance, 0) : 0)
  const client = data.clients.find((c) => c.name?.toLowerCase() === clientName.toLowerCase() || (gstin && c.gstin === gstin))
  const business = data.activeBusiness?.() || data.businesses[0] || null
  return {
    id: uid(),
    number,
    status: csvStatus(pick(row, ['status', 'payment status']), paid, balance, dueDate),
    kind: 'invoice',
    currency: pick(row, ['currency']) || 'INR',
    issueDate,
    dueDate: dueDate || addDays(issueDate, terms),
    poNumber: pick(row, ['po number', 'po', 'po #', 'ponumber']),
    paymentTerms: terms,
    business,
    client: client ? { ...client } : { ...emptyClient(), name: clientName || 'Imported Client', gstin },
    items: [{
      _id: uid(),
      description: pick(row, ['description', 'item', 'particulars', 'item description']) || 'Imported invoice line',
      hsn: '', quantity: 1, unit: 'Job', rate: subtotal,
      discountType: 'percent', discountValue: 0,
      taxRate: subtotal > 0 ? (tax / subtotal) * 100 : 0,
      taxName: 'GST',
    }],
    discount: { type: 'percent', value: 0 },
    shipping: 0,
    extraCharges: [],
    notes: '',
    terms: '',
    bankDetails: business?.bankDetails,
    taxScheme: 'gst',
    taxMode: 'exclusive',
    roundOff: true,
    payments: paid > 0 ? [{ id: uid(), date: issueDate, amount: paid, method: 'bank', note: 'Imported' }] : [],
    shareId: uid().replace(/-/g, '').slice(0, 12),
    createdAt: new Date().toISOString(),
  }
}

function sendReminder(inv, totals) {
  const subject = encodeURIComponent(`Reminder: invoice ${inv.number || ''}`)
  const body = encodeURIComponent(
    `Hi ${inv.client?.name || ''},\n\nThis is a friendly reminder that invoice ${inv.number} (due ${formatDate(inv.dueDate)}) for ${money(totals.balance, inv.currency)} is outstanding.\n\nPlease arrange payment at your earliest convenience.\n\nThanks`
  )
  if (inv.client?.email) {
    window.location.href = `mailto:${inv.client.email}?subject=${subject}&body=${body}`
    toast('Opening your email app with the reminder', 'info')
  } else {
    const text = `Reminder: invoice ${inv.number} is due. Amount: ${money(totals.balance, inv.currency)}`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer')
    toast('Opening WhatsApp with the reminder', 'info')
  }
}

export default function InvoicesPage() {
  const data = useData()
  const navigate = useNavigate()
  const fileRef = useRef(null)
  const masterRef = useRef(null)

  const [q, setQ] = useState('')
  const [status, setStatus] = useState('all')
  const [clientFilter, setClientFilter] = useState('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [dateRange, setDateRange] = useState('all')
  const [sort, setSort] = useState('date-desc')
  const [selected, setSelected] = useState(new Set())
  const [confirmBulk, setConfirmBulk] = useState(false)
  const [bulkMenu, setBulkMenu] = useState(false)
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)
  const [detailRow, setDetailRow] = useState(null)
  const [paymentFor, setPaymentFor] = useState(null)
  const [paymentForm, setPaymentForm] = useState({ amount: '', date: todayISO(), method: 'bank', note: '' })
  const [pdfTarget, setPdfTarget] = useState(null)
  const [pdfBusy, setPdfBusy] = useState(false)

  const allRows = useMemo(
    () => data.invoices.map((inv) => {
      const totals = computeTotals(inv)
      return { inv, totals, st: effectiveStatus(inv, totals) }
    }),
    [data.invoices]
  )

  const statusCounts = useMemo(() => {
    const counts = { all: allRows.length, draft: 0, sent: 0, partially: 0, paid: 0, overdue: 0 }
    allRows.forEach((r) => { if (r.st in counts) counts[r.st] += 1 })
    return counts
  }, [allRows])

  const metrics = useMemo(() => {
    const invoiced = allRows.reduce((s, r) => s + r.totals.total, 0)
    const collected = allRows.reduce((s, r) => s + r.totals.paid, 0)
    const outstanding = allRows.reduce((s, r) => s + Math.max(r.totals.balance, 0), 0)
    return {
      invoiced,
      collected,
      outstanding,
      rate: invoiced > 0 ? (collected / invoiced) * 100 : 0,
      clearances: allRows.filter((r) => r.totals.paid > 0).length,
      pending: allRows.filter((r) => r.st === 'sent' || r.st === 'partially').length,
      overdue: allRows.filter((r) => r.st === 'overdue').length,
    }
  }, [allRows])

  const overdueRows = useMemo(() => allRows.filter((r) => r.st === 'overdue' && r.totals.balance > 0), [allRows])

  const clientOptions = useMemo(() => {
    const map = new Map()
    data.clients.forEach((c) => { if (c.name) map.set(c.name, c.id || c.name) })
    allRows.forEach(({ inv }) => { if (inv.client?.name) map.set(inv.client.name, inv.client.id || inv.client.name) })
    return [{ value: 'all', label: 'All Clients' }, ...[...map.entries()].map(([name, id]) => ({ value: id, label: name }))]
  }, [data.clients, allRows])

  const rows = useMemo(() => {
    let list = allRows
    if (q.trim()) {
      const needle = q.trim().toLowerCase()
      list = list.filter((r) => `${r.inv.number} ${r.inv.client?.name || ''} ${r.inv.client?.gstin || ''} ${r.inv.poNumber || ''} ${r.totals.total}`.toLowerCase().includes(needle))
    }
    if (status !== 'all') list = list.filter((r) => r.st === status)
    if (clientFilter !== 'all') list = list.filter((r) => r.inv.client?.id === clientFilter || r.inv.client?.name === clientFilter)
    if (from) list = list.filter((r) => (r.inv.issueDate || '') >= from)
    if (to) list = list.filter((r) => (r.inv.issueDate || '') <= to)
    const sorters = {
      'date-desc': (a, b) => new Date(b.inv.issueDate || 0) - new Date(a.inv.issueDate || 0),
      'date-asc': (a, b) => new Date(a.inv.issueDate || 0) - new Date(b.inv.issueDate || 0),
      'total-desc': (a, b) => b.totals.total - a.totals.total,
      'total-asc': (a, b) => a.totals.total - b.totals.total,
      client: (a, b) => (a.inv.client?.name || '').localeCompare(b.inv.client?.name || ''),
    }
    return [...list].sort(sorters[sort])
  }, [allRows, q, status, clientFilter, from, to, sort])

  const totalPages = Math.max(1, Math.ceil(rows.length / perPage))
  const pageRows = useMemo(() => rows.slice((page - 1) * perPage, page * perPage), [rows, page, perPage])
  const selectedRows = useMemo(() => allRows.filter((r) => selected.has(r.inv.id)), [allRows, selected])
  const selectedValue = selectedRows.reduce((s, r) => s + r.totals.total, 0)

  useEffect(() => { setPage(1) }, [q, status, clientFilter, from, to, sort, perPage])
  useEffect(() => { if (page > totalPages) setPage(totalPages) }, [page, totalPages])

  useEffect(() => {
    const el = masterRef.current
    if (!el) return
    const ids = pageRows.map((r) => r.inv.id)
    const count = ids.filter((id) => selected.has(id)).length
    el.checked = ids.length > 0 && count === ids.length
    el.indeterminate = count > 0 && count < ids.length
  }, [pageRows, selected])

  useEffect(() => {
    const onKey = (e) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return
      const active = document.activeElement
      const tag = active?.tagName?.toLowerCase()
      if (document.querySelector('[role="dialog"]')) return
      if (['input', 'textarea', 'select'].includes(tag) || active?.isContentEditable) return
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault()
        navigate('/builder')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navigate])

  const toggle = (id) => {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelected(next)
  }

  const toggleAll = () => {
    const ids = pageRows.map((r) => r.inv.id)
    const allSelected = ids.length > 0 && ids.every((id) => selected.has(id))
    const next = new Set(selected)
    ids.forEach((id) => (allSelected ? next.delete(id) : next.add(id)))
    setSelected(next)
  }

  const clearSelection = () => setSelected(new Set())

  const openPayment = (row) => {
    setPaymentFor(row)
    setPaymentForm({
      amount: Math.max(0, row.totals.balance).toFixed(2),
      date: todayISO(),
      method: 'bank',
      note: '',
    })
  }

  const savePayment = () => {
    if (!paymentFor) return
    const amount = Number(paymentForm.amount)
    const balance = Math.max(0, paymentFor.totals.balance)
    if (!Number.isFinite(amount) || amount <= 0) {
      toast('Enter a payment amount greater than zero', 'error')
      return
    }
    if (amount > balance + 0.01) {
      toast(`Amount exceeds the outstanding balance of ${money(balance, paymentFor.inv.currency)}`, 'error')
      return
    }
    const payment = {
      id: uid(),
      date: paymentForm.date || todayISO(),
      amount,
      method: paymentForm.method,
      note: paymentForm.note.trim(),
    }
    data.saveInvoice({
      ...paymentFor.inv,
      payments: [...(paymentFor.inv.payments || []), payment],
    })
    toast(`Payment of ${money(amount, paymentFor.inv.currency)} recorded`, 'success')
    setPaymentFor(null)
  }

  const doExport = (fmt, source) => {
    const list = source || (selected.size ? selectedRows : rows)
    const rowsExport = list.map(({ inv, totals, st }) => ({
      Number: inv.number,
      Client: inv.client?.name || '',
      GSTIN: inv.client?.gstin || '',
      IssueDate: inv.issueDate,
      DueDate: inv.dueDate,
      Status: statusLabel(st),
      Subtotal: totals.subtotal.toFixed(2),
      Tax: totals.taxTotal.toFixed(2),
      Total: totals.total.toFixed(2),
      Balance: totals.balance.toFixed(2),
      Currency: inv.currency,
    }))
    if (!rowsExport.length) {
      toast('Nothing to export', 'info')
      return
    }
    if (fmt === 'csv') exportCSV(rowsExport, 'invix-invoices')
    else if (fmt === 'xls') exportXLS(rowsExport, 'invix-invoices', 'Invix Invoices')
    else exportJSON(rowsExport, 'invix-invoices')
    toast(`Exported ${rowsExport.length} invoices as ${fmt.toUpperCase()}`, 'success')
    setBulkMenu(false)
  }

  const duplicate = (id) => {
    const copy = data.duplicateInvoice(id)
    if (copy) {
      toast('Invoice duplicated as draft', 'success')
      navigate(`/builder/${copy.id}`)
    }
  }

  const duplicateSelected = () => {
    let count = 0
    selectedRows.forEach((r) => { if (data.duplicateInvoice(r.inv.id)) count += 1 })
    clearSelection()
    toast(`${count} invoice(s) duplicated as drafts`, 'success')
    setBulkMenu(false)
  }

  const convertToInvoice = (id) => {
    const src = data.invoices.find((i) => i.id === id)
    if (!src) return
    const copy = data.duplicateInvoice(id)
    if (copy) {
      data.saveInvoice({ ...copy, kind: 'invoice' })
      toast('Quotation converted to invoice', 'success')
      navigate(`/builder/${copy.id}`)
    }
  }

  const downloadPdf = async (inv) => {
    if (pdfBusy) return
    setPdfTarget(inv)
    setPdfBusy(true)
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
    try {
      const blob = await invoiceBlob({})
      downloadBlob(blob, `invoice-${inv.number || inv.id}.pdf`)
      toast('Invoice PDF downloaded', 'success')
    } catch (e) {
      toast(`PDF export failed: ${e.message}`, 'error')
    } finally {
      setPdfTarget(null)
      setPdfBusy(false)
    }
  }

  const shareInvoice = async (inv) => {
    if (!isSupabaseConfigured) {
      const summary = `Invoice ${inv.number || 'draft'}: ${money(computeTotals(inv).total, inv.currency)}`
      window.open(`https://wa.me/?text=${encodeURIComponent(summary)}`, '_blank', 'noopener,noreferrer')
      toast('Opening WhatsApp to share the invoice', 'info')
      return
    }
    let shareId = inv.shareId
    if (!shareId) {
      shareId = uid().replace(/-/g, '').slice(0, 12)
      data.saveInvoice({ ...inv, shareId })
    }
    const link = `${window.location.origin}/share/${shareId}`
    try {
      await navigator.clipboard.writeText(link)
      toast('Share link copied to clipboard', 'success')
    } catch {
      toast('Clipboard blocked — copy the link from the address bar', 'warn')
    }
  }

  const importCsv = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const parsed = parseCSV(await readFileAsText(file))
      if (!parsed.length) {
        toast('No invoice rows found in CSV', 'warn')
        return
      }
      const imported = parsed.map((r) => csvToInvoice(r, data))
      imported.forEach((inv) => data.saveInvoice(inv))
      toast(`${imported.length} invoice(s) imported from CSV`, 'success')
    } catch (err) {
      toast(`CSV import failed: ${err.message}`, 'error')
    }
  }

  const applyRange = (value) => {
    setDateRange(value)
    const t = todayISO()
    if (value === 'all') { setFrom(''); setTo('') }
    else if (value === 'today') { setFrom(t); setTo(t) }
    else if (value === '7d') { setFrom(addDays(t, -6)); setTo(t) }
    else if (value === '30d') { setFrom(addDays(t, -29)); setTo(t) }
  }

  const resetFilters = () => {
    setQ(''); setStatus('all'); setClientFilter('all'); setFrom(''); setTo('')
    setDateRange('all'); setSort('date-desc'); setSelected(new Set())
  }

  const batchNudge = () => {
    if (!overdueRows.length) {
      toast('No overdue invoices need a nudge', 'info')
      return
    }
    const lines = overdueRows.slice(0, 20).map((r) => `- ${r.inv.number || 'Draft'}: ${money(r.totals.balance, r.inv.currency)}`)
    const text = `Payment reminders for overdue invoices:\n${lines.join('\n')}`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer')
    toast('Opening WhatsApp with the overdue summary', 'info')
  }

  const today = todayISO()

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 pb-20 pt-4 sm:px-6 md:pb-6 lg:px-8">
      {/* Command & action bar */}
      <header className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h1 className="font-headline-lg text-headline-lg tracking-tight text-on-surface dark:text-slate-100">Invoices</h1>
            <span className="inline-flex items-center rounded-full bg-surface-container-high px-2 py-0.5 font-label-caps text-label-caps uppercase tracking-wider text-primary dark:bg-slate-700 dark:text-primary-fixed-dim">Live Ledger</span>
          </div>
          <p className="max-w-2xl font-body-md text-body-md text-on-surface-variant dark:text-slate-400">
            Manage, track and dispatch GST-compliant invoices and real-time payment schedules across your corporate entities.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-surface-container-lowest px-3.5 py-2 font-label-ui text-label-ui text-on-surface shadow-sm transition-all hover:bg-surface-container-low dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
          >
            <IconUpload size={18} className="text-on-surface-variant dark:text-slate-400" /> Import CSV
          </button>
          <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={importCsv} className="hidden" aria-label="Import invoices from CSV" />
          <div className="relative inline-block text-left">
            <button
              type="button"
              onClick={() => setBulkMenu(!bulkMenu)}
              aria-haspopup="menu"
              aria-expanded={bulkMenu}
              className="inline-flex items-center gap-1.5 rounded-lg bg-surface-container-lowest px-3.5 py-2 font-label-ui text-label-ui text-on-surface shadow-sm transition-all hover:bg-surface-container-low dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
            >
              <IconCheckCircle size={18} className="text-on-surface-variant dark:text-slate-400" /> Bulk Actions <IconChevronDown size={16} className="text-on-surface-variant dark:text-slate-400" />
            </button>
            {bulkMenu ? (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setBulkMenu(false)} aria-hidden="true" />
                <div className="absolute right-0 top-10 z-40 w-56 overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest py-1 shadow-xl dark:border-slate-700 dark:bg-slate-900" role="menu">
                  <button type="button" role="menuitem" onClick={() => doExport('csv')} className="flex w-full items-center gap-2.5 px-4 py-2 text-left font-label-ui text-label-ui text-on-surface hover:bg-surface-container-low dark:text-slate-100 dark:hover:bg-slate-800"><IconDownload size={15} /> Export CSV</button>
                  <button type="button" role="menuitem" onClick={() => doExport('xls')} className="flex w-full items-center gap-2.5 px-4 py-2 text-left font-label-ui text-label-ui text-on-surface hover:bg-surface-container-low dark:text-slate-100 dark:hover:bg-slate-800"><IconTable size={15} /> Export Excel</button>
                  <button type="button" role="menuitem" onClick={() => doExport('json')} className="flex w-full items-center gap-2.5 px-4 py-2 text-left font-label-ui text-label-ui text-on-surface hover:bg-surface-container-low dark:text-slate-100 dark:hover:bg-slate-800"><IconFileText size={15} /> Export JSON</button>
                  <div className="my-1 border-t border-outline-variant dark:border-slate-700" />
                  <button type="button" role="menuitem" onClick={duplicateSelected} disabled={!selected.size} className="flex w-full items-center gap-2.5 px-4 py-2 text-left font-label-ui text-label-ui text-on-surface hover:bg-surface-container-low disabled:opacity-40 dark:text-slate-100 dark:hover:bg-slate-800"><IconCopy size={15} /> Duplicate selected</button>
                  <button type="button" role="menuitem" onClick={() => { setBulkMenu(false); setConfirmBulk(true) }} disabled={!selected.size} className="flex w-full items-center gap-2.5 px-4 py-2 text-left font-label-ui text-label-ui text-error hover:bg-error-container/40 disabled:opacity-40 dark:text-danger-300"><IconTrash size={15} /> Delete selected</button>
                </div>
              </>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => navigate('/builder')}
            className="group inline-flex items-center gap-2 rounded-lg bg-primary-container px-4 py-2 font-label-ui text-label-ui text-on-primary shadow-md transition-all hover:bg-primary dark:bg-primary dark:text-white dark:hover:bg-primary-container"
          >
            <IconPlus size={18} /> New Invoice
            <span className="ml-1 rounded bg-on-primary/20 px-1.5 py-0.5 font-label-caps text-[10px] text-on-primary group-hover:bg-on-primary/30 dark:bg-white/20 dark:text-white">N</span>
          </button>
        </div>
      </header>

      {/* Metric snapshot bar */}
      <div className="mb-8 grid grid-cols-1 gap-5 md:grid-cols-3">
        <div className="relative overflow-hidden rounded-xl bg-surface-container-lowest p-5 shadow-sm transition-all hover:shadow-md dark:bg-slate-900">
          <div className="mb-3 flex items-center justify-between">
            <span className="font-label-caps text-label-caps uppercase tracking-wider text-on-surface-variant dark:text-slate-400">Total Invoiced</span>
            <span className="rounded-lg bg-surface-container p-2 text-primary dark:bg-slate-800 dark:text-primary-fixed-dim"><IconWallet size={20} /></span>
          </div>
          <div className="flex items-baseline gap-2.5">
            <span className="font-financial-display text-financial-display tabular-nums text-on-surface dark:text-slate-100">{money(metrics.invoiced, data.settings.currency)}</span>
          </div>
          <div className="-mx-5 -mb-5 mt-3 flex items-center justify-between border-t border-outline-variant bg-surface-container-low/50 px-5 py-2.5 dark:border-slate-800 dark:bg-slate-800/40">
            <span className="font-body-sm text-body-sm text-on-surface-variant dark:text-slate-400">Volume</span>
            <span className="font-label-ui text-label-ui font-semibold text-on-surface dark:text-slate-100">{allRows.length} invoices registered</span>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-xl bg-surface-container-lowest p-5 shadow-sm transition-all hover:shadow-md dark:bg-slate-900">
          <div className="mb-3 flex items-center justify-between">
            <span className="font-label-caps text-label-caps uppercase tracking-wider text-on-surface-variant dark:text-slate-400">Total Collected</span>
            <span className="rounded-lg bg-secondary-container/40 p-2 text-secondary dark:bg-slate-800 dark:text-secondary-fixed-dim"><IconReceipt size={20} /></span>
          </div>
          <div className="flex items-baseline gap-2.5">
            <span className="font-financial-display text-financial-display tabular-nums text-on-surface dark:text-slate-100">{money(metrics.collected, data.settings.currency)}</span>
            <span className="rounded-full bg-secondary-container/50 px-1.5 py-0.5 font-label-caps text-[10px] text-on-secondary-container dark:bg-slate-700 dark:text-secondary-fixed-dim">{metrics.rate.toFixed(1)}% Rate</span>
          </div>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-surface-container-high dark:bg-slate-800">
            <div className="h-full rounded-full bg-secondary dark:bg-secondary-fixed-dim" style={{ width: `${Math.min(100, Math.max(0, metrics.rate))}%` }} />
          </div>
          <div className="-mx-5 -mb-5 mt-2.5 flex items-center justify-between bg-surface-container-low/50 px-5 py-2.5 dark:bg-slate-800/40">
            <span className="font-body-sm text-body-sm text-on-surface-variant dark:text-slate-400">Settled through Bank / UPI</span>
            <span className="font-label-ui text-label-ui font-semibold text-secondary dark:text-secondary-fixed-dim">{metrics.clearances} Clearances</span>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-xl bg-surface-container-lowest p-5 shadow-sm transition-all hover:shadow-md dark:bg-slate-900">
          <div className="mb-3 flex items-center justify-between">
            <span className="font-label-caps text-label-caps uppercase tracking-wider text-on-surface-variant dark:text-slate-400">Outstanding / Due</span>
            <span className="rounded-lg bg-error-container/60 p-2 text-error dark:bg-danger-500/15 dark:text-danger-300"><IconClock size={20} /></span>
          </div>
          <div className="flex items-baseline gap-2.5">
            <span className="font-financial-display text-financial-display tabular-nums text-on-surface dark:text-slate-100">{money(metrics.outstanding, data.settings.currency)}</span>
            <span className="rounded-full bg-error-container px-1.5 py-0.5 font-label-caps text-[10px] text-on-error-container dark:bg-danger-500/20 dark:text-danger-200">{metrics.overdue ? 'Action Required' : 'On Track'}</span>
          </div>
          <div className="-mx-5 -mb-5 mt-3 flex items-center justify-between bg-surface-container-low/50 px-5 py-2.5 dark:bg-slate-800/40">
            <span className="flex items-center gap-1.5 font-body-sm text-body-sm text-on-surface dark:text-slate-200"><span className="h-2 w-2 rounded-full bg-warning-500" /> {metrics.pending} Pending</span>
            <span className="flex items-center gap-1.5 font-body-sm text-body-sm font-medium text-error dark:text-danger-300"><span className="h-2 w-2 animate-pulse rounded-full bg-error dark:bg-danger-500" /> {metrics.overdue} Overdue</span>
          </div>
        </div>
      </div>

      {/* Filter & search command strip */}
      <div className="mb-4 flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3 overflow-x-auto pb-1">
          <div className="inline-flex min-w-max gap-1 rounded-xl bg-surface-container-low p-1 shadow-inner dark:bg-slate-800">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatus(tab.id)}
                aria-pressed={status === tab.id}
                className={`whitespace-nowrap rounded-lg px-3.5 py-1.5 font-label-ui text-label-ui transition-all ${
                  status === tab.id
                    ? 'bg-surface-container-lowest font-semibold text-on-surface shadow-sm dark:bg-slate-900 dark:text-slate-100'
                    : tab.id === 'overdue'
                      ? 'text-error hover:bg-error-container/30 dark:text-danger-300'
                      : 'text-on-surface-variant hover:text-on-surface dark:text-slate-400 dark:hover:text-slate-100'
                }`}
              >
                {tab.label} <span className={`ml-1 font-normal ${status === tab.id ? 'text-on-surface-variant dark:text-slate-400' : tab.id === 'overdue' ? '' : 'text-outline'}`}>{statusCounts[tab.id] || 0}</span>
              </button>
            ))}
          </div>
          <div className="hidden shrink-0 items-center gap-2 xl:flex">
            <button type="button" onClick={() => doExport('csv', rows)} title="Export ledger view as CSV" aria-label="Export ledger view as CSV" className="rounded-lg bg-surface-container-lowest p-2 text-on-surface-variant shadow-sm transition-colors hover:text-on-surface dark:bg-slate-900 dark:text-slate-400 dark:hover:text-slate-100"><IconTable size={18} /></button>
            <button type="button" onClick={() => window.print()} title="Print ledger" aria-label="Print ledger" className="rounded-lg bg-surface-container-lowest p-2 text-on-surface-variant shadow-sm transition-colors hover:text-on-surface dark:bg-slate-900 dark:text-slate-400 dark:hover:text-slate-100"><IconPrinter size={18} /></button>
          </div>
        </div>

        <div className="flex flex-col items-stretch justify-between gap-3 md:flex-row md:items-center">
          <div className="relative min-w-[280px] flex-1">
            <IconSearch size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-outline" />
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by invoice #, client name, GSTIN, amount..."
              aria-label="Search invoices"
              className="h-10 w-full rounded-xl bg-surface-container-lowest pl-10 pr-4 font-body-md text-body-md text-on-surface shadow-sm outline-none placeholder:text-outline focus:ring-2 focus:ring-primary/20 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>
          <div className="flex items-center gap-2.5 overflow-x-auto pb-1 md:pb-0">
            <FilterSelect icon={IconBuilding} label="Filter by client" value={clientFilter} onChange={(e) => setClientFilter(e.target.value)} options={clientOptions} className="min-w-[170px]" />
            <FilterSelect
              icon={IconCalendar}
              label="Filter by date range"
              value={dateRange}
              onChange={(e) => applyRange(e.target.value)}
              options={[
                { value: 'all', label: 'All Time' },
                { value: 'today', label: 'Today' },
                { value: '7d', label: 'Last 7 days' },
                { value: '30d', label: 'Last 30 days' },
                { value: 'custom', label: 'Custom Range' },
              ]}
              className="min-w-[140px]"
            />
            <FilterSelect
              icon={IconSortAsc}
              label="Sort invoices"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              options={[
                { value: 'date-desc', label: 'Date: Newest First' },
                { value: 'date-asc', label: 'Date: Oldest First' },
                { value: 'total-desc', label: 'Amount: High to Low' },
                { value: 'total-asc', label: 'Amount: Low to High' },
                { value: 'client', label: 'Client A–Z' },
              ]}
              className="min-w-[190px]"
            />
            <button type="button" onClick={resetFilters} title="Reset filters" aria-label="Reset filters" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-outline transition-colors hover:text-primary dark:hover:text-primary-fixed-dim"><IconFilter size={20} /></button>
          </div>
        </div>
        {dateRange === 'custom' ? (
          <div className="flex flex-wrap items-center gap-2 font-body-sm text-body-sm text-on-surface-variant dark:text-slate-400">
            <span>From</span>
            <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setDateRange('custom') }} aria-label="From date" className="h-9 rounded-lg bg-surface-container-lowest px-2.5 text-on-surface shadow-sm dark:bg-slate-900 dark:text-slate-100" />
            <span>To</span>
            <input type="date" value={to} onChange={(e) => { setTo(e.target.value); setDateRange('custom') }} aria-label="To date" className="h-9 rounded-lg bg-surface-container-lowest px-2.5 text-on-surface shadow-sm dark:bg-slate-900 dark:text-slate-100" />
          </div>
        ) : null}
      </div>

      {/* Contextual bulk selection banner */}
      {selected.size ? (
        <div className="mb-4 flex flex-col gap-3 rounded-xl bg-inverse-surface px-4 py-2.5 text-inverse-on-surface shadow-lg transition-all duration-300 sm:flex-row sm:items-center sm:justify-between dark:bg-slate-700">
          <div className="flex items-center gap-3">
            <span className="h-2.5 w-2.5 rounded-full bg-secondary-fixed" />
            <span className="font-label-ui text-label-ui font-semibold tracking-wide">{selected.size} invoices selected</span>
            <span className="hidden font-label-caps text-label-caps text-outline-variant sm:inline-block dark:text-slate-300">{money(selectedValue, data.settings.currency)} total value</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={duplicateSelected} className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1.5 font-label-ui text-body-sm text-inverse-on-surface hover:bg-white/20"><IconCopy size={16} /> <span className="hidden md:inline">Duplicate</span></button>
            <button type="button" onClick={() => doExport('csv')} className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1.5 font-label-ui text-body-sm text-inverse-on-surface hover:bg-white/20"><IconDownload size={16} /> <span className="hidden md:inline">CSV</span></button>
            <button type="button" onClick={() => doExport('xls')} className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1.5 font-label-ui text-body-sm text-inverse-on-surface hover:bg-white/20"><IconTable size={16} /> <span className="hidden md:inline">Excel</span></button>
            <button type="button" onClick={() => doExport('json')} className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1.5 font-label-ui text-body-sm text-inverse-on-surface hover:bg-white/20"><IconFileText size={16} /> <span className="hidden md:inline">JSON</span></button>
            <button type="button" onClick={() => setConfirmBulk(true)} className="inline-flex items-center gap-1 rounded-lg bg-error px-2.5 py-1.5 font-label-ui text-body-sm text-on-error hover:bg-error/90 dark:bg-danger-600 dark:text-white"><IconTrash size={16} /> <span className="hidden sm:inline">Delete</span></button>
            <button type="button" onClick={clearSelection} title="Deselect all" aria-label="Deselect all" className="ml-1 rounded-lg p-1 text-inverse-on-surface/80 hover:bg-white/10 hover:text-inverse-on-surface"><IconX size={18} /></button>
          </div>
        </div>
      ) : null}

      {/* Ledger table */}
      {rows.length === 0 ? (
        <div className="mb-6 flex flex-col items-center justify-center rounded-2xl border border-dashed border-outline-variant bg-surface-container-lowest/60 px-6 py-14 text-center dark:border-slate-700 dark:bg-slate-900/60">
          <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-container text-outline dark:bg-slate-800 dark:text-slate-400"><IconInvoice size={44} strokeWidth={1.4} /></span>
          <h2 className="font-headline-sm text-headline-sm text-on-surface dark:text-slate-100">No invoices match</h2>
          <p className="mt-1 max-w-sm font-body-sm text-body-sm text-on-surface-variant dark:text-slate-400">Try clearing filters, or create a fresh invoice.</p>
          <button type="button" onClick={resetFilters} className="mt-4 rounded-lg bg-primary-container px-4 py-2 font-label-ui text-label-ui text-on-primary hover:bg-primary dark:bg-primary dark:text-white">Reset filters</button>
        </div>
      ) : (
        <div className="mb-6 w-full overflow-hidden rounded-2xl bg-surface-container-lowest shadow-sm dark:bg-slate-900">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1120px] border-collapse text-left">
              <thead>
                <tr className="h-11 bg-surface-container-low font-label-caps text-label-caps uppercase tracking-wider text-on-surface-variant dark:bg-slate-800 dark:text-slate-300">
                  <th className="w-12 px-4 py-3 text-center"><input ref={masterRef} type="checkbox" onChange={toggleAll} aria-label="Select all invoices on this page" className="h-4 w-4 cursor-pointer rounded accent-primary" /></th>
                  <th className="px-4 py-3 font-semibold">Invoice Details</th>
                  <th className="px-4 py-3 font-semibold">Client &amp; GSTIN</th>
                  <th className="px-4 py-3 font-semibold">Dates &amp; Terms</th>
                  <th className="px-4 py-3 text-right font-semibold">Amount &amp; Tax</th>
                  <th className="px-4 py-3 text-center font-semibold">Payment Status</th>
                  <th className="px-4 py-3 pr-6 text-right font-semibold">Quick Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container-low font-body-md text-body-md text-on-surface dark:divide-slate-800 dark:text-slate-100">
                {pageRows.map(({ inv, totals, st }) => {
                  const TileIcon = tileIcon(st, inv.kind)
                  const isSelected = selected.has(inv.id)
                  const dueDays = inv.dueDate ? daysBetween(inv.dueDate, today) : null
                  const dueText = !inv.dueDate
                    ? 'No due date'
                    : dueDays < 0
                      ? `Due ${formatDate(inv.dueDate)} (${Math.abs(dueDays)}d overdue)`
                      : dueDays === 0
                        ? 'Due today'
                        : `Due ${formatDate(inv.dueDate)} (${dueDays}d left)`
                  const method = inv.payments?.length ? String(inv.payments[inv.payments.length - 1].method || '') : ''
                  const statusText = st === 'paid' && method ? `${statusLabel(st)} (${method.toUpperCase()})` : statusLabel(st)
                  return (
                    <tr
                      key={inv.id}
                      className={`group transition-colors hover:bg-surface-container-low/60 dark:hover:bg-slate-800/40 ${
                        isSelected ? 'bg-surface-container-low/30 dark:bg-slate-800/30' : st === 'overdue' ? 'bg-error-container/10 dark:bg-danger-500/5' : ''
                      }`}
                    >
                      <td className="px-4 py-4 text-center">
                        <input type="checkbox" checked={isSelected} onChange={() => toggle(inv.id)} aria-label={`Select ${inv.number || 'draft invoice'}`} className="h-4 w-4 cursor-pointer rounded accent-primary" />
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <span className={`flex h-10 w-8 shrink-0 flex-col items-center justify-center rounded text-[10px] font-bold shadow-sm ${TILE_STYLES[st] || TILE_STYLES.sent}`}>
                            <TileIcon size={14} />
                            <span>{st === 'draft' ? 'DFT' : 'PDF'}</span>
                          </span>
                          <span className="flex min-w-0 flex-col">
                            <button type="button" onClick={() => setDetailRow({ inv, totals, st })} className="truncate text-left font-headline-sm text-body-md font-bold text-primary hover:underline dark:text-primary-fixed-dim">{inv.number || 'Draft'}</button>
                            <span className="truncate font-body-sm text-body-sm text-on-surface-variant dark:text-slate-400">{inv.items?.[0]?.description || (inv.kind === 'quotation' ? 'Quotation' : 'Invoice details')}</span>
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="flex flex-col">
                          <span className="font-label-ui text-label-ui font-semibold text-on-surface dark:text-slate-100">{inv.client?.name || '—'}</span>
                          <span className="font-body-sm text-body-sm text-outline dark:text-slate-500">{inv.client?.gstin || 'GSTIN not set'}</span>
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="flex flex-col">
                          <span className="font-body-md text-body-md text-on-surface dark:text-slate-100">{formatDate(inv.issueDate)}</span>
                          <span className={`font-body-sm text-body-sm ${st === 'overdue' ? 'font-medium text-error dark:text-danger-300' : 'text-on-surface-variant dark:text-slate-400'}`}>
                            {dueText}{inv.dueDate && st !== 'overdue' ? ` · Net ${inv.paymentTerms ?? 15}` : ''}
                          </span>
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <span className={`flex flex-col items-end ${st === 'overdue' ? 'text-error dark:text-danger-300' : 'text-on-surface dark:text-slate-100'}`}>
                          <span className="font-financial-tabular text-financial-tabular tabular-nums">{money(totals.total, inv.currency)}</span>
                          <span className="font-body-sm text-body-sm text-outline dark:text-slate-500">
                            {totals.balance > 0.009 && st !== 'draft' ? `Bal: ${money(totals.balance, inv.currency)}` : `Tax ${money(totals.taxTotal, inv.currency)}`}
                          </span>
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-label-caps text-label-caps ${CHIP_STYLES[st] || CHIP_STYLES.sent}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${DOT_STYLES[st] || DOT_STYLES.sent}`} />
                          {statusText}
                        </span>
                      </td>
                      <td className="px-4 py-4 pr-6 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-90 transition-opacity group-hover:opacity-100">
                          {st === 'draft' ? (
                            <button type="button" onClick={() => navigate(`/builder/${inv.id}`)} title="Review and send draft" className="inline-flex items-center gap-1 rounded-lg bg-primary-container px-2.5 py-1 font-label-caps text-label-caps text-on-primary hover:bg-primary dark:bg-primary dark:text-white"><IconSend size={14} /> <span className="hidden 2xl:inline">Review</span></button>
                          ) : st === 'paid' ? (
                            <button type="button" onClick={() => setDetailRow({ inv, totals, st })} title="View details" className="inline-flex items-center gap-1 rounded-lg bg-surface-container px-2.5 py-1 font-label-caps text-label-caps text-primary hover:bg-primary-container dark:bg-slate-800 dark:text-primary-fixed-dim"><IconEye size={14} /> <span className="hidden 2xl:inline">View</span></button>
                          ) : (
                            <button type="button" onClick={() => sendReminder(inv, totals)} title="Send payment reminder" className="inline-flex items-center gap-1 rounded-lg bg-surface-container px-2.5 py-1 font-label-caps text-label-caps text-secondary hover:bg-secondary hover:text-on-secondary dark:bg-slate-800 dark:text-secondary-fixed-dim"><IconBell size={14} /> <span className="hidden 2xl:inline">Remind</span></button>
                          )}
                          <ActionIcon icon={IconEye} label="View details" onClick={() => setDetailRow({ inv, totals, st })} />
                          {st !== 'draft' && totals.balance > 0.009 ? (
                            <ActionIcon icon={IconWallet} label="Record payment" onClick={() => openPayment({ inv, totals, st })} tone="text-secondary dark:text-secondary-fixed-dim" />
                          ) : null}
                          <ActionIcon icon={IconDownload} label="Download PDF" onClick={() => downloadPdf(inv)} disabled={pdfBusy} />
                          <ActionIcon icon={IconShare} label="Share invoice" onClick={() => shareInvoice(inv)} />
                          <ActionIcon icon={IconPencil} label="Edit invoice" onClick={() => navigate(`/builder/${inv.id}`)} />
                          <ActionIcon icon={IconCopy} label="Duplicate invoice" onClick={() => duplicate(inv.id)} />
                          {inv.kind === 'quotation' ? <ActionIcon icon={IconRefresh} label="Convert quotation to invoice" onClick={() => convertToInvoice(inv.id)} /> : null}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="flex flex-col gap-4 border-t border-outline-variant bg-surface-container-low/40 px-6 py-3.5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-800/30">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-body-sm text-body-sm text-on-surface-variant dark:text-slate-400">
                Showing <span className="font-semibold text-on-surface dark:text-slate-100">{rows.length ? (page - 1) * perPage + 1 : 0}</span> to <span className="font-semibold text-on-surface dark:text-slate-100">{Math.min(page * perPage, rows.length)}</span> of <span className="font-semibold text-on-surface dark:text-slate-100">{rows.length}</span> invoices
              </span>
              <span className="hidden text-outline-variant sm:inline">•</span>
              <div className="flex items-center gap-2">
                <span className="font-body-sm text-body-sm text-on-surface-variant dark:text-slate-400">Show:</span>
                <select value={perPage} onChange={(e) => setPerPage(Number(e.target.value))} aria-label="Rows per page" className="rounded-lg bg-surface-container-lowest px-2.5 py-1 font-label-ui text-body-sm text-on-surface shadow-sm outline-none dark:bg-slate-900 dark:text-slate-100">
                  {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n} per page</option>)}
                </select>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => setPage(page - 1)} disabled={page === 1} aria-label="Previous page" className="rounded-lg bg-surface-container-lowest p-1.5 text-on-surface-variant shadow-sm transition-colors hover:bg-surface-container hover:text-on-surface disabled:opacity-40 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-700"><IconChevronLeft size={18} /></button>
              {pageList(page, totalPages).map((p, i) => typeof p === 'number' ? (
                <button
                  key={`${p}-${i}`}
                  type="button"
                  onClick={() => setPage(p)}
                  aria-current={p === page ? 'page' : undefined}
                  className={`flex h-8 w-8 items-center justify-center rounded-lg font-label-ui text-label-ui shadow-sm transition-colors ${
                    p === page
                      ? 'bg-primary-container font-semibold text-on-primary dark:bg-primary dark:text-white'
                      : 'bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container hover:text-on-surface dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-100'
                  }`}
                >{p}</button>
              ) : <span key={`gap-${i}`} className="px-1 font-label-ui text-outline">...</span>)}
              <button type="button" onClick={() => setPage(page + 1)} disabled={page === totalPages} aria-label="Next page" className="rounded-lg bg-surface-container-lowest p-1.5 text-on-surface-variant shadow-sm transition-colors hover:bg-surface-container hover:text-on-surface disabled:opacity-40 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-700"><IconChevronRight size={18} /></button>
            </div>
          </div>
        </div>
      )}

      {/* Automated reminders promo strip */}
      <div className="flex flex-col gap-6 rounded-2xl bg-surface-container-low/60 p-6 shadow-sm md:flex-row md:items-center md:justify-between dark:bg-slate-800/60">
        <div className="flex items-center gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-surface-container-lowest text-primary shadow-sm dark:bg-slate-900 dark:text-primary-fixed-dim"><IconBell size={28} /></span>
          <div className="flex flex-col">
            <h2 className="font-headline-sm text-headline-sm text-on-surface dark:text-slate-100">{data.settings.remindersEnabled ? 'Automated Payment Reminders are Active' : 'Automated Payment Reminders are Paused'}</h2>
            <p className="max-w-xl font-body-sm text-body-sm text-on-surface-variant dark:text-slate-400">
              Invix Smart Schedule nudges clients before due dates and every 48 hours for overdue invoices. {overdueRows.length} overdue invoice(s) need attention.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <button type="button" onClick={() => navigate('/settings')} className="rounded-lg bg-surface-container-lowest px-3.5 py-2 font-label-ui text-label-ui text-on-surface shadow-sm hover:bg-surface-container dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-700">Configure Rules</button>
          <button type="button" onClick={batchNudge} className="rounded-lg bg-secondary px-3.5 py-2 font-label-ui text-label-ui text-on-secondary shadow-sm hover:bg-secondary/90 dark:bg-secondary dark:text-on-secondary">Trigger Batch Nudge</button>
        </div>
      </div>

      {/* Invoice details */}
      <Modal open={!!detailRow} onClose={() => setDetailRow(null)} title={detailRow ? `Invoice ${detailRow.inv.number || ''}` : 'Invoice details'}>
        {detailRow ? (
          <div className="space-y-4 font-body-md text-body-md text-on-surface dark:text-slate-100">
            <div className="flex items-center justify-between gap-3">
              <Badge color={STATUS_COLORS[detailRow.st] || CHIP_STYLES[detailRow.st]}>{statusLabel(detailRow.st)}</Badge>
              <span className="font-financial-tabular text-financial-tabular tabular-nums">{money(detailRow.totals.total, detailRow.inv.currency)}</span>
            </div>
            <div className="grid grid-cols-2 gap-3 rounded-xl bg-surface-container-low p-3 dark:bg-slate-800">
              <div><div className="font-label-caps text-label-caps text-on-surface-variant dark:text-slate-400">Client</div><div className="font-semibold">{detailRow.inv.client?.name || '—'}</div></div>
              <div><div className="font-label-caps text-label-caps text-on-surface-variant dark:text-slate-400">GSTIN</div><div className="font-mono text-body-sm text-on-surface-variant dark:text-slate-300">{detailRow.inv.client?.gstin || '—'}</div></div>
              <div><div className="font-label-caps text-label-caps text-on-surface-variant dark:text-slate-400">Issued</div><div>{formatDate(detailRow.inv.issueDate)}</div></div>
              <div><div className="font-label-caps text-label-caps text-on-surface-variant dark:text-slate-400">Due</div><div>{formatDate(detailRow.inv.dueDate)}</div></div>
            </div>
            <div className="space-y-2">
              {(detailRow.totals.lines || []).map((line) => (
                <div key={line._id || line.id} className="flex items-start justify-between gap-3 border-b border-outline-variant pb-2 dark:border-slate-700">
                  <span className="min-w-0 flex-1 truncate">{line.description || 'Item'}</span>
                  <span className="shrink-0 tabular-nums">{money((Number(line.quantity) || 0) * (Number(line.rate) || 0), detailRow.inv.currency)}</span>
                </div>
              ))}
              <div className="flex justify-between text-on-surface-variant dark:text-slate-300"><span>Tax</span><span className="tabular-nums">{money(detailRow.totals.taxTotal, detailRow.inv.currency)}</span></div>
              <div className="flex justify-between text-on-surface-variant dark:text-slate-300"><span>Paid</span><span className="tabular-nums">{money(detailRow.totals.paid, detailRow.inv.currency)}</span></div>
              <div className="flex justify-between font-semibold"><span>Balance</span><span className="tabular-nums">{money(detailRow.totals.balance, detailRow.inv.currency)}</span></div>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              {detailRow.st !== 'draft' && detailRow.totals.balance > 0.009 ? (
                <button type="button" onClick={() => { setDetailRow(null); openPayment(detailRow) }} className="inline-flex items-center gap-1.5 rounded-lg bg-secondary px-3.5 py-2 font-label-ui text-label-ui font-semibold text-on-secondary hover:bg-secondary-container dark:bg-secondary dark:text-white"><IconWallet size={15} /> Record payment</button>
              ) : null}
              <button type="button" onClick={() => navigate(`/builder/${detailRow.inv.id}`)} className="rounded-lg bg-primary-container px-3.5 py-2 font-label-ui text-label-ui text-on-primary hover:bg-primary dark:bg-primary dark:text-white">Open in builder</button>
              <button type="button" onClick={() => downloadPdf(detailRow.inv)} disabled={pdfBusy} className="inline-flex items-center gap-1.5 rounded-lg bg-surface-container-lowest px-3.5 py-2 font-label-ui text-label-ui text-on-surface shadow-sm hover:bg-surface-container disabled:opacity-40 dark:bg-slate-800 dark:text-slate-100"><IconDownload size={16} /> Download PDF</button>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal open={!!paymentFor} onClose={() => setPaymentFor(null)} title={paymentFor ? `Record payment · ${paymentFor.inv.number || 'Invoice'}` : 'Record payment'}>
        {paymentFor ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-xl bg-surface-container-low px-4 py-3 dark:bg-slate-800/60">
              <span className="font-body-sm text-body-sm text-on-surface-variant dark:text-slate-400">Outstanding balance</span>
              <span className="font-financial-tabular text-financial-tabular text-on-surface dark:text-white">{money(paymentFor.totals.balance, paymentFor.inv.currency)}</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                label="Amount"
                type="number"
                min="0.01"
                step="0.01"
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
              />
              <Input
                label="Payment date"
                type="date"
                value={paymentForm.date}
                onChange={(e) => setPaymentForm({ ...paymentForm, date: e.target.value })}
              />
            </div>
            <Select
              label="Payment method"
              value={paymentForm.method}
              onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })}
              options={[
                { value: 'bank', label: 'Bank transfer' },
                { value: 'upi', label: 'UPI' },
                { value: 'cash', label: 'Cash' },
                { value: 'card', label: 'Card' },
              ]}
            />
            <Textarea
              label="Note (optional)"
              rows={2}
              placeholder="Reference number or payment details"
              value={paymentForm.note}
              onChange={(e) => setPaymentForm({ ...paymentForm, note: e.target.value })}
            />
            <div className="flex items-center justify-end gap-2 border-t border-surface-container pt-4 dark:border-slate-800">
              <button type="button" onClick={() => setPaymentFor(null)} className="rounded-lg bg-surface-container px-3.5 py-2 font-label-ui text-label-ui font-semibold text-on-surface hover:bg-surface-container-high dark:bg-slate-800 dark:text-slate-100">Cancel</button>
              <button type="button" onClick={savePayment} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 font-label-ui text-label-ui font-semibold text-on-primary hover:bg-primary-container dark:text-white"><IconWallet size={16} /> Record payment</button>
            </div>
          </div>
        ) : null}
      </Modal>

      <ConfirmModal
        open={confirmBulk}
        onClose={() => setConfirmBulk(false)}
        onConfirm={() => {
          const ids = [...selected]
          data.deleteInvoices(ids)
          toast(`${ids.length} invoices deleted`, 'success')
          setSelected(new Set())
        }}
        message={`This permanently deletes ${selected.size} invoice(s) from your workspace.`}
      />

      {/* Offscreen render root used by the real PDF exporter */}
      {pdfTarget ? (
        <div id="invix-export-root" aria-hidden="true" className="pointer-events-none fixed left-[-10000px] top-0 z-[-1] w-[794px]">
          <RenderInvoice invoice={pdfTarget} customTemplates={data.customTemplates} />
        </div>
      ) : null}
    </div>
  )
}
