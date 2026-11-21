import React, { useEffect, useState } from 'react'
import { resolveCustomization, fontStack, FONT_SCALE, LINE_HEIGHTS, LOGO_SIZES, MARGIN_MM, SECTION_LABELS } from './schema'
import { computeTotals } from '../utils/calc'
import { formatMoney, formatNumber, currencySymbol } from '../utils/currency'
import { formatDate } from '../utils/date'
import { amountInWords } from '../utils/words'
import { qrDataURL, upiURI } from '../utils/upi'

// re-exports so layout engines can import these from one place
export { fontStack }

/* ============================ hooks ============================ */

export function useUpiQR(invoice, total, show) {
  const [src, setSrc] = useState('')
  useEffect(() => {
    let alive = true
    if (!show) return
    const uri = upiURI({ pa: invoice?.bankDetails?.upiId, pn: invoice?.business?.name, am: total || undefined, tn: `Invoice ${invoice?.number || ''}` })
    if (!uri) return
    qrDataURL(uri, { size: 180, dark: '#0f172a' }).then((d) => alive && setSrc(d))
    return () => {
      alive = false
    }
  }, [invoice?.bankDetails?.upiId, invoice?.business?.name, total, show])
  return src
}

/* ============================ helpers ============================ */

export const hexToRgb = (hex) => {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '#000000')
  return m ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) } : { r: 0, g: 0, b: 0 }
}
export const alpha = (hex, a) => {
  const { r, g, b } = hexToRgb(hex)
  return `rgba(${r},${g},${b},${a})`
}
export const isDark = (hex) => {
  const { r, g, b } = hexToRgb(hex)
  return r * 0.299 + g * 0.587 + b * 0.114 < 140
}

export const mm2px = (mm) => Math.round(mm * 3.7795)
export const PAPER_PX = { A4: { w: 794, h: 1123 }, A5: { w: 559, h: 794 }, Letter: { w: 816, h: 1056 } }

/* ============================ frame ============================ */

/** Paper page: exact size, margins, border, radius, watermark, footer */
export function PaperFrame({ cus, children, id, widthOverride }) {
  const paper = PAPER_PX[cus.paper.size] || PAPER_PX.A4
  const width = widthOverride || paper.w
  const marginPx = mm2px(MARGIN_MM[cus.paper.margin] ?? MARGIN_MM.normal)
  const scale = cus.paper.size === 'A5' ? 0.78 : 1
  const fs = Math.round(FONT_SCALE[cus.fonts.size] * scale)
  const lh = LINE_HEIGHTS[cus.fonts.lineHeight] || 1.5

  return (
    <div
      id={id}
      style={{
        width,
        minHeight: paper.h,
        margin: '0 auto',
        position: 'relative',
        overflow: 'hidden',
        background: cus.colors.background,
        color: cus.colors.text,
        fontFamily: fontStack(cus.fonts.family),
        fontSize: fs,
        lineHeight: lh,
        borderRadius: cus.border.enabled ? cus.border.radius : 0,
        border: cus.border.enabled ? `${cus.border.width}px solid ${cus.border.color}` : 'none',
        boxSizing: 'border-box',
        padding: marginPx,
        paddingBottom: marginPx + (cus.footer?.show !== false ? 30 : 0),
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {cus.watermark?.text ? <WatermarkLayer cus={cus} /> : null}
      {cus.watermark?.image ? <WatermarkImage cus={cus} /> : null}
      <div style={{ position: 'relative', zIndex: 1, flex: 1 }}>{children}</div>
      {cus.footer?.show !== false ? (
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: marginPx,
            right: marginPx,
            borderTop: `1px solid ${cus.table.borderColor}`,
            paddingTop: 6,
            textAlign: 'center',
            fontSize: 8.5,
            letterSpacing: 1.4,
            textTransform: 'uppercase',
            color: cus.colors.muted,
            opacity: 0.8,
          }}
        >
          {cus.footer?.text || 'Generated with Invix'}
        </div>
      ) : null}
    </div>
  )
}

