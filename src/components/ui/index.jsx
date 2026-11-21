import React, { useEffect, useRef, useState } from 'react'
import { useUI } from '../../store/ui'
import { readFileAsDataURL } from '../../utils/files'
import { IconX, IconCheck, IconAlert, IconInfo, IconFileText } from '../icons'

/* ---------- primitives ---------- */

const btnVariants = {
  primary: 'bg-primary text-on-primary hover:bg-primary-container shadow-xs disabled:opacity-50 dark:text-white',
  secondary: 'border border-outline-variant bg-surface-container-lowest text-on-surface hover:bg-surface-container dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700',
  ghost: 'text-on-surface-variant hover:bg-surface-container dark:text-slate-300 dark:hover:bg-slate-800',
  danger: 'bg-error text-on-error hover:bg-on-error-container dark:text-white',
  dangerGhost: 'text-error hover:bg-error-container dark:text-danger-300 dark:hover:bg-danger-500/15',
}

export function Button({ variant = 'primary', size = 'md', className = '', children, ...rest }) {
  const sizes = { sm: 'px-2.5 py-1.5 text-xs', md: 'px-4 py-2 text-sm', lg: 'px-5 py-2.5 text-base' }
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all active:scale-[.98] disabled:cursor-not-allowed ${btnVariants[variant]} ${sizes[size]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}

export function Input({ label, error, className = '', hint, ...rest }) {
  return (
    <label className={`block ${className}`}>
      {label ? <span className="mb-1 block text-xs font-semibold text-on-surface-variant dark:text-slate-300">{label}</span> : null}
      <input
        className={`w-full rounded-lg border bg-surface-container-lowest px-3 py-2 text-sm text-on-surface placeholder-outline transition-colors focus:border-primary focus:outline-none dark:bg-slate-900 dark:text-slate-100 ${error ? 'border-error' : 'border-outline-variant dark:border-slate-700'}`}
        {...rest}
      />
      {error ? <span className="mt-1 block text-[11px] text-error">{error}</span> : hint ? <span className="mt-1 block text-[11px] text-slate-400">{hint}</span> : null}
    </label>
  )
}

export function Textarea({ label, error, rows = 3, className = '', ...rest }) {
  return (
    <label className={`block ${className}`}>
      {label ? <span className="mb-1 block text-xs font-semibold text-on-surface-variant dark:text-slate-300">{label}</span> : null}
      <textarea
        rows={rows}
        className={`w-full rounded-lg border bg-surface-container-lowest px-3 py-2 text-sm text-on-surface placeholder-outline focus:border-primary focus:outline-none dark:bg-slate-900 dark:text-slate-100 ${error ? 'border-error' : 'border-outline-variant dark:border-slate-700'}`}
        {...rest}
      />
      {error ? <span className="mt-1 block text-[11px] text-error">{error}</span> : null}
    </label>
  )
}

export function Select({ label, options = [], className = '', error, ...rest }) {
  return (
    <label className={`block ${className}`}>
      {label ? <span className="mb-1 block text-xs font-semibold text-on-surface-variant dark:text-slate-300">{label}</span> : null}
      <select
        className={`w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 ${error ? 'border-error' : ''}`}
        {...rest}
      >
        {options.map((o) => (
          <option key={o.value ?? o.code ?? o} value={o.value ?? o.code ?? o}>
            {o.label ?? o.name ?? o}
          </option>
        ))}
      </select>
      {error ? <span className="mt-1 block text-[11px] text-error">{error}</span> : null}
    </label>
  )
}

export function Field({ label, children, hint }) {
  return (
    <div>
      {label ? <span className="mb-1 block text-xs font-semibold text-on-surface-variant dark:text-slate-300">{label}</span> : null}
      {children}
      {hint ? <span className="mt-1 block text-[11px] text-slate-400">{hint}</span> : null}
    </div>
  )
}

export function Badge({ color = 'bg-surface-container text-on-surface-variant', children, className = '' }) {
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${color} ${className}`}>{children}</span>
}

export function Card({ className = '', children, ...rest }) {
  return (
    <div className={`rounded-xl border border-surface-container bg-surface-container-lowest shadow-xs dark:border-slate-800 dark:bg-slate-900 ${className}`} {...rest}>
      {children}
    </div>
  )
}

export function Switch({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${checked ? 'bg-primary' : 'bg-outline-variant dark:bg-slate-700'}`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  )
}

