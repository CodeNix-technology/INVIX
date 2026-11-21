import { create } from 'zustand'
import { uid, nowISO, deepClone } from '../utils/id'
import { emptyItem, emptyPayment } from '../utils/calc'
import { todayISO, addDays } from '../utils/date'
import { nextInvoiceNumber } from '../utils/invoiceNumber'
import { useData, defaultSettings } from './data'
import { defaultCustomization, defaultTemplateId } from '../templates/schema'

const HISTORY_LIMIT = 60

/**
 * The invoice being edited. All edits go through patch() which snapshots
 * history (undo/redo) and triggers debounced autosave into the data store.
 */
export const useBuilder = create((set, get) => {
  let autosaveTimer = null

  const newInvoice = () => {
    const data = useData.getState()
    const business = data.activeBusiness() || emptyBusinessFallback()
    return {
      id: uid(),
      kind: 'invoice', // invoice | quotation
      number: nextInvoiceNumber(data.invoices, data.settings),
      templateId: data.settings.defaultTemplateId || defaultTemplateId(),
      customization: null, // template default until customized
      currency: data.settings.currency,
      status: 'draft',
      issueDate: todayISO(),
      dueDate: addDays(todayISO(), 15),
      poNumber: '',
      paymentTerms: 15,
      business: deepClone(business) || null,
      clientId: null,
      client: { name: '', address: '', city: '', state: '', stateCode: '', pincode: '', email: '', phone: '', gstin: '' },
      items: [emptyItem()],
      taxScheme: data.settings.taxScheme || 'gst',
      taxMode: data.settings.taxMode || 'exclusive',
      discount: { type: 'percent', value: 0 },
      shipping: 0,
      extraCharges: [],
      roundOff: true,
      notes: data.settings.defaultNotes || '',
      terms: data.settings.defaultTerms || '',
      bankDetails: { ...(business?.bankDetails || { bankName: '', accountName: '', accountNumber: '', ifsc: '', upiId: '' }) },
      showAmountInWords: true,
      showUPIQR: true,
      signature: { type: 'none', data: '', name: '', title: '' },
      stamp: '',
      payments: [],
      recurring: 'none',
      shareId: uid().replace(/-/g, '').slice(0, 12),
      createdAt: nowISO(),
      updatedAt: nowISO(),
    }
  }

  return {
    invoice: null,
    past: [],
    future: [],
    dirty: false,
    saving: false,

    /** Load an existing invoice, or create a fresh one */
    open(id) {
      const data = useData.getState()
      if (id) {
        const inv = data.invoices.find((i) => i.id === id)
        if (inv) {
          set({ invoice: deepClone(inv), past: [], future: [], dirty: false })
          return inv
        }
      }
      const inv = newInvoice()
      set({ invoice: inv, past: [], future: [], dirty: false })
      return inv
    },

    createForClient(clientId) {
      const inv = newInvoice()
      const client = useData.getState().clients.find((c) => c.id === clientId)
      if (client) inv.client = { ...deepClone(client), id: client.id }
      inv.clientId = clientId || null
      set({ invoice: inv, past: [], future: [], dirty: true })
      return inv
    },

    patch(partial, { history = true } = {}) {
      const prev = get().invoice
      if (!prev) return
      const next = { ...prev, ...partial, updatedAt: nowISO() }
      if (history) {
        set({ past: [...get().past, deepClone(prev)].slice(-HISTORY_LIMIT), future: [], invoice: next, dirty: true })
      } else {
        set({ invoice: next, dirty: true })
      }
      scheduleAutosave()
    },

    // convenience patches
    patchBusiness(patch) {
      get().patch({ business: { ...get().invoice.business, ...patch } })
    },
    patchClient(patch) {
      const inv = get().invoice
      get().patch({ client: { ...inv.client, ...patch } })
    },
    patchItem(id, patch) {
      const inv = get().invoice
      get().patch({ items: inv.items.map((it) => (it._id === id ? { ...it, ...patch } : it)) })
    },
    addItem(preset = {}) {
      const inv = get().invoice
      const item = { ...emptyItem(), ...preset }
      get().patch({ items: [...inv.items, item] })
    },
    removeItem(id) {
      const inv = get().invoice
      const items = inv.items.filter((it) => it._id !== id)
      get().patch({ items: items.length ? items : [emptyItem()] })
    },
    duplicateItem(id) {
      const inv = get().invoice
      const idx = inv.items.findIndex((it) => it._id === id)
      if (idx === -1) return
      const copy = { ...deepClone(inv.items[idx]), _id: uid() }
      const items = [...inv.items.slice(0, idx + 1), copy, ...inv.items.slice(idx + 1)]
      get().patch({ items })
    },
    reorderItems(from, to) {
      const inv = get().invoice
      const items = [...inv.items]
      const [moved] = items.splice(from, 1)
      items.splice(Math.max(0, Math.min(items.length, to)), 0, moved)
      get().patch({ items })
    },
    addPayment(payment = emptyPayment()) {
      const inv = get().invoice
      get().patch({ payments: [...(inv.payments || []), payment] })
    },
    removePayment(id) {
      const inv = get().invoice
      get().patch({ payments: (inv.payments || []).filter((p) => p.id !== id) })
    },
    setCustomization(customization) {
      get().patch({ customization: { ...get().invoice.customization, ...customization } })
    },

    undo() {
      const { past, invoice, future } = get()
      if (!past.length) return
      const prev = past[past.length - 1]
      set({ past: past.slice(0, -1), future: [deepClone(invoice), ...future].slice(0, HISTORY_LIMIT), invoice: prev, dirty: true })
    },
    redo() {
      const { future, invoice, past } = get()
      if (!future.length) return
      const next = future[0]
      set({ future: future.slice(1), past: [...past, deepClone(invoice)].slice(-HISTORY_LIMIT), invoice: next, dirty: true })
    },

    /** Persist current draft into the data store (autosave + manual save) */
    async save(status) {
      const inv = get().invoice
      if (!inv) return
      const final = status ? { ...inv, status } : inv
      set({ saving: true, invoice: final })
      useData.getState().saveInvoice(deepClone(final))
      set({ saving: false, dirty: false })
      if (status) useData.getState().pushCloud().catch(() => {})
    },

    resetAll() {
      if (autosaveTimer) clearTimeout(autosaveTimer)
      set({ invoice: null, past: [], future: [], dirty: false })
    },
  }

  function emptyBusinessFallback() {
    return { id: uid(), name: '', bankDetails: {} }
  }

  function scheduleAutosave() {
    if (autosaveTimer) clearTimeout(autosaveTimer)
    autosaveTimer = setTimeout(() => {
      const b = useBuilder.getState()
      if (b.invoice && b.dirty) b.save()
    }, 1200)
  }
})

export const settingsFallback = defaultSettings
