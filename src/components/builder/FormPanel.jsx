import React, { useState } from 'react'
import { useBuilder } from '../../store/builder'
import { useData } from '../../store/data'
import { Button, Input, Select, Textarea, Modal, Switch, Tabs, ImageUpload } from '../ui'
import LineItemsEditor from './LineItemsEditor'
import { CURRENCIES, formatMoney } from '../../utils/currency'
import { PAYMENT_TERMS, addDays } from '../../utils/date'
import { isEmail, isPhone, isGSTIN } from '../../utils/validate'
import { STATUSES } from '../../utils/calc'
import {
  IconReceipt, IconBuilding, IconPackage, IconPercent, IconBank,
  IconUsers, IconChevronRight, IconPlus, IconSave, IconX,
  IconCheck, IconWallet,
} from '../icons'

const TABS = [
  { id: 'meta', label: 'Invoice Info', icon: IconReceipt },
  { id: 'parties', label: 'Parties', icon: IconBuilding },
  { id: 'items', label: 'Items', icon: IconPackage, count: true },
  { id: 'taxes', label: 'Taxes', icon: IconPercent },
  { id: 'payment', label: 'Terms', icon: IconBank },
]

// Restyle the shared ui primitives inside the form without touching them.
const FIELD_SKIN = [
  '[&_input]:rounded-lg [&_input]:border [&_input]:border-surface-container-high [&_input]:bg-surface [&_input]:px-3 [&_input]:py-2 [&_input]:font-label-ui [&_input]:text-label-ui [&_input]:text-on-surface [&_input]:placeholder:text-outline [&_input]:focus:border-primary [&_input]:focus:ring-2 [&_input]:focus:ring-primary/20',
  'dark:[&_input]:border-slate-700 dark:[&_input]:bg-slate-800 dark:[&_input]:text-slate-100 dark:[&_input]:placeholder:text-slate-500',
  '[&_select]:rounded-lg [&_select]:border [&_select]:border-surface-container-high [&_select]:bg-surface [&_select]:font-label-ui [&_select]:text-label-ui [&_select]:text-on-surface [&_select]:focus:border-primary',
  'dark:[&_select]:border-slate-700 dark:[&_select]:bg-slate-800 dark:[&_select]:text-slate-100',
  '[&_textarea]:rounded-lg [&_textarea]:border [&_textarea]:border-surface-container-high [&_textarea]:bg-surface [&_textarea]:font-body-sm [&_textarea]:text-body-sm [&_textarea]:text-on-surface [&_textarea]:focus:border-primary',
  'dark:[&_textarea]:border-slate-700 dark:[&_textarea]:bg-slate-800 dark:[&_textarea]:text-slate-100',
  '[&_label>span.mb-1]:font-label-caps [&_label>span.mb-1]:text-label-caps [&_label>span.mb-1]:uppercase [&_label>span.mb-1]:tracking-wider [&_label>span.mb-1]:text-on-surface-variant dark:[&_label>span.mb-1]:text-slate-400',
].join(' ')

export default function FormPanel() {
  const [tab, setTab] = useState('meta')
  const itemCount = useBuilder((s) => s.invoice?.items?.length || 0)

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* underlined section tabs */}
      <div
        className="no-scrollbar sticky top-0 z-10 flex shrink-0 items-center gap-1 overflow-x-auto bg-surface-container px-2 pt-2 dark:bg-slate-800"
        role="tablist"
        aria-label="Invoice sections"
      >
        {TABS.map((t) => {
          const active = tab === t.id
          const TIcon = t.icon
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.id)}
              className={`flex shrink-0 items-center gap-1.5 rounded-t-lg border-b-2 px-3 py-2 font-label-ui text-label-ui transition-colors ${
                active
                  ? 'border-primary bg-surface-container-lowest font-semibold text-primary dark:border-primary-fixed-dim dark:bg-slate-900 dark:text-primary-fixed-dim'
                  : 'border-transparent text-on-surface-variant hover:text-on-surface dark:text-slate-400 dark:hover:text-slate-100'
              }`}
            >
              <TIcon size={15} />
              <span>{t.label}{t.count ? ` (${itemCount})` : ''}</span>
            </button>
          )
        })}
      </div>

      <div className={`no-scrollbar min-h-0 flex-1 overflow-y-auto bg-surface-container-lowest p-4 pb-10 dark:bg-slate-900 ${FIELD_SKIN}`}>
        {tab === 'meta' ? <MetaTab onGoParties={() => setTab('parties')} onGoItems={() => setTab('items')} /> : null}
        {tab === 'parties' ? <PartiesTab /> : null}
        {tab === 'items' ? <LineItemsEditor /> : null}
        {tab === 'taxes' ? <TaxesTab /> : null}
        {tab === 'payment' ? <PaymentTab /> : null}
      </div>
    </div>
  )
}

