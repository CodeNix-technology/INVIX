export const formatDate = (iso, style = 'medium') => {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  const opts = { day: '2-digit', month: 'short', year: 'numeric' }
  if (style === 'long') opts.month = 'long'
  return d.toLocaleDateString('en-IN', opts)
}

export const todayISO = () => new Date().toISOString().slice(0, 10)

export const addDays = (dateISO, days) => {
  const d = dateISO ? new Date(dateISO) : new Date()
  d.setDate(d.getDate() + Number(days || 0))
  return d.toISOString().slice(0, 10)
}

export const monthKey = (iso) => (iso ? iso.slice(0, 7) : '')

export const monthLabel = (key) => {
  if (!key) return ''
  const [y, m] = key.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('en', { month: 'short', year: '2-digit' })
}

export const daysBetween = (a, b) => Math.round((new Date(a) - new Date(b)) / 86400000)

export const PAYMENT_TERMS = [
  { label: 'Due on receipt', days: 0 },
  { label: 'Net 7', days: 7 },
  { label: 'Net 15', days: 15 },
  { label: 'Net 30', days: 30 },
  { label: 'Net 45', days: 45 },
  { label: 'Net 60', days: 60 },
]