function WatermarkLayer({ cus }) {
  const pos = cus.watermark.position || 'center'
  const map = {
    center: { top: '50%', left: '50%', transform: 'translate(-50%,-50%) rotate(-28deg)' },
    tl: { top: 40, left: 40, transform: 'rotate(-18deg)' },
    tr: { top: 40, right: 40, transform: 'rotate(18deg)' },
    bl: { bottom: 90, left: 40, transform: 'rotate(18deg)' },
    br: { bottom: 90, right: 40, transform: 'rotate(-18deg)' },
  }
  const sizeMap = { sm: 42, md: 64, lg: 92 }
  return (
    <div style={{ ...map[pos], position: 'absolute', pointerEvents: 'none', zIndex: 0, opacity: cus.watermark.opacity ?? 0.08 }}>
      <span style={{ fontSize: sizeMap[cus.watermark.size] || 64, fontWeight: 800, color: cus.colors.primary, letterSpacing: 4, whiteSpace: 'nowrap' }}>
        {cus.watermark.text}
      </span>
    </div>
  )
}

function WatermarkImage({ cus }) {
  const pos = cus.watermark.position || 'center'
  const map = { center: { top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }, tl: { top: 40, left: 40 }, tr: { top: 40, right: 40 }, bl: { bottom: 90, left: 40 }, br: { bottom: 90, right: 40 } }
  return (
    <div style={{ ...map[pos], position: 'absolute', zIndex: 0, pointerEvents: 'none', opacity: cus.watermark.opacity ?? 0.08, maxWidth: '70%' }}>
      <img src={cus.watermark.image} alt="" style={{ width: '100%' }} />
    </div>
  )
}

/* ============================ pieces ============================ */

/** Logo with optional white "plate" so it stays visible on colored bands/sidebars */
export function LogoBox({ inv, cus, engine = 'inline', plate = false }) {
  const size = LOGO_SIZES[cus.logo.size] || LOGO_SIZES.md
  const imgStyle =
    engine === 'stack'
      ? { width: size, height: size, borderRadius: 10, objectFit: 'contain' }
      : { maxHeight: size / 1.7, maxWidth: size * 1.8, objectFit: 'contain', display: 'block' }
  const inner = inv.business?.logo ? (
    <img src={inv.business.logo} alt={inv.business?.name || 'logo'} style={imgStyle} />
  ) : (
    <div
      style={{
        width: engine === 'stack' ? size : 'auto',
        height: engine === 'stack' ? size : size / 2.7,
        padding: engine === 'stack' ? 0 : '0 12px',
        borderRadius: 10,
        background: plate ? 'transparent' : alpha(cus.colors.primary, 0.12),
        color: plate ? '#4f46e5' : cus.colors.primary,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 800,
        fontSize: 21,
        letterSpacing: 1,
        fontFamily: fontStack(cus.fonts.headingFamily),
      }}
    >
      {(inv.business?.name || 'I').slice(0, 2).toUpperCase()}
    </div>
  )
  if (!plate) return inner
  return (
    <div style={{ background: '#ffffff', borderRadius: 12, padding: engine === 'stack' ? 6 : '6px 8px', display: 'inline-flex', boxShadow: '0 1px 0 rgba(15,23,42,.06)' }}>
      {inner}
    </div>
  )
}

export function TitleBlock({ inv, cus, align = 'right', big = false, onColor = false }) {
  const label = cus.labels.invoice || 'Invoice'
  return (
    <div style={{ textAlign: align }}>
      <div
        style={{
          fontFamily: fontStack(cus.fonts.headingFamily),
          fontSize: big ? 32 : 25,
          fontWeight: 800,
          letterSpacing: big ? 1.5 : 2.5,
          textTransform: 'uppercase',
          color: onColor ? cus.colors.headerText : cus.colors.primary,
          lineHeight: 1.1,
        }}
      >
        {label}
      </div>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
        <span style={{ fontSize: 11, color: onColor ? alpha(cus.colors.headerText, 0.85) : cus.colors.muted }}>#</span>
        <span
          style={{
            fontSize: 11.5,
            fontWeight: 700,
            letterSpacing: 0.5,
            color: onColor ? cus.colors.headerText : cus.colors.text,
            background: onColor ? alpha('#ffffff', 0.16) : alpha(cus.colors.primary, 0.08),
            padding: '2px 9px',
            borderRadius: 999,
          }}
        >
          {inv.number || '—'}
        </span>
      </div>
    </div>
  )
}

