import React from 'react'
import { PaperFrame, useTemplateDoc } from './shared'
import { BandLayout, SidebarLayout, MinimalLayout, ThermalLayout, GSTLayout } from './layouts'
import { defaultTemplateId } from './schema'

/** Universal doc renderer: resolves customization + computes totals + hands to the def's engine */
export function TemplateDoc({ def, invoice, customization }) {
  const { cus, totals, qrSrc } = useTemplateDoc({ inv: invoice, customization, engineDefaults: def.defaults })
  return (
    <PaperFrame cus={cus} widthOverride={def.widthOverride}>
      {def.render({ inv: invoice, cus, totals, qrSrc })}
    </PaperFrame>
  )
}

const band = (variant) => (p) => <BandLayout {...p} variant={variant} />
const sidebar = (variant) => (p) => <SidebarLayout {...p} variant={variant} />
const minimal = (variant) => (p) => <MinimalLayout {...p} variant={variant} />
const gst = (p) => <GSTLayout {...p} />
const thermal = (p) => <ThermalLayout {...p} />

export const TEMPLATES = [
  {
    id: 'classic',
    name: 'Classic',
    category: 'Business',
    description: 'Timeless serif-accented layout with a strong header band.',
    defaults: { colors: { primary: '#1e3a5f', secondary: '#b45309' }, fonts: { family: 'Georgia', headingFamily: 'Georgia', size: 'md', lineHeight: 1.5 }, labels: { invoice: 'Invoice', billTo: 'Bill To', notes: 'Notes', terms: 'Terms & Conditions', paidStamp: 'PAID' }, table: { style: 'minimal', zebra: false, headerBg: false, borderColor: '#e2d8c8' } },
    render: band({ headerFill: 'color', heroSize: 'md' }),
  },
  {
    id: 'modern',
    name: 'Modern',
    category: 'Business',
    description: 'Bold vertical sidebar with a clean content column.',
    defaults: { colors: { primary: '#4f46e5', secondary: '#8b5cf6' }, fonts: { family: 'Inter', headingFamily: 'Inter', size: 'md', lineHeight: 1.5 }, labels: { invoice: 'Invoice', billTo: 'Bill To', notes: 'Notes', terms: 'Terms & Conditions', paidStamp: 'PAID' } },
    render: sidebar({ width: 32 }),
  },
  {
    id: 'minimal',
    name: 'Minimal',
    category: 'Minimal',
    description: 'Whitespace-first editorial design with hairline rules.',
    defaults: { colors: { primary: '#0f172a', secondary: '#64748b' }, fonts: { family: 'Inter', headingFamily: 'Inter', size: 'md', lineHeight: 1.6 }, table: { style: 'minimal', zebra: false, headerBg: false, borderColor: '#e2e8f0' }, labels: { invoice: 'Invoice', billTo: 'Bill To', notes: 'Notes', terms: 'Terms', paidStamp: 'PAID' } },
    render: minimal({}),
  },
  {
    id: 'corporate',
    name: 'Corporate',
    category: 'Business',
    description: 'Formal navy design for enterprises and B2B billing.',
    defaults: { colors: { primary: '#1f2937', secondary: '#6b7280' }, fonts: { family: 'Open Sans', headingFamily: 'Open Sans', size: 'md', lineHeight: 1.5 }, table: { style: 'bordered', zebra: false, headerBg: true, borderColor: '#d1d5db' }, labels: { invoice: 'Invoice', billTo: 'Bill To', notes: 'Notes', terms: 'Terms & Conditions', paidStamp: 'PAID' } },
    render: band({ headerFill: 'color' }),
  },
  {
    id: 'creative',
    name: 'Creative',
    category: 'Creative',
    description: 'Playful gradient sidebar for designers and studios.',
    defaults: { colors: { primary: '#db2777', secondary: '#a855f7' }, fonts: { family: 'Poppins', headingFamily: 'Poppins', size: 'md', lineHeight: 1.55 }, labels: { invoice: 'Invoice', billTo: 'Invoice For', notes: 'Notes', terms: 'Terms', paidStamp: 'PAID' } },
    render: sidebar({ width: 36, sidebarBg: 'linear-gradient(160deg, #db2777, #a855f7)' }),
  },
  {
    id: 'elegant',
    name: 'Elegant',
    category: 'Minimal',
    description: 'Refined serif typography with delicate gold accents.',
    defaults: { colors: { primary: '#92702a', secondary: '#b98e2f' }, fonts: { family: 'Playfair Display', headingFamily: 'Playfair Display', size: 'md', lineHeight: 1.7 }, table: { style: 'minimal', zebra: false, headerBg: false, borderColor: '#e5ddcc' }, labels: { invoice: 'Invoice', billTo: 'Prepared For', notes: 'Notes', terms: 'Terms', paidStamp: 'PAID' } },
    render: minimal({ serifHead: true, ruleColor: '#d8c69a' }),
  },
  {
    id: 'bold',
    name: 'Bold',
    category: 'Creative',
    description: 'Oversized type and a confident color block.',
    defaults: { colors: { primary: '#111827', secondary: '#f59e0b' }, fonts: { family: 'Montserrat', headingFamily: 'Montserrat', size: 'lg', lineHeight: 1.45 }, table: { style: 'striped', zebra: true, headerBg: true, borderColor: '#e5e7eb' }, labels: { invoice: 'Invoice', billTo: 'Bill To', notes: 'Notes', terms: 'Terms', paidStamp: 'PAID' } },
    render: band({ headerFill: 'color', heroSize: 'lg' }),
  },
  {
    id: 'gradient',
    name: 'Gradient',
    category: 'Creative',
    description: 'Smooth two-tone gradient header, modern SaaS feel.',
    defaults: { colors: { primary: '#0ea5e9', secondary: '#6366f1' }, fonts: { family: 'Rubik', headingFamily: 'Rubik', size: 'md', lineHeight: 1.5 }, labels: { invoice: 'Invoice', billTo: 'Bill To', notes: 'Notes', terms: 'Terms', paidStamp: 'PAID' } },
    render: band({ headerFill: 'gradient' }),
  },
  {
    id: 'dark',
    name: 'Dark',
    category: 'Creative',
    description: 'Full dark mode invoice with electric accents.',
    defaults: { colors: { primary: '#38bdf8', secondary: '#a78bfa', text: '#e2e8f0', muted: '#94a3b8', background: '#0f172a', headerText: '#ffffff' }, fonts: { family: 'Work Sans', headingFamily: 'Work Sans', size: 'md', lineHeight: 1.5 }, table: { style: 'minimal', zebra: true, headerBg: true, borderColor: '#334155' }, labels: { invoice: 'Invoice', billTo: 'Bill To', notes: 'Notes', terms: 'Terms', paidStamp: 'PAID' } },
    render: sidebar({ width: 34, sidebarBg: '#1e293b' }),
  },
  {
    id: 'compact',
    name: 'Compact',
    category: 'Business',
    description: 'Dense layout that fits more line items per page.',
    defaults: { colors: { primary: '#334155', secondary: '#64748b' }, fonts: { family: 'Lato', headingFamily: 'Lato', size: 'sm', lineHeight: 1.35 }, paper: { size: 'A4', orientation: 'portrait', margin: 'tight' }, table: { style: 'bordered', zebra: true, headerBg: true, borderColor: '#d1d5db' }, labels: { invoice: 'Invoice', billTo: 'Bill To', notes: 'Notes', terms: 'Terms', paidStamp: 'PAID' } },
    render: band({ headerFill: 'color', compact: true }),
  },
  {
    id: 'thermal',
    name: 'Thermal Receipt',
    category: 'Minimal',
    description: '80mm POS receipt style for retail counters.',
    widthOverride: 320,
    defaults: { paper: { size: 'A5', orientation: 'portrait', margin: 'tight' }, fonts: { family: 'Courier New', headingFamily: 'Courier New', size: 'sm', lineHeight: 1.4 }, footer: { show: false, text: '' }, labels: { invoice: 'INVOICE', billTo: 'Bill To', notes: 'Notes', terms: 'Terms', paidStamp: '' } },
    render: thermal,
  },
  {
    id: 'freelancer',
    name: 'Freelancer',
    category: 'Freelancer',
    description: 'Friendly layout with a prominent "pay me" bank block.',
    defaults: { colors: { primary: '#0d9488', secondary: '#f59e0b' }, fonts: { family: 'Nunito', headingFamily: 'Nunito', size: 'md', lineHeight: 1.55 }, labels: { invoice: 'Invoice', billTo: 'Bill To', notes: 'A quick note', terms: 'Payment info', paidStamp: 'PAID' } },
    render: minimal({}),
  },
  {
    id: 'agency',
    name: 'Agency',
    category: 'Freelancer',
    description: 'Big-brand look with a deep accent sidebar.',
    defaults: { colors: { primary: '#111827', secondary: '#f97316' }, fonts: { family: 'Raleway', headingFamily: 'Raleway', size: 'md', lineHeight: 1.5 }, labels: { invoice: 'Invoice', billTo: 'Client', notes: 'Project notes', terms: 'Terms', paidStamp: 'PAID' } },
    render: sidebar({ width: 38, sidebarBg: '#111827' }),
  },
  {
    id: 'gst',
    name: 'GST Tax Invoice',
    category: 'GST',
    description: 'Statutory format with HSN, CGST/SGST split and declaration.',
    defaults: { colors: { primary: '#065f46', secondary: '#10b981' }, fonts: { family: 'Source Sans 3', headingFamily: 'Source Sans 3', size: 'md', lineHeight: 1.45 }, labels: { invoice: 'TAX INVOICE', billTo: 'Bill To', notes: 'Notes', terms: 'Terms', paidStamp: 'PAID' } },
    render: gst,
  },
  {
    id: 'proforma',
    name: 'Proforma / Quotation',
    category: 'GST',
    description: 'Estimate-style proforma with validity note and soft totals.',
    defaults: { colors: { primary: '#0369a1', secondary: '#0ea5e9' }, fonts: { family: 'Quicksand', headingFamily: 'Quicksand', size: 'md', lineHeight: 1.55 }, table: { style: 'striped', zebra: true, headerBg: true, borderColor: '#bae6fd' }, labels: { invoice: 'PROFORMA INVOICE', billTo: 'Prospective Client', notes: 'Scope notes', terms: 'Terms', paidStamp: '' } },
    render: band({ headerFill: 'gradient' }),
  },
]

export const TEMPLATE_CATEGORIES = ['All', 'Business', 'Freelancer', 'GST', 'Minimal', 'Creative']

export function getTemplate(id) {
  return TEMPLATES.find((t) => t.id === id)
}

/** Resolve any template reference (builtin id or custom template object) to a def */
export function resolveTemplateDef(templateId, customTemplates = []) {
  const custom = customTemplates.find((t) => t.id === templateId)
  if (custom) {
    const base = getTemplate(custom.basedOn) || getTemplate(defaultTemplateId())
    return { ...base, id: custom.id, name: custom.name, category: 'My Templates', isCustom: true, customRef: custom }
  }
  return getTemplate(templateId) || getTemplate(defaultTemplateId())
}

/** Render any invoice with its template + optional custom-template customization */
export function RenderInvoice({ invoice, customTemplates = [], scale = 1, className = '', style = {} }) {
  const def = resolveTemplateDef(invoice.templateId, customTemplates)
  const customization = def.isCustom ? def.customRef.customization : invoice.customization
  return (
    <div className={className} style={{ transform: `scale(${scale})`, transformOrigin: 'top left', ...style }}>
      <TemplateDoc def={def} invoice={invoice} customization={customization} />
    </div>
  )
}
