import React, { useState, useRef } from 'react'
import { useData, emptyBusiness } from '../store/data'
import { useUI, applyTheme, toast } from '../store/ui'
import { Button, Card, Input, Select, Textarea, Switch, Modal, Tabs, ColorInput, ConfirmModal, Badge } from '../components/ui'
import { IconTrash, IconDownload, IconUpload } from '../components/icons'
import { CURRENCIES } from '../utils/currency'
import { LANGUAGES, useT } from '../i18n'
import { STORAGE_PROVIDERS, getStorageSettings, setStorageSettings } from '../services/storage'
import { isSupabaseConfigured } from '../services/supabase'
import { exportJSON, readFileAsText } from '../utils/files'
import { isEmail, isPhone, isGSTIN, isURL } from '../utils/validate'

const TABS = [
  { id: 'business', label: 'Business profiles' },
  { id: 'defaults', label: 'Invoice defaults' },
  { id: 'cloud', label: 'Cloud & storage' },
  { id: 'app', label: 'App' },
]

export default function SettingsPage() {
  const [tab, setTab] = useState('business')
  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4 lg:p-6">
      <header>
        <h1 className="text-2xl font-extrabold">Settings</h1>
        <p className="text-sm text-slate-500">Configure your workspace</p>
      </header>
      <Tabs tabs={TABS} active={tab} onChange={setTab} className="w-fit" />
      {tab === 'business' ? <BusinessTab /> : tab === 'defaults' ? <DefaultsTab /> : tab === 'cloud' ? <CloudTab /> : <AppTab />}
    </div>
  )
}

