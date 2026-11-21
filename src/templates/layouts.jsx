import React from 'react'
import { alpha, LogoBox, TitleBlock, MetaGrid, PartyBlocks, ItemsTable, TotalsTable, BankBlock, SignatureBlock, StatusStamp, SectionFlow, fontStack, mm2px, PAPER_PX } from './shared'
import { MARGIN_MM } from './schema'
import { computeTotals } from '../utils/calc'
import { formatMoney, formatNumber } from '../utils/currency'
import { amountInWords } from '../utils/words'
import { formatDate } from '../utils/date'
import { qrDataURL, upiURI } from '../utils/upi'

const isDarkBg = (hex) => {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '#fff')
  if (!m) return false
  const [r, g, b] = [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)]
  return r * 0.299 + g * 0.587 + b * 0.114 < 120
}

/* ==================================================================== */
/* ENGINE 1 — Band header (Classic, Corporate, Bold, Gradient, Compact)  */
/* ==================================================================== */

export function BandLayout({ inv, cus, totals, qrSrc, variant = {} }) {
  const { headerFill = 'color', compact = false, heroSize = 'md' } = variant
  const gradient = headerFill === 'gradient'
  const headerBg = gradient ? `linear-gradient(115deg, ${cus.colors.primary} 0%, ${cus.colors.secondary} 100%)` : cus.colors.primary
  const margin = mm2px(MARGIN_MM[cus.paper.margin] ?? 16)
  const gap = compact ? 12 : 20

  return (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', flex: 1 }}>
      {inv.status === 'paid' && cus.labels.paidStamp ? <StatusStamp inv={inv} cus={cus} /> : null}

      {/* header band — bleeds to paper edges */}
      <div
        style={{
          background: headerBg,
          color: cus.colors.headerText,
          margin: `${-margin}px ${-margin}px 0`,
          padding: compact ? '20px 28px 18px' : '30px 34px 26px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* decorative soft circles */}
        <div style={{ position: 'absolute', right: -70, top: -90, width: 220, height: 220, borderRadius: '50%', background: alpha('#ffffff', 0.07) }} />
        <div style={{ position: 'absolute', right: 60, bottom: -110, width: 190, height: 190, borderRadius: '50%', background: alpha('#ffffff', 0.05) }} />
        {/* accent stripe */}
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 4, background: gradient ? alpha('#ffffff', 0.35) : cus.colors.secondary }} />

        <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <LogoBox inv={inv} cus={cus} plate />
            <div>
              <div style={{ fontFamily: fontStack(cus.fonts.headingFamily), fontWeight: 800, fontSize: heroSize === 'lg' ? 23 : 18, letterSpacing: 0.2 }}>{inv.business?.name}</div>
              <div style={{ fontSize: 10.5, opacity: 0.85, marginTop: 2 }}>
                {[inv.business?.website, inv.business?.email].filter(Boolean).join('  ·  ')}
              </div>
            </div>
          </div>
          <TitleBlock inv={inv} cus={cus} onColor big={heroSize === 'lg'} />
        </div>
      </div>

      {/* body */}
      <div style={{ padding: `${gap + 8}px 0 0`, display: 'flex', flexDirection: 'column', flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
          <PartyBlocks inv={inv} cus={cus} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
            <MetaGrid inv={inv} cus={cus} cols={compact ? 2 : 2} />
            {inv.status === 'paid' ? (
              <span style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', color: '#047857', background: 'rgba(4,120,87,.1)', borderRadius: 999, padding: '3px 10px' }}>
                ✓ Paid
              </span>
            ) : null}
          </div>
        </div>

        <div style={{ marginTop: gap + 4 }}>
          <ItemsTable inv={inv} cus={cus} totals={totals} compact={compact} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 16, flexWrap: 'wrap', gap: 16 }}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <SectionFlow inv={inv} cus={cus} totals={totals} qrSrc={qrSrc} />
          </div>
          <TotalsTable inv={inv} cus={cus} totals={totals} showWords={false} />
        </div>

        {inv.kind === 'quotation' ? (
          <div style={{ marginTop: 14, fontSize: 10, color: cus.colors.muted, border: `1px dashed ${alpha(cus.colors.primary, 0.35)}`, background: alpha(cus.colors.primary, 0.04), padding: '9px 13px', borderRadius: 9 }}>
            This {String(cus.labels.invoice || 'proforma').toLowerCase()} is valid for 15 days from the date of issue; prices may be revised thereafter.
          </div>
        ) : null}
      </div>
    </div>
  )
}

