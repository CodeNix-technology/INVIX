import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useBuilder } from '../../store/builder'
import { useData } from '../../store/data'
import { TemplateDoc, resolveTemplateDef } from '../../templates/registry'
import { resolveCustomization } from '../../templates/schema'
import { exportPDF, exportPNG, printInvoice } from '../../services/pdf'
import { useUI } from '../../store/ui'
import { PAPER_PX } from '../../templates/shared'
import { computeTotals } from '../../utils/calc'
import {
  IconPrinter, IconImage, IconFileDown, IconMinus, IconExternal,
} from '../icons'

const ZOOMS = [
  { id: 'fit', label: 'Fit' },
  { id: '0.75', label: '75%' },
  { id: '1', label: '100%' },
]

const THEMES = [
  { label: 'Invix Indigo', primary: '#4f46e5', secondary: '#8b5cf6', swatch: 'bg-primary-container', ring: 'ring-primary' },
  { label: 'Emerald', primary: '#059669', secondary: '#34d399', swatch: 'bg-secondary', ring: 'ring-secondary' },
  { label: 'Executive Obsidian', primary: '#283044', secondary: '#64748b', swatch: 'bg-inverse-surface', ring: 'ring-inverse-surface' },
]

const iconButton =
  'flex h-7 w-7 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-100'

