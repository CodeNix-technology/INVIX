import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Wordmark } from '../components/brand'
import { TEMPLATES, TemplateDoc } from '../templates/registry'
import { makeSampleInvoice } from './TemplatesGalleryPage'
import { useData } from '../store/data'
import { useUI, applyTheme } from '../store/ui'
import { computeTotals } from '../utils/calc'
import { formatMoney } from '../utils/currency'
import {
  IconArrowRight, IconCheck, IconMenu, IconX, IconSun, IconMoon,
  IconPalette, IconSparkle, IconPercent, IconWallet, IconRefresh,
  IconFileDown, IconLayers, IconChart, IconClock, IconBank, IconGlobe,
  IconPlus, IconMinus, IconBuilding, IconFileText, IconSearch,
} from '../components/icons'

const SHOWCASE = [
  { id: 'modern', label: 'Modern', note: 'Sidebar / editorial' },
  { id: 'gst', label: 'GST Tax', note: 'Statutory / India' },
  { id: 'minimal', label: 'Minimal', note: 'Whitespace / hairline' },
  { id: 'thermal', label: 'Thermal', note: '80mm / retail' },
]

const FEATURES = [
  {
    icon: IconPalette,
    tag: 'DESIGN',
    title: 'Fifteen templates, one studio',
    text: 'Classic, modern, GST, thermal receipts and everything between. Switch designs without losing a single line item.',
    detail: 'Every template is driven by the same schema, so changing your design never means rebuilding the invoice. Tune colors, type, spacing and sections from one customize panel.',
  },
  {
    icon: IconSparkle,
    tag: 'BUILD',
    title: 'A live builder that keeps up',
    text: 'Type on the left, watch the real document update on the right. Undo, redo, autosave and keyboard shortcuts included.',
    detail: 'Your draft is stored locally as you work. Press Ctrl/⌘ + Z to step back, Ctrl/⌘ + S to save, and Ctrl/⌘ + K to jump anywhere in the workspace.',
  },
  {
    icon: IconPercent,
    tag: 'TAX',
    title: 'GST that does the math',
    text: 'CGST, SGST and IGST splits, HSN codes, inclusive or exclusive pricing, and amounts in Indian words.',
    detail: 'Invix detects whether your client is intra-state or inter-state and splits tax automatically. Add discounts, shipping and charges without touching a spreadsheet.',
  },
  {
    icon: IconWallet,
    tag: 'PAY',
    title: 'Get paid without the chase',
    text: 'UPI QR codes, bank details, payment links and a ledger that tracks partial payments and overdue reminders.',
    detail: 'Record a payment in two clicks. The ledger recalculates balances instantly and flags invoices that need a follow-up.',
  },
  {
    icon: IconFileDown,
    tag: 'EXPORT',
    title: 'Exports that actually work',
    text: 'Pixel-perfect PDF, PNG, print and share links. Multi-page invoices paginate cleanly, even with long item lists.',
    detail: 'Every export renders the real invoice canvas. No blank pages, no cropped totals, no surprise margins.',
  },
  {
    icon: IconGlobe,
    tag: 'REACH',
    title: 'Local first, everywhere',
    text: 'Works offline in your browser, speaks English, Tamil and Hindi, and installs as a PWA on desktop or mobile.',
    detail: 'Your data lives in IndexedDB on this device until you choose to export a backup. There is no account to create and no subscription to manage.',
  },
]

const STEPS = [
  { n: '01', icon: IconPalette, title: 'Choose a design', text: 'Start from fifteen production-ready templates or customize your own. The preview is the document, not a mockup.' },
  { n: '02', icon: IconBuilding, title: 'Add the details', text: 'Set your business, client, line items, tax scheme and payment details. Invix calculates totals as you type.' },
  { n: '03', icon: IconFileText, title: 'Export and send', text: 'Download a print-ready PDF, copy a public share link, or send a PNG straight to WhatsApp.' },
  { n: '04', icon: IconChart, title: 'Track the money', text: 'The ledger shows what is outstanding, what is overdue and what has been paid — all in one view.' },
]