/** Modern meta "chips" row */
export function MetaGrid({ inv, cus, cols = 3 }) {
  const rows = [
    ['Invoice No', inv.number],
    [String(cus.labels.invoice || '').includes('Proforma') ? 'Valid Until' : 'Issue Date', formatDate(inv.issueDate)],
    ['Due Date', formatDate(inv.dueDate)],
    inv.poNumber ? ['PO Number', inv.poNumber] : null,
    inv.paymentTerms !== undefined && inv.paymentTerms !== null ? ['Payment Terms', `Net ${inv.paymentTerms} days`] : null,
    ['Currency', inv.currency],
  ].filter(Boolean)
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: cols === 4 ? 'flex-start' : 'flex-end' }}>
      {rows.map(([k, v]) => (
        <span
          key={k}
          style={{
            display: 'inline-flex',
            alignItems: 'baseline',
            gap: 5,
            fontSize: 10.5,
            background: alpha(cus.colors.primary, 0.07),
            border: `1px solid ${alpha(cus.colors.primary, 0.14)}`,
            borderRadius: 7,
            padding: '3.5px 9px',
          }}
        >
          <span style={{ color: cus.colors.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: 9 }}>{k}</span>
          <span style={{ fontWeight: 700 }}>{v || '—'}</span>
        </span>
      ))}
    </div>
  )
}

