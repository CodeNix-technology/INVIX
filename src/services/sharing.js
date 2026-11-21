import { getStorage } from './storage'
import { isSupabaseConfigured, supabase } from './supabase'

/**
 * Public share links.
 *
 * When Supabase is configured we upload the PDF to storage and record a
 * read-only row in `shared_invoices`; the /share/:id route resolves it.
 * Without Supabase we keep everything on-device (guest mode).
 */
export async function uploadShare({ invoice, totals, pdfBlob, user }) {
  const shareId = invoice.shareId
  const storage = getStorage()
  const path = `shares/${shareId}/invoice-${invoice.number || 'draft'}.pdf`

  let pdfUrl = ''
  try {
    await storage.upload(path, pdfBlob)
    if (storage.name === 'supabase') {
      pdfUrl = storage.getPublicUrl(path)?.data?.publicUrl || ''
    }
  } catch {
    /* keep local-only */
  }

  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from('shared_invoices').upsert({
      share_id: shareId,
      user_id: user?.id || null,
      invoice_id: invoice.id,
      number: invoice.number,
      currency: invoice.currency,
      total: totals.total,
      status: invoice.status,
      pdf_path: path,
      pdf_url: pdfUrl,
      data: {
        business: invoice.business,
        client: invoice.client,
        items: invoice.items,
        issueDate: invoice.issueDate,
        dueDate: invoice.dueDate,
        kind: invoice.kind,
      },
    })
    if (error) throw error
  }

  return `${window.location.origin}/share/${shareId}`
}

export async function fetchSharedInvoice(shareId) {
  if (!isSupabaseConfigured || !supabase) return null
  const { data, error } = await supabase.from('shared_invoices').select('*').eq('share_id', shareId).single()
  if (error) return null
  return data
}
