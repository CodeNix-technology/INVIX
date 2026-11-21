import { uid, deepClone } from '../utils/id'
import { todayISO, addDays } from '../utils/date'
import { nextInvoiceNumber } from '../utils/invoiceNumber'

/**
 * Recurring invoices: for each recurring invoice whose next due date has
 * passed, produce a fresh copy (new number/dates, cleared payments).
 * Called from Reports → Recurring; runs offline, no backend cron needed.
 */
export function generateRecurring(data) {
  const created = []
  const today = todayISO()
  for (const inv of data.invoices) {
    const freq = inv.recurring
    if (!freq || freq === 'none') continue

    const nextIssue = nextRunDate(inv.issueDate, freq)
    if (!nextIssue || nextIssue > today) continue

    // Skip if we've already generated one from this parent for this period
    const alreadyGenerated = data.invoices.some(
      (i) => i.parentId === inv.id && (i.issueDate || '') >= nextIssue
    )
    if (alreadyGenerated) continue

    const copy = deepClone(inv)
    copy.id = uid()
    copy.parentId = inv.id
    copy.number = nextInvoiceNumber(data.invoices, data.settings)
    copy.status = 'draft'
    copy.issueDate = nextIssue
    copy.paymentTerms = inv.paymentTerms ?? 15
    copy.dueDate = addDays(nextIssue, inv.paymentTerms ?? 15)
    copy.payments = []
    copy.createdAt = new Date().toISOString()
    copy.items = copy.items.map((it) => ({ ...it, _id: uid() }))
    copy.shareId = uid().replace(/-/g, '').slice(0, 12)
    created.push(copy)
  }
  return created
}

function nextRunDate(fromISO, freq) {
  if (!fromISO) return null
  const d = new Date(fromISO)
  if (Number.isNaN(d.getTime())) return null
  if (freq === 'weekly') d.setDate(d.getDate() + 7)
  else if (freq === 'monthly') d.setMonth(d.getMonth() + 1)
  else if (freq === 'yearly') d.setFullYear(d.getFullYear() + 1)
  else return null
  return d.toISOString().slice(0, 10)
}