/* ==================================================================== */
/* ENGINE 2 — Vertical sidebar (Modern, Creative, Agency, Dark)          */
/* ==================================================================== */

const MetaList = ({ label, value, dark }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '5px 0', borderBottom: `1px solid ${dark ? 'rgba(255,255,255,.12)' : 'rgba(15,23,42,.08)'}` }}>
    <span style={{ opacity: 0.7, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.8 }}>{label}</span>
    <span style={{ fontWeight: 700, fontSize: 10.5, textAlign: 'right' }}>{value || '—'}</span>
  </div>
)

export function SidebarLayout({ inv, cus, totals, qrSrc, variant = {} }) {
  const { width = 33 } = variant
  const dark = variant.dark || isDarkBg(cus.colors.background)
  const sideBg = variant.sidebarBg || cus.colors.primary
  const sideIsDark = typeof sideBg === 'string' && sideBg.startsWith('#') ? isDarkBg(sideBg) : true
  const sideText = sideIsDark ? '#f8fafc' : '#1e293b'
  const margin = mm2px(MARGIN_MM[cus.paper.margin] ?? 16)

  return (
    <div style={{ display: 'flex', gap: 0, margin: -margin, minHeight: 'calc(100% )', position: 'relative' }}>
      {inv.status === 'paid' && cus.labels.paidStamp ? <StatusStamp inv={inv} cus={cus} /> : null}

      {/* Sidebar */}
      <div style={{ width: `${width}%`, background: sideBg, color: sideText, padding: 26, display: 'flex', flexDirection: 'column', gap: 20, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', left: -60, bottom: -80, width: 200, height: 200, borderRadius: '50%', background: alpha(sideIsDark ? '#ffffff' : '#0f172a', 0.05) }} />
        <div style={{ position: 'relative' }}>
          <LogoBox inv={inv} cus={cus} engine="stack" plate />
        </div>
        <div style={{ position: 'relative' }}>
          <div style={{ fontFamily: fontStack(cus.fonts.headingFamily), fontWeight: 800, fontSize: 16.5, letterSpacing: 0.2 }}>{inv.business?.name}</div>
          <div style={{ fontSize: 10.5, opacity: 0.85, whiteSpace: 'pre-line', marginTop: 5, lineHeight: 1.6 }}>
            {[inv.business?.address, [inv.business?.city, inv.business?.state, inv.business?.pincode].filter(Boolean).join(', ')].filter(Boolean).join('\n')}
          </div>
          <div style={{ fontSize: 10.5, opacity: 0.85, marginTop: 8, lineHeight: 1.7 }}>
            {inv.business?.email ? <div>{inv.business.email}</div> : null}
            {inv.business?.phone ? <div>{inv.business.phone}</div> : null}
            {inv.business?.website ? <div>{inv.business.website}</div> : null}
            {inv.business?.taxId ? <div style={{ marginTop: 4, fontWeight: 700 }}>Tax ID · {inv.business.taxId}</div> : null}
          </div>
        </div>
        <div style={{ position: 'relative', fontSize: 10.5 }}>
          <MetaList dark={sideIsDark} label="Invoice No" value={inv.number} />
          <MetaList dark={sideIsDark} label="Issue Date" value={formatDate(inv.issueDate)} />
          <MetaList dark={sideIsDark} label="Due Date" value={formatDate(inv.dueDate)} />
          {inv.poNumber ? <MetaList dark={sideIsDark} label="PO No" value={inv.poNumber} /> : null}
          <MetaList dark={sideIsDark} label="Terms" value={`Net ${inv.paymentTerms ?? 15} days`} />
          <MetaList dark={sideIsDark} label="Currency" value={inv.currency} />
        </div>
        <div style={{ position: 'relative', marginTop: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          {qrSrc ? (
            <div style={{ background: '#fff', padding: 7, borderRadius: 12, boxShadow: '0 2px 8px rgba(15,23,42,.18)' }}>
              <img src={qrSrc} alt="UPI QR" style={{ width: 76, height: 76, display: 'block' }} />
            </div>
          ) : null}
          {inv.bankDetails?.upiId ? <div style={{ fontSize: 9.5, opacity: 0.8, textAlign: 'center', letterSpacing: 0.4 }}>{inv.bankDetails.upiId}</div> : null}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: '26px 28px', background: dark ? cus.colors.background : 'transparent', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontFamily: fontStack(cus.fonts.headingFamily), fontSize: 27, fontWeight: 800, color: cus.colors.primary, textTransform: 'uppercase', letterSpacing: 2, lineHeight: 1.1 }}>
              {cus.labels.invoice || 'Invoice'}
            </div>
            <span style={{ display: 'inline-block', marginTop: 7, fontSize: 11, fontWeight: 700, background: alpha(cus.colors.primary, 0.09), color: cus.colors.primary, borderRadius: 999, padding: '3px 11px' }}>
              #{inv.number || '—'}
            </span>
          </div>
          {inv.status === 'paid' ? (
            <span style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', color: '#047857', background: 'rgba(4,120,87,.1)', borderRadius: 999, padding: '4px 11px' }}>
              ✓ Paid
            </span>
          ) : null}
        </div>

        <div style={{ marginTop: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <span style={{ width: 14, height: 3, borderRadius: 2, background: cus.colors.primary }} />
            <span style={{ fontSize: 9.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.4, color: cus.colors.primary }}>{cus.labels.billTo || 'Bill To'}</span>
          </div>
          <div style={{ fontWeight: 700, fontSize: 13.5 }}>{inv.client?.name || '—'}</div>
          <div style={{ color: cus.colors.muted, fontSize: 11, whiteSpace: 'pre-line', marginTop: 3, lineHeight: 1.55 }}>
            {[inv.client?.address, [inv.client?.city, inv.client?.state, inv.client?.pincode].filter(Boolean).join(', ')].filter(Boolean).join('\n')}
          </div>
          <div style={{ color: cus.colors.muted, fontSize: 11, marginTop: 4 }}>
            {inv.client?.email ? <div>{inv.client.email}</div> : null}
            {inv.client?.phone ? <div>{inv.client.phone}</div> : null}
            {inv.client?.gstin ? <div>GSTIN: <b style={{ color: cus.colors.text }}>{inv.client.gstin}</b></div> : null}
          </div>
        </div>

        <div style={{ marginTop: 18 }}>
          <ItemsTable inv={inv} cus={cus} totals={totals} />
        </div>

        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <TotalsTable inv={inv} cus={cus} totals={totals} showWords={false} />
          <SectionFlow inv={inv} cus={cus} totals={totals} qrSrc={null} />
        </div>
      </div>
    </div>
  )
}

/* ==================================================================== */
/* ENGINE 3 — Minimal / editorial (Minimal, Elegant, Freelancer)         */
/* ==================================================================== */

export function MinimalLayout({ inv, cus, totals, qrSrc, variant = {} }) {
  const { ruleColor } = variant
  const rule = ruleColor || cus.table.borderColor
  return (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', flex: 1 }}>
      {inv.status === 'paid' && cus.labels.paidStamp ? <StatusStamp inv={inv} cus={cus} /> : null}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontFamily: fontStack(cus.fonts.headingFamily), fontWeight: 800, fontSize: 28, letterSpacing: 4, textTransform: 'uppercase', lineHeight: 1.1 }}>
            {cus.labels.invoice || 'Invoice'}
          </div>
          <span style={{ display: 'inline-block', marginTop: 8, fontSize: 11, fontWeight: 700, color: cus.colors.primary, letterSpacing: 0.5 }}>
            #{inv.number || '—'}
          </span>
        </div>
        <LogoBox inv={inv} cus={cus} />
      </div>

      <div style={{ borderTop: `3px solid ${cus.colors.primary}`, margin: '18px 0 16px' }} />

      <MetaGrid inv={inv} cus={cus} cols={4} />

      <div style={{ margin: '22px 0 18px', display: 'flex', gap: 40, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <span style={{ width: 14, height: 3, borderRadius: 2, background: cus.colors.primary }} />
            <span style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: 1.4, textTransform: 'uppercase', color: cus.colors.primary }}>From</span>
          </div>
          <div style={{ fontWeight: 700, fontSize: 13.5 }}>{inv.business?.name}</div>
          <div style={{ color: cus.colors.muted, fontSize: 11, whiteSpace: 'pre-line', marginTop: 3, lineHeight: 1.55 }}>
            {[inv.business?.address, [inv.business?.city, inv.business?.state, inv.business?.pincode].filter(Boolean).join(', ')].filter(Boolean).join('\n')}
          </div>
          {inv.business?.taxId ? <div style={{ fontSize: 11, marginTop: 5 }}><span style={{ color: cus.colors.muted }}>Tax ID: </span><b>{inv.business.taxId}</b></div> : null}
        </div>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <span style={{ width: 14, height: 3, borderRadius: 2, background: cus.colors.primary }} />
            <span style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: 1.4, textTransform: 'uppercase', color: cus.colors.primary }}>{cus.labels.billTo || 'Bill To'}</span>
          </div>
          <div style={{ fontWeight: 700, fontSize: 13.5 }}>{inv.client?.name}</div>
          <div style={{ color: cus.colors.muted, fontSize: 11, whiteSpace: 'pre-line', marginTop: 3, lineHeight: 1.55 }}>
            {[inv.client?.address, [inv.client?.city, inv.client?.state, inv.client?.pincode].filter(Boolean).join(', ')].filter(Boolean).join('\n')}
          </div>
          {inv.client?.gstin ? <div style={{ fontSize: 11, marginTop: 5 }}><span style={{ color: cus.colors.muted }}>GSTIN: </span><b>{inv.client.gstin}</b></div> : null}
        </div>
      </div>

      <ItemsTable inv={inv} cus={cus} totals={totals} card={false} />

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20, gap: 20, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <SectionFlow inv={inv} cus={cus} totals={totals} qrSrc={qrSrc} />
        </div>
        <TotalsTable inv={inv} cus={cus} totals={totals} showWords={false} />
      </div>
    </div>
  )
}

