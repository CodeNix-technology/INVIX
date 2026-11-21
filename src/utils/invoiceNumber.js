/**
 * Invoice numbering: patterns like "INV-{YYYY}-{MM}-{NNNN}".
 * Placeholders: {YYYY} {YY} {MM} {DD} {NNN+} (auto-width) or {N...} any count.
 */
export function formatInvoiceNumber(pattern, seq) {
  const d = new Date()
  const pad = (n, w) => String(n).padStart(w, '0')
  return (pattern || 'INV-{NNNN}')
    .replace(/\{YYYY\}/g, d.getFullYear())
    .replace(/\{YY\}/g, pad(d.getFullYear() % 100, 2))
    .replace(/\{MM\}/g, pad(d.getMonth() + 1, 2))
    .replace(/\{DD\}/g, pad(d.getDate(), 2))
    .replace(/\{(N+)\}/g, (_, ns) => pad(seq, ns.length))
}

/** Extract the numeric sequence from the last number + pattern */
export function nextSequence(lastNumber, pattern) {
  if (!lastNumber) return 1
  // Tokenize: placeholders -> regex parts, everything else -> escaped literals
  const parts = []
  let buf = ''
  const pushLiteral = () => {
    if (buf) {
      parts.push(buf.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      buf = ''
    }
  }
  const p = pattern || 'INV-{NNNN}'
  for (let i = 0; i < p.length; i++) {
    if (p[i] === '{') {
      pushLiteral()
      const close = p.indexOf('}', i)
      const ph = close === -1 ? '' : p.slice(i + 1, close)
      if (/^N+$/.test(ph)) parts.push(`(\\d{1,${ph.length}})`)
      else if (ph === 'YYYY') parts.push('\\d{4}')
      else if (ph === 'YY') parts.push('\\d{2}')
      else if (ph === 'MM' || ph === 'DD') parts.push('\\d{2}')
      else parts.push('[^\\s]*')
      i = close === -1 ? p.length : close
    } else buf += p[i]
  }
  pushLiteral()
  try {
    const m = new RegExp(parts.join('')).exec(lastNumber)
    if (m && m[1]) {
      const seq = parseInt(m[1], 10)
      if (!Number.isNaN(seq)) return seq + 1
    }
  } catch {
    /* fall through */
  }
  // fallback: trailing number
  const trail = /(\d+)(?!.*\d)/.exec(lastNumber)
  return trail ? parseInt(trail[1], 10) + 1 : 1
}

/** Next number for an invoice list + settings pattern. Monthly reset if pattern has {MM}. */
export function nextInvoiceNumber(invoices, settings) {
  const pattern = settings?.numberPattern || 'INV-{NNNN}'
  const monthly = pattern.includes('{MM}')
  const period = monthly ? new Date().toISOString().slice(0, 7) : null
  const candidates = (invoices || []).filter((inv) => {
    if (!monthly) return true
    return (inv.issueDate || '').slice(0, 7) === period
  })
  const last = candidates
    .map((i) => i.number)
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b))
    .pop()
  return formatInvoiceNumber(pattern, nextSequence(last, pattern))
}