/* ---------------- small shared shells ---------------- */

function Group({ title, icon: Icon, action, children }) {
  return (
    <section className="rounded-xl bg-surface p-3 shadow-xs ring-1 ring-surface-container dark:bg-slate-800/60 dark:ring-slate-700/60">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h4 className="flex items-center gap-2 font-label-caps text-label-caps uppercase tracking-wider text-on-surface-variant dark:text-slate-400">
          {Icon ? <Icon size={14} className="text-primary dark:text-primary-fixed-dim" /> : null}
          {title}
        </h4>
        {action}
      </div>
      {children}
    </section>
  )
}

function TextAction({ onClick, children, icon: Icon }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 font-label-caps text-label-caps uppercase tracking-wider text-secondary transition-colors hover:bg-secondary-container/40 dark:text-secondary-fixed-dim dark:hover:bg-slate-700"
    >
      {Icon ? <Icon size={13} /> : null}
      {children}
    </button>
  )
}

function PartySummary({ label, name, detail, tone = 'neutral' }) {
  return (
    <div className="rounded-lg bg-surface-container-low p-3 dark:bg-slate-800">
      <div className="flex items-center justify-between gap-2">
        <span
          className={`rounded px-1.5 py-0.5 font-label-caps text-[9px] font-bold uppercase tracking-wider ${
            tone === 'client'
              ? 'bg-secondary-container text-on-secondary-container dark:bg-secondary/20 dark:text-secondary-fixed'
              : 'bg-surface-container-high text-on-surface-variant dark:bg-slate-700 dark:text-slate-200'
          }`}
        >
          {label}
        </span>
      </div>
      <div className="mt-2 font-headline-sm text-[13px] font-semibold text-on-surface dark:text-slate-100">{name}</div>
      <div className="mt-0.5 truncate font-body-sm text-[11px] text-on-surface-variant dark:text-slate-400">{detail || '—'}</div>
    </div>
  )
}

/* ---------------- invoice meta ---------------- */