const FAQS = [
  { q: 'Do I need an account?', a: 'No. Invix opens straight into a local workspace. Your work is saved in this browser and you can export a full backup whenever you want.' },
  { q: 'Can I use it without internet?', a: 'Yes. The app installs as a PWA and keeps working offline. Invoice generation, tax math and PDF exports all run on your device.' },
  { q: 'Does it handle Indian GST invoices?', a: 'Yes. Add GSTIN and HSN/SAC codes, choose inclusive or exclusive tax, and Invix splits CGST/SGST or applies IGST based on state codes.' },
  { q: 'Can I customize the invoice design?', a: 'Every template has a schema-driven customize panel for colors, typography, spacing, sections and table style. Save custom templates for repeat use.' },
]

const MARQUEE_ITEMS = [
  'LOCAL-FIRST WORKSPACE', 'GST READY', '15 INVOICE TEMPLATES',
  'PDF / PNG / PRINT', 'UPI QR PAYMENTS', 'UNDO + REDO',
  'OFFLINE PWA', 'EN / TA / HI', 'NO ACCOUNT NEEDED',
]

function ActionLink({ to, children, variant = 'solid', className = '' }) {
  const base = 'group inline-flex items-center justify-center gap-3 border px-5 py-3 font-label-ui text-label-ui font-semibold transition-all'
  const skin = variant === 'solid'
    ? 'border-primary bg-primary text-on-primary hover:bg-transparent hover:text-on-surface dark:border-inverse-bg dark:bg-inverse-bg dark:text-inverse-fg dark:hover:bg-transparent dark:hover:text-on-surface'
    : variant === 'light'
      ? 'border-inverse-fg bg-inverse-fg text-inverse-bg hover:bg-transparent hover:text-inverse-fg'
      : 'border-line-strong bg-transparent text-on-surface hover:border-primary hover:bg-surface-container'
  return (
    <Link to={to} className={`${base} ${skin} ${className}`}>
      <span>{children}</span>
      <IconArrowRight size={17} className="transition-transform group-hover:translate-x-1" />
    </Link>
  )
}

function Hud({ children, className = '' }) {
  return <span className={`hud-label text-on-surface-variant ${className}`}>{children}</span>
}

