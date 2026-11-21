import { deepClone } from '../utils/id'

export const DEFAULT_TEMPLATE_ID = 'classic'

/* Google-font families available in the studio */
export const FONT_OPTIONS = [
  { value: 'Inter', label: 'Inter', stack: "Inter, sans-serif" },
  { value: 'Roboto', label: 'Roboto', stack: "Roboto, sans-serif" },
  { value: 'Open Sans', label: 'Open Sans', stack: "'Open Sans', sans-serif" },
  { value: 'Lato', label: 'Lato', stack: "Lato, sans-serif" },
  { value: 'Montserrat', label: 'Montserrat', stack: "Montserrat, sans-serif" },
  { value: 'Poppins', label: 'Poppins', stack: "Poppins, sans-serif" },
  { value: 'Raleway', label: 'Raleway', stack: "Raleway, sans-serif" },
  { value: 'Nunito', label: 'Nunito', stack: "Nunito, sans-serif" },
  { value: 'Work Sans', label: 'Work Sans', stack: "'Work Sans', sans-serif" },
  { value: 'Source Sans 3', label: 'Source Sans 3', stack: "'Source Sans 3', sans-serif" },
  { value: 'Rubik', label: 'Rubik', stack: "Rubik, sans-serif" },
  { value: 'Quicksand', label: 'Quicksand', stack: "Quicksand, sans-serif" },
  { value: 'Merriweather', label: 'Merriweather', serif: true, stack: "Merriweather, serif" },
  { value: 'Playfair Display', label: 'Playfair Display', serif: true, stack: "'Playfair Display', serif" },
  { value: 'Georgia', label: 'Georgia', serif: true, stack: "Georgia, serif" },
  { value: 'Courier New', label: 'Courier New', mono: true, stack: "'Courier New', monospace" },
]

export const fontStack = (family) => (FONT_OPTIONS.find((f) => f.value === family)?.stack) || 'Inter, sans-serif'

export const PALETTES = [
  { name: 'Indigo', primary: '#4f46e5', secondary: '#8b5cf6' },
  { name: 'Midnight', primary: '#1e293b', secondary: '#475569' },
  { name: 'Emerald', primary: '#059669', secondary: '#34d399' },
  { name: 'Ocean', primary: '#0369a1', secondary: '#38bdf8' },
  { name: 'Rose', primary: '#e11d48', secondary: '#fb7185' },
  { name: 'Amber', primary: '#d97706', secondary: '#fbbf24' },
  { name: 'Violet', primary: '#7c3aed', secondary: '#c084fc' },
  { name: 'Slate', primary: '#334155', secondary: '#94a3b8' },
  { name: 'Teal', primary: '#0d9488', secondary: '#5eead4' },
  { name: 'Crimson', primary: '#b91c1c', secondary: '#f87171' },
]

export const SECTION_KEYS = ['amountWords', 'notes', 'terms', 'bank', 'qr', 'signature', 'stamp']
export const SECTION_LABELS = {
  amountWords: 'Amount in words',
  notes: 'Notes',
  terms: 'Terms & conditions',
  bank: 'Bank details',
  qr: 'UPI / QR code',
  signature: 'Signature',
  stamp: 'Company stamp',
}

export const COLUMN_DEFS = [
  { key: 'description', label: 'Description', visible: true, required: true },
  { key: 'hsn', label: 'HSN/SAC', visible: true },
  { key: 'qty', label: 'Qty', visible: true, required: true },
  { key: 'unit', label: 'Unit', visible: false },
  { key: 'rate', label: 'Rate', visible: true, required: true },
  { key: 'discount', label: 'Discount', visible: true },
  { key: 'tax', label: 'Tax', visible: true },
  { key: 'amount', label: 'Amount', visible: true, required: true },
]

export const PAPER_SIZES = ['A4', 'A5', 'Letter']
export const ORIENTATIONS = ['portrait', 'landscape']

/**
 * The complete customization JSON. Every template starts from this shape;
 * the Customize Studio binds directly to these keys.
 * Template overrides are deep-merged so partials (e.g. colors: {primary}) never
 * wipe sibling defaults like text/background.
 */
function deepMerge(base, over) {
  if (!over || typeof over !== 'object' || Array.isArray(over)) return over
  const out = { ...base }
  for (const k of Object.keys(over)) {
    out[k] = base && typeof base[k] === 'object' && base[k] !== null && !Array.isArray(base[k]) && over[k] && typeof over[k] === 'object' && !Array.isArray(over[k]) ? deepMerge(base[k], over[k]) : over[k]
  }
  return out
}

export function defaultCustomization(overrides = {}) {
  return deepClone(deepMerge(BASE_CUSTOMIZATION, overrides))
}

const BASE_CUSTOMIZATION = {
  colors: { primary: '#4f46e5', secondary: '#8b5cf6', text: '#1e293b', muted: '#64748b', background: '#ffffff', headerText: '#ffffff' },
  fonts: { family: 'Inter', headingFamily: 'Inter', size: 'md', lineHeight: 1.5 },
  logo: { position: 'left', size: 'md' },
  sections: { order: [...SECTION_KEYS], hidden: [] },
  columns: COLUMN_DEFS.map((c) => ({ ...c })),
  paper: { size: 'A4', orientation: 'portrait', margin: 'normal' },
  watermark: { text: '', image: '', opacity: 0.08, position: 'center', size: 'md' },
  labels: { invoice: 'Invoice', billTo: 'Bill To', items: 'Items', notes: 'Notes', terms: 'Terms & Conditions', paidStamp: '' },
  table: { style: 'minimal', zebra: false, headerBg: true, borderColor: '#e2e8f0' },
  border: { enabled: false, width: 1, color: '#e2e8f0', radius: 8 },
  footer: { show: true, text: 'Generated with Invix' },
}

/* Margin presets in mm */
export const MARGIN_MM = { none: 0, tight: 10, normal: 16, wide: 24 }
export const LOGO_SIZES = { sm: 64, md: 96, lg: 140 }
export const FONT_SCALE = { xs: 12, sm: 13, md: 14, lg: 15.5, xl: 17 }
export const LINE_HEIGHTS = { compact: 1.3, normal: 1.5, relaxed: 1.7 }

export const WATERMARK_POSITIONS = { center: 'Center', tl: 'Top left', tr: 'Top right', bl: 'Bottom left', br: 'Bottom right' }
export const LOGO_POSITIONS = { left: 'Left', center: 'Center', right: 'Right' }
export const TABLE_STYLES = { minimal: 'Minimal', striped: 'Striped', bordered: 'Bordered' }

export const defaultTemplateId = () => DEFAULT_TEMPLATE_ID

/** Deep-merge partial customization into the template's default */
export function resolveCustomization(tplDefaults, userCustomization) {
  const base = defaultCustomization(tplDefaults || {})
  if (!userCustomization) return base
  const out = base
  for (const key of Object.keys(userCustomization)) {
    if (userCustomization[key] && typeof userCustomization[key] === 'object' && !Array.isArray(userCustomization[key]) && base[key] && typeof base[key] === 'object') {
      out[key] = { ...base[key], ...userCustomization[key] }
    } else {
      out[key] = userCustomization[key]
    }
  }
  return out
}