function MetaTab({ onGoParties, onGoItems }) {
  const invoice = useBuilder((s) => s.invoice)
  const patch = useBuilder((s) => s.patch)
  const b = useBuilder()
  const settings = useData((s) => s.settings)
  const updateSettings = useData((s) => s.updateSettings)
  if (!invoice) return null

  return (
    <div className="space-y-3">
      <Group title="Document" icon={IconReceipt}>
        <div className="grid grid-cols-2 gap-2">
          <Select
            label="Document type"
            options={[
              { value: 'invoice', label: 'Invoice' },
              { value: 'quotation', label: 'Quotation / Proforma' },
            ]}
            value={invoice.kind}
            onChange={(e) => patch({ kind: e.target.value })}
          />
          <Select
            label="Status"
            options={STATUSES.map((s) => ({ value: s, label: s[0].toUpperCase() + s.slice(1) }))}
            value={invoice.status}
            onChange={(e) => patch({ status: e.target.value })}
          />
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Input label="Invoice number" value={invoice.number} onChange={(e) => patch({ number: e.target.value })} hint="Auto-increments via numbering pattern in Settings" />
          <Select
            label="Currency"
            options={CURRENCIES.map((c) => ({ value: c.code, label: `${c.code} · ${c.name}` }))}
            value={invoice.currency}
            onChange={(e) => patch({ currency: e.target.value })}
          />
        </div>
      </Group>

      <Group title="Schedule" icon={IconBank}>
        <div className="grid grid-cols-2 gap-2">
          <Input
            label="Issue date"
            type="date"
            value={invoice.issueDate}
            onChange={(e) => patch({ issueDate: e.target.value, dueDate: addDays(e.target.value, Number(invoice.paymentTerms) || 0) })}
          />
          <Select
            label="Payment terms"
            options={PAYMENT_TERMS.map((t) => ({ value: t.days, label: t.label }))}
            value={Number(invoice.paymentTerms ?? 0)}
            onChange={(e) => patch({ paymentTerms: Number(e.target.value), dueDate: addDays(invoice.issueDate, Number(e.target.value)) })}
          />
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Input label="Due date" type="date" value={invoice.dueDate} onChange={(e) => patch({ dueDate: e.target.value })} />
          <Input label="PO number" value={invoice.poNumber} onChange={(e) => patch({ poNumber: e.target.value })} />
        </div>
      </Group>

      <Group
        title="Billing parties"
        icon={IconUsers}
        action={<TextAction icon={IconChevronRight} onClick={onGoParties}>Manage</TextAction>}
      >
        <div className="grid gap-2">
          <PartySummary
            label="Issuer / From"
            name={invoice.business?.name || 'Add business'}
            detail={[invoice.business?.taxId, invoice.business?.city].filter(Boolean).join(' · ')}
          />
          <PartySummary
            label="Client / Billed To"
            tone="client"
            name={invoice.client?.name || 'Add client'}
            detail={[invoice.client?.gstin, invoice.client?.city].filter(Boolean).join(' · ')}
          />
        </div>
      </Group>

      <Group
        title={`Line items (${invoice.items.length})`}
        icon={IconPackage}
        action={<TextAction icon={IconChevronRight} onClick={onGoItems}>Edit</TextAction>}
      >
        <div className="space-y-1.5">
          {invoice.items.slice(0, 3).map((it) => (
            <div key={it._id} className="flex items-center justify-between gap-2 rounded-lg bg-surface-container-low px-2.5 py-2 dark:bg-slate-800">
              <div className="min-w-0">
                <p className="truncate font-label-ui text-label-ui font-semibold text-on-surface dark:text-slate-100">
                  {it.description || 'Untitled item'}
                </p>
                <p className="truncate font-body-sm text-[11px] text-on-surface-variant dark:text-slate-400">
                  {[
                    it.hsn ? `HSN ${it.hsn}` : null,
                    `${it.quantity || 0} ${it.unit || ''}`.trim(),
                    it.taxRate ? `${it.taxRate}% tax` : null,
                  ].filter(Boolean).join(' · ') || 'No details'}
                </p>
              </div>
              <span className="shrink-0 font-financial-tabular text-financial-tabular text-on-surface dark:text-slate-100">
                {formatMoney(Number(it.quantity || 0) * Number(it.rate || 0), invoice.currency)}
              </span>
            </div>
          ))}
          {invoice.items.length > 3 ? (
            <p className="px-1 font-body-sm text-[11px] text-on-surface-variant dark:text-slate-400">
              + {invoice.items.length - 3} more items
            </p>
          ) : null}
        </div>
        <div className="mt-3 flex items-center justify-between gap-2">
          <TextAction icon={IconPackage} onClick={onGoItems}>Catalog</TextAction>
          <button
            type="button"
            onClick={() => { b.addItem(); onGoItems() }}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-surface-container px-3 py-2 font-label-ui text-label-ui font-semibold text-primary transition-colors hover:bg-primary-container hover:text-on-primary dark:bg-slate-700 dark:text-primary-fixed-dim dark:hover:bg-primary dark:hover:text-white"
          >
            <IconPlus size={15} /> Add line item
          </button>
        </div>
      </Group>

      <Group title="Numbering & recurrence" icon={IconReceipt}>
        <div className="flex items-center justify-between rounded-lg bg-surface-container-low px-3 py-2.5 dark:bg-slate-800">
          <div>
            <div className="font-label-ui text-label-ui font-semibold text-on-surface dark:text-slate-100">Recurring</div>
            <div className="font-body-sm text-[11px] text-on-surface-variant dark:text-slate-400">Auto-create the next invoice in Reports</div>
          </div>
          <Select
            options={[
              { value: 'none', label: 'Off' },
              { value: 'weekly', label: 'Weekly' },
              { value: 'monthly', label: 'Monthly' },
              { value: 'yearly', label: 'Yearly' },
            ]}
            value={invoice.recurring || 'none'}
            onChange={(e) => patch({ recurring: e.target.value })}
            className="w-28"
            aria-label="Recurring frequency"
          />
        </div>
        <div className="mt-3">
          <Input
            label="Numbering pattern"
            value={settings.numberPattern}
            onChange={(e) => updateSettings({ numberPattern: e.target.value })}
            placeholder="INV-{NNNN}"
            hint="Placeholders: {YYYY} {YY} {MM} {DD} {NNN} — e.g. ACME/{YY}/{NNNN}"
          />
        </div>
      </Group>
    </div>
  )
}

