import { create } from 'zustand'
import { uid, nowISO } from '../utils/id'
import { computeTotals } from '../utils/calc'
import { idbGet, idbSet } from '../services/db'
import { supabase, isSupabaseConfigured } from '../services/supabase'
import { toast } from './ui'
import { useAuth } from './auth'

export const DATA_KEY = 'invix:data-v1'

export const emptyBusiness = (name = 'My Business') => ({
  id: uid(),
  name,
  legalName: '',
  address: '',
  city: '',
  state: '',
  stateCode: '27',
  pincode: '',
  country: 'India',
  taxId: '',
  email: '',
  phone: '',
  website: '',
  logo: '',
  bankDetails: { bankName: '', accountName: '', accountNumber: '', ifsc: '', upiId: '' },
})

export const emptyClient = () => ({
  id: uid(),
  name: '',
  address: '',
  city: '',
  state: '',
  stateCode: '',
  pincode: '',
  email: '',
  phone: '',
  gstin: '',
  notes: '',
  updatedAt: nowISO(),
})

export const emptyCatalogItem = () => ({
  id: uid(),
  name: '',
  description: '',
  hsn: '',
  unit: 'Nos',
  rate: 0,
  taxRate: 0,
  updatedAt: nowISO(),
})

export const emptyExpense = () => ({
  id: uid(),
  category: 'Software',
  amount: 0,
  date: new Date().toISOString().slice(0, 10),
  description: '',
  receipt: '',
  updatedAt: nowISO(),
})

export const DEFAULT_WIDGETS = {
  order: ['kpis', 'sales', 'status', 'recent', 'due', 'activity', 'cashflow', 'topClients'],
  hidden: [],
  sizes: {},
}

export const defaultSettings = () => ({
  currency: 'INR',
  numberPattern: 'INV-{NNNN}',
  defaultNotes: 'Thank you for your business! Please make the payment within the due date.',
  defaultTerms: '1. Goods once sold will not be taken back.\n2. Interest @18% p.a. will be charged on overdue payments.',
  pdfFooter: 'Generated with Invix',
  showPdfFooter: true,
  taxScheme: 'gst',
  taxMode: 'exclusive',
  wordsSystem: 'indian',
  language: 'en',
  remindersEnabled: true,
  recurring: 'none', // none|weekly|monthly|yearly
})

const SEED = () => {
  const business = emptyBusiness('Acme Design Studio')
  business.legalName = 'Acme Design Studio LLP'
  business.address = '221 Anna Salai'
  business.city = 'Chennai'
  business.state = 'Tamil Nadu'
  business.stateCode = '33'
  business.pincode = '600002'
  business.taxId = '33AAECA1234C1ZV'
  business.email = 'billing@acmedesign.in'
  business.phone = '+91 98400 12345'
  business.website = 'https://acmedesign.in'
  business.bankDetails = {
    bankName: 'HDFC Bank, Anna Salai Branch',
    accountName: 'Acme Design Studio LLP',
    accountNumber: '50100234567890',
    ifsc: 'HDFC0000123',
    upiId: 'acmedesign@hdfcbank',
  }
  const clients = [
    { ...emptyClient(), name: 'Bright Retail Pvt Ltd', address: '48 MG Road', city: 'Bengaluru', state: 'Karnataka', stateCode: '29', pincode: '560001', email: 'accounts@brightretail.in', phone: '+91 98450 67890', gstin: '29AABCB5678D1Z2' },
    { ...emptyClient(), name: 'Nova Technologies', address: '9 Tech Park Drive', city: 'Chennai', state: 'Tamil Nadu', stateCode: '33', pincode: '600096', email: 'ap@novatech.io', phone: '+91 96000 11111', gstin: '33AACCN9012E1Z5' },
  ]
  const items = [
    { ...emptyCatalogItem(), name: 'Brand Identity Design', description: 'Logo, palette, typography and brand guidelines', unit: 'Job', rate: 35000, taxRate: 18 },
    { ...emptyCatalogItem(), name: 'Website Development', description: '5-page responsive marketing website', unit: 'Job', rate: 85000, taxRate: 18 },
    { ...emptyCatalogItem(), name: 'UI/UX Consulting', description: 'On-site product consulting (hourly)', unit: 'Hrs', rate: 2500, taxRate: 18 },
  ]
  const settings = defaultSettings()
  return { businesses: [business], activeBusinessId: business.id, clients, items, invoices: [], customTemplates: [], settings }
}