export default function PreviewPane({ invoice: propInvoice, showToolbar = true, className = '' }) {
  const data = useData()
  const b = useBuilder()
  const invoice = propInvoice || useBuilder((s) => s.invoice)
  const [exporting, setExporting] = useState('')
  const [zoom, setZoom] = useState('fit')
  const [fullscreen, setFullscreen] = useState(false)
  const scrollRef = useRef(null)
  const innerRef = useRef(null)
  const rootRef = useRef(null)
  const [fitScale, setFitScale] = useState(0.8)
  const [docH, setDocH] = useState(0)

  const def = useMemo(
    () => (invoice ? resolveTemplateDef(invoice.templateId, data.customTemplates) : null),
    [invoice, data.customTemplates],
  )
  const cus = useMemo(
    () => (def ? resolveCustomization(def.defaults, invoice?.customization) : null),
    [def, invoice?.customization],
  )

  const totals = useMemo(() => (invoice ? computeTotals(invoice) : null), [invoice])

  // measure available width for fit-zoom
  React.useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const paperW = PAPER_PX[cus?.paper?.size || 'A4'].w
    const fn = () => setFitScale(Math.min(1, (el.clientWidth - 48) / paperW))
    fn()
    const ro = new ResizeObserver(fn)
    ro.observe(el)
    return () => ro.disconnect()
  }, [cus?.paper?.size])

  // measure document height (unscaled) to size the wrapper
  React.useEffect(() => {
    if (!innerRef.current) return
    const update = () => setDocH(innerRef.current.scrollHeight)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(innerRef.current)
    return () => ro.disconnect()
  })

  useEffect(() => {
    const fn = () => setFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', fn)
    return () => document.removeEventListener('fullscreenchange', fn)
  }, [])

  if (!invoice || !totals) {
    return (
      <div className={`flex h-full items-center justify-center font-body-md text-body-md text-on-surface-variant dark:text-slate-400 ${className}`}>
        No invoice selected
      </div>
    )
  }

  const paper = PAPER_PX[cus?.paper?.size || 'A4']
  const scale = zoom === 'fit' ? fitScale : Number(zoom)

  const applyTheme = (theme) => {
    b.setCustomization({ colors: { ...(cus?.colors || {}), primary: theme.primary, secondary: theme.secondary } })
    useUI.getState().toast(`${theme.label} theme applied`, 'success')
  }

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) await rootRef.current?.requestFullscreen?.()
      else await document.exitFullscreen?.()
    } catch {
      useUI.getState().toast('Fullscreen is unavailable in this browser', 'warn')
    }
  }

  const doExport = async (kind) => {
    setExporting(kind)
    try {
      const name = `invoice-${invoice.number || 'draft'}`
      if (kind === 'pdf') await exportPDF({ filename: `${name}.pdf`, paper: 'A4', orientation: 'portrait' })
      if (kind === 'png') await exportPNG({ filename: `${name}.png` })
      if (kind === 'print') await printInvoice({})
      useUI.getState().toast(kind === 'print' ? 'Sent to printer' : `${kind.toUpperCase()} downloaded`, 'success')
    } catch (e) {
      useUI.getState().toast(`Export failed: ${e.message}`, 'error')
    } finally {
      setExporting('')
    }
  }

  return (
    <div ref={rootRef} className={`relative flex h-full min-w-0 flex-col bg-surface dark:bg-[#0b1120] ${className}`}>
      {showToolbar ? (
        <>
          {/* floating canvas controls */}
          <div className="pointer-events-none absolute left-1/2 top-4 z-20 flex w-[min(560px,calc(100%-2rem))] -translate-x-1/2 flex-wrap items-center justify-between gap-2 rounded-xl border border-surface-container bg-surface-container-lowest/90 px-3 py-1.5 shadow-sm backdrop-blur-md dark:border-slate-700 dark:bg-slate-900/90">
            <div className="pointer-events-auto flex items-center gap-1.5">
              <div className="flex items-center rounded-lg bg-surface-container-low p-0.5 dark:bg-slate-800" role="group" aria-label="Zoom">
                {ZOOMS.map((z) => (
                  <button
                    key={z.id}
                    type="button"
                    onClick={() => setZoom(z.id)}
                    aria-pressed={zoom === z.id}
                    className={`rounded-md px-2 py-1 font-label-caps text-label-caps transition-colors ${
                      zoom === z.id
                        ? 'bg-surface-container-lowest font-semibold text-primary shadow-sm dark:bg-slate-900 dark:text-primary-fixed-dim'
                        : 'text-on-surface-variant hover:text-on-surface dark:text-slate-400 dark:hover:text-slate-100'
                    }`}
                  >
                    {z.label}
                  </button>
                ))}
              </div>
              <span className="hidden h-5 w-px bg-outline-variant sm:block dark:bg-slate-700" />
              <span className="hidden rounded-full bg-surface-container px-2.5 py-1 font-label-caps text-[10px] font-semibold text-on-surface sm:inline dark:bg-slate-800 dark:text-slate-200">
                {cus?.paper?.size || 'A4'} {cus?.paper?.orientation === 'landscape' ? 'Landscape' : 'Portrait'}
              </span>
            </div>
            <div className="pointer-events-auto flex items-center gap-1.5">
              {THEMES.map((theme) => (
                <button
                  key={theme.label}
                  type="button"
                  title={theme.label}
                  aria-label={`Apply ${theme.label} theme`}
                  onClick={() => applyTheme(theme)}
                  className={`h-4 w-4 rounded-full transition-transform hover:scale-110 ${theme.swatch} ring-2 ${theme.ring} ring-offset-1 ring-offset-surface-container-lowest dark:ring-offset-slate-900`}
                />
              ))}
              <span className="mx-0.5 h-5 w-px bg-outline-variant dark:bg-slate-700" />
              <button
                type="button"
                onClick={toggleFullscreen}
                title={fullscreen ? 'Exit fullscreen preview' : 'Open fullscreen preview'}
                aria-label={fullscreen ? 'Exit fullscreen preview' : 'Open fullscreen preview'}
                className={iconButton}
              >
                {fullscreen ? <IconMinus size={16} /> : <IconExternal size={16} />}
              </button>
            </div>
          </div>

          {/* export actions */}
          <div className="pointer-events-none absolute bottom-4 right-4 z-20 flex items-center gap-1 rounded-xl border border-surface-container bg-surface-container-lowest/90 p-1.5 shadow-sm backdrop-blur-md dark:border-slate-700 dark:bg-slate-900/90">
            <div className="pointer-events-auto flex items-center gap-1">
              <button type="button" onClick={() => doExport('print')} disabled={!!exporting} title="Print" aria-label="Print invoice" className={iconButton}>
                <IconPrinter size={16} />
              </button>
              <button type="button" onClick={() => doExport('png')} disabled={!!exporting} title="Download PNG" aria-label="Download PNG" className={iconButton}>
                <IconImage size={16} />
              </button>
              <button
                type="button"
                onClick={() => doExport('pdf')}
                disabled={!!exporting}
                title="Download PDF"
                className="flex h-7 items-center gap-1.5 rounded-lg bg-primary px-2.5 font-label-caps text-label-caps font-semibold text-on-primary transition-colors hover:bg-on-primary-fixed-variant disabled:opacity-50 dark:hover:bg-primary-fixed-dim"
              >
                <IconFileDown size={15} />
                {exporting === 'pdf' ? 'Rendering…' : 'PDF'}
              </button>
            </div>
          </div>
        </>
      ) : null}

      <div
        ref={scrollRef}
        className="no-scrollbar relative flex-1 overflow-auto p-6 pt-20"
        style={{ background: 'radial-gradient(circle at 1px 1px, rgba(119,117,135,.20) 1px, transparent 0)', backgroundSize: '22px 22px' }}
        id="invix-preview-scroll"
      >
        {/* Visible scaled preview — measured correctly against the scroll container */}
        <div className="mx-auto" style={{ width: paper.w * scale, height: (docH || paper.h) * scale }}>
          <div
            ref={innerRef}
            style={{
              width: paper.w,
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
              boxShadow: '0 24px 60px -24px rgba(15,23,42,.4), 0 0 0 1px rgba(15,23,42,.06)',
              borderRadius: invoice.customization?.border?.enabled ? undefined : 2,
              overflow: 'hidden',
            }}
          >
            <TemplateDoc def={def} invoice={invoice} customization={invoice.customization} />
          </div>
        </div>

        {/* Exact-size hidden export root (html2canvas / PDF target) */}
        <div id="invix-export-root" style={{ position: 'fixed', left: -10000, top: 0, visibility: 'hidden', pointerEvents: 'none' }} aria-hidden>
          <TemplateDoc def={def} invoice={invoice} customization={invoice.customization} />
        </div>
      </div>
    </div>
  )
}