/* ---------------- business & client ---------------- */

function PartiesTab() {
  const invoice = useBuilder((s) => s.invoice)
  const b = useBuilder()
  const saveClient = useData((s) => s.saveClient)
  const [clientModal, setClientModal] = useState(false)
  const [clientErr, setClientErr] = useState({})
  if (!invoice) return null

  const validateClient = (c) => {
    const errs = {}
    if (!c.name?.trim()) errs.name = 'Client name is required'
    if (c.email && !isEmail(c.email)) errs.email = 'Invalid email'
    if (c.phone && !isPhone(c.phone)) errs.phone = 'Invalid phone'
    if (c.gstin && !isGSTIN(c.gstin)) errs.gstin = 'Invalid GSTIN'
    setClientErr(errs)
    return Object.keys(errs).length === 0
  }

  return (
    <div className="space-y-3">
      <BusinessSection />

      <Group
        title="Client"
        icon={IconUsers}
        action={
          <Button size="sm" variant="secondary" onClick={() => setClientModal(true)}>
            <IconUsers size={13} /> Address book
          </Button>
        }
      >
        <Input label="Name" value={invoice.client?.name || ''} onChange={(e) => b.patchClient({ name: e.target.value })} error={clientErr.name} />
        <Textarea label="Address" rows={2} value={invoice.client?.address || ''} onChange={(e) => b.patchClient({ address: e.target.value })} className="mt-2" />
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Input label="City" value={invoice.client?.city || ''} onChange={(e) => b.patchClient({ city: e.target.value })} />
          <Input label="State" value={invoice.client?.state || ''} onChange={(e) => b.patchClient({ state: e.target.value })} />
          <Input label="State code" maxLength={2} value={invoice.client?.stateCode || ''} onChange={(e) => b.patchClient({ stateCode: e.target.value.replace(/\D/g, '') })} hint="For GST supply state" />
          <Input label="PIN code" maxLength={6} value={invoice.client?.pincode || ''} onChange={(e) => b.patchClient({ pincode: e.target.value.replace(/\D/g, '') })} />
          <Input label="Email" type="email" value={invoice.client?.email || ''} onChange={(e) => b.patchClient({ email: e.target.value })} error={clientErr.email} />
          <Input label="Phone" value={invoice.client?.phone || ''} onChange={(e) => b.patchClient({ phone: e.target.value })} error={clientErr.phone} />
          <Input label="GSTIN" value={invoice.client?.gstin || ''} onChange={(e) => b.patchClient({ gstin: e.target.value.toUpperCase() })} className="col-span-2" error={clientErr.gstin} />
        </div>
        <div className="mt-3 flex gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              const c = { ...invoice.client }
              if (!validateClient(c)) return
              saveClient({ ...c, id: c.id || undefined })
              b.patchClient({ id: c.id })
            }}
          >
            <IconSave size={13} /> Save to address book
          </Button>
        </div>
        {Object.keys(clientErr).length ? (
          <p className="mt-2 font-body-sm text-[11px] text-error dark:text-error-container">Fix the highlighted fields to save.</p>
        ) : null}
      </Group>

      <ClientPicker open={clientModal} onClose={() => setClientModal(false)} />
    </div>
  )
}