export const useData = create((set, get) => ({
  loaded: false,
  businesses: [],
  activeBusinessId: null,
  clients: [],
  items: [],
  invoices: [],
  customTemplates: [],
  expenses: [],
  goals: [],
  widgets: { ...DEFAULT_WIDGETS },
  settings: defaultSettings(),
  syncing: false,
  lastSyncedAt: null,

  async loadLocal() {
    const saved = await idbGet(DATA_KEY)
    if (saved && typeof saved === 'object') {
      set({
        businesses: saved.businesses?.length ? saved.businesses : SEED().businesses,
        activeBusinessId: saved.activeBusinessId || saved.businesses?.[0]?.id,
        clients: saved.clients || [],
        items: saved.items || [],
        invoices: saved.invoices || [],
        customTemplates: saved.customTemplates || [],
        expenses: saved.expenses || [],
        goals: saved.goals || [],
        widgets: { ...DEFAULT_WIDGETS, ...(saved.widgets || {}) },
        settings: { ...defaultSettings(), ...(saved.settings || {}) },
      })
    } else {
      const seed = SEED()
      set(seed)
      get().persist()
    }
    set({ loaded: true })
  },

  persist() {
    const { businesses, activeBusinessId, clients, items, invoices, customTemplates, expenses, goals, widgets, settings } = get()
    idbSet(DATA_KEY, { businesses, activeBusinessId, clients, items, invoices, customTemplates, expenses, goals, widgets, settings, savedAt: nowISO() })
  },

  /* ---------- Settings / business ---------- */
  updateSettings(patch) {
    set((s) => ({ settings: { ...s.settings, ...patch } }))
    get().persist()
  },
  setActiveBusiness(id) {
    set({ activeBusinessId: id })
    get().persist()
  },
  addBusiness() {
    const b = emptyBusiness('New Business')
    set((s) => ({ businesses: [...s.businesses, b], activeBusinessId: b.id }))
    get().persist()
    return b
  },
  updateBusiness(id, patch) {
    set((s) => ({ businesses: s.businesses.map((b) => (b.id === id ? { ...b, ...patch } : b)) }))
    get().persist()
  },
  saveBusiness(business) {
    set((s) => ({
      businesses: s.businesses.some((b) => b.id === business.id) ? s.businesses.map((b) => (b.id === business.id ? business : b)) : [...s.businesses, business],
    }))
    get().persist()
  },
  removeBusiness(id) {
    set((s) => {
      const businesses = s.businesses.filter((b) => b.id !== id)
      return { businesses, activeBusinessId: s.activeBusinessId === id ? businesses[0]?.id || null : s.activeBusinessId }
    })
    get().persist()
  },
  activeBusiness() {
    const { businesses, activeBusinessId } = get()
    return businesses.find((b) => b.id === activeBusinessId) || businesses[0] || null
  },

  /* ---------- Clients ---------- */
  saveClient(client) {
    const c = { ...client, updatedAt: nowISO() }
    set((s) => ({
      clients: s.clients.some((x) => x.id === c.id) ? s.clients.map((x) => (x.id === c.id ? c : x)) : [c, ...s.clients],
    }))
    get().persist()
  },
  deleteClient(id) {
    set((s) => ({ clients: s.clients.filter((c) => c.id !== id) }))
    get().persist()
  },

  /* ---------- Catalog items ---------- */
  saveItem(item) {
    const it = { ...item, updatedAt: nowISO() }
    set((s) => ({ items: s.items.some((x) => x.id === it.id) ? s.items.map((x) => (x.id === it.id ? it : x)) : [it, ...s.items] }))
    get().persist()
  },
  deleteItem(id) {
    set((s) => ({ items: s.items.filter((x) => x.id !== id) }))
    get().persist()
  },

  /* ---------- Invoices ---------- */
  saveInvoice(invoice) {
    const inv = { ...invoice, updatedAt: nowISO() }
    set((s) => ({
      invoices: s.invoices.some((x) => x.id === inv.id) ? s.invoices.map((x) => (x.id === inv.id ? inv : x)) : [inv, ...s.invoices],
    }))
    get().persist()
  },
  deleteInvoice(id) {
    set((s) => ({ invoices: s.invoices.filter((i) => i.id !== id) }))
    get().persist()
  },
  deleteInvoices(ids) {
    const idSet = new Set(ids)
    set((s) => ({ invoices: s.invoices.filter((i) => !idSet.has(i.id)) }))
    get().persist()
  },
  duplicateInvoice(id) {
    const src = get().invoices.find((i) => i.id === id)
    if (!src) return null
    const copy = { ...JSON.parse(JSON.stringify(src)), id: uid(), number: '', status: 'draft', payments: [], createdAt: nowISO() }
    copy.items = copy.items.map((it) => ({ ...it, _id: uid() }))
    get().saveInvoice(copy)
    return copy
  },

  /* ---------- Custom templates ---------- */
  saveCustomTemplate(tpl) {
    set((s) => ({
      customTemplates: s.customTemplates.some((t) => t.id === tpl.id) ? s.customTemplates.map((t) => (t.id === tpl.id ? tpl : t)) : [...s.customTemplates, tpl],
    }))
    get().persist()
  },
  deleteCustomTemplate(id) {
    set((s) => ({ customTemplates: s.customTemplates.filter((t) => t.id !== id) }))
    get().persist()
  },

  /* ---------- Expenses & goals ---------- */
  saveExpense(expense) {
    const ex = { ...expense, updatedAt: nowISO() }
    set((s) => ({ expenses: s.expenses.some((x) => x.id === ex.id) ? s.expenses.map((x) => (x.id === ex.id ? ex : x)) : [ex, ...s.expenses] }))
    get().persist()
  },
  deleteExpense(id) {
    set((s) => ({ expenses: s.expenses.filter((e) => e.id !== id) }))
    get().persist()
  },
  saveGoal(goal) {
    const g = { ...goal, updatedAt: nowISO() }
    set((s) => ({ goals: s.goals.some((x) => x.id === g.id) ? s.goals.map((x) => (x.id === g.id ? g : x)) : [g, ...s.goals] }))
    get().persist()
  },
  deleteGoal(id) {
    set((s) => ({ goals: s.goals.filter((g) => g.id !== id) }))
    get().persist()
  },
  setWidgets(widgets) {
    set((s) => ({ widgets: { ...DEFAULT_WIDGETS, ...s.widgets, ...widgets } }))
    get().persist()
  },

  /* ---------- Backup / restore ---------- */
  async exportBackup() {
    const { businesses, activeBusinessId, clients, items, invoices, customTemplates, expenses, goals, widgets, settings } = get()
    return { app: 'invix', version: 1, exportedAt: nowISO(), businesses, activeBusinessId, clients, items, invoices, customTemplates, expenses, goals, widgets, settings }
  },
  async importBackup(data) {
    if (!data || data.app !== 'invix') throw new Error('Not a valid Invix backup file')
    set({
      businesses: Array.isArray(data.businesses) && data.businesses.length ? data.businesses : SEED().businesses,
      activeBusinessId: data.activeBusinessId || data.businesses?.[0]?.id,
      clients: data.clients || [],
      items: data.items || [],
      invoices: data.invoices || [],
      customTemplates: data.customTemplates || [],
      expenses: data.expenses || [],
      goals: data.goals || [],
      widgets: { ...DEFAULT_WIDGETS, ...(data.widgets || {}) },
      settings: { ...defaultSettings(), ...(data.settings || {}) },
    })
    get().persist()
  },

  /* ---------- Cloud sync ---------- */
  get authed() {
    return isSupabaseConfigured && !!useAuth.getState().user
  },

  async pullCloud() {
    if (!isSupabaseConfigured || !supabase) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    set({ syncing: true })
    try {
      const uid_ = user.id
      const [biz, cli, itm, inv, tpl, exp, goal, layout] = await Promise.all([
        supabase.from('businesses').select('*').eq('user_id', uid_),
        supabase.from('clients').select('*').eq('user_id', uid_),
        supabase.from('items').select('*').eq('user_id', uid_),
        supabase.from('invoices').select('*, invoice_items(*), payments(*)').eq('user_id', uid_),
        supabase.from('templates').select('*').eq('user_id', uid_),
        supabase.from('expenses').select('*').eq('user_id', uid_),
        supabase.from('goals').select('*').eq('user_id', uid_),
        supabase.from('dashboard_layouts').select('layout').eq('user_id', uid_).maybeSingle(),
      ])

      const cloudBusinesses = (biz.data || []).map(rowToBusiness)
      const cloudClients = (cli.data || []).map(rowToClient)
      const cloudItems = (itm.data || []).map(rowToItem)
      const cloudInvoices = (inv.data || []).map(rowToInvoice)
      const cloudTemplates = (tpl.data || []).map(rowToTemplate)
      const cloudExpenses = (exp.data || []).map(rowToExpense)
      const cloudGoals = (goal.data || []).map(rowToGoal)

      // last-write-wins merge on updatedAt
      const merged = {
        businesses: mergeById(get().businesses, cloudBusinesses),
        clients: mergeById(get().clients, cloudClients),
        items: mergeById(get().items, cloudItems),
        invoices: mergeById(get().invoices, cloudInvoices),
        customTemplates: mergeById(get().customTemplates, cloudTemplates),
        expenses: mergeById(get().expenses, cloudExpenses),
        goals: mergeById(get().goals, cloudGoals),
      }
      set({
        ...merged,
        widgets: layout.data?.layout ? { ...DEFAULT_WIDGETS, ...(layout.data.layout) } : get().widgets,
        activeBusinessId: merged.businesses.find((b) => b.id === get().activeBusinessId) ? get().activeBusinessId : merged.businesses[0]?.id || null,
        lastSyncedAt: nowISO(),
      })
      get().persist()
      // push anything local that is newer than cloud
      await get().pushCloud()
    } finally {
      set({ syncing: false })
    }
  },

  async pushCloud() {
    if (!isSupabaseConfigured || !supabase) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const uid_ = user.id
    const s = get()
    set({ syncing: true })
    try {
      await Promise.all([
        supabase.from('businesses').upsert(s.businesses.map(businessToRow(uid_))),
        supabase.from('clients').upsert(s.clients.map(clientToRow(uid_))),
        supabase.from('items').upsert(s.items.map(itemToRow(uid_))),
        supabase.from('templates').upsert(s.customTemplates.map(templateToRow(uid_))),
        supabase.from('invoices').upsert(s.invoices.map(invoiceToRow(uid_))),
        supabase.from('expenses').upsert(s.expenses.map(expenseToRow(uid_))),
        supabase.from('goals').upsert(s.goals.map(goalToRow(uid_))),
        supabase.from('dashboard_layouts').upsert({ user_id: uid_, layout: s.widgets, updated_at: nowISO() }),
      ])
      const itemsRows = s.invoices.flatMap((inv) => inv.items.map((it) => itemLineToRow(uid_, inv.id, it)))
      if (itemsRows.length) await supabase.from('invoice_items').upsert(itemsRows)
      const paymentRows = s.invoices.flatMap((inv) => (inv.payments || []).map((p) => paymentToRow(uid_, inv.id, p)))
      if (paymentRows.length) await supabase.from('payments').upsert(paymentRows)
      set({ lastSyncedAt: nowISO() })
    } finally {
      set({ syncing: false })
    }
  },

  async syncNow() {
    if (!isSupabaseConfigured) {
      toast('Cloud sync requires Supabase configuration (.env)', 'warn')
      return
    }
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      toast('Cloud sync is not active for this workspace', 'warn')
      return
    }
    try {
      await get().pushCloud()
      await get().pullCloud()
      toast('Workspace synced', 'success')
    } catch (e) {
      toast(`Sync failed: ${e.message}`, 'error')
    }
  },
}))