/* ==================================================================== */
/* ENGINE 4 — Thermal receipt (80mm)                                    */
/* ==================================================================== */

export function ThermalLayout({ inv, cus, totals }) {
  const cur = inv.currency || 'INR'
  const sym = cur === 'INR' ? '₹' : cur + ' '
  const dash = { borderTop: '1px dashed #94a3b8', margin: '7px 0' }
  return (
    <div style={{ fontFamily: "'Courier New', monospace", fontSize: 10.5, lineHeight: 1.5, padding: 6 }}>
      <div style={{ textAlign: 'center' }}>
        {inv.business?.logo ? <img src={inv.business.logo} alt="" style={{ maxHeight: 40, maxWidth: 86, objectFit: 'contain' }} /> : null}
        <div style={{ fontWeight: 800, fontSize: 13.5, letterSpacing: 1 }}>{inv.business?.name}</div>
        <div style={{ fontSize: 9.5, marginTop: 2 }}>{[inv.business?.address, inv.business?.city].filter(Boolean).join(', ')}</div>
        <div style={{ fontSize: 9.5 }}>{inv.business?.phone}</div>
        {inv.business?.taxId ? <div style={{ fontSize: 9.5, marginTop: 2 }}>GSTIN: {inv.business.taxId}</div> : null}
      </div>
      <div style={dash} />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10 }}>
        <span>{cus.labels.invoice || 'INVOICE'}</span>
        <span>#{inv.number}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10 }}>
        <span>Date</span>
        <span>{formatDate(inv.issueDate)}</span>
      </div>
      {inv.client?.name ? <div style={{ fontSize: 10, marginTop: 3 }}>Bill To: {inv.client.name}</div> : null}
      <div style={dash} />
      {totals.lines.map((l, i) => (
        <div key={l._id || i} style={{ marginBottom: 6 }}>
          <div style={{ fontWeight: 700 }}>{l.description}</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10 }}>
            <span>{l.quantity} {l.unit !== 'Nos' ? l.unit : ''} x {sym}{formatNumber(l.rate, cur)}{l.taxRate ? ` +${l.taxRate}%` : ''}</span>
            <span style={{ fontWeight: 700 }}>{sym}{formatNumber(l.net, cur)}</span>
          </div>
        </div>
      ))}
      <div style={dash} />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10 }}>
        <span>Subtotal</span>
        <span>{sym}{formatNumber(totals.subtotal, cur)}</span>
      </div>
      {totals.taxBreakdown.map((t) => (
        <div key={t.name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10 }}>
          <span>{t.name}</span>
          <span>{sym}{formatNumber(t.amount, cur)}</span>
        </div>
      ))}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 13, marginTop: 4, borderTop: '2px solid #0f172a', paddingTop: 5 }}>
        <span>TOTAL</span>
        <span>{sym}{formatNumber(totals.total, cur)}</span>
      </div>
      {totals.paid > 0 ? (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10 }}>
          <span>Paid</span>
          <span>{sym}{formatNumber(totals.paid, cur)}</span>
        </div>
      ) : null}
      <div style={dash} />
      {inv.bankDetails?.upiId ? (
        <div style={{ textAlign: 'center', fontSize: 9.5 }}>
          UPI · {inv.bankDetails.upiId}
          {inv.showUPIQR !== false ? <UPIQRSmall inv={inv} total={totals.total} /> : null}
        </div>
      ) : null}
      <div style={{ textAlign: 'center', marginTop: 10, fontSize: 10 }}>
        {inv.notes || 'Thank you. Please visit again!'}
      </div>
      <div style={{ textAlign: 'center', fontSize: 8, color: '#94a3b8', marginTop: 8, letterSpacing: 1 }}>GENERATED WITH INVIX</div>
    </div>
  )
}