export function PartyBlocks({ inv, cus, stacked = false }) {
  const b = inv.business || {}
  const c = inv.client || {}
  const Block = ({ title, obj, extra }) => (
    <div style={{ flex: stacked ? 'none' : 1, minWidth: 200 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <span style={{ width: 14, height: 3, borderRadius: 2, background: cus.colors.primary }} />
        <span style={{ fontSize: 9.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.4, color: cus.colors.primary }}>{title}</span>
      </div>
      <div style={{ fontWeight: 700, fontSize: 13.5, letterSpacing: 0.1 }}>{obj.name || '—'}</div>
      <div style={{ color: cus.colors.muted, whiteSpace: 'pre-line', fontSize: 11.5, marginTop: 3, lineHeight: 1.55 }}>
        {[obj.address, [obj.city, obj.state, obj.pincode].filter(Boolean).join(', '), obj.country].filter(Boolean).join('\n')}
      </div>
      <div style={{ color: cus.colors.muted, fontSize: 11.5, marginTop: 4 }}>
        {obj.email ? <div>{obj.email}</div> : null}
        {obj.phone ? <div>{obj.phone}</div> : null}
      </div>
      {extra}
    </div>
  )
  return (
    <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap' }}>
      <Block title={inv.kind === 'quotation' ? 'From' : 'From'} obj={b} extra={b.taxId ? <div style={{ fontSize: 11.5, marginTop: 5 }}><span style={{ color: cus.colors.muted }}>Tax ID: </span><b>{b.taxId}</b></div> : null} />
      <Block title={cus.labels.billTo || 'Bill To'} obj={c} extra={c.gstin ? <div style={{ fontSize: 11.5, marginTop: 5 }}><span style={{ color: cus.colors.muted }}>GSTIN: </span><b>{c.gstin}</b></div> : null} />
    </div>
  )
}

/** Item table that respects the column manager */
export function ItemsTable({ inv, cus, totals, compact = false, currency, card = true }) {
  const cols = (cus.columns || []).filter((c) => c.visible)
  const cur = currency || inv.currency || 'INR'
  const sym = currencySymbol(cur)
  const cellPad = compact ? '6px 7px' : '9px 10px'
  const headerBg = cus.table.headerBg ? (cus.table.style === 'bordered' ? cus.colors.primary : alpha(cus.colors.primary, 0.07)) : 'transparent'
  const headerColor = cus.table.headerBg && cus.table.style === 'bordered' ? '#fff' : cus.colors.primary
  const rowBorder = `1px solid ${cus.table.borderColor}`
  const zebraBg = alpha(cus.colors.primary, 0.03)

  const render = (key, line) => {
    switch (key) {
      case 'description':
        return (
          <div>
            <div style={{ fontWeight: 600 }}>{line.description || '—'}</div>
            {line.extraDescription ? <div style={{ color: cus.colors.muted, fontSize: 10.5, marginTop: 2 }}>{line.extraDescription}</div> : null}
          </div>
        )
      case 'hsn':
        return <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 10.5 }}>{line.hsn || '—'}</span>
      case 'qty':
        return formatNumber(line.quantity, cur).replace(/\.00$/, '')
      case 'unit':
        return <span style={{ color: cus.colors.muted }}>{line.unit || ''}</span>
      case 'rate':
        return `${sym}${formatNumber(line.rate, cur)}`
      case 'discount': {
        if (!line.discountValue) return <span style={{ color: cus.colors.muted }}>—</span>
        return line.discountType === 'percent' ? `${line.discountValue}%` : `${sym}${formatNumber(line.discountValue, cur)}`
      }
      case 'tax':
        return line.taxRate ? `${line.taxName || 'GST'} ${line.taxRate}%` : <span style={{ color: cus.colors.muted }}>—</span>
      case 'amount':
        return <b style={{ fontWeight: 700 }}>{`${sym}${formatNumber(line.net, cur)}`}</b>
      default:
        return line[key] || ''
    }
  }

  const table = (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: compact ? 11 : 11.5 }}>
      <thead>
        <tr>
          {cols.map((c) => (
            <th
              key={c.key}
              style={{
                textAlign: ['amount', 'rate', 'qty'].includes(c.key) ? 'right' : c.key === 'description' ? 'left' : 'center',
                padding: cellPad,
                background: headerBg,
                color: headerColor,
                fontWeight: 800,
                fontSize: 9.5,
                textTransform: 'uppercase',
                letterSpacing: 1,
                borderBottom: `2px solid ${cus.table.style === 'bordered' ? cus.colors.primary : alpha(cus.colors.primary, 0.3)}`,
                border: cus.table.style === 'bordered' ? rowBorder : undefined,
              }}
            >
              {c.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {totals.lines.map((line, i) => (
          <tr key={line._id || i} style={{ background: cus.table.zebra && i % 2 === 1 ? zebraBg : 'transparent' }}>
            {cols.map((c) => (
              <td
                key={c.key}
                style={{
                  padding: cellPad,
                  borderBottom: cus.table.style === 'minimal' ? `1px solid ${alpha(cus.table.borderColor, 0.7)}` : cus.table.style === 'bordered' ? rowBorder : 'none',
                  textAlign: ['amount', 'rate', 'qty'].includes(c.key) ? 'right' : c.key === 'description' ? 'left' : 'center',
                  verticalAlign: 'top',
                }}
              >
                {render(c.key, line)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )

  if (!card) return table
  return (
    <div
      style={{
        border: `1px solid ${cus.table.style === 'bordered' ? cus.table.borderColor : alpha(cus.table.borderColor, 0.9)}`,
        borderRadius: 10,
        overflow: 'hidden',
        background: cus.table.headerBg && cus.table.style !== 'bordered' ? '#fff' : 'transparent',
      }}
    >
      {table}
    </div>
  )
}

/** Totals inside a tinted summary panel */
export function TotalsTable({ inv, cus, totals, currency, showWords }) {
  const cur = currency || inv.currency || 'INR'
  const sym = currencySymbol(cur)
  const Row = ({ label, value, strong, color }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2.5px 0', fontSize: 11.5 }}>
      <span style={{ color: color || cus.colors.muted }}>{label}</span>
      <span style={{ fontWeight: strong ? 800 : 600, color: color || cus.colors.text }}>{value}</span>
    </div>
  )
  return (
    <div
      style={{
        minWidth: 250,
        marginLeft: 'auto',
        background: alpha(cus.colors.primary, 0.055),
        border: `1px solid ${alpha(cus.colors.primary, 0.12)}`,
        borderRadius: 12,
        padding: '12px 14px',
      }}
    >
      <Row label="Subtotal" value={`${sym}${formatNumber(totals.subtotal, cur)}`} />
      {totals.discountAmount > 0 ? <Row label="Discount" value={`− ${sym}${formatNumber(totals.discountAmount, cur)}`} /> : null}
      {totals.extraTotal > 0 ? <Row label="Additional charges" value={`${sym}${formatNumber(totals.extraTotal, cur)}`} /> : null}
      {totals.shipping > 0 ? <Row label="Shipping" value={`${sym}${formatNumber(totals.shipping, cur)}`} /> : null}
      {totals.taxBreakdown.map((t) => (
        <Row key={t.name} label={t.name} value={`${sym}${formatNumber(t.amount, cur)}`} />
      ))}
      {totals.roundOff ? <Row label="Round off" value={`${sym}${formatNumber(totals.roundOff, cur)}`} /> : null}
      <div style={{ borderTop: `2px solid ${cus.colors.primary}`, marginTop: 7, paddingTop: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{ fontWeight: 800, fontSize: 12.5, textTransform: 'uppercase', letterSpacing: 1.5, color: cus.colors.primary }}>Total</span>
          <span style={{ fontWeight: 800, fontSize: 18, letterSpacing: 0.2 }}>{formatMoney(totals.total, cur)}</span>
        </div>
      </div>
      {totals.paid > 0 ? (
        <>
          <Row label="Amount paid" value={`− ${sym}${formatNumber(totals.paid, cur)}`} />
          <div style={{ marginTop: 6, borderRadius: 8, padding: '6px 10px', background: totals.balance > 0 ? 'rgba(185,28,28,.08)' : 'rgba(4,120,87,.08)', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: totals.balance > 0 ? '#b91c1c' : '#047857' }}>
              {totals.balance > 0 ? 'Balance due' : 'Fully paid'}
            </span>
            <span style={{ fontWeight: 800, fontSize: 13, color: totals.balance > 0 ? '#b91c1c' : '#047857' }}>
              {formatMoney(Math.max(totals.balance, 0), cur)}
            </span>
          </div>
        </>
      ) : null}
      {showWords ? (
        <div style={{ marginTop: 8, fontSize: 10.5, color: cus.colors.muted, lineHeight: 1.5 }}>
          <span style={{ fontWeight: 700, color: cus.colors.text }}>Amount in words: </span>
          {amountInWords(totals.total, cur, inv._wordsSystem || 'indian')}
        </div>
      ) : null}
    </div>
  )
}

export function SectionTitle({ cus, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
      <span style={{ width: 14, height: 3, borderRadius: 2, background: cus.colors.primary }} />
      <span style={{ fontSize: 9.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.4, color: cus.colors.primary }}>{children}</span>
    </div>
  )
}

export function NotesTerms({ inv, cus }) {
  return (
    <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap' }}>
      {inv.notes ? (
        <div style={{ flex: 1, minWidth: 220 }}>
          <SectionTitle cus={cus}>{cus.labels.notes || 'Notes'}</SectionTitle>
          <div style={{ color: cus.colors.muted, whiteSpace: 'pre-line', fontSize: 11 }}>{inv.notes}</div>
        </div>
      ) : null}
      {inv.terms ? (
        <div style={{ flex: 1.2, minWidth: 220 }}>
          <SectionTitle cus={cus}>{cus.labels.terms || 'Terms & Conditions'}</SectionTitle>
          <div style={{ color: cus.colors.muted, whiteSpace: 'pre-line', fontSize: 11 }}>{inv.terms}</div>
        </div>
      ) : null}
    </div>
  )
}

export function BankBlock({ inv, cus }) {
  const bd = inv.bankDetails || {}
  if (!bd.bankName && !bd.accountNumber && !bd.upiId) return null
  return (
    <div style={{ minWidth: 230 }}>
      <SectionTitle cus={cus}>Bank Details</SectionTitle>
      <div style={{ fontSize: 11, lineHeight: 1.65 }}>
        {bd.bankName ? <div><b>{bd.bankName}</b></div> : null}
        {bd.accountName ? <div style={{ color: cus.colors.muted }}>{bd.accountName}</div> : null}
        {bd.accountNumber ? <div>A/C: <span style={{ letterSpacing: 0.8, fontWeight: 600 }}>{bd.accountNumber}</span></div> : null}
        {bd.ifsc ? <div style={{ color: cus.colors.muted }}>IFSC {bd.ifsc}</div> : null}
        {bd.upiId ? <div style={{ marginTop: 2 }}>UPI: <b>{bd.upiId}</b></div> : null}
      </div>
    </div>
  )
}

export function QRBlock({ src }) {
  if (!src) return null
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ padding: 5, border: `1px solid ${alpha('#64748b', 0.3)}`, borderRadius: 10, display: 'inline-block', background: '#fff' }}>
        <img src={src} alt="UPI QR" style={{ width: 84, height: 84, display: 'block' }} />
      </div>
      <div style={{ fontSize: 8.5, color: '#64748b', marginTop: 4, textTransform: 'uppercase', letterSpacing: 1 }}>Scan to pay</div>
    </div>
  )
}

export function SignatureBlock({ inv, cus }) {
  const sig = inv.signature || { type: 'none' }
  return (
    <div style={{ textAlign: 'right', minWidth: 200 }}>
      <div style={{ minHeight: 48, display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end' }}>
        {sig.type === 'draw' && sig.data ? <img src={sig.data} alt="signature" style={{ height: 44, objectFit: 'contain' }} /> : null}
        {sig.type === 'upload' && sig.data ? <img src={sig.data} alt="signature" style={{ height: 50, objectFit: 'contain' }} /> : null}
        {sig.type === 'type' && sig.name ? (
          <div style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: 21, color: cus.colors.primary, paddingRight: 4 }}>{sig.name}</div>
        ) : null}
      </div>
      <div style={{ borderTop: `1px solid ${cus.table.borderColor}`, marginTop: 4, paddingTop: 4, fontSize: 10.5, fontWeight: 700 }}>
        {sig.name || 'Authorised Signatory'}
        {sig.title ? <span style={{ color: cus.colors.muted, fontWeight: 400 }}> · {sig.title}</span> : null}
      </div>
      <div style={{ fontSize: 9.5, color: cus.colors.muted, marginTop: 1 }}>for {inv.business?.name || '—'}</div>
    </div>
  )
}

export function StampImage({ stamp }) {
  if (!stamp) return null
  return <img src={stamp} alt="stamp" style={{ height: 74, opacity: 0.9, transform: 'rotate(-6deg)' }} />
}

/** PAID / DRAFT rubber stamp */
export function StatusStamp({ inv, cus }) {
  const text = (cus.labels.paidStamp || '').trim()
  if (!text) return null
  return (
    <div
      style={{
        position: 'absolute',
        top: 150,
        right: 56,
        transform: 'rotate(-12deg)',
        border: `3px double ${alpha(cus.colors.primary, 0.55)}`,
        outline: `1px solid ${alpha(cus.colors.primary, 0.25)}`,
        outlineOffset: 3,
        borderRadius: 8,
        padding: '5px 18px',
        color: alpha(cus.colors.primary, 0.7),
        fontWeight: 900,
        fontSize: 19,
        letterSpacing: 5,
        textTransform: 'uppercase',
        pointerEvents: 'none',
        zIndex: 2,
      }}
    >
      {text}
    </div>
  )
}

/** Renders lower sections in user-defined order */
export function SectionFlow({ inv, cus, totals, qrSrc }) {
  const order = cus.sections?.order || []
  const hidden = new Set(cus.sections?.hidden || [])
  const parts = []
  for (const key of order) {
    if (hidden.has(key)) continue
    switch (key) {
      case 'amountWords':
        if (inv.showAmountInWords !== false) {
          parts.push(
            <div key={key} style={{ flexBasis: '100%', fontSize: 10.5, color: cus.colors.muted }}>
              <span style={{ fontWeight: 700, color: cus.colors.text }}>Amount in words: </span>
              {amountInWords(totals.total, inv.currency || 'INR', inv._wordsSystem || 'indian')}
            </div>
          )
        }
        break
      case 'notes':
      case 'terms':
        if (inv[key]) parts.push(<NotesTermsBlock key={key} inv={inv} cus={cus} which={key} />)
        break
      case 'bank':
        parts.push(<BankBlock key={key} inv={inv} cus={cus} />)
        break
      case 'qr':
        if (qrSrc) parts.push(<QRBlock key={key} src={qrSrc} />)
        break
      case 'signature':
        parts.push(<SignatureBlock key={key} inv={inv} cus={cus} />)
        break
      case 'stamp':
        parts.push(<StampImage key={key} stamp={inv.stamp} />)
        break
      default:
        break
    }
  }
  return <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-start', marginTop: 16 }}>{parts.filter(Boolean)}</div>
}

function NotesTermsBlock({ inv, cus, which }) {
  return (
    <div style={{ flex: 1, minWidth: 220 }}>
      <SectionTitle cus={cus}>{which === 'notes' ? cus.labels.notes || SECTION_LABELS.notes : cus.labels.terms || SECTION_LABELS.terms}</SectionTitle>
      <div style={{ color: cus.colors.muted, whiteSpace: 'pre-line', fontSize: 10.5, lineHeight: 1.55 }}>{inv[which]}</div>
    </div>
  )
}

/* ============================ engine context ============================ */

export function buildCtx({ inv, customization, engineDefaults }) {
  const cus = resolveCustomization(engineDefaults, customization)
  const totals = computeTotals(inv)
  return { inv, cus, totals, cur: inv.currency || 'INR' }
}

export function useTemplateDoc({ inv, customization, engineDefaults }) {
  const cus = resolveCustomization(engineDefaults, customization)
  const totals = computeTotals(inv)
  const showQR = !cus.sections?.hidden?.includes('qr') && inv.showUPIQR !== false
  const qrSrc = useUpiQR(inv, totals.total, showQR)
  return { cus, totals, qrSrc }
}