function mergeById(localArr, cloudArr) {
  const map = new Map(localArr.map((x) => [x.id, x]))
  for (const c of cloudArr) {
    const l = map.get(c.id)
    if (!l || new Date(c.updatedAt || 0) >= new Date(l.updatedAt || 0)) map.set(c.id, c)
  }
  return [...map.values()]
}

/* ---------- row <-> entity mappers ---------- */
const strip = (obj) => {
  const { _id, ...rest } = obj
  void _id
  return rest
}

export const businessToRow = (userId) => (b) => ({ id: b.id, user_id: userId, ...strip(b), bank_details: b.bankDetails || {}, bankDetails: undefined })
export const rowToBusiness = (r) => ({ ...r, bankDetails: r.bank_details || {}, bank_details: undefined })

export const clientToRow = (userId) => (c) => ({ id: c.id, user_id: userId, ...strip(c) })
export const rowToClient = (r) => ({ id: r.id, ...strip(r) })

export const itemToRow = (userId) => (i) => ({ id: i.id, user_id: userId, category: i.category || null, ...strip(i) })
export const rowToItem = (r) => ({ id: r.id, ...strip(r) })

export const expenseToRow = (userId) => (e) => ({
  id: e.id,
  user_id: userId,
  business_id: e.businessId || null,
  category: e.category || 'Other',
  description: e.description || null,
  amount: Number(e.amount) || 0,
  expense_date: e.date || null,
  receipt_path: e.receipt || null,
  updated_at: e.updatedAt || nowISO(),
})
export const rowToExpense = (r) => ({
  id: r.id,
  businessId: r.business_id || undefined,
  category: r.category || 'Other',
  description: r.description || '',
  amount: Number(r.amount) || 0,
  date: r.expense_date || null,
  receipt: r.receipt_path || '',
  updatedAt: r.updated_at,
})

