import { uid } from './id'

export const LINE_UNITS = ['Nos', 'Pcs', 'Hrs', 'Days', 'Kg', 'Ltr', 'Mtr', 'Box', 'Set', 'Job']

/** Per-line money math */
export function lineNet(item, invoice) {
  const qty = Number(item.quantity) || 0
  const rate = Number(item.rate) || 0
  const gross = qty * rate
  const disc = item.discountType === 'percent' ? (gross * (Number(item.discountValue) || 0)) / 100 : Number(item.discountValue) || 0
  return Math.max(gross - disc, 0)
}

/**
 * Full invoice totals.
 * Tax scheme: 'gst' splits into CGST+SGST (intra-state) or IGST (inter-state);
 * 'vat'/'custom' show a single tax line. 'inclusive' taxes are backed out of the net.
 */
export function computeTotals(invoice) {
  const taxMode = invoice.taxMode || 'exclusive' // exclusive | inclusive
  const scheme = invoice.taxScheme || 'gst' // gst | vat | custom | none
  const intraState = !invoice.client?.stateCode || !invoice.business?.stateCode ? true : invoice.client.stateCode === invoice.business.stateCode

  let subtotal = 0
  let lineDiscounts = 0
  let taxTotal = 0
  const taxGroups = new Map()

  const lines = (invoice.items || []).map((item) => {
    const qty = Number(item.quantity) || 0
    const rate = Number(item.rate) || 0
    const gross = qty * rate
    const disc = item.discountType === 'percent' ? (gross * (Number(item.discountValue) || 0)) / 100 : Number(item.discountValue) || 0
    const net = Math.max(gross - disc, 0)
    lineDiscounts += disc

    const taxRatePct = Number(item.taxRate) || 0
    let tax = 0
    let effectiveNet = net
    if (scheme !== 'none' && taxRatePct > 0) {
      if (taxMode === 'inclusive') {
        tax = (net * taxRatePct) / (100 + taxRatePct)
        effectiveNet = net - tax
      } else {
        tax = (net * taxRatePct) / 100
      }
      taxTotal += tax
    }
    subtotal += effectiveNet

    if (scheme === 'gst' && taxRatePct > 0) {
      const half = taxRatePct / 2
      if (intraState) {
        taxGroups.set(`CGST@${half}`, (taxGroups.get(`CGST@${half}`) || 0) + tax / 2)
        taxGroups.set(`SGST@${half}`, (taxGroups.get(`SGST@${half}`) || 0) + tax / 2)
      } else {
        taxGroups.set(`IGST@${taxRatePct}`, (taxGroups.get(`IGST@${taxRatePct}`) || 0) + tax)
      }
    } else if (scheme !== 'none' && taxRatePct > 0) {
      const name = item.taxName || (scheme === 'vat' ? 'VAT' : 'Tax')
      taxGroups.set(`${name}@${taxRatePct}`, (taxGroups.get(`${name}@${taxRatePct}`) || 0) + tax)
    }

    return { ...item, _id: item._id || item.id, gross, discount: disc, net: effectiveNet, taxAmount: tax }
  })

  subtotal = lines.reduce((s, l) => s + l.net, 0)

  // global discount
  const gd = invoice.discount || { type: 'percent', value: 0 }
  const discountAmount =
    gd.type === 'percent' ? (subtotal * (Number(gd.value) || 0)) / 100 : Number(gd.value) || 0

  const charges = invoice.extraCharges || []
  const extraTotal = charges.reduce((s, c) => s + (Number(c.amount) || 0), 0)
  const shipping = Number(invoice.shipping) || 0

  let total = subtotal - discountAmount + extraTotal + shipping + taxTotal
  const roundOff = invoice.roundOff === false ? 0 : Math.round(total) - total
  total = invoice.roundOff === false ? total : Math.round(total)

  const payments = invoice.payments || []
  const paid = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0)
  const balance = total - paid

  return {
    lines,
    subtotal,
    lineDiscounts,
    discountAmount,
    extraTotal,
    shipping,
    taxTotal,
    taxBreakdown: [...taxGroups.entries()].map(([name, amount]) => ({ name, amount })),
    roundOff,
    total,
    paid,
    balance,
  }
}

export const emptyItem = () => ({
  _id: uid(),
  description: '',
  hsn: '',
  quantity: 1,
  unit: 'Nos',
  rate: 0,
  discountType: 'percent',
  discountValue: 0,
  taxRate: 0,
  taxName: 'GST',
})

export const emptyPayment = () => ({ id: uid(), date: new Date().toISOString().slice(0, 10), amount: 0, method: 'bank', note: '' })

export const STATUSES = ['draft', 'sent', 'partially', 'paid', 'overdue']

export const statusMeta = {
  draft: { label: 'Draft', color: 'bg-surface-container-high text-on-surface-variant' },
  sent: { label: 'Sent', color: 'bg-brand-100 text-brand-700' },
  partially: { label: 'Partially Paid', color: 'bg-warning-100 text-warning-700' },
  paid: { label: 'Paid', color: 'bg-success-100 text-success-700' },
  overdue: { label: 'Overdue', color: 'bg-danger-100 text-danger-700' },
}

/** Auto status: paid/partially based on payments; overdue if due date passed & unpaid */
export function effectiveStatus(invoice, totals) {
  if (!invoice || !totals) return 'draft'
  if (invoice.status === 'paid' || invoice.status === 'draft') return invoice.status
  if (totals.paid > 0 && totals.balance <= 0.009) return 'paid'
  if (totals.paid > 0) return 'partially'
  if (invoice.status !== 'draft' && invoice.dueDate && new Date(invoice.dueDate) < new Date(new Date().toDateString())) return 'overdue'
  return invoice.status || 'sent'
}