function BusinessSection() {
  const invoice = useBuilder((s) => s.invoice)
  const b = useBuilder()
  const businesses = useData((s) => s.businesses)
  const activeId = useData((s) => s.activeBusinessId)
  const setActive = useData((s) => s.setActiveBusiness)
  if (!invoice) return null

  return (
    <Group
      title="Your business"
      icon={IconBuilding}
      action={
        businesses.length > 1 ? (
          <select
            value={activeId}
            onChange={(e) => setActive(e.target.value)}
            className="max-w-[150px] rounded-lg border border-surface-container-high bg-surface px-2 py-1 font-label-ui text-label-ui text-on-surface focus:border-primary dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            aria-label="Switch business profile"
          >
            {businesses.map((biz) => (
              <option key={biz.id} value={biz.id}>{biz.name}</option>
            ))}
          </select>
        ) : null
      }
    >
      <ImageUpload label="Logo" value={invoice.business?.logo || ''} onChange={(v) => b.patchBusiness({ logo: v })} hint="PNG/SVG up to 2 MB" />
      <div className="mt-2 space-y-2">
        <Input label="Business name" value={invoice.business?.name || ''} onChange={(e) => b.patchBusiness({ name: e.target.value })} />
        <Textarea label="Address" rows={2} value={invoice.business?.address || ''} onChange={(e) => b.patchBusiness({ address: e.target.value })} />
        <div className="grid grid-cols-2 gap-2">
          <Input label="City" value={invoice.business?.city || ''} onChange={(e) => b.patchBusiness({ city: e.target.value })} />
          <Input label="State" value={invoice.business?.state || ''} onChange={(e) => b.patchBusiness({ state: e.target.value })} />
          <Input label="State code" maxLength={2} value={invoice.business?.stateCode || ''} onChange={(e) => b.patchBusiness({ stateCode: e.target.value.replace(/\D/g, '') })} />
          <Input label="PIN code" maxLength={6} value={invoice.business?.pincode || ''} onChange={(e) => b.patchBusiness({ pincode: e.target.value.replace(/\D/g, '') })} />
          <Input label="Tax ID / GSTIN" value={invoice.business?.taxId || ''} onChange={(e) => b.patchBusiness({ taxId: e.target.value.toUpperCase() })} />
          <Input label="Email" type="email" value={invoice.business?.email || ''} onChange={(e) => b.patchBusiness({ email: e.target.value })} />
          <Input label="Phone" value={invoice.business?.phone || ''} onChange={(e) => b.patchBusiness({ phone: e.target.value })} />
          <Input label="Website" value={invoice.business?.website || ''} onChange={(e) => b.patchBusiness({ website: e.target.value })} />
        </div>
      </div>
    </Group>
  )
}

function ClientPicker({ open, onClose }) {
  const clients = useData((s) => s.clients)
  const b = useBuilder()
  const [q, setQ] = useState('')
  const filtered = clients.filter((c) => (c.name + c.email + c.city).toLowerCase().includes(q.toLowerCase()))
  return (
    <Modal open={open} onClose={onClose} title="Saved clients">
      <Input placeholder="Search clients…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search clients" className="mb-3" />
      {filtered.length === 0 ? (
        <p className="py-6 text-center font-body-sm text-body-sm text-on-surface-variant dark:text-slate-400">
          No saved clients yet — fill the client form and hit “Save to address book”.
        </p>
      ) : (
        <div className="no-scrollbar max-h-80 space-y-1.5 overflow-y-auto">
          {filtered.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                b.patch({ client: { ...JSON.parse(JSON.stringify(c)), id: c.id }, clientId: c.id })
                onClose()
              }}
              className="flex w-full items-center justify-between gap-2 rounded-xl border border-surface-container p-2.5 text-left transition-colors hover:border-primary dark:border-slate-700"
            >
              <span className="min-w-0">
                <span className="block truncate font-label-ui text-label-ui font-semibold text-on-surface dark:text-slate-100">{c.name}</span>
                <span className="block truncate font-body-sm text-[11px] text-on-surface-variant dark:text-slate-400">{[c.city, c.email].filter(Boolean).join(' · ')}</span>
              </span>
              {c.gstin ? <span className="shrink-0 font-financial-tabular text-[10px] text-on-surface-variant dark:text-slate-400">{c.gstin}</span> : null}
            </button>
          ))}
        </div>
      )}
    </Modal>
  )
}

