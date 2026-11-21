import React, { useState } from 'react'
import { useBuilder } from '../../store/builder'
import { useData } from '../../store/data'
import { useUI } from '../../store/ui'
import { Button, Input, Select, ColorInput, Switch, Slider, Modal, Field, Badge } from '../ui'
import {
  PALETTES, FONT_OPTIONS, SECTION_LABELS, PAPER_SIZES, ORIENTATIONS,
  MARGIN_MM, LOGO_POSITIONS, WATERMARK_POSITIONS,
  FONT_SCALE, LOGO_SIZES, resolveCustomization,
} from '../../templates/schema'
import { TEMPLATES, resolveTemplateDef } from '../../templates/registry'
import { move, uid } from '../../utils/id'
import { exportJSON, readFileAsText } from '../../utils/files'
import {
  IconPalette, IconSave, IconDownload, IconUpload, IconRotate,
  IconChevronUp, IconChevronDown, IconChevronLeft, IconChevronRight,
  IconLayers, IconTable, IconFileText, IconGrip,
} from '../icons'

const FONTS = [
  { value: 'Plus Jakarta Sans', label: 'Plus Jakarta Sans (Modern)' },
  ...FONT_OPTIONS,
]

const ACCORDIONS = [
  { id: 'design', label: 'Design & Theme', icon: IconPalette },
  { id: 'sections', label: 'Modular Sections', icon: IconLayers },
  { id: 'table', label: 'Table Columns & Grid', icon: IconTable },
  { id: 'paper', label: 'Paper & Export', icon: IconFileText },
]

const LOGO_SIZE_MAP = { sm: LOGO_SIZES.sm, md: LOGO_SIZES.md, lg: LOGO_SIZES.lg }
const sizeKeyFromPx = (px) => (px <= 70 ? 'sm' : px <= 110 ? 'md' : 'lg')

