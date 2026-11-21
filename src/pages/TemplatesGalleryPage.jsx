import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TEMPLATES, TemplateDoc, resolveTemplateDef } from '../templates/registry'
import { TEMPLATE_CATEGORIES } from '../templates/registry'
import { useData } from '../store/data'
import { useBuilder } from '../store/builder'
import { Badge, Button, Card, Input, Tabs } from '../components/ui'
import { computeTotals } from '../utils/calc'
import { uid } from '../utils/id'
import { toast } from '../store/ui'
import { defaultCustomization, resolveCustomization } from '../templates/schema'

const SCALE = 0.27

export default function TemplatesGalleryPage() {
  const data = useData()
  const navigate = useNavigate()
  const b = useBuilder()
  const [cat, setCat] = useState('All')
  const [q, setQ] = useState('')

  const sample = useMemo(() => makeSampleInvoice(data.settings), [data.settings])

  const allDefs = useMemo(() => {
    const builtin = TEMPLATES
    const custom = data.customTemplates.map((t) => ({ ...resolveTemplateDef(t.id, data.customTemplates), custom: t }))
    return [...builtin, ...custom]
  }, [data.customTemplates])

  const filtered = allDefs.filter(
    (d) => (cat === 'All' || d.category === cat) && `${d.name} ${d.description} ${d.category}`.toLowerCase().includes(q.toLowerCase())
  )

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4 lg:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">Template gallery</h1>
          <p className="text-sm text-slate-500">{allDefs.length} professional designs — click to preview & customize</p>
        </div>
        <Input placeholder="Search templates…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" aria-label="Search templates" />
      </header>

      <Tabs tabs={TEMPLATE_CATEGORIES.map((c) => ({ id: c, label: c }))} active={cat} onChange={setCat} className="w-fit" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((def) => (
          <TemplateCard
            key={def.id}
            def={def}
            sample={sample}
            onUse={() => {
              if (def.isCustom) {
                b.patch({ templateId: def.id, customization: def.customRef.customization || null })
              } else {
                b.patch({ templateId: def.id, customization: null })
              }
              b.save()
              toast(`${def.name} applied to your draft`, 'success')
              navigate(`/builder/${b.invoice?.id || ''}`)
            }}
            onPreview={() => navigate(`/templates/${def.id}`)}
          />
        ))}
      </div>
    </div>
  )
}

function TemplateCard({ def, sample, onUse, onPreview }) {
  return (
    <Card className="group overflow-hidden">
      <button onClick={onPreview} className="block w-full bg-slate-100 p-3 text-left dark:bg-slate-800/60" aria-label={`Preview ${def.name} template`}>
        <div className="h-56 overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-slate-200 dark:ring-slate-700">
          <div style={{ transform: `scale(${SCALE})`, transformOrigin: 'top left', width: 794 }}>
            <TemplateDoc def={def} invoice={sample} />
          </div>
        </div>
      </button>
      <div className="flex items-center justify-between gap-2 p-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-bold">{def.name}</h3>
          <p className="truncate text-xs text-slate-400">{def.description}</p>
        </div>
        <Badge>{def.isCustom ? 'My Templates' : def.category}</Badge>
      </div>
      <div className="flex gap-2 px-3 pb-3">
        <Button size="sm" className="flex-1" onClick={onUse}>Use template</Button>
        <Button size="sm" variant="secondary" onClick={onPreview}>Preview</Button>
      </div>
    </Card>
  )
}

export function makeSampleInvoice(settings) {
  return {
    id: 'sample',
    kind: 'invoice',
    number: 'INV-2026-041',
    currency: settings?.currency || 'INR',
    status: 'sent',
    issueDate: new Date().toISOString().slice(0, 10),
    dueDate: new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10),
    paymentTerms: 15,
    poNumber: 'PO-88231',
    taxScheme: 'gst',
    taxMode: 'exclusive',
    roundOff: true,
    showAmountInWords: true,
    showUPIQR: true,
    discount: { type: 'percent', value: 0 },
    shipping: 0,
    extraCharges: [],
    payments: [],
    business: {
      name: 'Acme Design Studio',
      address: '221 Anna Salai',
      city: 'Chennai',
      state: 'Tamil Nadu',
      stateCode: '33',
      pincode: '600002',
      country: 'India',
      taxId: '33AAECA1234C1ZV',
      email: 'billing@acmedesign.in',
      phone: '+91 98400 12345',
      website: 'acmedesign.in',
      bankDetails: { bankName: 'HDFC Bank', accountName: 'Acme Design Studio LLP', accountNumber: '50100234567890', ifsc: 'HDFC0000123', upiId: 'acme@hdfcbank' },
    },
    client: {
      name: 'Bright Retail Pvt Ltd',
      address: '48 MG Road',
      city: 'Bengaluru',
      state: 'Karnataka',
      stateCode: '29',
      pincode: '560001',
      email: 'accounts@brightretail.in',
      phone: '+91 98450 67890',
      gstin: '29AABCB5678D1Z2',
    },
    items: [
      { _id: 's1', description: 'Brand identity design', hsn: '998383', quantity: 1, unit: 'Job', rate: 35000, discountType: 'percent', discountValue: 0, taxRate: 18, taxName: 'GST' },
      { _id: 's2', description: 'Website development — 5 pages', hsn: '998314', quantity: 1, unit: 'Job', rate: 85000, discountType: 'percent', discountValue: 5, taxRate: 18, taxName: 'GST' },
      { _id: 's3', description: 'UI/UX consulting', hsn: '998313', quantity: 12, unit: 'Hrs', rate: 2500, discountType: 'percent', discountValue: 0, taxRate: 18, taxName: 'GST' },
    ],
    notes: 'Thank you for your business!',
    terms: 'Payment due within 15 days. Interest @18% p.a. on overdue amounts.',
    bankDetails: { bankName: 'HDFC Bank', accountName: 'Acme Design Studio LLP', accountNumber: '50100234567890', ifsc: 'HDFC0000123', upiId: 'acme@hdfcbank' },
    signature: { type: 'type', name: 'Priya Sharma', title: 'Director', data: '' },
    stamp: '',
  }
}
