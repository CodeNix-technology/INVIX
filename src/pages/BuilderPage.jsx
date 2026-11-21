import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useBuilder } from '../store/builder'
import { useData } from '../store/data'
import { useAuth } from '../store/auth'
import { toast } from '../store/ui'
import FormPanel from '../components/builder/FormPanel'
import CustomizePanel from '../components/builder/CustomizePanel'
import PreviewPane from '../components/builder/PreviewPane'
import { Modal, Input, Badge } from '../components/ui'
import {
  IconArrowLeft, IconUndo, IconRedo, IconSave, IconPalette, IconPrinter,
  IconFileDown, IconShare, IconSend, IconCheck, IconDownload, IconLink,
  IconMessage, IconMail, IconPencil, IconEye, IconChevronDown, IconX,
} from '../components/icons'
import { TEMPLATES, resolveTemplateDef } from '../templates/registry'
import { exportPDF, printInvoice, invoiceBlob } from '../services/pdf'
import { uploadShare } from '../services/sharing'
import { isSupabaseConfigured } from '../services/supabase'
import { computeTotals, effectiveStatus, statusMeta, STATUSES } from '../utils/calc'
import { exportJSON } from '../utils/files'
import { formatMoney } from '../utils/currency'

const VIEWS = [
  ['editor', 'Editor', IconPencil],
  ['preview', 'Preview', IconEye],
  ['style', 'Style', IconPalette],
]