function SectionHeading({ eyebrow, title, accent, copy, align = 'left' }) {
  return (
    <div className={align === 'center' ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl'}>
      <div className="flex items-center gap-3">
        <span className="h-px w-8 bg-brand-500" />
        <Hud>{eyebrow}</Hud>
      </div>
      <h2 className="mt-4 font-headline-lg text-on-surface sm:text-[2.25rem]">
        {title} {accent ? <span className="serif-accent text-brand-500">{accent}</span> : null}
      </h2>
      {copy ? <p className="mt-3 max-w-xl text-sm leading-6 text-on-surface-variant">{copy}</p> : null}
    </div>
  )
}

function InvoicePreview({ invoice, def, currency }) {
  const width = def.widthOverride || 794
  const scale = def.id === 'thermal' ? 0.92 : 0.47
  return (
    <div className="scan-field relative flex h-[430px] items-start justify-center overflow-hidden border border-line bg-surface-container p-4 sm:h-[520px] sm:p-6">
      <div className="grid-field pointer-events-none absolute inset-0 opacity-60" aria-hidden />
      <div
        className="relative origin-top-left"
        style={{ width: width * scale, height: 1120 * scale, transform: `scale(${scale})` }}
      >
        <div style={{ width }}>
          <TemplateDoc
            def={def}
            invoice={invoice}
            customization={{ colors: { primary: '#101014', secondary: '#2d81ff' } }}
          />
        </div>
      </div>
      <div className="pointer-events-none absolute bottom-3 left-3 border border-line bg-surface-container-lowest px-2 py-1">
        <Hud>{def.category} / {width}PX</Hud>
      </div>
    </div>
  )
}

function LiveDemo() {
  const settings = useData((s) => s.settings)
  const [activeId, setActiveId] = useState('modern')
  const [clientName, setClientName] = useState('Bright Retail Pvt Ltd')
  const [amount, setAmount] = useState('35000')
  const [taxMode, setTaxMode] = useState('exclusive')
  const [menuOpen, setMenuOpen] = useState(false)

  const base = useMemo(() => makeSampleInvoice(settings), [settings])
  const invoice = useMemo(() => ({
    ...base,
    client: { ...base.client, name: clientName.trim() || 'Your client' },
    taxMode,
    items: [{
      ...base.items[0],
      description: 'Brand identity & design system',
      quantity: 1,
      rate: Math.max(0, Number(amount) || 0),
      discountValue: 0,
      taxRate: 18,
      taxName: 'GST',
    }],
    showUPIQR: true,
  }), [base, clientName, amount, taxMode])

  const totals = useMemo(() => computeTotals(invoice), [invoice])
  const def = TEMPLATES.find((t) => t.id === activeId) || TEMPLATES[1]
  const currency = settings?.currency || 'INR'

  const cycle = () => {
    const i = SHOWCASE.findIndex((s) => s.id === activeId)
    setActiveId(SHOWCASE[(i + 1) % SHOWCASE.length].id)
  }

  return (
    <div className="panel reveal" id="demo">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 bg-brand-500" />
          <Hud>Live invoice sandbox</Hud>
        </div>
        <button type="button" onClick={cycle} className="flex items-center gap-2 border border-line px-2.5 py-1.5 font-label-caps text-label-caps text-on-surface-variant transition-colors hover:border-primary hover:text-on-surface" aria-label="Next template">
          Next design <IconArrowRight size={13} />
        </button>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 border-b border-line lg:border-b-0 lg:border-r">
          <InvoicePreview invoice={invoice} def={def} currency={currency} />
        </div>

        <div className="flex flex-col">
          <div className="space-y-5 border-b border-line p-5">
            <div>
              <Hud>01 / Client</Hud>
              <input
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                aria-label="Demo client name"
                placeholder="Client name"
                className="mt-2 w-full border-b border-line-strong bg-transparent pb-2 font-headline-sm text-on-surface outline-none transition-colors placeholder:text-faint focus:border-brand-500"
              />
            </div>
            <div>
              <Hud>02 / Project value</Hud>
              <div className="mt-2 flex items-center gap-2 border-b border-line-strong pb-2 focus-within:border-brand-500">
                <span className="font-headline-md text-on-surface-variant">₹</span>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  aria-label="Demo project value"
                  className="min-w-0 flex-1 bg-transparent font-financial-display text-on-surface outline-none"
                />
              </div>
            </div>
            <div>
              <Hud>03 / Tax mode</Hud>
              <div className="mt-2 grid grid-cols-2 border border-line" role="group" aria-label="Demo tax mode">
                {['exclusive', 'inclusive'].map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setTaxMode(mode)}
                    aria-pressed={taxMode === mode}
                    className={`px-2 py-2 font-label-caps text-label-caps transition-colors ${taxMode === mode ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-container'}`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="p-5">
            <Hud>Live calculation</Hud>
            <dl className="mt-3 space-y-2 font-label-ui text-label-ui">
              <div className="flex justify-between text-on-surface-variant">
                <dt>Subtotal</dt>
                <dd className="financial-tabular">{formatMoney(totals.subtotal, currency)}</dd>
              </div>
              <div className="flex justify-between text-on-surface-variant">
                <dt>GST @ 18%</dt>
                <dd className="financial-tabular">{formatMoney(totals.taxTotal, currency)}</dd>
              </div>
              <div className="flex justify-between border-t border-line pt-2 font-headline-sm text-on-surface">
                <dt>Total</dt>
                <dd className="financial-tabular">{formatMoney(totals.total, currency)}</dd>
              </div>
            </dl>
            <Link to="/builder" className="mt-5 flex items-center justify-between border border-line-strong px-3 py-2.5 font-label-ui text-label-ui font-semibold text-on-surface transition-colors hover:border-primary hover:bg-surface-container">
              Open this in the studio <IconArrowRight size={15} />
            </Link>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-px border-t border-line bg-line">
        {SHOWCASE.map((item) => {
          const tpl = TEMPLATES.find((t) => t.id === item.id)
          const active = activeId === item.id
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveId(item.id)}
              aria-pressed={active}
              className={`flex-1 px-3 py-3 text-left transition-colors ${active ? 'bg-inverse-surface text-inverse-fg' : 'bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container'}`}
            >
              <span className="block font-label-caps text-label-caps">{item.label}</span>
              <span className="mt-0.5 block truncate font-body-sm text-body-sm opacity-70">{tpl?.name || item.note}</span>
            </button>
          )
        })}
      </div>
      {menuOpen ? null : null}
    </div>
  )
}