export const goalToRow = (userId) => (g) => ({
  id: g.id,
  user_id: userId,
  business_id: g.businessId || null,
  period_type: g.periodType || 'monthly',
  period_key: String(g.periodKey || ''),
  target: Number(g.target) || 0,
  updated_at: g.updatedAt || nowISO(),
})
export const rowToGoal = (r) => ({
  id: r.id,
  businessId: r.business_id || undefined,
  periodType: r.period_type || 'monthly',
  periodKey: r.period_key,
  target: Number(r.target) || 0,
  updatedAt: r.updated_at,
})

export const templateToRow = (userId) => (t) => ({ id: t.id, user_id: userId, ...strip(t) })
export const rowToTemplate = (r) => ({ id: r.id, ...strip(r) })

export const invoiceToRow = (userId) => (inv) => {
  const totals = computeTotals(inv)
  return {
  id: inv.id,
  user_id: userId,
  business_id: inv.business?.id || null,
  client_id: inv.client?.id || null,
  number: inv.number,
  status: inv.status,
  kind: inv.kind || 'invoice',
  template_id: inv.templateId,
  customization: inv.customization || null,
  currency: inv.currency,
  data: {
    issueDate: inv.issueDate, dueDate: inv.dueDate, poNumber: inv.poNumber, paymentTerms: inv.paymentTerms,
    business: inv.business, client: inv.client, items: inv.items, discount: inv.discount, shipping: inv.shipping,
    extraCharges: inv.extraCharges, notes: inv.notes, terms: inv.terms, bankDetails: inv.bankDetails,
    signature: inv.signature, stamp: inv.stamp, taxScheme: inv.taxScheme, taxMode: inv.taxMode,
    roundOff: inv.roundOff, recurring: inv.recurring, showAmountInWords: inv.showAmountInWords,
    shareId: inv.shareId, amountPaidMeta: (inv.payments || []).length,
    paid: totals.paid, balance: totals.balance, tax_total: totals.taxTotal,
  },
  issue_date: inv.issueDate || null,
  due_date: inv.dueDate || null,
  total: totals.total,
  paid: totals.paid,
  balance: totals.balance,
  tax_total: totals.taxTotal,
  status: inv.status,
  updated_at: inv.updatedAt || nowISO(),
  created_at: inv.createdAt || nowISO(),
  }
}

