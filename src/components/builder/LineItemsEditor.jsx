import React, { useState } from 'react'
import { useBuilder } from '../../store/builder'
import { useData } from '../../store/data'
import { Button, Input, Select, Draggable, Modal, Card, ConfirmModal, EmptyState } from '../ui'
import { formatMoney, currencySymbol } from '../../utils/currency'
import { LINE_UNITS } from '../../utils/calc'
import { deepClone, uid } from '../../utils/id'
import { isNumber } from '../../utils/validate'
import { formatDate, todayISO } from '../../utils/date'
import { IconPlus, IconPackage, IconTrash, IconGrip, IconCopy, IconX } from '../icons'

export default function LineItemsEditor() {
  const invoice = useBuilder((s) => s.invoice)
  const patch = useBuilder((s) => s.patch)
  const b = useBuilder()
  const catalog = useData((s) => s.items)
  const [pickerOpen, setPickerOpen] = useState(false)

  if (!invoice) return null
  const cur = invoice.currency || 'INR'

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-sm font-bold">Line items</h4>
        <div className="flex gap-1.5">
          <Button size="sm" variant="secondary" onClick={() => setPickerOpen(true)}><IconPackage size={13} /> Catalog</Button>
          <Button size="sm" onClick={() => b.addItem()}><IconPlus size={13} /> Add item</Button>
        </div>
      </div>

      {invoice.items.length === 0 ? (
        <EmptyState icon={IconPlus} title="No items yet" description="Add your first line item to start building this invoice." />
      ) : (
        <div className="space-y-2">
          <Draggable as="div" index={-1} onReorder={() => {}} className="hidden" itemKey="head" aria-hidden />
          {invoice.items.map((item, idx) => (
            <Draggable
              key={item._id}
              index={idx}
              onReorder={(from, to) => b.reorderItems(from, to)}
              className="group relative rounded-xl border border-slate-200 bg-slate-50/70 p-2.5 dark:border-slate-700 dark:bg-slate-800/60"
            >
              <div className="flex items-start gap-2">
                <span className="mt-2 cursor-grab select-none text-slate-300 group-hover:text-slate-500" title="Drag to reorder" aria-label="Drag to reorder"><IconGrip size={14} /></span>
                <div className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-12">
                  <div className="col-span-2 sm:col-span-5">
                    <Input
                      placeholder="Description"
                      value={item.description}
                      onChange={(e) => b.patchItem(item._id, { description: e.target.value })}
                      aria-label="Item description"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Input
                      placeholder="HSN/SAC"
                      value={item.hsn}
                      maxLength={8}
                      onChange={(e) => b.patchItem(item._id, { hsn: e.target.value.replace(/\D/g, '') })}
                      aria-label="HSN or SAC code"
                    />
                  </div>
                  <div className="sm:col-span-1">
                    <Input
                      type="number"
                      min="0"
                      step="any"
                      value={item.quantity}
                      onChange={(e) => b.patchItem(item._id, { quantity: e.target.value })}
                      aria-label="Quantity"
                    />
                  </div>
                  <div className="sm:col-span-1">
                    <Select
                      options={LINE_UNITS.map((u) => ({ value: u, label: u }))}
                      value={item.unit}
                      onChange={(e) => b.patchItem(item._id, { unit: e.target.value })}
                      aria-label="Unit"
                    />
                  </div>
                  <div className="sm:col-span-1">
                    <Input
                      type="number"
                      min="0"
                      step="any"
                      value={item.rate}
                      onChange={(e) => b.patchItem(item._id, { rate: e.target.value })}
                      aria-label="Rate"
                    />
                  </div>
                  <div className="flex gap-1 sm:col-span-1">
                    <Input
                      type="number"
                      min="0"
                      step="any"
                      value={item.discountValue || ''}
                      placeholder="Disc"
                      onChange={(e) => b.patchItem(item._id, { discountValue: e.target.value })}
                      aria-label="Discount value"
                    />
                  </div>
                  <div className="sm:col-span-1">
                    <Select
                      options={[
                        { value: 'percent', label: '%' },
                        { value: 'flat', label: currencySymbol(cur) },
                      ]}
                      value={item.discountType}
                      onChange={(e) => b.patchItem(item._id, { discountType: e.target.value })}
                      aria-label="Discount type"
                    />
                  </div>
                  <div className="sm:col-span-1">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="any"
                      value={item.taxRate || ''}
                      placeholder="Tax %"
                      onChange={(e) => b.patchItem(item._id, { taxRate: e.target.value })}
                      aria-label="Tax rate percent"
                    />
                  </div>
                </div>
                <div className="flex w-16 shrink-0 flex-col items-end">
                  <span className="text-xs font-bold">{formatMoney(Number(item.quantity || 0) * Number(item.rate || 0), cur)}</span>
                </div>
                <div className="flex shrink-0 flex-col gap-0.5">
                  <button onClick={() => b.duplicateItem(item._id)} title="Duplicate row" aria-label="Duplicate item" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-700"><IconCopy size={14} /></button>
                  <button onClick={() => b.removeItem(item._id)} title="Remove row" aria-label="Remove item" className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"><IconX size={14} /></button>
                </div>
              </div>
              {idx === 0 ? null : null}
            </Draggable>
          ))}
        </div>
      )}

      <div className="mt-3 flex items-center justify-between rounded-xl bg-slate-100 px-3 py-2 text-sm dark:bg-slate-800">
        <span className="text-slate-500">Items: <b>{invoice.items.length}</b></span>
        <DiscountEditor invoice={invoice} patch={patch} cur={cur} />
      </div>

      <ItemCatalogPicker open={pickerOpen} onClose={() => setPickerOpen(false)} />
    </div>
  )
}

