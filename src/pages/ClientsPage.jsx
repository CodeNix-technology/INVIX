import React, { useState } from 'react'
import { useData, emptyClient } from '../store/data'
import { Button, Card, ConfirmModal, EmptyState, Input, Modal, Textarea } from '../components/ui'
import { IconPlus, IconUsers, IconPencil, IconTrash } from '../components/icons'
import { isEmail, isPhone, isGSTIN } from '../utils/validate'
import { toast } from '../store/ui'
import { formatDate } from '../utils/date'
import { computeTotals, effectiveStatus } from '../utils/calc'
import { formatMoney } from '../utils/currency'

export default function ClientsPage() {
  const data = useData()
  const [q, setQ] = useState('')
  const [editing, setEditing] = useState(null) // null | {} (new) | client
  const [errors, setErrors] = useState({})
  const [confirmDelete, setConfirmDelete] = useState(null)

  const filtered = data.clients.filter((c) => `${c.name} ${c.email} ${c.city} ${c.gstin}`.toLowerCase().includes(q.toLowerCase()))

  const openNew = () => {
    setEditing(emptyClient())
    setErrors({})
  }

  const save = () => {
    const errs = {}
    if (!editing.name?.trim()) errs.name = 'Name is required'
    if (editing.email && !isEmail(editing.email)) errs.email = 'Invalid email'
    if (editing.phone && !isPhone(editing.phone)) errs.phone = 'Invalid phone'
    if (editing.gstin && !isGSTIN(editing.gstin)) errs.gstin = 'Invalid GSTIN'
    setErrors(errs)
    if (Object.keys(errs).length) return
    data.saveClient(editing)
    toast('Client saved', 'success')
    setEditing(null)
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4 lg:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">Clients</h1>
          <p className="text-sm text-slate-500">{data.clients.length} saved clients</p>
        </div>
        <Button onClick={openNew}><IconPlus size={15} strokeWidth={2.5} /> Add client</Button>
      </header>

      <Input placeholder="Search clients…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search clients" />

      {filtered.length === 0 ? (
        <EmptyState icon={IconUsers} title={data.clients.length ? 'No matches' : 'No clients yet'} description="Save client details to fill invoices in one click." action={data.clients.length ? null : <Button onClick={openNew}>Add your first client</Button>} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((c) => {
            const invs = data.invoices.filter((i) => i.client?.id === c.id)
            const outstanding = invs.reduce((s, inv) => {
              const t = computeTotals(inv)
              return s + (effectiveStatus(inv, t) !== 'paid' && effectiveStatus(inv, t) !== 'draft' ? t.balance : 0)
            }, 0)
            return (
              <Card key={c.id} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="truncate font-bold">{c.name}</h3>
                    <p className="mt-0.5 text-xs text-slate-500">{[c.city, c.state].filter(Boolean).join(', ')}</p>
                    <p className="mt-1 text-xs text-slate-400">{c.email}{c.phone ? ` · ${c.phone}` : ''}</p>
                    {c.gstin ? <p className="mt-1 font-mono text-[11px] text-slate-400">{c.gstin}</p> : null}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button size="sm" variant="secondary" onClick={() => { setEditing({ ...c }); setErrors({}) }}><IconPencil size={13} /> Edit</Button>
                    <Button size="sm" variant="dangerGhost" onClick={() => setConfirmDelete(c)} aria-label={`Delete ${c.name}`}><IconTrash size={14} /></Button>
                  </div>
                </div>
                <div className="mt-3 flex gap-4 border-t border-slate-100 pt-2 text-xs dark:border-slate-800">
                  <span className="text-slate-400">{invs.length} invoices</span>
                  <span className={outstanding > 0 ? 'font-semibold text-amber-600' : 'text-slate-400'}>{outstanding > 0 ? `${formatMoney(outstanding)} outstanding` : 'All settled'}</span>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? 'Edit client' : 'New client'} wide>
        {editing ? (
          <div className="grid grid-cols-2 gap-3">
            <Input label="Name" required error={errors.name} value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} className="col-span-2" />
            <Input label="Email" error={errors.email} value={editing.email || ''} onChange={(e) => setEditing({ ...editing, email: e.target.value })} />
            <Input label="Phone" error={errors.phone} value={editing.phone || ''} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} />
            <Textarea label="Address" rows={2} value={editing.address || ''} onChange={(e) => setEditing({ ...editing, address: e.target.value })} className="col-span-2" />
            <Input label="City" value={editing.city || ''} onChange={(e) => setEditing({ ...editing, city: e.target.value })} />
            <Input label="State" value={editing.state || ''} onChange={(e) => setEditing({ ...editing, state: e.target.value })} />
            <Input label="State code" maxLength={2} value={editing.stateCode || ''} onChange={(e) => setEditing({ ...editing, stateCode: e.target.value.replace(/\D/g, '') })} />
            <Input label="PIN code" maxLength={6} value={editing.pincode || ''} onChange={(e) => setEditing({ ...editing, pincode: e.target.value.replace(/\D/g, '') })} />
            <Input label="GSTIN" error={errors.gstin} value={editing.gstin || ''} onChange={(e) => setEditing({ ...editing, gstin: e.target.value.toUpperCase() })} className="col-span-2" />
            <Textarea label="Notes" rows={2} value={editing.notes || ''} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} className="col-span-2" />
            <div className="col-span-2 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setEditing(null)}>Cancel</Button>
              <Button onClick={save}>Save client</Button>
            </div>
          </div>
        ) : null}
      </Modal>

      <ConfirmModal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => {
          data.deleteClient(confirmDelete.id)
          toast('Client deleted', 'success')
        }}
        message={`Delete ${confirmDelete?.name}? Existing invoices keep their snapshot of this client.`}
      />
    </div>
  )
}