export default function BuilderPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const b = useBuilder()
  const data = useData()
  const user = useAuth((s) => s.user)
  const [activeView, setActiveView] = useState('editor')
  const [styleDrawer, setStyleDrawer] = useState(false)
  const [templateOpen, setTemplateOpen] = useState(false)
  const [shareModal, setShareModal] = useState(false)
  const [shareLink, setShareLink] = useState('')
  const [finalizeOpen, setFinalizeOpen] = useState(false)

  useEffect(() => {
    b.open(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  useEffect(() => {
    const onKey = (e) => {
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        b.undo()
      } else if ((mod && e.key === 'y') || (mod && e.shiftKey && e.key === 'Z')) {
        e.preventDefault()
        b.redo()
      } else if (mod && e.key === 's') {
        e.preventDefault()
        b.save()
        toast('Draft saved', 'success')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [b])

  if (!b.invoice) {
    return (
      <div className="flex h-[calc(100vh-56px)] items-center justify-center bg-surface font-body-md text-body-md text-on-surface-variant dark:bg-[#0b1120] dark:text-slate-400">
        Loading builder…
      </div>
    )
  }

  const totals = computeTotals(b.invoice)
  const st = effectiveStatus(b.invoice, totals)
  const activeTemplate = resolveTemplateDef(b.invoice.templateId, data.customTemplates)

  const onSwitchTemplate = (tid) => {
    const custom = data.customTemplates.find((t) => t.id === tid)
    if (custom) b.patch({ templateId: tid, customization: custom.customization || null })
    else b.patch({ templateId: tid, customization: null })
    setTemplateOpen(false)
  }

  const renderCustomize = () => <CustomizePanel onSwitchTemplate={onSwitchTemplate} />

  // The export root lives inside the preview pane. Below xl, bring it into view
  // before a print/PDF action so html2canvas always has a rendered target.
  const ensurePreview = async () => {
    if (window.innerWidth < 1280 && activeView !== 'preview') {
      setActiveView('preview')
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
    }
  }

  const doPrint = async () => {
    try {
      await ensurePreview()
      await printInvoice({})
      toast('Sent to printer', 'success')
    } catch (e) {
      toast(`Print failed: ${e.message}`, 'error')
    }
  }

  const doPDF = async () => {
    try {
      await ensurePreview()
      await exportPDF({ filename: `invoice-${b.invoice.number || 'draft'}.pdf` })
      toast('PDF downloaded', 'success')
    } catch (e) {
      toast(`PDF failed: ${e.message}`, 'error')
    }
  }

  const saveDraft = () => {
    b.save()
    toast('Draft saved', 'success')
  }

  const iconBtn =
    'flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100'

  return (
    <div className="flex h-[calc(100vh-56px)] flex-col gap-4 bg-surface p-3 font-body-md text-on-surface dark:bg-[#0b1120] dark:text-slate-100 md:p-5">
      {/* ── sticky studio action bar ─────────────────────────── */}
      <div className="sticky top-0 z-30 flex shrink-0 flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-xl bg-surface-container-lowest px-3 py-2.5 shadow-sm ring-1 ring-surface-container dark:bg-slate-900 dark:ring-slate-800 sm:px-4">
        {/* left: workspace meta */}
        <div className="order-1 flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/invoices')}
            title="Back to invoices"
            aria-label="Back to invoices"
            className={iconBtn}
          >
            <IconArrowLeft size={19} />
          </button>
          <div className="hidden h-5 w-px bg-surface-container-high sm:block dark:bg-slate-700" />
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate font-headline-sm text-headline-sm font-semibold tracking-tight text-on-surface dark:text-white">
              {b.invoice.number || 'Draft'}
            </span>
            <Badge color={statusMeta[st]?.color}>{statusMeta[st]?.label || 'Draft'}</Badge>
          </div>
          <div className="hidden items-center gap-2 pl-2 lg:flex">
            <span className="font-financial-tabular text-financial-tabular text-on-surface dark:text-slate-100">
              {formatMoney(totals.total, b.invoice.currency)}
            </span>
            <div className="flex items-center gap-1.5 pl-2">
              <span className="relative flex h-2 w-2">
                <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${b.dirty ? 'bg-warning-500' : 'bg-secondary'}`} />
                <span className={`relative inline-flex h-2 w-2 rounded-full ${b.dirty ? 'bg-warning-500' : 'bg-secondary'}`} />
              </span>
              <span className="font-body-sm text-body-sm text-on-surface-variant dark:text-slate-400">
                {b.saving ? 'Saving…' : b.dirty ? 'Unsaved changes' : 'Saved'}
              </span>
            </div>
          </div>
        </div>

        {/* center: pane switcher below xl */}
        <div
          className="order-3 flex w-full items-center rounded-lg bg-surface-container-low p-0.5 dark:bg-slate-800 xl:hidden"
          role="tablist"
          aria-label="Builder view"
        >
          {VIEWS.map(([key, label, TIcon]) => {
            const active = activeView === key
            return (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveView(key)}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1 font-label-ui text-label-ui transition-all ${
                  active
                    ? 'bg-surface-container-lowest font-semibold text-primary shadow-sm dark:bg-slate-900 dark:text-primary-fixed-dim'
                    : 'text-on-surface-variant hover:text-on-surface dark:text-slate-400 dark:hover:text-slate-100'
                }`}
              >
                <TIcon size={14} />
                {label}
              </button>
            )
          })}
        </div>

        {/* right: workspace operations */}
        <div className="order-2 ml-auto flex items-center gap-1.5 sm:gap-2">
          <div className="hidden items-center rounded-lg bg-surface-container-low p-0.5 xl:flex dark:bg-slate-800">
            <button
              type="button"
              onClick={b.undo}
              disabled={!b.past.length}
              title="Undo (Ctrl+Z)"
              aria-label="Undo"
              className={`${iconBtn} h-7 w-7`}
            >
              <IconUndo size={17} />
            </button>
            <button
              type="button"
              onClick={b.redo}
              disabled={!b.future.length}
              title="Redo (Ctrl+Y)"
              aria-label="Redo"
              className={`${iconBtn} h-7 w-7`}
            >
              <IconRedo size={17} />
            </button>
          </div>
          <button type="button" onClick={saveDraft} title="Save (Ctrl+S)" aria-label="Save draft" className={iconBtn}>
            <IconSave size={16} />
          </button>

          {/* template switcher */}
          <div className="relative hidden xl:block">
            <button
              type="button"
              onClick={() => setTemplateOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={templateOpen}
              className="flex h-9 items-center gap-2 rounded-lg bg-surface-container-low px-3 font-label-ui text-label-ui text-on-surface transition-colors hover:bg-surface-container dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
            >
              <IconPalette size={16} className="text-primary dark:text-primary-fixed-dim" />
              <span className="max-w-[110px] truncate font-medium">{activeTemplate.name}</span>
              <IconChevronDown size={15} className="text-on-surface-variant dark:text-slate-400" />
            </button>
            {templateOpen ? (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setTemplateOpen(false)} aria-hidden />
                <div
                  className="no-scrollbar absolute right-0 top-10 z-40 max-h-72 w-56 overflow-y-auto rounded-xl border border-surface-container bg-surface-container-lowest p-1 shadow-xl dark:border-slate-700 dark:bg-slate-900"
                  role="menu"
                  aria-label="Choose template"
                >
                  {TEMPLATES.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      role="menuitem"
                      onClick={() => onSwitchTemplate(t.id)}
                      className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left font-label-ui text-label-ui transition-colors hover:bg-surface-container-low dark:hover:bg-slate-800 ${
                        t.id === b.invoice.templateId ? 'font-semibold text-primary dark:text-primary-fixed-dim' : 'text-on-surface dark:text-slate-200'
                      }`}
                    >
                      <span className="truncate">{t.name}</span>
                      {t.id === b.invoice.templateId ? <IconCheck size={14} /> : null}
                    </button>
                  ))}
                  {data.customTemplates.length ? (
                    <div className="px-3 pb-1 pt-2 font-label-caps text-label-caps uppercase tracking-wider text-on-surface-variant dark:text-slate-500">
                      My Templates
                    </div>
                  ) : null}
                  {data.customTemplates.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      role="menuitem"
                      onClick={() => onSwitchTemplate(t.id)}
                      className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left font-label-ui text-label-ui transition-colors hover:bg-surface-container-low dark:hover:bg-slate-800 ${
                        t.id === b.invoice.templateId ? 'font-semibold text-primary dark:text-primary-fixed-dim' : 'text-on-surface dark:text-slate-200'
                      }`}
                    >
                      <span className="truncate">{t.name}</span>
                      {t.id === b.invoice.templateId ? <IconCheck size={14} /> : null}
                    </button>
                  ))}
                </div>
              </>
            ) : null}
          </div>

          <button
            type="button"
            onClick={doPrint}
            title="Print"
            aria-label="Print invoice"
            className={iconBtn}
          >
            <IconPrinter size={17} />
          </button>
          <button
            type="button"
            onClick={doPDF}
            title="Export PDF"
            className="flex h-9 items-center gap-1.5 rounded-lg bg-surface-container-low px-2.5 font-label-ui text-label-ui text-on-surface transition-colors hover:bg-surface-container dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 sm:px-3"
          >
            <IconFileDown size={17} className="text-tertiary dark:text-tertiary-fixed-dim" />
            <span className="hidden xl:inline">PDF</span>
          </button>
          <ShareButton b={b} totals={totals} user={user} onOpen={() => { setShareLink(''); setShareModal(true) }} />
          <button
            type="button"
            onClick={() => setStyleDrawer(true)}
            title="Customize design"
            aria-label="Customize design"
            className={`${iconBtn} xl:hidden`}
          >
            <IconPalette size={16} />
          </button>
          <button
            type="button"
            onClick={() => setFinalizeOpen(true)}
            className="flex h-9 items-center gap-2 rounded-lg bg-primary px-3 font-label-ui text-label-ui font-semibold text-on-primary shadow-sm transition-all hover:bg-on-primary-fixed-variant active:scale-95 dark:bg-primary dark:hover:bg-primary-fixed-dim sm:px-4"
          >
            <IconSend size={16} />
            <span className="whitespace-nowrap">Finalize &amp; Send</span>
          </button>
        </div>
      </div>

      {/* ── studio panes ─────────────────────────────────────── */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 xl:grid-cols-12">
        <section
          aria-label="Invoice editor"
          className={`${activeView === 'editor' ? '' : 'hidden'} min-h-0 xl:col-span-4 xl:block`}
        >
          <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl bg-surface-container-lowest shadow-sm ring-1 ring-surface-container dark:bg-slate-900 dark:ring-slate-800">
            <FormPanel />
          </div>
        </section>

        <section
          aria-label="Invoice preview"
          className={`${activeView === 'preview' ? '' : 'hidden'} min-h-0 xl:col-span-5 xl:block`}
        >
          <PreviewPane />
        </section>

        <section
          aria-label="Customize invoice"
          className={`${activeView === 'style' ? '' : 'hidden'} min-h-0 xl:col-span-3 xl:block`}
        >
          <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl bg-surface-container-lowest shadow-sm ring-1 ring-surface-container dark:bg-slate-900 dark:ring-slate-800">
            {renderCustomize()}
          </div>
        </section>
      </div>

      {/* style drawer for smaller screens */}
      {styleDrawer ? (
        <div className="fixed inset-0 z-50 xl:hidden" role="dialog" aria-modal="true" aria-label="Customize panel">
          <div
            className="absolute inset-0 bg-inverse-surface/40 backdrop-blur-xs dark:bg-slate-950/60"
            onClick={() => setStyleDrawer(false)}
          />
          <div className="absolute inset-y-0 right-0 flex w-[340px] max-w-[92vw] flex-col bg-surface-container-lowest shadow-2xl animate-fade-in dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-surface-container px-4 py-3 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <IconPalette size={17} className="text-primary dark:text-primary-fixed-dim" />
                <span className="font-headline-sm text-sm font-bold text-on-surface dark:text-white">Design studio</span>
              </div>
              <button
                type="button"
                onClick={() => setStyleDrawer(false)}
                aria-label="Close customize panel"
                className="rounded-lg p-1.5 text-on-surface-variant hover:bg-surface-container dark:text-slate-400 dark:hover:bg-slate-800"
              >
                <IconX size={17} />
              </button>
            </div>
            <div className="min-h-0 flex-1">{renderCustomize()}</div>
          </div>
        </div>
      ) : null}

      <ShareModal
        open={shareModal}
        onClose={() => setShareModal(false)}
        shareLink={shareLink}
        invoice={b.invoice}
        totals={totals}
        setShareLink={setShareLink}
        user={user}
      />

      <Modal open={finalizeOpen} onClose={() => setFinalizeOpen(false)} title="Finalize invoice">
        <p className="mb-4 font-body-sm text-body-sm text-on-surface-variant dark:text-slate-400">
          Save the current draft with a status. Overdue is applied automatically once the due date passes.
        </p>
        <div className="grid grid-cols-2 gap-2">
          {STATUSES.filter((s) => s !== 'overdue').map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                b.save(s)
                toast(`Marked as ${s}`, 'success')
                setFinalizeOpen(false)
              }}
              className={`rounded-lg border border-surface-container px-3 py-2.5 text-left font-label-ui text-label-ui font-semibold transition-colors hover:border-primary dark:border-slate-700 ${statusMeta[s]?.color}`}
            >
              {statusMeta[s]?.label}
            </button>
          ))}
        </div>
        <div className="mt-5 flex items-center justify-between gap-2 border-t border-surface-container pt-4 dark:border-slate-800">
          <button
            type="button"
            onClick={() => exportJSON(b.invoice, `invoice-${b.invoice.number}`)}
            className="inline-flex items-center gap-2 rounded-lg px-2.5 py-2 font-label-ui text-label-ui font-semibold text-secondary transition-colors hover:bg-secondary-container/40 dark:text-secondary-fixed-dim dark:hover:bg-slate-800"
          >
            <IconDownload size={15} /> Export JSON
          </button>
          <button
            type="button"
            onClick={() => { setFinalizeOpen(false); navigate('/invoices') }}
            className="rounded-lg bg-surface-container px-3 py-2 font-label-ui text-label-ui font-semibold text-on-surface transition-colors hover:bg-surface-container-high dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
          >
            Back to list
          </button>
        </div>
      </Modal>
    </div>
  )
}