function BusinessTab() {
  const data = useData()
  const [editing, setEditing] = useState(null)
  const [errors, setErrors] = useState({})
  const [confirmDelete, setConfirmDelete] = useState(null)

  const openNew = () => {
    setEditing(emptyBusiness('New Business'))
    setErrors({})
  }
  const openEdit = (b) => {
    setEditing({ ...b, bankDetails: { ...(b.bankDetails || {}) } })
    setErrors({})
  }

  const save = () => {
    const errs = {}
    if (!editing.name?.trim()) errs.name = 'Business name is required'
    if (editing.email && !isEmail(editing.email)) errs.email = 'Invalid email'
    if (editing.phone && !isPhone(editing.phone)) errs.phone = 'Invalid phone'
    if (editing.website && !isURL(editing.website)) errs.website = 'Invalid URL'
    if (editing.taxId && !isGSTIN(editing.taxId)) errs.taxId = 'Invalid GSTIN format'
    setErrors(errs)
    if (Object.keys(errs).length) return
    if (!data.businesses.some((b) => b.id === editing.id)) data.saveBusiness(editing)
    else data.updateBusiness(editing.id, editing)
    toast('Business profile saved', 'success')
    setEditing(null)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">One account, many businesses. The active one is used for new invoices.</p>
        <Button size="sm" onClick={openNew}>+ Add business</Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {data.businesses.map((b) => (
          <Card key={b.id} className={`p-4 ${b.id === data.activeBusinessId ? 'ring-2 ring-brand-500' : ''}`}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                {b.logo ? <img src={b.logo} alt="" className="h-10 w-10 rounded-lg object-contain" /> : <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-100 font-bold text-brand-700">{b.name?.[0] || 'B'}</span>}
                <div className="min-w-0">
                  <h3 className="truncate font-bold">{b.name}</h3>
                  <p className="truncate text-xs text-slate-400">{[b.city, b.state].filter(Boolean).join(', ')}</p>
                </div>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button size="sm" variant="secondary" onClick={() => openEdit(b)}>Edit</Button>
                {data.businesses.length > 1 ? <Button size="sm" variant="dangerGhost" onClick={() => setConfirmDelete(b)} aria-label={`Delete ${b.name}`}><IconTrash size={14} /></Button> : null}
              </div>
            </div>
            <div className="mt-3">
              {b.id === data.activeBusinessId ? <span className="text-xs font-semibold text-brand-600">● Active profile</span> : (
                <Button size="sm" variant="ghost" onClick={() => { data.setActiveBusiness(b.id); toast(`${b.name} is now active`, 'success') }}>Set as active</Button>
              )}
            </div>
          </Card>
        ))}
      </div>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={data.businesses.some((b) => b.id === editing?.id) ? 'Edit business' : 'New business'} wide>
        {editing ? (
          <div className="grid grid-cols-2 gap-3">
            <Input label="Business name" required error={errors.name} value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} className="col-span-2" />
            <Input label="Legal name" value={editing.legalName || ''} onChange={(e) => setEditing({ ...editing, legalName: e.target.value })} className="col-span-2" />
            <Textarea label="Address" rows={2} value={editing.address || ''} onChange={(e) => setEditing({ ...editing, address: e.target.value })} className="col-span-2" />
            <Input label="City" value={editing.city || ''} onChange={(e) => setEditing({ ...editing, city: e.target.value })} />
            <Input label="State" value={editing.state || ''} onChange={(e) => setEditing({ ...editing, state: e.target.value })} />
            <Input label="State code" maxLength={2} value={editing.stateCode || ''} onChange={(e) => setEditing({ ...editing, stateCode: e.target.value.replace(/\D/g, '') })} />
            <Input label="PIN code" maxLength={6} value={editing.pincode || ''} onChange={(e) => setEditing({ ...editing, pincode: e.target.value.replace(/\D/g, '') })} />
            <Input label="Tax ID / GSTIN" error={errors.taxId} value={editing.taxId || ''} onChange={(e) => setEditing({ ...editing, taxId: e.target.value.toUpperCase() })} />
            <Input label="Email" error={errors.email} value={editing.email || ''} onChange={(e) => setEditing({ ...editing, email: e.target.value })} />
            <Input label="Phone" error={errors.phone} value={editing.phone || ''} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} />
            <Input label="Website" error={errors.website} value={editing.website || ''} onChange={(e) => setEditing({ ...editing, website: e.target.value })} />
            <div className="col-span-2 grid grid-cols-2 gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
              <Input label="Bank name" value={editing.bankDetails?.bankName || ''} onChange={(e) => setEditing({ ...editing, bankDetails: { ...editing.bankDetails, bankName: e.target.value } })} className="col-span-2" />
              <Input label="Account name" value={editing.bankDetails?.accountName || ''} onChange={(e) => setEditing({ ...editing, bankDetails: { ...editing.bankDetails, accountName: e.target.value } })} />
              <Input label="Account number" value={editing.bankDetails?.accountNumber || ''} onChange={(e) => setEditing({ ...editing, bankDetails: { ...editing.bankDetails, accountNumber: e.target.value } })} />
              <Input label="IFSC" value={editing.bankDetails?.ifsc || ''} onChange={(e) => setEditing({ ...editing, bankDetails: { ...editing.bankDetails, ifsc: e.target.value.toUpperCase() } })} />
              <Input label="UPI ID" value={editing.bankDetails?.upiId || ''} onChange={(e) => setEditing({ ...editing, bankDetails: { ...editing.bankDetails, upiId: e.target.value } })} />
            </div>
            <div className="col-span-2 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setEditing(null)}>Cancel</Button>
              <Button onClick={save}>Save business</Button>
            </div>
          </div>
        ) : null}
      </Modal>

      <ConfirmModal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => {
          data.removeBusiness(confirmDelete.id)
          toast('Business removed', 'success')
        }}
        message={`Remove ${confirmDelete?.name} from your workspace? Invoices keep their data snapshots.`}
      />
    </div>
  )
}