export const rowToInvoice = (r) => {
  const d = r.data || {}
  const invoice = {
    id: r.id,
    number: r.number,
    status: r.status,
    kind: r.kind || 'invoice',
    templateId: r.template_id,
    customization: r.customization || undefined,
    currency: r.currency || 'INR',
    issueDate: d.issueDate || r.issue_date,
    dueDate: d.dueDate || r.due_date,
    poNumber: d.poNumber,
    paymentTerms: d.paymentTerms,
    business: d.business,
    client: d.client,
    items: d.items || [],
    discount: d.discount,
    shipping: d.shipping,
    extraCharges: d.extraCharges,
    notes: d.notes,
    terms: d.terms,
    bankDetails: d.bankDetails,
    signature: d.signature,
    stamp: d.stamp,
    taxScheme: d.taxScheme,
    taxMode: d.taxMode,
    roundOff: d.roundOff,
    recurring: d.recurring,
    showAmountInWords: d.showAmountInWords,
    shareId: d.shareId,
    payments: (r.payments || []).map((p) => ({ id: p.id, date: p.date, amount: Number(p.amount), method: p.method, note: p.note })),
    updatedAt: r.updated_at,
    createdAt: r.created_at,
  }
  const totals = computeTotals(invoice)
  return {
    ...invoice,
    total: Number(r.total ?? d.total ?? totals.total) || 0,
    paid: Number(r.paid ?? d.paid ?? totals.paid) || 0,
    balance: Number(r.balance ?? d.balance ?? totals.balance) || 0,
    tax_total: Number(r.tax_total ?? d.tax_total ?? totals.taxTotal) || 0,
  }
}

export const itemLineToRow = (userId, invoiceId, it) => ({
  id: it._id || it.id,
  invoice_id: invoiceId,
  user_id: userId,
  description: it.description,
  hsn: it.hsn,
  quantity: Number(it.quantity) || 0,
  unit: it.unit,
  rate: Number(it.rate) || 0,
  discount_type: it.discountType || 'percent',
  discount_value: Number(it.discountValue) || 0,
  tax_rate: Number(it.taxRate) || 0,
  tax_name: it.taxName,
  position: it.position || 0,
})

export const paymentToRow = (userId, invoiceId, p) => ({
  id: p.id,
  invoice_id: invoiceId,
  user_id: userId,
  date: p.date,
  amount: Number(p.amount) || 0,
  method: p.method,
  note: p.note,
})