function DiscountEditor({ invoice, patch, cur }) {
  const d = invoice.discount || { type: 'percent', value: 0 }
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-slate-500">Extra discount</span>
      <input
        type="number"
        min="0"
        step="any"
        value={d.value || ''}
        onChange={(e) => patch({ discount: { ...d, value: e.target.value } })}
        className="w-20 rounded-lg border border-slate-300 px-2 py-1 text-xs dark:border-slate-600 dark:bg-slate-900"
        aria-label="Global discount value"
      />
      <select
        value={d.type}
        onChange={(e) => patch({ discount: { ...d, type: e.target.value } })}
        className="rounded-lg border border-slate-300 px-1 py-1 text-xs dark:border-slate-600 dark:bg-slate-900"
        aria-label="Global discount type"
      >
        <option value="percent">%</option>
        <option value="flat">{currencySymbol(cur)}</option>
      </select>
    </div>
  )
}

function ItemCatalogPicker({ open, onClose }) {
  const catalog = useData((s) => s.items)
  const saveItem = useData((s) => s.saveItem)
  const deleteItem = useData((s) => s.deleteItem)
  const b = useBuilder()
  const [q, setQ] = useState('')
  const [form, setForm] = useState(null) // null = list view; object = editor

  const filtered = catalog.filter((i) => (i.name + i.description).toLowerCase().includes(q.toLowerCase()))

  return (
    <Modal open={open} onClose={onClose} title="Items catalog" wide>
      {form ? (
        <div className="mb-3 grid grid-cols-2 gap-2 rounded-xl border border-brand-200 bg-brand-50/50 p-3 dark:border-brand-500/30 dark:bg-brand-500/5">
          <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input label="Rate" type="number" value={form.rate} onChange={(e) => setForm({ ...form, rate: e.target.value })} />
          <Input label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="col-span-2" />
          <Input label="HSN/SAC" value={form.hsn} maxLength={8} onChange={(e) => setForm({ ...form, hsn: e.target.value.replace(/\D/g, '') })} />
          <div className="grid grid-cols-2 gap-2">
            <Input label="Tax %" type="number" value={form.taxRate} onChange={(e) => setForm({ ...form, taxRate: e.target.value })} />
            <Input label="Unit" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
          </div>
          <div className="col-span-2 flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setForm(null)}>Cancel</Button>
            <Button
              size="sm"
              onClick={() => {
                const item = { ...form, rate: Number(form.rate) || 0, taxRate: Number(form.taxRate) || 0, id: form.id || uid() }
                saveItem(item)
                setForm(null)
              }}
            >
              Save item
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="mb-3 flex gap-2">
            <Input placeholder="Search catalog…" value={q} onChange={(e) => setQ(e.target.value)} className="flex-1" aria-label="Search catalog" />
            <Button onClick={() => setForm({ name: '', description: '', hsn: '', unit: 'Nos', rate: 0, taxRate: 18 })}>+ New item</Button>
          </div>
          {filtered.length === 0 ? (
            <EmptyState icon={IconPackage} title="No catalog items" description="Save reusable products and services here for one-tap insert." />
          ) : (
            <div className="max-h-80 space-y-1.5 overflow-y-auto">
              {filtered.map((item) => (
                <div key={item.id} className="flex items-center gap-2 rounded-xl border border-slate-200 p-2.5 dark:border-slate-700">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{item.name}</div>
                    <div className="truncate text-xs text-slate-500">{item.description}</div>
                  </div>
                  <span className="text-xs font-bold">{formatMoney(item.rate)}</span>
                  <Button size="sm" variant="secondary" onClick={() => { b.addItem({ description: item.description || item.name, hsn: item.hsn, unit: item.unit, rate: item.rate, taxRate: item.taxRate }); onClose() }}>Insert</Button>
                  <Button size="sm" variant="ghost" onClick={() => setForm({ ...item })} aria-label={`Edit ${item.name}`}>Edit</Button>
                  <Button size="sm" variant="dangerGhost" onClick={() => deleteItem(item.id)} aria-label={`Delete ${item.name}`}><IconTrash size={14} /></Button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </Modal>
  )
}