function UPIQRSmall({ inv, total }) {
  const [src, setSrc] = React.useState('')
  React.useEffect(() => {
    let alive = true
    const uri = upiURI({ pa: inv.bankDetails?.upiId, pn: inv.business?.name, am: total || undefined })
    qrDataURL(uri, { size: 100, dark: '#0f172a' }).then((d) => alive && setSrc(d))
    return () => {
      alive = false
    }
  }, [inv.bankDetails?.upiId, inv.business?.name, total])
  return src ? <div style={{ display: 'flex', justifyContent: 'center', marginTop: 5 }}><img src={src} alt="QR" width="82" height="82" style={{ border: '1px solid #e2e8f0', borderRadius: 4 }} /></div> : null
}

/* ==================================================================== */
/* ENGINE 5 — Statutory GST Tax Invoice                                 */
/* ==================================================================== */

export function GSTLayout({ inv, cus, totals }) {
  const cur = inv.currency || 'INR'
  const sym = cur === 'INR' ? '₹' : cur + ' '
  const cell = { border: '1px solid #cbd5e1', padding: '6px 8px', fontSize: 10.5 }
  const intraState = !inv.client?.stateCode || !inv.business?.stateCode ? true : inv.client.stateCode === inv.business.stateCode
  const title = cus.labels.invoice || 'TAX INVOICE'

  return (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', flex: 1 }}>
      {inv.status === 'paid' && cus.labels.paidStamp ? <StatusStamp inv={inv} cus={cus} /> : null}

      {/* header */}
      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        <LogoBox inv={inv} cus={cus} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: 15.5, letterSpacing: 0.2 }}>{inv.business?.name}</div>
          <div style={{ fontSize: 10, color: cus.colors.muted, whiteSpace: 'pre-line', marginTop: 3, lineHeight: 1.5 }}>
            {[inv.business?.address, [inv.business?.city, inv.business?.state, inv.business?.pincode].filter(Boolean).join(', ')].filter(Boolean).join('\n')}
          </div>
          <div style={{ fontSize: 10, marginTop: 4 }}>
            GSTIN: <b>{inv.business?.taxId || '—'}</b>
            {inv.business?.phone ? <span> · {inv.business.phone}</span> : null}
            {inv.business?.email ? <span> · {inv.business.email}</span> : null}
          </div>
        </div>
        <div style={{ border: `2px solid ${cus.colors.primary}`, outline: `1px solid ${alpha(cus.colors.primary, 0.4)}`, outlineOffset: 2, padding: '6px 15px', fontWeight: 800, letterSpacing: 1.5, fontSize: 12, textTransform: 'uppercase', color: cus.colors.primary, alignSelf: 'center' }}>
          {title}
        </div>
      </div>

      {/* meta row */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 12 }}>
        <tbody>
          <tr>
            <td style={cell}><b>Invoice No:</b> {inv.number}</td>
            <td style={cell}><b>Date:</b> {formatDate(inv.issueDate)}</td>
            <td style={cell}><b>Due Date:</b> {formatDate(inv.dueDate)}</td>
          </tr>
          <tr>
            <td style={cell}><b>Place of Supply:</b> {inv.client?.state || '—'} ({inv.client?.stateCode || '—'})</td>
            <td style={cell}><b>PO No:</b> {inv.poNumber || '—'}</td>
            <td style={cell}><b>Terms:</b> Net {inv.paymentTerms ?? 15} days</td>
          </tr>
        </tbody>
      </table>

      {/* buyer box */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8 }}>
        <tbody>
          <tr>
            <td style={{ ...cell, width: '50%', verticalAlign: 'top' }}>
              <div style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, color: cus.colors.primary, marginBottom: 4 }}>Details of Receiver (Billed to)</div>
              <div style={{ fontWeight: 700, marginTop: 2 }}>{inv.client?.name}</div>
              <div style={{ fontSize: 10, color: cus.colors.muted, whiteSpace: 'pre-line', lineHeight: 1.5 }}>
                {[inv.client?.address, [inv.client?.city, inv.client?.state, inv.client?.pincode].filter(Boolean).join(', ')].filter(Boolean).join('\n')}
              </div>
              <div style={{ fontSize: 10, marginTop: 3 }}>GSTIN: <b>{inv.client?.gstin || '—'}</b></div>
            </td>
            <td style={{ ...cell, width: '50%', verticalAlign: 'top' }}>
              <div style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, color: cus.colors.primary, marginBottom: 4 }}>Details of Consignee (Shipped to)</div>
              <div style={{ fontWeight: 700, marginTop: 2 }}>{inv.shipTo?.name || inv.client?.name || '—'}</div>
              <div style={{ fontSize: 10, color: cus.colors.muted, whiteSpace: 'pre-line', lineHeight: 1.5 }}>
                {[inv.shipTo?.address || inv.client?.address, inv.shipTo?.city || inv.client?.city, inv.shipTo?.state || inv.client?.state].filter(Boolean).join(', ')}
              </div>
              <div style={{ fontSize: 10, marginTop: 3 }}>GSTIN: <b>{inv.shipTo?.gstin || inv.client?.gstin || '—'}</b></div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* items */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 10 }}>
        <thead>
          <tr style={{ background: cus.colors.primary, color: '#fff' }}>
            {['#', 'Description of Goods', 'HSN/SAC', 'Qty', 'Unit', 'Rate', 'Disc', 'Taxable', 'CGST', 'SGST/IGST', 'Amount'].map((h) => (
              <th key={h} style={{ border: '1px solid #cbd5e1', padding: '5px 6px', fontSize: 8.5, textAlign: 'left', textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {totals.lines.map((l, i) => {
            const rate = Number(l.taxRate) || 0
            const half = rate / 2
            return (
              <tr key={l._id || i} style={{ background: i % 2 === 1 ? alpha(cus.colors.primary, 0.03) : 'transparent' }}>
                <td style={cell}>{i + 1}</td>
                <td style={{ ...cell, fontWeight: 600 }}>{l.description}</td>
                <td style={cell}>{l.hsn || '—'}</td>
                <td style={{ ...cell, textAlign: 'right' }}>{l.quantity}</td>
                <td style={cell}>{l.unit}</td>
                <td style={{ ...cell, textAlign: 'right' }}>{sym}{formatNumber(l.rate, cur)}</td>
                <td style={{ ...cell, textAlign: 'right' }}>{l.discountValue ? (l.discountType === 'percent' ? `${l.discountValue}%` : sym + formatNumber(l.discountValue, cur)) : '—'}</td>
                <td style={{ ...cell, textAlign: 'right' }}>{sym}{formatNumber(l.net, cur)}</td>
                <td style={{ ...cell, textAlign: 'right' }}>{rate ? `${intraState ? half : rate}% = ${sym}${formatNumber(l.taxAmount, cur)}` : '—'}</td>
                <td style={{ ...cell, textAlign: 'right' }}>{rate ? (intraState ? `SGST ${half}%` : 'IGST') : '—'}</td>
                <td style={{ ...cell, textAlign: 'right', fontWeight: 700 }}>{sym}{formatNumber(l.net + l.taxAmount, cur)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {/* totals */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 10 }}>
        <tbody>
          <tr>
            <td style={{ ...cell, width: '55%', verticalAlign: 'top', border: 'none', padding: 0, paddingRight: 12 }}>
              <div style={{ fontSize: 10.5 }}><b>Amount in words:</b> {amountInWords(totals.total, cur, 'indian')}</div>
              {totals.paid > 0 ? <div style={{ fontSize: 10.5, marginTop: 3 }}><b>Amount paid:</b> {formatMoney(totals.paid, cur)} · <b>Balance:</b> {formatMoney(totals.balance, cur)}</div> : null}
              <div style={{ marginTop: 10 }}>
                <BankBlock inv={inv} cus={cus} />
              </div>
            </td>
            <td style={{ ...cell, border: 'none', padding: 0, minWidth: 250 }}>
              <div style={{ background: alpha(cus.colors.primary, 0.055), border: `1px solid ${alpha(cus.colors.primary, 0.12)}`, borderRadius: 10, padding: '10px 13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '2px 0' }}><span style={{ color: cus.colors.muted }}>Taxable Value</span><span style={{ fontWeight: 600 }}>{sym}{formatNumber(totals.subtotal, cur)}</span></div>
                {totals.taxBreakdown.map((t) => (
                  <div key={t.name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '2px 0' }}><span style={{ color: cus.colors.muted }}>{t.name}</span><span style={{ fontWeight: 600 }}>{sym}{formatNumber(t.amount, cur)}</span></div>
                ))}
                <div style={{ borderTop: `2px solid ${cus.colors.primary}`, marginTop: 5, paddingTop: 6, display: 'flex', justifyContent: 'space-between', fontWeight: 800 }}>
                  <span style={{ fontSize: 11.5, textTransform: 'uppercase', letterSpacing: 1, color: cus.colors.primary }}>Total</span>
                  <span style={{ fontSize: 14 }}>{formatMoney(totals.total, cur)}</span>
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* declaration */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16, gap: 24 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.2, color: cus.colors.primary }}>Declaration</div>
          <div style={{ fontSize: 9.5, color: cus.colors.muted, lineHeight: 1.55 }}>
            We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct. This is a computer-generated invoice.
          </div>
          {inv.notes ? <div style={{ fontSize: 9.5, marginTop: 7 }}><b>Notes:</b> <span style={{ color: cus.colors.muted }}>{inv.notes}</span></div> : null}
        </div>
        <div style={{ minWidth: 200 }}>
          <SignatureBlock inv={inv} cus={cus} />
        </div>
      </div>
    </div>
  )
}

export { computeTotals, PAPER_PX }
