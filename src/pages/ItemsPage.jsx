import React, { useMemo, useState } from 'react'
import { useData, emptyCatalogItem } from '../store/data'
import { Button, Card, ConfirmModal, EmptyState, Input, Modal } from '../components/ui'
import { IconPlus, IconSearch, IconPencil, IconTrash, IconPackage, IconPercent, IconTag } from '../components/icons'
import { toast } from '../store/ui'
import { formatMoney, currencySymbol } from '../utils/currency'
import { LINE_UNITS } from '../utils/calc'
import { isHSN } from '../utils/validate'

export default function ItemsPage() {
  const data = useData()
  const cur = data.settings.currency || 'INR'
  const sym = currencySymbol(cur)
  const [q, setQ] = useState('')
  const [editing, setEditing] = useState(null)
  const [isNew, setIsNew] = useState(false)
  const [errors, setErrors] = useState({})
  const [confirmDelete, setConfirmDelete] = useState(null)

  const filtered = useMemo(
    () => data.items.filter((i) => `${i.name} ${i.description} ${i.hsn}`.toLowerCase().includes(q.toLowerCase())),
    [data.items, q]
  )

  const openNew = () => { setEditing(emptyCatalogItem()); setIsNew(true); setErrors({}) }
  const openEdit = (item) => { setEditing({ ...item }); setIsNew(false); setErrors({}) }

  const save = () => {
    const errs = {}
    if (!editing.name?.trim()) errs.name = 'Name is required'
    if (editing.hsn && !isHSN(editing.hsn)) errs.hsn = 'HSN/SAC must be 4, 6 or 8 digits'
    if (editing.rate === '' || Number.isNaN(Number(editing.rate))) errs.rate = 'Enter a valid rate'
    if (Number(editing.taxRate) < 0 || Number(editing.taxRate) > 100) errs.taxRate = '0–100'
    setErrors(errs)
    if (Object.keys(errs).length) return
    data.saveItem({ ...editing, rate: Number(editing.rate), taxRate: Number(editing.taxRate) || 0 })
    toast(isNew ? 'Item added to catalog' : 'Item updated', 'success')
    setEditing(null)
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4 lg:p-8">
      {/* header */}
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-300">
              <IconPackage size={19} />
            </span>
            <h1 className="text-2xl font-extrabold tracking-tight">Items &amp; services</h1>
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Your reusable catalog — insert any item into an invoice with one tap.
          </p>
        </div>
        <Button onClick={openNew}>
          <IconPlus size={15} strokeWidth={2.5} /> Add item
        </Button>
      </header>

      {/* toolbar */}
      <div className="relative max-w-sm">
        <IconSearch size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name, description or HSN…"
          aria-label="Search items"
          className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm placeholder-slate-400 focus:border-brand-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        />
      </div>

      {/* content */}
      {data.items.length === 0 ? (
        <EmptyState
          icon={IconPackage}
          title="No items yet"
          description="Save your products and services with rates here — then add them to any invoice in one click."
          action={<Button onClick={openNew}><IconPlus size={15} /> Add first item</Button>}
        />
      ) : filtered.length === 0 ? (
        <EmptyState icon={IconSearch} title="No matches" description={`Nothing matches “${q}”. Try a different search.`} />
      ) : (
        <>
          {/* desktop table */}
          <Card className="hidden overflow-hidden md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:border-slate-800">
                  <th className="px-4 py-3">Item</th>
                  <th className="px-4 py-3">HSN / SAC</th>
                  <th className="px-4 py-3 text-right">Rate</th>
                  <th className="px-4 py-3 text-right">Tax</th>
                  <th className="px-4 py-3">Unit</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((it) => (
                  <tr key={it.id} className="group border-b border-slate-100 transition-colors last:border-0 hover:bg-slate-50 dark:border-slate-800/70 dark:hover:bg-slate-800/40">
                    <td className="max-w-xs px-4 py-3">
                      <div className="truncate font-semibold text-slate-800 dark:text-slate-100">{it.name}</div>
                      {it.description ? <div className="mt-0.5 truncate text-xs text-slate-400">{it.description}</div> : null}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{it.hsn || <span className="text-slate-300 dark:text-slate-600">—</span>}</td>
                    <td className="px-4 py-3 text-right font-bold tabular-nums text-slate-800 dark:text-slate-100">{formatMoney(it.rate, cur)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {it.taxRate ? (
                        <span className="inline-flex items-center gap-1 border border-warning-200 bg-warning-50 px-2 py-0.5 text-[11px] font-semibold text-warning-700 dark:bg-warning-500/10 dark:text-warning-300">
                          <IconPercent size={10} /> {it.taxRate}%
                        </span>
                      ) : (
                        <span className="text-xs text-slate-300 dark:text-slate-600">None</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">per {it.unit}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1 opacity-60 transition-opacity group-hover:opacity-100">
                        <Button size="sm" variant="ghost" onClick={() => openEdit(it)} aria-label={`Edit ${it.name}`} title="Edit">
                          <IconPencil size={14} />
                        </Button>
                        <Button size="sm" variant="dangerGhost" onClick={() => setConfirmDelete(it)} aria-label={`Delete ${it.name}`} title="Delete">
                          <IconTrash size={14} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="border-t border-slate-100 px-4 py-2.5 text-xs text-slate-400 dark:border-slate-800">
              {filtered.length} of {data.items.length} items
            </div>
          </Card>

          {/* mobile cards */}
          <div className="grid gap-3 md:hidden">
            {filtered.map((it) => (
              <Card key={it.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate font-bold">{it.name}</h3>
                    <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{it.description}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
                      {it.hsn ? <span className="border border-line bg-surface-container px-1.5 py-0.5 font-mono text-slate-500 dark:bg-slate-800">HSN {it.hsn}</span> : null}
                      {it.taxRate ? <span className="border border-warning-200 bg-warning-50 px-1.5 py-0.5 font-semibold text-warning-700 dark:bg-warning-500/10 dark:text-warning-300">{it.taxRate}% tax</span> : null}
                      <span className="text-slate-400">per {it.unit}</span>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="font-bold tabular-nums">{formatMoney(it.rate, cur)}</div>
                    <div className="mt-2 flex justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(it)} aria-label={`Edit ${it.name}`}><IconPencil size={14} /></Button>
                      <Button size="sm" variant="dangerGhost" onClick={() => setConfirmDelete(it)} aria-label={`Delete ${it.name}`}><IconTrash size={14} /></Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* editor modal */}
      <Modal open={!!editing} onClose={() => setEditing(null)} title={isNew ? 'New item' : 'Edit item'} wide>
        {editing ? (
          <form onSubmit={(e) => { e.preventDefault(); save() }} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Input label="Name" required error={errors.name} value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} className="sm:col-span-2" placeholder="e.g. Website design — 5 pages" />
              <Input label="Description" value={editing.description || ''} onChange={(e) => setEditing({ ...editing, description: e.target.value })} className="sm:col-span-2" placeholder="Optional details shown on the invoice" />

              <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60 sm:col-span-2">
                <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <IconTag size={11} /> Pricing
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Input label="Rate" required error={errors.rate} type="number" min="0" step="any" value={editing.rate} onChange={(e) => setEditing({ ...editing, rate: e.target.value })} hint={sym} />
                  <Input label="Tax %" error={errors.taxRate} type="number" min="0" max="100" step="any" value={editing.taxRate} onChange={(e) => setEditing({ ...editing, taxRate: e.target.value })} placeholder="0" />
                  <Input label="Unit" value={editing.unit || 'Nos'} list="invix-units" onChange={(e) => setEditing({ ...editing, unit: e.target.value })} />
                  <Input label="HSN / SAC" error={errors.hsn} value={editing.hsn || ''} maxLength={8} inputMode="numeric" onChange={(e) => setEditing({ ...editing, hsn: e.target.value.replace(/\D/g, '') })} placeholder="Optional" />
                </div>
              </div>
            </div>
            <datalist id="invix-units">{LINE_UNITS.map((u) => <option key={u} value={u} />)}</datalist>
            <div className="flex justify-end gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
              <Button type="button" variant="secondary" onClick={() => setEditing(null)}>Cancel</Button>
              <Button type="submit">Save item</Button>
            </div>
          </form>
        ) : null}
      </Modal>

      <ConfirmModal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => {
          data.deleteItem(confirmDelete.id)
          toast('Item deleted', 'success')
        }}
        message={`Delete “${confirmDelete?.name}” from the catalog? Invoices already using it are not affected.`}
      />
    </div>
  )
}
