import QRCode from 'qrcode'

/** UPI deep link for payment requests */
export function upiURI({ pa, pn, am, tn, cu = 'INR' }) {
  if (!pa) return ''
  const params = new URLSearchParams({ pa, cu })
  if (pn) params.set('pn', pn)
  if (am) params.set('am', String(am))
  if (tn) params.set('tn', tn)
  return `upi://pay?${params.toString()}`
}

/** Async data-URL QR generator */
export async function qrDataURL(text, { size = 220, dark = '#1e293b', light = '#ffffff' } = {}) {
  if (!text) return ''
  try {
    return await QRCode.toDataURL(text, { width: size, margin: 1, color: { dark, light }, errorCorrectionLevel: 'M' })
  } catch {
    return ''
  }
}

export const upiQrForInvoice = async (invoice, total) =>
  qrDataURL(upiURI({ pa: invoice.bankDetails?.upiId || invoice.upiId, pn: invoice.business?.name || 'Invoice', am: total > 0 ? total : undefined, tn: `Invoice ${invoice.number || ''}` }))
