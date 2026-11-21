import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { fetchSharedInvoice } from '../services/sharing'
import { Wordmark } from '../components/brand'
import { Button, Badge, EmptyState, Skeleton } from '../components/ui'
import { IconDownload, IconFileText, IconSearch } from '../components/icons'
import { TemplateDoc } from '../templates/registry'
import { getTemplate } from '../templates/registry'
import { resolveCustomization } from '../templates/schema'
import { computeTotals } from '../utils/calc'
import { formatMoney } from '../utils/currency'
import { formatDate } from '../utils/date'

/** Public read-only invoice page for share links */
export default function SharedInvoicePage() {
  const { shareId } = useParams()
  const [record, setRecord] = useState(undefined) // undefined = loading, null = not found
  const [pdfUrl, setPdfUrl] = useState('')

  useEffect(() => {
    let alive = true
    fetchSharedInvoice(shareId).then((data) => {
      if (!alive) return
      setRecord(data)
      if (data?.pdf_url) setPdfUrl(data.pdf_url)
      else if (data?.pdf_path) {
        import('../services/storage').then(({ getStorage }) => {
          getStorage().getPublicUrl(data.pdf_path).then((r) => alive && setPdfUrl(r?.data?.publicUrl || ''))
        })
      }
    })
    return () => {
      alive = false
    }
  }, [shareId])

  if (record === undefined) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 p-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-[600px] w-full" />
      </div>
    )
  }

  if (!record) {
    return (
      <div className="flex min-h-full items-center justify-center p-6">
        <EmptyState
          icon={IconSearch}
          title="Invoice not found"
          description="This share link is invalid or the invoice is no longer shared."
          action={<Link to="/"><Button>Go to Invix</Button></Link>}
        />
      </div>
    )
  }

  const data = record.data || {}
  const invoice = {
    id: record.invoice_id,
    number: record.number,
    currency: record.currency || 'INR',
    kind: data.kind || 'invoice',
    issueDate: data.issueDate,
    dueDate: data.dueDate,
    status: record.status,
    business: data.business || {},
    client: data.client || {},
    items: data.items || [],
    taxScheme: 'gst',
    taxMode: 'exclusive',
    discount: { type: 'percent', value: 0 },
    shipping: 0,
    extraCharges: [],
    payments: [],
    roundOff: true,
    bankDetails: {},
    showAmountInWords: false,
    showUPIQR: false,
    notes: '',
    terms: '',
    signature: { type: 'none' },
    stamp: '',
  }
  const totals = computeTotals(invoice)
  const def = getTemplate('modern')
  const cus = resolveCustomization(def.defaults, null)

  return (
    <div className="min-h-full bg-slate-100 pb-16 dark:bg-slate-950">
      <nav className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <Link to="/"><Wordmark size={26} /></Link>
          {pdfUrl ? <a href={pdfUrl} target="_blank" rel="noreferrer"><Button size="sm" variant="secondary"><IconDownload size={13} /> Download PDF</Button></a> : null}
        </div>
      </nav>
      <div className="mx-auto max-w-3xl p-4">
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl bg-white p-4 shadow-sm dark:bg-slate-900">
          <div className="flex-1">
            <h1 className="text-lg font-bold">{data.kind === 'quotation' ? 'Quotation' : 'Invoice'} {record.number}</h1>
            <p className="text-xs text-slate-400">{invoice.business?.name} → {invoice.client?.name} · issued {formatDate(invoice.issueDate)}</p>
          </div>
          <Badge color="bg-brand-100 text-brand-700">Total: {formatMoney(record.total ?? totals.total, record.currency)}</Badge>
        </div>
        <div className="mx-auto overflow-hidden rounded-xl bg-white shadow-lg" style={{ transform: 'scale(0.72)', transformOrigin: 'top left', width: 794 * 0.72, height: 1123 * 0.72 }}>
          <TemplateDoc def={def} invoice={invoice} customization={cus} />
        </div>
      </div>
    </div>
  )
}