/* ---------------- taxes & charges ---------------- */

function TaxesTab() {
  const invoice = useBuilder((s) => s.invoice)
  const patch = useBuilder((s) => s.patch)
  if (!invoice) return null
  const charges = invoice.extraCharges || []

  return (
    <div className="space-y-3">
      <Group title="Tax scheme" icon={IconPercent}>
        <div className="grid grid-cols-2 gap-2">
          <Select
            label="Scheme"
            options={[
              { value: 'gst', label: 'GST (CGST/SGST/IGST)' },
              { value: 'vat', label: 'VAT' },
              { value: 'custom', label: 'Custom taxes' },
              { value: 'none', label: 'No tax' },
            ]}
            value={invoice.taxScheme}
            onChange={(e) => patch({ taxScheme: e.target.value })}
          />
          <Select
            label="Tax mode"
            options={[
              { value: 'exclusive', label: 'Exclusive of total' },
              { value: 'inclusive', label: 'Inclusive in rate' },
            ]}
            value={invoice.taxMode}
            onChange={(e) => patch({ taxMode: e.target.value })}
          />
        </div>
        <p className="mt-2 font-body-sm text-[11px] text-on-surface-variant dark:text-slate-400">
          Set a tax rate per line item. GST splits into CGST+SGST when client and business state codes match, otherwise IGST.
        </p>
      </Group>

      <Group
        title="Shipping & extra charges"
        icon={IconPlus}
        action={
          <Button size="sm" variant="secondary" onClick={() => patch({ extraCharges: [...charges, { id: `ch${Date.now()}`, label: 'Handling', amount: 0 }] })}>
            <IconPlus size={13} /> Charge
          </Button>
        }
      >
        <Input label="Shipping" type="number" min="0" step="any" value={invoice.shipping || ''} onChange={(e) => patch({ shipping: e.target.value })} />
        {charges.map((c) => (
          <div key={c.id} className="mt-2 flex gap-2">
            <Input placeholder="Charge label" value={c.label} onChange={(e) => patch({ extraCharges: charges.map((x) => (x.id === c.id ? { ...x, label: e.target.value } : x)) })} className="flex-1" aria-label="Charge label" />
            <Input type="number" min="0" step="any" placeholder="Amount" value={c.amount} onChange={(e) => patch({ extraCharges: charges.map((x) => (x.id === c.id ? { ...x, amount: e.target.value } : x)) })} className="w-28" aria-label="Charge amount" />
            <Button variant="dangerGhost" size="sm" onClick={() => patch({ extraCharges: charges.filter((x) => x.id !== c.id) })} aria-label="Remove charge"><IconX size={13} /></Button>
          </div>
        ))}
      </Group>

      <div className="flex items-center justify-between rounded-xl bg-surface px-3 py-3 shadow-xs ring-1 ring-surface-container dark:bg-slate-800/60 dark:ring-slate-700/60">
        <div>
          <div className="font-label-ui text-label-ui font-semibold text-on-surface dark:text-slate-100">Round off total</div>
          <div className="font-body-sm text-[11px] text-on-surface-variant dark:text-slate-400">Nearest whole unit</div>
        </div>
        <Switch checked={invoice.roundOff !== false} onChange={(v) => patch({ roundOff: v })} label="Round off total" />
      </div>
    </div>
  )
}

/* ---------------- payment, notes, signature ---------------- */