function DefaultsTab() {
  const data = useData()
  const s = data.settings
  const upd = data.updateSettings
  return (
    <div className="space-y-3">
      <Card className="space-y-3 p-4">
        <h3 className="text-sm font-bold">Defaults</h3>
        <div className="grid grid-cols-2 gap-3">
          <Select label="Default currency" options={CURRENCIES.map((c) => ({ value: c.code, label: `${c.code} · ${c.name}` }))} value={s.currency} onChange={(e) => upd({ currency: e.target.value })} />
          <Select
            label="Amount-in-words system"
            options={[{ value: 'indian', label: 'Indian (Lakh/Crore)' }, { value: 'international', label: 'International (Million/Billion)' }]}
            value={s.wordsSystem}
            onChange={(e) => upd({ wordsSystem: e.target.value })}
          />
          <Select
            label="Tax scheme"
            options={[{ value: 'gst', label: 'GST' }, { value: 'vat', label: 'VAT' }, { value: 'custom', label: 'Custom' }, { value: 'none', label: 'None' }]}
            value={s.taxScheme}
            onChange={(e) => upd({ taxScheme: e.target.value })}
          />
          <Select
            label="Tax mode"
            options={[{ value: 'exclusive', label: 'Exclusive' }, { value: 'inclusive', label: 'Inclusive' }]}
            value={s.taxMode}
            onChange={(e) => upd({ taxMode: e.target.value })}
          />
          <Input label="Invoice numbering pattern" value={s.numberPattern} onChange={(e) => upd({ numberPattern: e.target.value })} hint="{YYYY} {YY} {MM} {DD} {NNN}" />
        </div>
        <Textarea label="Default notes" rows={2} value={s.defaultNotes} onChange={(e) => upd({ defaultNotes: e.target.value })} />
        <Textarea label="Default terms" rows={3} value={s.defaultTerms} onChange={(e) => upd({ defaultTerms: e.target.value })} />
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-bold">PDF footer</div>
            <Input value={s.pdfFooter} onChange={(e) => upd({ pdfFooter: e.target.value })} className="mt-1 w-64" aria-label="PDF footer text" />
          </div>
          <Switch checked={s.showPdfFooter !== false} onChange={(v) => upd({ showPdfFooter: v })} label="Show PDF footer" />
        </div>
      </Card>
    </div>
  )
}