/* ── share ─────────────────────────────── */

function ShareButton({ b, totals, user, onOpen }) {
  const [open, setOpen] = useState(false)
  const invoice = b.invoice
  const items = [
    ['Public link', IconLink, () => { setOpen(false); onOpen() }],
    [
      'WhatsApp',
      IconMessage,
      () => {
        const text = encodeURIComponent(`Invoice ${invoice.number}: ${window.location.origin}/share/${invoice.shareId}`)
        window.open(`https://wa.me/?text=${text}`, '_blank')
        setOpen(false)
      },
    ],
    [
      'Email client',
      IconMail,
      () => {
        const subject = encodeURIComponent(`Invoice ${invoice.number}`)
        const body = encodeURIComponent(`Hi ${invoice.client?.name || ''},\n\nPlease find invoice ${invoice.number} attached.\n\nThanks,\n${invoice.business?.name || ''}`)
        window.location.href = `mailto:${invoice.client?.email || ''}?subject=${subject}&body=${body}`
        setOpen(false)
      },
    ],
  ]
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex h-9 items-center gap-1.5 rounded-lg bg-surface-container-low px-2.5 font-label-ui text-label-ui text-on-surface transition-colors hover:bg-surface-container dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 sm:px-3"
      >
        <IconShare size={16} />
        <span className="hidden xl:inline">Share</span>
      </button>
      {open ? (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} aria-hidden />
          <div
            className="absolute right-0 top-10 z-40 w-52 overflow-hidden rounded-xl border border-surface-container bg-surface-container-lowest p-1 shadow-xl dark:border-slate-700 dark:bg-slate-900"
            role="menu"
          >
            {items.map(([label, TIcon, fn]) => (
              <button
                key={label}
                type="button"
                onClick={fn}
                role="menuitem"
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left font-label-ui text-label-ui font-semibold text-on-surface transition-colors hover:bg-surface-container-low dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <TIcon size={15} className="text-on-surface-variant dark:text-slate-400" />
                {label}
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  )
}

async function doShare(b, totals, user) {
  try {
    if (!isSupabaseConfigured) {
      toast('Public links need Supabase — configure .env', 'warn')
      return
    }
    await b.save()
    const blob = await invoiceBlob({})
    const link = await uploadShare({ invoice: b.invoice, totals, pdfBlob: blob, user })
    await navigator.clipboard.writeText(link).catch(() => {})
    toast('Share link copied to clipboard', 'success')
  } catch (e) {
    toast(`Share failed: ${e.message}`, 'error')
  }
}

function ShareModal({ open, onClose, shareLink, invoice, totals, setShareLink, user }) {
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    if (!open || shareLink || busy) return
    setBusy(true)
    ;(async () => {
      try {
        if (!isSupabaseConfigured) {
          toast('Public links need Supabase — configure .env', 'warn')
          return
        }
        await useBuilder.getState().save()
        const blob = await invoiceBlob({})
        const link = await uploadShare({ invoice: useBuilder.getState().invoice, totals, pdfBlob: blob, user })
        setShareLink(link)
      } catch (e) {
        toast(`Share failed: ${e.message}`, 'error')
      } finally {
        setBusy(false)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])
  return (
    <Modal open={open} onClose={onClose} title="Share invoice">
      {shareLink ? (
        <div className="space-y-3">
          <Input readOnly value={shareLink} onFocus={(e) => e.target.select()} aria-label="Share link" />
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(shareLink)
              toast('Link copied', 'success')
            }}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 font-label-ui text-label-ui font-semibold text-on-primary transition-colors hover:bg-on-primary-fixed-variant dark:hover:bg-primary-fixed-dim"
          >
            Copy link
          </button>
        </div>
      ) : (
        <p className="animate-pulse font-body-sm text-body-sm text-on-surface-variant dark:text-slate-400">
          Uploading PDF to cloud storage…
        </p>
      )}
    </Modal>
  )
}