function PaymentTab() {
  const invoice = useBuilder((s) => s.invoice)
  const b = useBuilder()
  const [sigOpen, setSigOpen] = useState(false)
  if (!invoice) return null

  return (
    <div className="space-y-3">
      <Group title="Bank details & UPI" icon={IconBank}>
        <Input label="Bank name" value={invoice.bankDetails?.bankName || ''} onChange={(e) => b.patch({ bankDetails: { ...invoice.bankDetails, bankName: e.target.value } })} />
        <Input label="Account name" value={invoice.bankDetails?.accountName || ''} onChange={(e) => b.patch({ bankDetails: { ...invoice.bankDetails, accountName: e.target.value } })} className="mt-2" />
        <Input label="Account number" value={invoice.bankDetails?.accountNumber || ''} onChange={(e) => b.patch({ bankDetails: { ...invoice.bankDetails, accountNumber: e.target.value } })} className="mt-2" />
        <Input label="IFSC" value={invoice.bankDetails?.ifsc || ''} onChange={(e) => b.patch({ bankDetails: { ...invoice.bankDetails, ifsc: e.target.value.toUpperCase() } })} className="mt-2" />
        <Input label="UPI ID" value={invoice.bankDetails?.upiId || ''} onChange={(e) => b.patch({ bankDetails: { ...invoice.bankDetails, upiId: e.target.value } })} className="mt-2" hint="Generates the UPI QR code on the invoice" />
        <div className="mt-3 flex items-center justify-between rounded-lg bg-surface-container-low px-3 py-2 dark:bg-slate-800">
          <span className="font-label-ui text-label-ui font-semibold text-on-surface dark:text-slate-100">Show UPI QR on invoice</span>
          <Switch checked={invoice.showUPIQR !== false} onChange={(v) => b.patch({ showUPIQR: v })} label="Show UPI QR" />
        </div>
      </Group>

      <Group title="Notes & terms" icon={IconReceipt}>
        <Textarea label="Notes" rows={3} value={invoice.notes || ''} onChange={(e) => b.patch({ notes: e.target.value })} />
        <Textarea label="Terms & conditions" rows={4} value={invoice.terms || ''} onChange={(e) => b.patch({ terms: e.target.value })} className="mt-2" />
      </Group>

      <Group
        title="Signature & stamp"
        icon={IconCheck}
        action={<Button size="sm" variant="secondary" onClick={() => setSigOpen(true)}>Add signature</Button>}
      >
        <div className="flex items-center justify-between font-body-sm text-body-sm text-on-surface-variant dark:text-slate-400">
          <span>Signature: <b className="text-on-surface dark:text-slate-100">{invoice.signature?.type === 'none' ? 'None' : invoice.signature?.type}</b></span>
        </div>
        <ImageUpload label="Company stamp" value={invoice.stamp || ''} onChange={(v) => b.patch({ stamp: v })} className="mt-3" />
      </Group>

      <Group
        title={`Payments (${(invoice.payments || []).length})`}
        icon={IconWallet}
        action={<Button size="sm" variant="secondary" onClick={() => b.addPayment()}><IconPlus size={13} /> Record payment</Button>}
      >
        {(invoice.payments || []).map((p, i) => (
          <div key={p.id} className="mt-2 flex items-end gap-1.5">
            <Input type="date" value={p.date} onChange={(e) => b.patch({ payments: invoice.payments.map((x) => (x.id === p.id ? { ...x, date: e.target.value } : x)) })} className="w-36" aria-label={`Payment ${i + 1} date`} />
            <Input type="number" min="0" step="any" placeholder="Amount" value={p.amount} onChange={(e) => b.patch({ payments: invoice.payments.map((x) => (x.id === p.id ? { ...x, amount: e.target.value } : x)) })} className="w-28" aria-label={`Payment ${i + 1} amount`} />
            <Select
              options={[{ value: 'bank', label: 'Bank' }, { value: 'cash', label: 'Cash' }, { value: 'upi', label: 'UPI' }, { value: 'card', label: 'Card' }]}
              value={p.method}
              onChange={(e) => b.patch({ payments: invoice.payments.map((x) => (x.id === p.id ? { ...x, method: e.target.value } : x)) })}
              className="w-24"
              aria-label={`Payment ${i + 1} method`}
            />
            <Button variant="dangerGhost" size="sm" onClick={() => b.removePayment(p.id)} aria-label="Remove payment"><IconX size={13} /></Button>
          </div>
        ))}
        {!(invoice.payments || []).length ? (
          <p className="font-body-sm text-[11px] text-on-surface-variant dark:text-slate-400">No payments recorded yet.</p>
        ) : null}
      </Group>

      <SignaturePad open={sigOpen} onClose={() => setSigOpen(false)} />
    </div>
  )
}