function CloudTab() {
  const data = useData()
  const [confirmRestore, setConfirmRestore] = useState(null)
  const restoreRef = useRef(null)
  const storageSettings = getStorageSettings()

  const doBackup = async () => {
    const backup = await data.exportBackup()
    exportJSON(backup, `invix-backup-${new Date().toISOString().slice(0, 10)}`)
    toast('Backup downloaded', 'success')
  }

  return (
    <div className="space-y-3">
      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold">Local workspace</h3>
            <p className="mt-1 text-xs text-slate-400">Your invoices, clients and templates stay in this browser. Export a backup to move them elsewhere.</p>
          </div>
          <span className="inline-flex items-center gap-2 border border-outline-variant px-2.5 py-1.5 font-label-caps text-label-caps text-on-surface-variant">
            <span className="h-2 w-2 bg-secondary" />
            {isSupabaseConfigured ? 'LOCAL FIRST' : 'OFFLINE READY'}
          </span>
        </div>
      </Card>

      <Card className="p-4">
        <h3 className="mb-2 text-sm font-bold">File storage provider</h3>
        <p className="mb-2 text-xs text-slate-400">Where logos, signatures, stamps and shared PDFs are uploaded. Implements a common StorageProvider interface (upload / download / delete / list).</p>
        <div className="space-y-1.5">
          {STORAGE_PROVIDERS.map((p) => (
            <label key={p.id} className={`flex cursor-pointer items-center justify-between rounded-xl border px-3 py-2.5 text-sm ${storageSettings.provider === p.id ? 'border-brand-500 bg-brand-50/60 dark:bg-brand-500/10' : 'border-slate-200 dark:border-slate-700'} ${p.available() ? '' : 'opacity-40 pointer-events-none'}`}>
              <span className="flex items-center gap-2">
                <input type="radio" name="storageProvider" checked={storageSettings.provider === p.id} onChange={() => { setStorageSettings({ ...storageSettings, provider: p.id }); toast(`Storage provider: ${p.label}`, 'success') }} />
                <span className="font-medium">{p.label}</span>
              </span>
              {storageSettings.provider === p.id ? <Badge /> : null}
            </label>
          ))}
        </div>
        {!isSupabaseConfigured ? <p className="mt-2 text-[11px] text-amber-600">Supabase is not configured — files stay on this device.</p> : null}
      </Card>

      <Card className="p-4">
        <h3 className="mb-2 text-sm font-bold">Backup & restore</h3>
        <p className="mb-3 text-xs text-slate-400">Full JSON snapshot of businesses, clients, items, invoices, templates and settings.</p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={doBackup}><IconDownload size={13} /> Download backup</Button>
          <label className="cursor-pointer">
            <span className="inline-flex items-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"><IconUpload size={14} /> Restore backup</span>
            <input
              ref={restoreRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0]
                if (!file) return
                try {
                  const parsed = JSON.parse(await readFileAsText(file))
                  setConfirmRestore(parsed)
                } catch (err) {
                  toast(`Invalid backup: ${err.message}`, 'error')
                }
                e.target.value = ''
              }}
            />
          </label>
        </div>
      </Card>

      <ConfirmModal
        open={!!confirmRestore}
        onClose={() => setConfirmRestore(null)}
        onConfirm={async () => {
          try {
            await data.importBackup(confirmRestore)
            toast('Backup restored', 'success')
          } catch (err) {
            toast(err.message, 'error')
          }
        }}
        title="Restore backup?"
        message="This replaces your current workspace data with the backup contents."
        confirmLabel="Restore"
      />
    </div>
  )
}

function AppTab() {
  const { theme, setTheme, language, setLanguage } = useUI()
  const t = useT()
  return (
    <Card className="space-y-3 p-4">
      <h3 className="text-sm font-bold">Appearance & language</h3>
      <div className="grid grid-cols-2 gap-3">
        <Select
          label="Theme"
          options={[{ value: 'system', label: 'System' }, { value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]}
          value={theme}
          onChange={(e) => { setTheme(e.target.value); applyTheme(e.target.value) }}
        />
        <Select label="Language" options={LANGUAGES.map((l) => ({ value: l.code, label: l.label }))} value={language} onChange={(e) => setLanguage(e.target.value)} />
      </div>
      <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500 dark:bg-slate-800/60">
        <div className="mb-1 font-bold text-slate-600 dark:text-slate-300">Keyboard shortcuts</div>
        <ul className="list-inside list-disc space-y-0.5">
          <li><kbd className="rounded bg-white px-1 dark:bg-slate-900">Ctrl/⌘ + Z</kbd> Undo in builder</li>
          <li><kbd className="rounded bg-white px-1 dark:bg-slate-900">Ctrl/⌘ + Y</kbd> or <kbd className="rounded bg-white px-1 dark:bg-slate-900">Ctrl/⌘ + Shift + Z</kbd> Redo</li>
          <li><kbd className="rounded bg-white px-1 dark:bg-slate-900">Ctrl/⌘ + S</kbd> Save draft</li>
        </ul>
      </div>
      <div className="space-y-1 text-xs text-slate-400">
        <p>{t('Smart Invoices, Made Simple')} — Invix PWA (open source). Install from your browser menu for offline use.</p>
        <p>
          Made by <a href="https://codenix-technology.xyz/" target="_blank" rel="noreferrer" className="underline hover:text-slate-600 dark:hover:text-slate-300">https://codenix-technology.xyz/</a> · Elements by Y. GOKUL RAAJ
        </p>
      </div>
    </Card>
  )
}