/* ---------- color picker ---------- */

export function ColorInput({ value, onChange, label }) {
  return (
    <label className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-2.5 py-2 dark:border-slate-700">
      <span className="text-xs font-medium text-on-surface-variant dark:text-slate-300">{label}</span>
      <span className="flex items-center gap-2">
        <span className="font-mono text-[10px] text-slate-400">{(value || '').toUpperCase()}</span>
        <input type="color" value={value || '#000000'} onChange={(e) => onChange(e.target.value)} className="h-7 w-9 cursor-pointer rounded border border-slate-200 bg-transparent p-0 dark:border-slate-700" aria-label={label} />
      </span>
    </label>
  )
}

/* ---------- modal ---------- */

export function Modal({ open, onClose, title, children, wide = false }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose?.()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-inverse-surface/50 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative max-h-[88vh] w-full overflow-y-auto rounded-xl bg-surface-container-lowest p-5 shadow-2xl animate-scale-in dark:bg-slate-900 ${wide ? 'max-w-3xl' : 'max-w-lg'}`}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-headline-sm text-base font-bold text-on-surface dark:text-white">{title}</h3>
          <button onClick={onClose} aria-label="Close dialog" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800">
            <IconX size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function ConfirmModal({ open, onClose, onConfirm, title = 'Are you sure?', message, confirmLabel = 'Delete' }) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p className="text-sm text-on-surface-variant dark:text-slate-300">{message}</p>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button variant="danger" onClick={() => { onConfirm(); onClose() }}>{confirmLabel}</Button>
      </div>
    </Modal>
  )
}

/* ---------- toasts ---------- */

export function Toasts() {
  const toasts = useUI((s) => s.toasts)
  const dismiss = useUI((s) => s.dismissToast)
  const icons = { success: IconCheck, error: IconX, warn: IconAlert, info: IconInfo }
  const colors = {
    success: 'bg-secondary', error: 'bg-error', warn: 'bg-tertiary', info: 'bg-primary',
  }
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[70] flex w-80 flex-col gap-2" aria-live="polite">
      {toasts.map((t) => {
        const TIcon = icons[t.type] || IconInfo
        return (
          <div key={t.id} className="pointer-events-auto flex items-start gap-2.5 rounded-xl bg-surface-container-lowest p-3 shadow-lg ring-1 ring-outline-variant animate-fade-in dark:bg-slate-900 dark:ring-slate-700">
            <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white ${colors[t.type] || colors.info}`}>
              <TIcon size={12} strokeWidth={2.5} />
            </span>
            <p className="flex-1 text-sm text-slate-700 dark:text-slate-200">{t.message}</p>
            <button onClick={() => dismiss(t.id)} aria-label="Dismiss notification" className="mt-0.5 text-slate-400 hover:text-slate-600"><IconX size={14} /></button>
          </div>
        )
      })}
    </div>
  )
}

/* ---------- skeletons & empties ---------- */

export function Skeleton({ className = 'h-4 w-full' }) {
  return <div className={`animate-pulse rounded bg-surface-container dark:bg-slate-800 ${className}`} />
}

export function EmptyState({ icon = IconFileText, title, description, action }) {
  const TIcon = icon
  const rendered = React.isValidElement(icon)
    ? icon
    : typeof icon === 'function'
      ? <TIcon size={44} strokeWidth={1.4} className="text-outline-variant dark:text-slate-600" />
      : null
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-outline-variant bg-surface-container-lowest/60 px-6 py-14 text-center dark:border-slate-700 dark:bg-slate-900/60">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-container dark:bg-slate-800" aria-hidden>
        {rendered}
      </div>
      <h3 className="text-base font-bold">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}