export default function CustomizePanel({ onSwitchTemplate }) {
  const invoice = useBuilder((s) => s.invoice)
  const b = useBuilder()
  const customTemplates = useData((s) => s.customTemplates)
  const saveCustomTemplate = useData((s) => s.saveCustomTemplate)
  const deleteCustomTemplate = useData((s) => s.deleteCustomTemplate)
  const [open, setOpen] = useState({ design: true, sections: false, table: false, paper: false })
  const [saveModal, setSaveModal] = useState(false)
  const [tplName, setTplName] = useState('')

  if (!invoice) return null
  const baseDef = resolveTemplateDef(invoice.templateId, customTemplates)
  const cus = resolveCustomization(baseDef.defaults, invoice.customization)

  const set = (patch) => b.setCustomization(patch)
  const setDeep = (group, key, value) => b.setCustomization({ [group]: { ...cus[group], [key]: value } })
  const toggle = (id) => setOpen((o) => ({ ...o, [id]: !o[id] }))

  return (
    <div className="flex h-full min-h-0 flex-col bg-surface-container-lowest dark:bg-slate-900">
      <header className="flex shrink-0 items-center justify-between gap-2 border-b border-surface-container px-4 py-3 dark:border-slate-800">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-container text-on-primary dark:bg-primary/20 dark:text-primary-fixed-dim">
            <IconPalette size={16} />
          </span>
          <div className="min-w-0">
            <h3 className="font-headline-sm text-sm font-bold text-on-surface dark:text-white">Design studio</h3>
            <p className="truncate font-body-sm text-[11px] text-on-surface-variant dark:text-slate-400">{baseDef.name}</p>
          </div>
        </div>
        <Badge color="bg-primary-container text-on-primary-container dark:bg-primary/20 dark:text-primary-fixed-dim">
          {baseDef.category || 'Template'}
        </Badge>
      </header>

      <div className={`no-scrollbar min-h-0 flex-1 space-y-3 overflow-y-auto p-3 pb-16 [&_select]:rounded-lg [&_select]:border [&_select]:border-surface-container-high [&_select]:bg-surface [&_select]:font-label-ui [&_select]:text-label-ui [&_select]:text-on-surface [&_select]:focus:border-primary dark:[&_select]:border-slate-700 dark:[&_select]:bg-slate-800 dark:[&_select]:text-slate-100`}>
        {/* 1 — Design & Theme */}
        <Accordion id="design" label={ACCORDIONS[0].label} icon={ACCORDIONS[0].icon} open={open.design} onToggle={() => toggle('design')}>
          <Field label="Base template">
            <Select
              options={[
                ...TEMPLATES.map((t) => ({ value: t.id, label: t.name })),
                ...customTemplates.map((t) => ({ value: t.id, label: `${t.name} (My Templates)` })),
              ]}
              value={invoice.templateId}
              onChange={(e) => onSwitchTemplate(e.target.value)}
            />
          </Field>

          <SubCard title="Color preset">
            <div className="grid grid-cols-3 gap-2">
              {PALETTES.slice(0, 3).map((p) => {
                const active = cus.colors.primary.toLowerCase() === p.primary.toLowerCase()
                return (
                  <button
                    key={p.name}
                    type="button"
                    title={p.name}
                    aria-label={`Apply ${p.name} palette`}
                    onClick={() => set({ colors: { ...cus.colors, primary: p.primary, secondary: p.secondary } })}
                    className={`flex flex-col items-center gap-1.5 rounded-lg p-2 text-center transition-colors ${
                      active
                        ? 'bg-surface-container-high ring-2 ring-primary dark:bg-slate-700'
                        : 'bg-surface hover:bg-surface-container-low dark:bg-slate-800 dark:hover:bg-slate-700'
                    }`}
                  >
                    <span className="flex h-5 w-5 overflow-hidden rounded-full">
                      <span style={{ background: p.primary }} className="w-1/2" />
                      <span style={{ background: p.secondary }} className="w-1/2" />
                    </span>
                    <span className={`font-label-caps text-[10px] font-semibold ${active ? 'text-primary dark:text-primary-fixed-dim' : 'text-on-surface-variant dark:text-slate-400'}`}>
                      {p.name}
                    </span>
                  </button>
                )
              })}
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {PALETTES.slice(3).map((p) => (
                <button
                  key={p.name}
                  type="button"
                  title={p.name}
                  aria-label={`Apply ${p.name} palette`}
                  onClick={() => set({ colors: { ...cus.colors, primary: p.primary, secondary: p.secondary } })}
                  className="flex h-7 w-9 overflow-hidden rounded-md ring-1 ring-surface-container-high transition-transform hover:scale-105 dark:ring-slate-600"
                >
                  <span style={{ background: p.primary }} className="w-1/2" />
                  <span style={{ background: p.secondary }} className="w-1/2" />
                </button>
              ))}
            </div>
            <div className="mt-3 space-y-1.5">
              <ColorInput label="Primary" value={cus.colors.primary} onChange={(v) => setDeep('colors', 'primary', v)} />
              <ColorInput label="Secondary" value={cus.colors.secondary} onChange={(v) => setDeep('colors', 'secondary', v)} />
              <ColorInput label="Text" value={cus.colors.text} onChange={(v) => setDeep('colors', 'text', v)} />
              <ColorInput label="Muted text" value={cus.colors.muted} onChange={(v) => setDeep('colors', 'muted', v)} />
              <ColorInput label="Background" value={cus.colors.background} onChange={(v) => setDeep('colors', 'background', v)} />
            </div>
          </SubCard>

          <SubCard title="Document font family">
            <div className="space-y-1.5">
              {FONTS.slice(0, 3).map((f) => {
                const active = cus.fonts.family === f.value
                const previewClass =
                  f.value === 'Plus Jakarta Sans'
                    ? 'font-headline-sm'
                    : f.value === 'Courier New'
                      ? 'font-financial-tabular'
                      : 'font-body-md'
                return (
                  <label
                    key={f.value}
                    className={`flex cursor-pointer items-center justify-between rounded-lg p-2 transition-colors ${
                      active ? 'bg-surface-container-low dark:bg-slate-800' : 'hover:bg-surface dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <span className={`${previewClass} text-xs font-semibold text-on-surface dark:text-slate-100`}>{f.label}</span>
                    <input
                      type="radio"
                      name="doc-font"
                      checked={active}
                      onChange={() => setDeep('fonts', 'family', f.value)}
                      className="accent-primary"
                    />
                  </label>
                )
              })}
            </div>
            <Field label="More fonts" className="mt-2">
              <Select
                options={FONTS.map((f) => ({ value: f.value, label: f.label }))}
                value={cus.fonts.family}
                onChange={(e) => setDeep('fonts', 'family', e.target.value)}
              />
            </Field>
          </SubCard>

          <SubCard title="Typography details">
            <div className="grid grid-cols-2 gap-2">
              <Field label="Heading font">
                <Select options={FONTS.map((f) => ({ value: f.value, label: f.label }))} value={cus.fonts.headingFamily} onChange={(e) => setDeep('fonts', 'headingFamily', e.target.value)} />
              </Field>
              <Field label="Font size">
                <Select options={Object.keys(FONT_SCALE).map((k) => ({ value: k, label: `${k} (${FONT_SCALE[k]}px)` }))} value={cus.fonts.size} onChange={(e) => setDeep('fonts', 'size', e.target.value)} />
              </Field>
            </div>
            <Field label="Line spacing" className="mt-2">
              <Select
                options={[{ value: 'compact', label: 'Compact' }, { value: 'normal', label: 'Normal' }, { value: 'relaxed', label: 'Relaxed' }]}
                value={['compact', 'normal', 'relaxed'].includes(cus.fonts.lineHeight) ? cus.fonts.lineHeight : 'normal'}
                onChange={(e) => setDeep('fonts', 'lineHeight', e.target.value)}
              />
            </Field>
          </SubCard>

          <SubCard title="Accent vibrancy">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="font-label-caps text-label-caps uppercase tracking-wider text-on-surface-variant dark:text-slate-400">
                Intensity
              </span>
              <span className="font-financial-tabular text-xs font-semibold text-primary dark:text-primary-fixed-dim">
                {cus.colors.vibrancy ?? 85}%
              </span>
            </div>
            <Slider min={20} max={100} value={cus.colors.vibrancy ?? 85} onChange={(v) => setDeep('colors', 'vibrancy', v)} />
          </SubCard>

          <SubCard title="Corner radius & border">
            <Slider label="Corner radius" min={0} max={28} value={cus.border.radius} onChange={(v) => set({ border: { ...cus.border, radius: v } })} />
            <div className="mt-2 grid grid-cols-2 gap-2">
              <ColorInput label="Border" value={cus.border.color} onChange={(v) => set({ border: { ...cus.border, color: v } })} />
              <Field label="Width">
                <Select options={[0, 1, 2, 3, 4].map((w) => ({ value: w, label: `${w}px` }))} value={cus.border.width} onChange={(e) => set({ border: { ...cus.border, width: Number(e.target.value) } })} />
              </Field>
            </div>
          </SubCard>
        </Accordion>

        {/* 2 — Modular Sections */}
        <Accordion id="sections" label={ACCORDIONS[1].label} icon={ACCORDIONS[1].icon} open={open.sections} onToggle={() => toggle('sections')}>
          <SubCard title="Logo">
            <Field label="Position">
              <Select options={Object.entries(LOGO_POSITIONS).map(([value, label]) => ({ value, label }))} value={cus.logo.position} onChange={(e) => setDeep('logo', 'position', e.target.value)} />
            </Field>
            <Slider label="Logo size" min={48} max={180} value={LOGO_SIZE_MAP[cus.logo.size] || LOGO_SIZES.md} onChange={(v) => setDeep('logo', 'size', sizeKeyFromPx(v))} className="mt-2" />
          </SubCard>
          <SectionOrderSection cus={cus} set={set} />
          <LabelsSection cus={cus} set={set} />
        </Accordion>

        {/* 3 — Table Columns & Grid */}
        <Accordion id="table" label={ACCORDIONS[2].label} icon={ACCORDIONS[2].icon} open={open.table} onToggle={() => toggle('table')}>
          <TableSection cus={cus} set={set} />
        </Accordion>

        {/* 4 — Paper & Export */}
        <Accordion id="paper" label={ACCORDIONS[3].label} icon={ACCORDIONS[3].icon} open={open.paper} onToggle={() => toggle('paper')}>
          <SubCard title="Paper & margins">
            <div className="grid grid-cols-2 gap-2">
              <Field label="Size">
                <Select options={PAPER_SIZES.map((p) => ({ value: p, label: p }))} value={cus.paper.size} onChange={(e) => setDeep('paper', 'size', e.target.value)} />
              </Field>
              <Field label="Orientation">
                <Select options={ORIENTATIONS.map((o) => ({ value: o, label: o[0].toUpperCase() + o.slice(1) }))} value={cus.paper.orientation} onChange={(e) => setDeep('paper', 'orientation', e.target.value)} />
              </Field>
            </div>
            <Field label="Margins" className="mt-2">
              <Select options={Object.keys(MARGIN_MM).map((m) => ({ value: m, label: `${m} (${MARGIN_MM[m]}mm)` }))} value={cus.paper.margin} onChange={(e) => setDeep('paper', 'margin', e.target.value)} />
            </Field>
          </SubCard>
          <WatermarkSection cus={cus} set={set} />
          <SubCard title="Thermal POS Mode">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-label-ui text-label-ui font-semibold text-on-surface dark:text-slate-100">Thermal POS mode</div>
                <div className="font-body-sm text-[11px] text-on-surface-variant dark:text-slate-400">Format for 80mm roll printers</div>
              </div>
              <Switch checked={Boolean(cus.paper.thermal)} onChange={(v) => setDeep('paper', 'thermal', v)} label="Thermal POS mode" />
            </div>
          </SubCard>
          <SubCard
            title="PDF footer"
            action={<Switch checked={cus.footer?.show !== false} onChange={(v) => set({ footer: { ...cus.footer, show: v } })} label="Show footer" />}
          >
            <Input value={cus.footer?.text || ''} onChange={(e) => set({ footer: { ...cus.footer, text: e.target.value } })} placeholder="Generated with Invix" aria-label="Footer text" />
          </SubCard>
          <MyTemplates
            baseDef={baseDef}
            invoice={invoice}
            customTemplates={customTemplates}
            saveCustomTemplate={saveCustomTemplate}
            deleteCustomTemplate={deleteCustomTemplate}
            setSaveModal={setSaveModal}
            setTplName={setTplName}
            patch={b.patch}
          />
        </Accordion>
      </div>

      <SaveTemplateModal
        open={saveModal}
        onClose={() => setSaveModal(false)}
        initial={tplName ? customTemplates.find((t) => t.id === tplName)?.name || '' : ''}
        rename={Boolean(tplName)}
        onSave={(name) => {
          if (tplName) {
            const t = customTemplates.find((x) => x.id === tplName)
            saveCustomTemplate({ ...t, name })
          } else {
            saveCustomTemplate({ id: uid(), name, basedOn: invoice.templateId, customization: invoice.customization || null })
          }
          setTplName('')
          useUI.getState().toast('Saved to My Templates', 'success')
        }}
      />
    </div>
  )
}

/* ---------------- shells ---------------- */

function Accordion({ id, label, icon: Icon, open, onToggle, children }) {
  return (
    <section className="overflow-hidden rounded-xl bg-surface-container-lowest shadow-xs ring-1 ring-surface-container dark:bg-slate-800/50 dark:ring-slate-700/60">
      <button
        type="button"
        aria-expanded={open}
        onClick={onToggle}
        className="flex w-full items-center justify-between bg-surface-container px-4 py-3 text-left transition-colors hover:bg-surface-container-high dark:bg-slate-800 dark:hover:bg-slate-700"
      >
        <span className="flex items-center gap-2">
          <Icon size={17} className={open ? 'text-primary dark:text-primary-fixed-dim' : 'text-on-surface-variant dark:text-slate-400'} />
          <span className="font-headline-sm text-sm font-semibold text-on-surface dark:text-slate-100">{label}</span>
        </span>
        {open
          ? <IconChevronUp size={17} className="text-on-surface-variant dark:text-slate-400" />
          : <IconChevronDown size={17} className="text-on-surface-variant dark:text-slate-400" />}
      </button>
      {open ? <div className="space-y-3 p-4">{children}</div> : null}
    </section>
  )
}

function SubCard({ title, action, children }) {
  return (
    <div className="rounded-lg bg-surface p-3 ring-1 ring-surface-container dark:bg-slate-900/60 dark:ring-slate-700/60">
      {title ? (
        <div className="mb-2.5 flex items-center justify-between gap-2">
          <h5 className="font-label-caps text-label-caps uppercase tracking-wider text-on-surface-variant dark:text-slate-400">{title}</h5>
          {action}
        </div>
      ) : null}
      {children}
    </div>
  )
}

/* ---------------- sub-sections ---------------- */

function SectionOrderSection({ cus, set }) {
  const order = cus.sections.order
  const hidden = new Set(cus.sections.hidden)
  const rowClass = 'flex items-center gap-1.5 rounded-lg bg-surface-container-low px-2 py-1.5 dark:bg-slate-800'
  const btnClass = 'rounded p-0.5 text-on-surface-variant transition-colors hover:text-on-surface disabled:cursor-not-allowed disabled:opacity-30 dark:text-slate-400 dark:hover:text-slate-100'
  return (
    <SubCard title="Sections — visibility & order">
      <div className="space-y-1">
        {order.map((key, idx) => (
          <div key={key} className={rowClass}>
            <IconGrip size={13} className="shrink-0 text-outline dark:text-slate-500" aria-hidden />
            <Switch
              checked={!hidden.has(key)}
              onChange={(v) => set({ sections: { order, hidden: v ? [...hidden].filter((k) => k !== key) : [...hidden, key] } })}
              label={`Show ${SECTION_LABELS[key]}`}
            />
            <span className={`min-w-0 flex-1 truncate font-label-ui text-label-ui font-semibold ${hidden.has(key) ? 'text-outline line-through dark:text-slate-500' : 'text-on-surface dark:text-slate-100'}`}>
              {SECTION_LABELS[key]}
            </span>
            <button onClick={() => set({ sections: { ...cus.sections, order: move(order, idx, idx - 1) } })} disabled={idx === 0} className={btnClass} aria-label={`Move ${SECTION_LABELS[key]} up`}><IconChevronUp size={13} /></button>
            <button onClick={() => set({ sections: { ...cus.sections, order: move(order, idx, idx + 1) } })} disabled={idx === order.length - 1} className={btnClass} aria-label={`Move ${SECTION_LABELS[key]} down`}><IconChevronDown size={13} /></button>
          </div>
        ))}
      </div>
    </SubCard>
  )
}

function WatermarkSection({ cus, set }) {
  return (
    <SubCard title="Watermark">
      <Input placeholder="e.g. PAID, DRAFT, ORIGINAL" value={cus.watermark.text} onChange={(e) => set({ watermark: { ...cus.watermark, text: e.target.value } })} aria-label="Watermark text" />
      <div className="mt-2 grid grid-cols-2 gap-2">
        <Field label="Position">
          <Select options={Object.entries(WATERMARK_POSITIONS).map(([value, label]) => ({ value, label }))} value={cus.watermark.position} onChange={(e) => set({ watermark: { ...cus.watermark, position: e.target.value } })} />
        </Field>
        <Field label="Size">
          <Select options={[{ value: 'sm', label: 'Small' }, { value: 'md', label: 'Medium' }, { value: 'lg', label: 'Large' }]} value={cus.watermark.size} onChange={(e) => set({ watermark: { ...cus.watermark, size: e.target.value } })} />
        </Field>
      </div>
      <Slider label="Opacity %" min={2} max={30} value={Math.round((cus.watermark.opacity || 0.08) * 100)} onChange={(v) => set({ watermark: { ...cus.watermark, opacity: v / 100 } })} className="mt-2" />
    </SubCard>
  )
}

function LabelsSection({ cus, set }) {
  const labels = cus.labels
  const fields = [
    ['invoice', 'Document title'],
    ['billTo', 'Client heading'],
    ['notes', 'Notes heading'],
    ['terms', 'Terms heading'],
    ['paidStamp', 'Paid stamp text'],
  ]
  return (
    <SubCard title="Custom labels">
      {fields.map(([key, label]) => (
        <Input key={key} label={label} value={labels[key] || ''} placeholder={key === 'invoice' ? 'Invoice' : ''} onChange={(e) => set({ labels: { ...labels, [key]: e.target.value } })} className="mb-1.5" />
      ))}
    </SubCard>
  )
}

function TableSection({ cus, set }) {
  const styleButtons = [
    ['minimal', 'Minimal'],
    ['bordered', 'Bordered'],
    ['striped', 'Striped'],
  ]
  const rowClass = 'flex items-center gap-1.5 rounded-lg bg-surface-container-low px-2 py-1.5 dark:bg-slate-800'
  const btnClass = 'rounded p-0.5 text-on-surface-variant transition-colors hover:text-on-surface disabled:cursor-not-allowed disabled:opacity-30 dark:text-slate-400 dark:hover:text-slate-100'
  return (
    <>
      <SubCard title="Item table style">
        <div className="grid grid-cols-3 gap-1 rounded-lg bg-surface-container-low p-1 dark:bg-slate-800">
          {styleButtons.map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => set({ table: { ...cus.table, style: value } })}
              aria-pressed={cus.table.style === value}
              className={`rounded-md py-1 font-label-caps text-label-caps transition-colors ${
                cus.table.style === value
                  ? 'bg-surface-container-lowest font-semibold text-primary shadow-sm dark:bg-slate-900 dark:text-primary-fixed-dim'
                  : 'text-on-surface-variant hover:text-on-surface dark:text-slate-400'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="mt-3 flex flex-col gap-2">
          <label className="flex items-center justify-between gap-3">
            <span className="font-label-ui text-label-ui font-semibold text-on-surface dark:text-slate-100">Zebra rows</span>
            <Switch checked={cus.table.zebra} onChange={(v) => set({ table: { ...cus.table, zebra: v } })} label="Zebra rows" />
          </label>
          <label className="flex items-center justify-between gap-3">
            <span className="font-label-ui text-label-ui font-semibold text-on-surface dark:text-slate-100">Header background</span>
            <Switch checked={cus.table.headerBg} onChange={(v) => set({ table: { ...cus.table, headerBg: v } })} label="Header background" />
          </label>
        </div>
        <ColorInput label="Border color" value={cus.table.borderColor} onChange={(v) => set({ table: { ...cus.table, borderColor: v } })} className="mt-3" />
      </SubCard>

      <SubCard title="Columns">
        <div className="space-y-1">
          {cus.columns.map((col, idx) => (
            <div key={col.key} className={rowClass}>
              <Switch
                checked={col.visible}
                onChange={(v) => set({ columns: cus.columns.map((c) => (c.key === col.key ? { ...c, visible: v } : c)) })}
                label={`Show ${col.label}`}
              />
              <input
                value={col.label}
                onChange={(e) => set({ columns: cus.columns.map((c) => (c.key === col.key ? { ...c, label: e.target.value } : c)) })}
                aria-label={`Rename ${col.label} column`}
                className="min-w-0 flex-1 rounded border border-transparent bg-transparent px-1 py-0.5 font-label-ui text-label-ui font-semibold text-on-surface hover:border-outline-variant focus:border-primary focus:outline-none dark:text-slate-100 dark:hover:border-slate-600"
              />
              {col.required ? <span className="shrink-0 font-label-caps text-[9px] text-outline dark:text-slate-500">LOCKED</span> : null}
              <button onClick={() => set({ columns: move(cus.columns, idx, idx - 1) })} disabled={idx === 0} className={btnClass} aria-label={`Move ${col.label} left`}><IconChevronLeft size={13} /></button>
              <button onClick={() => set({ columns: move(cus.columns, idx, idx + 1) })} disabled={idx === cus.columns.length - 1} className={btnClass} aria-label={`Move ${col.label} right`}><IconChevronRight size={13} /></button>
            </div>
          ))}
        </div>
      </SubCard>
    </>
  )
}

/* ---------------- my templates ---------------- */

function MyTemplates({ baseDef, invoice, customTemplates, saveCustomTemplate, deleteCustomTemplate, setSaveModal, setTplName, patch }) {
  const actionClass = 'rounded-lg px-2 py-1.5 font-label-ui text-label-ui font-semibold transition-colors hover:bg-surface-container-high dark:hover:bg-slate-700'
  return (
    <SubCard title="My templates">
      <div className="flex flex-wrap gap-1.5">
        <Button size="sm" variant="secondary" onClick={() => setSaveModal(true)}><IconSave size={13} /> Save design</Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => exportJSON({ app: 'invix-template', name: baseDef.name, defaults: baseDef.defaults, customization: invoice.customization || null }, `invix-template-${invoice.templateId}`)}
        >
          <IconDownload size={13} /> Export JSON
        </Button>
        <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-surface-container-high px-2.5 py-1.5 font-label-ui text-label-ui font-semibold text-on-surface transition-colors hover:bg-surface-container dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700">
          <IconUpload size={13} /> Import
          <input
            type="file"
            accept="application/json"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0]
              if (!file) return
              try {
                const data = JSON.parse(await readFileAsText(file))
                if (data.app !== 'invix-template') throw new Error('Not an Invix template file')
                patch({ customization: data.customization || null })
                useUI.getState().toast('Template imported', 'success')
              } catch (err) {
                useUI.getState().toast(err.message, 'error')
              }
              e.target.value = ''
            }}
          />
        </label>
        <Button size="sm" variant="ghost" onClick={() => patch({ customization: null })}><IconRotate size={13} /> Reset to default</Button>
      </div>
      {customTemplates.length ? (
        <div className="mt-2 space-y-1">
          {customTemplates.map((t) => (
            <div key={t.id} className="flex items-center gap-1 rounded-lg bg-surface-container-low px-2 py-1.5 dark:bg-slate-800">
              <span className="min-w-0 flex-1 truncate font-label-ui text-label-ui font-semibold text-on-surface dark:text-slate-100">{t.name}</span>
              <button
                onClick={() => patch({ templateId: t.id, customization: t.customization || null })}
                className={`${actionClass} text-primary dark:text-primary-fixed-dim`}
              >
                Use
              </button>
              <button
                onClick={() => {
                  const copy = { ...t, id: uid(), name: `${t.name} copy` }
                  saveCustomTemplate(copy)
                }}
                className={`${actionClass} text-on-surface-variant dark:text-slate-400`}
              >
                Duplicate
              </button>
              <button
                onClick={() => {
                  setTplName(t.id)
                  setSaveModal(true)
                }}
                className={`${actionClass} text-on-surface-variant dark:text-slate-400`}
                aria-label={`Rename ${t.name}`}
              >
                Rename
              </button>
              <button onClick={() => deleteCustomTemplate(t.id)} className={`${actionClass} text-error dark:text-error-container`} aria-label={`Delete ${t.name}`}>
                Delete
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </SubCard>
  )
}

function SaveTemplateModal({ open, onClose, onSave, initial = '', rename = false }) {
  const [name, setName] = useState(initial)
  React.useEffect(() => setName(initial), [initial, open])
  return (
    <Modal open={open} onClose={onClose} title={rename ? 'Rename template' : 'Save as My Template'}>
      <Input label="Template name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. My Brand Invoice" autoFocus />
      <div className="mt-3 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button disabled={!name.trim()} onClick={() => { onSave(name.trim()); onClose() }}>{rename ? 'Rename' : 'Save'}</Button>
      </div>
    </Modal>
  )
}