/* ---------------- signature pad modal ---------------- */

function SignaturePad({ open, onClose }) {
  const invoice = useBuilder((s) => s.invoice)
  const b = useBuilder()
  const [mode, setMode] = useState('draw')
  const [typed, setTyped] = useState('')
  return (
    <Modal open={open} onClose={onClose} title="Digital signature">
      <Tabs
        tabs={[{ id: 'draw', label: 'Draw' }, { id: 'upload', label: 'Upload' }, { id: 'type', label: 'Type' }]}
        active={mode}
        onChange={setMode}
        className="mb-3"
      />
      {mode === 'draw' ? <DrawPad onSave={(data) => { b.patch({ signature: { type: 'draw', data, name: invoice.signature?.name || '', title: invoice.signature?.title || '' } }); onClose() }} /> : null}
      {mode === 'upload' ? (
        <div>
          <ImageUpload label="Signature image" value={invoice.signature?.type === 'upload' ? invoice.signature.data : ''} onChange={(data) => b.patch({ signature: { type: 'upload', data, name: invoice.signature?.name || '', title: invoice.signature?.title || '' } })} />
        </div>
      ) : null}
      {mode === 'type' ? (
        <div className="space-y-2">
          <Input label="Full name" value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="e.g. Priya Sharma" />
          <Button onClick={() => { b.patch({ signature: { type: 'type', name: typed, data: '', title: invoice.signature?.title || '' } }); onClose() }}>Apply</Button>
        </div>
      ) : null}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Input label="Signatory name" value={invoice.signature?.name || ''} onChange={(e) => b.patch({ signature: { ...(invoice.signature || {}), name: e.target.value } })} />
        <Input label="Title" value={invoice.signature?.title || ''} placeholder="Director" onChange={(e) => b.patch({ signature: { ...(invoice.signature || {}), title: e.target.value } })} />
      </div>
      {invoice.signature?.type !== 'none' ? (
        <Button variant="ghost" size="sm" className="mt-3" onClick={() => { b.patch({ signature: { type: 'none', data: '', name: '', title: '' } }); onClose() }}>Remove signature</Button>
      ) : null}
    </Modal>
  )
}

function DrawPad({ onSave }) {
  const ref = React.useRef(null)
  const drawing = React.useRef(false)

  const pos = (e) => {
    const rect = ref.current.getBoundingClientRect()
    const t = e.touches ? e.touches[0] : e
    return { x: ((t.clientX - rect.left) / rect.width) * ref.current.width, y: ((t.clientY - rect.top) / rect.height) * ref.current.height }
  }
  const start = (e) => {
    drawing.current = true
    const ctx = ref.current.getContext('2d')
    const { x, y } = pos(e)
    ctx.beginPath()
    ctx.moveTo(x, y)
    e.preventDefault()
  }
  const move = (e) => {
    if (!drawing.current) return
    const ctx = ref.current.getContext('2d')
    const { x, y } = pos(e)
    ctx.lineWidth = 2.2
    ctx.lineCap = 'round'
    ctx.strokeStyle = '#3525cd'
    ctx.lineTo(x, y)
    ctx.stroke()
    e.preventDefault()
  }
  const end = () => (drawing.current = false)

  return (
    <div>
      <canvas
        ref={ref}
        width={520}
        height={160}
        className="w-full cursor-crosshair rounded-xl border-2 border-dashed border-outline-variant bg-surface touch-none dark:border-slate-600 dark:bg-slate-800"
        onMouseDown={start}
        onMouseMove={move}
        onMouseUp={end}
        onMouseLeave={end}
        onTouchStart={start}
        onTouchMove={move}
        onTouchEnd={end}
        aria-label="Signature drawing pad"
      />
      <div className="mt-2 flex justify-end gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            const ctx = ref.current.getContext('2d')
            ctx.clearRect(0, 0, ref.current.width, ref.current.height)
          }}
        >
          Clear
        </Button>
        <Button size="sm" onClick={() => onSave(ref.current.toDataURL('image/png'))}>Use signature</Button>
      </div>
    </div>
  )
}