/* ---------- tabs ---------- */

export function Tabs({ tabs, active, onChange, className = '' }) {
  return (
    <div role="tablist" className={`flex flex-wrap gap-1 rounded-xl bg-surface-container-low p-1 dark:bg-slate-800 ${className}`}>
      {tabs.map((t) => (
        <button
          key={t.id}
          role="tab"
          aria-selected={active === t.id}
          onClick={() => onChange(t.id)}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${active === t.id ? 'bg-surface-container-lowest text-primary shadow-xs dark:bg-slate-900 dark:text-primary-fixed-dim' : 'text-on-surface-variant hover:text-on-surface dark:hover:text-slate-100'}`}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

/* ---------- drag & drop list ---------- */

export function Draggable({ index, onReorder, children, className = '', itemKey, as = 'div', ...rest }) {
  const ref = useRef(null)
  const [dragging, setDragging] = useState(false)
  const [over, setOver] = useState(false)
  const Tag = as
  return (
    <Tag
      ref={ref}
      draggable
      onDragStart={(e) => {
        setDragging(true)
        e.dataTransfer.effectAllowed = 'move'
        e.dataTransfer.setData('text/invix-index', String(index))
      }}
      onDragEnd={() => { setDragging(false); setOver(false) }}
      onDragOver={(e) => {
        e.preventDefault()
        if (!over) setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setOver(false)
        setDragging(false)
        const from = parseInt(e.dataTransfer.getData('text/invix-index'), 10)
        if (!Number.isNaN(from) && from !== index) onReorder(from, index)
      }}
      className={`${dragging ? 'opacity-40' : ''} ${over ? 'ring-2 ring-primary ring-offset-1 rounded-lg' : ''} ${className}`}
      {...rest}
    >
      {children}
    </Tag>
  )
}

/* ---------- slider ---------- */

export function Slider({ value, onChange, min = 0, max = 100, step = 1, label, className = '' }) {
  return (
    <label className={`block ${className}`}>
      {label ? <span className="mb-1 flex justify-between text-xs font-semibold text-on-surface-variant dark:text-slate-300"><span>{label}</span><span className="text-slate-400">{value}</span></span> : null}
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-primary" />
    </label>
  )
}

/* ---------- image upload w/ preview ---------- */

export function ImageUpload({ value, onChange, label, className = '', hint }) {
  const ref = useRef(null)
  const [busy, setBusy] = useState(false)
  return (
    <div className={className}>
      {label ? <span className="mb-1 block text-xs font-semibold text-on-surface-variant dark:text-slate-300">{label}</span> : null}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => ref.current?.click()}
          className="rounded-lg border border-dashed border-outline-variant px-3 py-2 text-xs font-medium text-on-surface-variant hover:border-primary hover:text-primary dark:border-slate-700"
        >
          {busy ? 'Loading…' : value ? 'Replace image' : 'Upload image'}
        </button>
        {value ? (
          <span className="flex items-center gap-1.5">
            <img src={value} alt="preview" className="h-9 w-9 rounded border border-slate-200 object-contain dark:border-slate-700" />
            <button type="button" onClick={() => onChange('')} aria-label="Remove image" className="text-xs text-error hover:underline">Remove</button>
          </span>
        ) : null}
      </div>
      {hint ? <span className="mt-1 block text-[11px] text-slate-400">{hint}</span> : null}
      <input
        ref={ref}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0]
          if (!file) return
          if (file.size > 2 * 1024 * 1024) {
            useUI.getState().toast('Image must be under 2 MB', 'warn')
            return
          }
          setBusy(true)
          try {
            onChange(await readFileAsDataURL(file))
          } finally {
            setBusy(false)
          }
          e.target.value = ''
        }}
      />
    </div>
  )
}