function FeatureList() {
  const [open, setOpen] = useState(0)
  return (
    <div className="border-t border-line">
      {FEATURES.map((f, i) => {
        const active = open === i
        const FIcon = f.icon
        return (
          <div key={f.title} className="border-b border-line">
            <button
              type="button"
              onClick={() => setOpen(active ? -1 : i)}
              aria-expanded={active}
              className="group flex w-full items-start gap-4 py-5 text-left"
            >
              <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center border transition-colors ${active ? 'border-brand-500 bg-brand-500 text-white' : 'border-line text-on-surface-variant group-hover:border-primary'}`}>
                <FIcon size={17} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-3">
                  <span className="font-headline-sm text-on-surface">{f.title}</span>
                  <span className="hud-label text-brand-500">{f.tag}</span>
                </span>
                <span className="mt-1 block max-w-2xl text-sm leading-6 text-on-surface-variant">{f.text}</span>
              </span>
              <span className="mt-1 shrink-0 text-on-surface-variant">
                {active ? <IconMinus size={18} /> : <IconPlus size={18} />}
              </span>
            </button>
            {active ? (
              <div className="animate-fade-in pb-6 pl-[52px] pr-8">
                <div className="max-w-2xl border-l-2 border-brand-500 bg-surface-container-low px-4 py-3 text-sm leading-6 text-on-surface-variant">
                  {f.detail}
                </div>
              </div>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}

function Workflow() {
  const [active, setActive] = useState(0)
  const step = STEPS[active]
  const StepIcon = step.icon
  return (
    <div className="grid gap-px border border-line bg-line lg:grid-cols-[340px_minmax(0,1fr)]">
      <div className="bg-surface-container-lowest">
        {STEPS.map((s, i) => (
          <button
            key={s.n}
            type="button"
            onClick={() => setActive(i)}
            aria-pressed={active === i}
            className={`flex w-full items-start gap-4 border-b border-line px-5 py-5 text-left transition-colors last:border-b-0 ${active === i ? 'bg-inverse-surface text-inverse-fg' : 'text-on-surface-variant hover:bg-surface-container'}`}
          >
            <span className={`hud-label ${active === i ? 'text-inverse-fg/60' : 'text-faint'}`}>{s.n}</span>
            <span className="min-w-0">
              <span className="block font-label-ui text-label-ui font-semibold">{s.title}</span>
              <span className={`mt-1 block font-body-sm text-body-sm ${active === i ? 'text-inverse-fg/70' : 'text-on-surface-variant'}`}>{s.text}</span>
            </span>
          </button>
        ))}
      </div>
      <div className="relative flex min-h-[380px] flex-col justify-between overflow-hidden bg-surface-container-lowest p-6 sm:p-10">
        <div className="grid-field pointer-events-none absolute inset-0 opacity-70" aria-hidden />
        <div className="relative flex items-center justify-between">
          <Hud>Workflow / Step {step.n}</Hud>
          <span className="flex h-12 w-12 items-center justify-center border border-line bg-surface-container-lowest text-brand-500">
            <StepIcon size={22} />
          </span>
        </div>
        <div className="relative my-10 max-w-lg">
          <div className="font-headline-lg text-on-surface">{step.title}</div>
          <p className="mt-4 text-sm leading-7 text-on-surface-variant">{step.text}</p>
        </div>
        <div className="relative flex flex-wrap items-center gap-2">
          {STEPS.map((s, i) => (
            <button
              key={s.n}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`Go to step ${s.n}`}
              className={`h-2 transition-all ${active === i ? 'w-10 bg-brand-500' : 'w-4 bg-line-strong hover:bg-primary'}`}
            />
          ))}
          <span className="ml-auto hud-label text-faint">Press a step</span>
        </div>
      </div>
    </div>
  )
}

function Faq() {
  const [open, setOpen] = useState(0)
  return (
    <div className="grid gap-px border border-line bg-line lg:grid-cols-2">
      {FAQS.map((item, i) => {
        const active = open === i
        return (
          <div key={item.q} className="bg-surface-container-lowest p-5">
            <button type="button" onClick={() => setOpen(active ? -1 : i)} aria-expanded={active} className="flex w-full items-start justify-between gap-4 text-left">
              <span className="font-label-ui text-label-ui font-semibold text-on-surface">{item.q}</span>
              <span className="shrink-0 text-on-surface-variant">{active ? <IconMinus size={16} /> : <IconPlus size={16} />}</span>
            </button>
            {active ? <p className="animate-fade-in mt-3 text-sm leading-6 text-on-surface-variant">{item.a}</p> : null}
          </div>
        )
      })}
    </div>
  )
}

function TemplateStrip() {
  const ids = ['classic', 'gst', 'thermal', 'dark', 'agency', 'minimal']
  const settings = useData((s) => s.settings)
  const sample = useMemo(() => makeSampleInvoice(settings), [settings])
  return (
    <div className="grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
      {ids.map((id, i) => {
        const def = TEMPLATES.find((t) => t.id === id)
        if (!def) return null
        const width = def.widthOverride || 794
        const scale = def.id === 'thermal' ? 0.48 : 0.27
        return (
          <Link key={id} to={`/templates/${id}`} className="group bg-surface-container-lowest p-3 transition-colors hover:bg-surface-container">
            <div className="relative h-44 overflow-hidden border border-line bg-white">
              <div className="absolute left-1/2 top-0 origin-top" style={{ transform: `translateX(-50%) scale(${scale})`, width }}>
                <TemplateDoc def={def} invoice={sample} />
              </div>
              <span className="absolute bottom-2 left-2 border border-line bg-surface-container-lowest px-2 py-0.5">
                <Hud>{String(i + 1).padStart(2, '0')}</Hud>
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate font-label-ui text-label-ui font-semibold text-on-surface">{def.name}</div>
                <div className="truncate font-body-sm text-body-sm text-on-surface-variant">{def.category}</div>
              </div>
              <IconArrowRight size={16} className="shrink-0 text-on-surface-variant transition-transform group-hover:translate-x-1 group-hover:text-brand-500" />
            </div>
          </Link>
        )
      })}
    </div>
  )
}

export default function LandingPage() {
  const theme = useUI((s) => s.theme)
  const setTheme = useUI((s) => s.setTheme)
  const [menuOpen, setMenuOpen] = useState(false)
  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark')

  useEffect(() => { applyTheme(theme) }, [theme])

  useEffect(() => {
    const nodes = document.querySelectorAll('.reveal')
    if (!('IntersectionObserver' in window)) {
      nodes.forEach((n) => n.classList.add('is-visible'))
      return
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible')
          io.unobserve(entry.target)
        }
      })
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' })
    nodes.forEach((n) => io.observe(n))
    return () => io.disconnect()
  }, [])

  const toggleTheme = () => setTheme(isDark ? 'light' : 'dark')

  const navLinks = [
    ['Demo', '#demo'],
    ['Features', '#features'],
    ['Templates', '#templates'],
    ['Workflow', '#workflow'],
    ['FAQ', '#faq'],
  ]

  return (
    <div className="min-h-full bg-surface text-on-surface">
      {/* top HUD strip */}
      <div className="hidden border-b border-line bg-inverse-surface text-inverse-fg sm:block">
        <div className="mx-auto flex h-8 max-w-7xl items-center justify-between px-5">
          <Hud className="text-inverse-fg/70">Invix / Invoice tools / v2.4</Hud>
          <div className="flex items-center gap-5">
            <Hud className="text-inverse-fg/70">Local-first</Hud>
            <Hud className="text-inverse-fg/70">15 templates</Hud>
            <Hud className="text-brand-500">No account needed</Hud>
          </div>
        </div>
      </div>

      {/* nav */}
      <nav className="sticky top-0 z-40 border-b border-line bg-surface/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-5">
          <Link to="/" aria-label="Invix home"><Wordmark size={28} /></Link>
          <div className="hidden items-center gap-7 md:flex">
            {navLinks.map(([label, href]) => (
              <a key={href} href={href} className="font-label-ui text-label-ui font-medium text-on-surface-variant transition-colors hover:text-on-surface">{label}</a>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              className="flex h-9 w-9 items-center justify-center border border-line text-on-surface-variant transition-colors hover:border-primary hover:text-on-surface"
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDark ? <IconSun size={17} /> : <IconMoon size={17} />}
            </button>
            <ActionLink to="/builder" className="hidden sm:inline-flex">Open studio</ActionLink>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="flex h-9 w-9 items-center justify-center border border-line text-on-surface-variant md:hidden"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
            >
              {menuOpen ? <IconX size={18} /> : <IconMenu size={18} />}
            </button>
          </div>
        </div>
        {menuOpen ? (
          <div className="animate-slide-down border-t border-line bg-surface-container-lowest px-4 py-3 md:hidden">
            {navLinks.map(([label, href]) => (
              <a key={href} href={href} onClick={() => setMenuOpen(false)} className="block border-b border-line py-3 font-label-ui text-label-ui font-semibold text-on-surface last:border-b-0">{label}</a>
            ))}
            <Link to="/builder" onClick={() => setMenuOpen(false)} className="mt-3 flex items-center justify-between border border-primary bg-primary px-4 py-3 font-label-ui text-label-ui font-semibold text-on-primary">
              Open studio <IconArrowRight size={16} />
            </Link>
          </div>
        ) : null}
      </nav>

      {/* hero */}
      <section className="relative overflow-hidden border-b border-line">
        <div className="grid-field pointer-events-none absolute inset-0 opacity-70" aria-hidden />
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:py-24">
          <div className="reveal">
            <div className="flex flex-wrap items-center gap-3">
              <span className="border border-brand-500 px-2.5 py-1 hud-label text-brand-500">Invoice studio</span>
              <Hud>Built for freelancers & teams</Hud>
            </div>
            <h1 className="mt-6 font-headline-xl text-[clamp(2.6rem,6vw,5.4rem)] text-on-surface">
              Invoices with <span className="serif-accent text-brand-500">real craft.</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-on-surface-variant sm:text-lg">
              Design, tax and export professional invoices from one quiet workspace. No account, no setup, no friction — just a document that gets you paid.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ActionLink to="/builder">Start an invoice</ActionLink>
              <a href="#templates" className="group inline-flex items-center gap-3 border border-line-strong px-5 py-3 font-label-ui text-label-ui font-semibold text-on-surface transition-colors hover:border-primary hover:bg-surface-container">
                Browse designs <IconArrowRight size={17} className="transition-transform group-hover:translate-x-1" />
              </a>
            </div>
            <div className="mt-10 flex flex-wrap gap-x-6 gap-y-2">
              {['No account needed', 'Works offline', 'GST ready', 'PDF in one click'].map((item) => (
                <span key={item} className="flex items-center gap-2 font-label-ui text-label-ui text-on-surface-variant">
                  <IconCheck size={14} className="text-brand-500" strokeWidth={2.5} /> {item}
                </span>
              ))}
            </div>
            <div className="mt-12 flex flex-wrap gap-8 border-t border-line pt-5">
              {[
                ['15', 'templates'],
                ['3', 'languages'],
                ['0', 'accounts required'],
              ].map(([n, label]) => (
                <div key={label}>
                  <div className="font-financial-display text-on-surface">{n}</div>
                  <div className="hud-label mt-1 text-faint">{label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="reveal">
            <LiveDemo />
          </div>
        </div>
      </section>

      {/* marquee */}
      <div className="overflow-hidden border-b border-line bg-surface-container">
        <div className="marquee-track py-3">
          {[0, 1].map((copy) => (
            <div key={copy} className="flex shrink-0 items-center">
              {MARQUEE_ITEMS.map((item) => (
                <React.Fragment key={`${copy}-${item}`}>
                  <span className="hud-label whitespace-nowrap px-6 text-on-surface-variant">{item}</span>
                  <span className="h-1.5 w-1.5 shrink-0 bg-brand-500" aria-hidden />
                </React.Fragment>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* features */}
      <section id="features" className="scroll-mt-20 mx-auto max-w-7xl px-4 py-20 sm:px-5 lg:py-28">
        <div className="reveal grid gap-8 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)] lg:gap-16">
          <div>
            <SectionHeading
              eyebrow="What's inside"
              title="Everything you need"
              accent="to get paid."
              copy="A focused toolkit, not a sprawling accounting suite. Every feature earns its place on the screen."
            />
            <div className="mt-8 flex items-center gap-3 border border-line bg-surface-container-low p-4">
              <IconSearch size={18} className="shrink-0 text-brand-500" />
              <p className="font-body-sm text-body-sm text-on-surface-variant">Press <kbd className="border border-line-strong px-1.5 py-0.5 font-label-caps text-[10px] text-on-surface">Ctrl K</kbd> in the workspace to jump anywhere.</p>
            </div>
          </div>
          <FeatureList />
        </div>
      </section>

      {/* templates */}
      <section id="templates" className="scroll-mt-20 border-y border-line bg-surface-container-low py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-5">
          <div className="reveal flex flex-wrap items-end justify-between gap-6">
            <SectionHeading
              eyebrow="Template library"
              title="Pick a shape for"
              accent="your business."
              copy="From statutory tax invoices to 80mm receipts. Every design is editable, exportable and ready to send."
            />
            <Link to="/templates" className="group inline-flex items-center gap-3 border border-line-strong bg-surface-container-lowest px-4 py-2.5 font-label-ui text-label-ui font-semibold text-on-surface transition-colors hover:border-primary">
              All 15 templates <IconArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
          <div className="reveal mt-10">
            <TemplateStrip />
          </div>
        </div>
      </section>

      {/* workflow */}
      <section id="workflow" className="scroll-mt-20 mx-auto max-w-7xl px-4 py-20 sm:px-5 lg:py-28">
        <div className="reveal">
          <SectionHeading
            eyebrow="The workflow"
            title="Four steps."
            accent="Then get back to work."
            copy="Click through the process to see how the workspace supports each stage."
            align="center"
          />
        </div>
        <div className="reveal mt-10">
          <Workflow />
        </div>
      </section>

      {/* proof strip */}
      <section className="border-y border-line bg-inverse-surface text-inverse-fg">
        <div className="mx-auto grid max-w-7xl gap-px bg-line sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: IconRefresh, title: 'Autosaved drafts', text: 'Never lose a line item.' },
            { icon: IconClock, title: 'Payment reminders', text: 'Know who needs a nudge.' },
            { icon: IconPercent, title: 'Accurate tax', text: 'CGST, SGST and IGST.' },
            { icon: IconBank, title: 'UPI + bank details', text: 'Faster settlement.' },
          ].map((item) => {
            const I = item.icon
            return (
              <div key={item.title} className="bg-inverse-surface p-6">
                <I size={21} className="text-brand-500" />
                <div className="mt-8 font-label-ui text-label-ui font-semibold">{item.title}</div>
                <div className="mt-1 font-body-sm text-body-sm text-inverse-fg/60">{item.text}</div>
              </div>
            )
          })}
        </div>
      </section>

      {/* faq */}
      <section id="faq" className="scroll-mt-20 mx-auto max-w-7xl px-4 py-20 sm:px-5 lg:py-28">
        <div className="reveal grid gap-10 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
          <SectionHeading eyebrow="Good to know" title="Questions," accent="answered." />
          <Faq />
        </div>
      </section>

      {/* final CTA */}
      <section className="border-t border-line bg-surface-container-low">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-5 lg:py-24">
          <div className="reveal relative overflow-hidden border border-line bg-inverse-surface px-6 py-12 text-inverse-fg sm:px-12 sm:py-16">
            <div className="grid-field pointer-events-none absolute inset-0 opacity-25" aria-hidden />
            <div className="relative flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-end">
              <div className="max-w-2xl">
                <Hud className="text-inverse-fg/60">Ready when you are</Hud>
                <h2 className="mt-5 font-headline-lg text-[clamp(2rem,4vw,3.4rem)] text-inverse-fg">
                  Make the next invoice <span className="serif-accent text-brand-500">count.</span>
                </h2>
                <p className="mt-4 max-w-xl text-sm leading-7 text-inverse-fg/65">
                  Open the studio, choose a template and send something your clients will actually want to open.
                </p>
              </div>
              <ActionLink to="/builder" variant="light">Open the studio</ActionLink>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 sm:px-5 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <Wordmark size={26} />
            <Hud>© {new Date().getFullYear()} Invix · Open-source project</Hud>
          </div>
          <div className="flex flex-wrap gap-5 md:pt-1">
            {navLinks.map(([label, href]) => <a key={href} href={href} className="font-label-caps text-label-caps text-on-surface-variant hover:text-on-surface">{label}</a>)}
          </div>
          <div className="space-y-1 text-sm text-on-surface-variant md:text-right">
            <p>
              Made by{' '}
              <a href="https://codenix-technology.xyz/" target="_blank" rel="noreferrer" className="font-medium text-on-surface underline decoration-line underline-offset-4 hover:text-primary">
                https://codenix-technology.xyz/
              </a>
            </p>
            <p>Elements by Y. GOKUL RAAJ</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
