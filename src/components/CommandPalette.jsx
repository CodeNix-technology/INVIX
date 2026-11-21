import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../store/data'
import { useUI, toast } from '../store/ui'
import { exportJSON } from '../utils/files'
import { formatMoney } from '../utils/currency'
import {
  IconSearch, IconArrowRight, IconInvoice, IconUsers, IconPackage, IconRefresh,
  IconDownload, IconSun, IconMoon, IconSparkle, IconPlus, IconChart, IconPalette,
  IconSettings, IconDashboard, IconFileText, IconWallet, IconX, IconChevronLeft,
} from './icons'

const SHORTCUTS = [
  ['Ctrl / ⌘ + K', 'Open command palette'],
  ['N', 'New invoice (Invoices ledger)'],
  ['Ctrl / ⌘ + Z', 'Undo (Invoice studio)'],
  ['Ctrl / ⌘ + Y', 'Redo (Invoice studio)'],
  ['Ctrl / ⌘ + S', 'Save draft (Invoice studio)'],
  ['Esc', 'Close dialogs and palette'],
]

export default function CommandPalette({ open, onClose }) {
  const navigate = useNavigate()
  const data = useData()
  const theme = useUI((s) => s.theme)
  const [query, setQuery] = useState('')
  const [index, setIndex] = useState(0)
  const [view, setView] = useState('commands')
  const inputRef = useRef(null)
  const listRef = useRef(null)

  useEffect(() => {
    if (!open) return
    setQuery('')
    setIndex(0)
    setView('commands')
    const frame = requestAnimationFrame(() => inputRef.current?.focus())
    return () => cancelAnimationFrame(frame)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        if (view === 'shortcuts') setView('commands')
        else onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, view, onClose])

  useEffect(() => { setIndex(0) }, [query, view])

  useEffect(() => {
    listRef.current?.querySelector(`[data-cmd-index="${index}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [index])

  if (!open) return null

  const go = (to) => () => navigate(to)
  const run = (fn) => () => { onClose(); fn() }
  const q = query.trim().toLowerCase()

  const commands = [
    { id: 'nav-dashboard', group: 'Navigate', label: 'Dashboard', hint: 'Business overview', icon: IconDashboard, run: go('/dashboard') },
    { id: 'nav-analytics', group: 'Navigate', label: 'Analytics & Insights', hint: 'Revenue, tax and goals', icon: IconChart, run: go('/analytics') },
    { id: 'nav-invoices', group: 'Navigate', label: 'Invoices ledger', hint: 'All documents', icon: IconInvoice, run: go('/invoices') },
    { id: 'nav-clients', group: 'Navigate', label: 'Clients', hint: 'Customer directory', icon: IconUsers, run: go('/clients') },
    { id: 'nav-items', group: 'Navigate', label: 'Items & services', hint: 'Catalog', icon: IconPackage, run: go('/items') },
    { id: 'nav-templates', group: 'Navigate', label: 'Templates', hint: '15 invoice designs', icon: IconPalette, run: go('/templates') },
    { id: 'nav-reports', group: 'Navigate', label: 'Reports', hint: 'Classic statements', icon: IconFileText, run: go('/reports') },
    { id: 'nav-settings', group: 'Navigate', label: 'Settings', hint: 'Workspace preferences', icon: IconSettings, run: go('/settings') },
    { id: 'create-invoice', group: 'Create', label: 'New invoice', hint: 'Open Invoice Studio', icon: IconPlus, run: go('/builder') },
    { id: 'create-client', group: 'Create', label: 'Add client', hint: 'Save a customer', icon: IconUsers, run: go('/clients') },
    { id: 'create-item', group: 'Create', label: 'Add item', hint: 'Add to catalog', icon: IconPackage, run: go('/items') },
    { id: 'create-expense', group: 'Create', label: 'Expense or goal', hint: 'Financial planning', icon: IconWallet, run: go('/analytics?tab=goals') },
    { id: 'act-sync', group: 'Actions', label: 'Sync now', hint: 'Push and pull cloud data', icon: IconRefresh, run: run(() => data.syncNow()) },
    {
      id: 'act-backup', group: 'Actions', label: 'Export backup', hint: 'Download all workspace data', icon: IconDownload,
      run: run(async () => {
        const backup = await data.exportBackup()
        exportJSON(backup, `invix-backup-${new Date().toISOString().slice(0, 10)}`)
        toast('Backup downloaded', 'success')
      }),
    },
    {
      id: 'act-theme', group: 'Actions', label: 'Toggle light / dark theme', hint: 'Switch appearance',
      icon: theme === 'dark' ? IconSun : IconMoon,
      run: run(() => useUI.getState().setTheme(theme === 'dark' ? 'light' : 'dark')),
    },
    { id: 'act-shortcuts', group: 'Actions', label: 'Keyboard shortcuts', hint: 'See all hotkeys', icon: IconSparkle, run: () => setView('shortcuts') },
  ]

  if (q.length > 1) {
    data.invoices.slice(0, 40).forEach((inv) => {
      const label = inv.number || 'Untitled invoice'
      const haystack = `${label} ${inv.client?.name || ''} ${inv.client?.gstin || ''}`.toLowerCase()
      if (!haystack.includes(q)) return
      commands.push({
        id: `inv-${inv.id}`, group: 'Invoices', label,
        hint: `${inv.client?.name || 'No client'} · ${formatMoney(inv.total ?? 0, inv.currency)}`,
        icon: IconInvoice, run: go(`/builder/${inv.id}`),
      })
    })
    data.clients.slice(0, 40).forEach((client) => {
      if (!`${client.name || ''} ${client.email || ''} ${client.gstin || ''}`.toLowerCase().includes(q)) return
      commands.push({
        id: `client-${client.id}`, group: 'Clients', label: client.name || 'Unnamed client',
        hint: client.email || client.gstin || 'Client record', icon: IconUsers, run: go('/clients'),
      })
    })
    data.items.slice(0, 40).forEach((item) => {
      if (!`${item.name || ''} ${item.sku || ''}`.toLowerCase().includes(q)) return
      commands.push({
        id: `item-${item.id}`, group: 'Items', label: item.name || 'Unnamed item',
        hint: `Catalog · ${formatMoney(item.price || item.rate || 0)}`, icon: IconPackage, run: go('/items'),
      })
    })
  }

  const results = commands.filter((c) => `${c.group} ${c.label} ${c.hint || ''}`.toLowerCase().includes(q)).slice(0, 24)
  const active = results[index]

  const onInputKey = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setIndex((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      active?.run()
    }
  }

  let lastGroup = ''

  return (
    <div
      className="fixed inset-0 z-[80] flex items-start justify-center bg-inverse-surface/40 px-3 pt-[10vh] backdrop-blur-xs sm:pt-[14vh]"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div role="dialog" aria-modal="true" aria-label="Command palette" className="w-full max-w-xl overflow-hidden rounded-2xl border border-surface-container bg-surface-container-lowest shadow-2xl animate-scale-in dark:border-slate-700 dark:bg-slate-900">
        {view === 'shortcuts' ? (
          <>
            <div className="flex items-center gap-2 border-b border-surface-container px-4 py-3 dark:border-slate-800">
              <button type="button" onClick={() => setView('commands')} aria-label="Back to commands" className="rounded-lg p-1.5 text-on-surface-variant hover:bg-surface-container dark:hover:bg-slate-800"><IconChevronLeft size={18} /></button>
              <span className="font-headline-sm text-sm font-bold text-on-surface dark:text-white">Keyboard shortcuts</span>
              <button type="button" onClick={onClose} aria-label="Close command palette" className="ml-auto rounded-lg p-1.5 text-on-surface-variant hover:bg-surface-container dark:hover:bg-slate-800"><IconX size={17} /></button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-3">
              {SHORTCUTS.map(([keys, label]) => (
                <div key={keys} className="flex items-center justify-between gap-4 rounded-lg px-3 py-2.5 hover:bg-surface-container-low dark:hover:bg-slate-800/60">
                  <span className="font-body-sm text-body-sm text-on-surface dark:text-slate-200">{label}</span>
                  <kbd className="shrink-0 rounded-md bg-surface-container px-2 py-1 font-label-caps text-[10px] font-semibold text-on-surface-variant dark:bg-slate-800 dark:text-slate-300">{keys}</kbd>
                </div>
              ))}
            </div>
            <div className="border-t border-surface-container px-4 py-2.5 font-body-sm text-body-sm text-on-surface-variant dark:border-slate-800 dark:text-slate-400">
              Tip: type in the command palette to search invoices, clients and items.
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-3 border-b border-surface-container px-4 py-3 dark:border-slate-800">
              <IconSearch size={19} className="shrink-0 text-primary dark:text-primary-fixed-dim" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onInputKey}
                placeholder="Search or type a command…"
                aria-label="Search commands"
                className="min-w-0 flex-1 bg-transparent font-body-md text-body-md text-on-surface outline-none placeholder:text-outline dark:text-slate-100"
              />
              <kbd className="hidden shrink-0 rounded-md bg-surface-container px-2 py-1 font-label-caps text-[10px] font-semibold text-on-surface-variant dark:bg-slate-800 dark:text-slate-300 sm:block">ESC</kbd>
            </div>
            <div ref={listRef} className="no-scrollbar max-h-[56vh] overflow-y-auto p-2">
              {!results.length ? (
                <div className="px-4 py-10 text-center font-body-sm text-body-sm text-on-surface-variant dark:text-slate-400">No commands match “{query}”.</div>
              ) : results.map((cmd, i) => {
                const CmdIcon = cmd.icon
                const showGroup = cmd.group !== lastGroup
                lastGroup = cmd.group
                return (
                  <React.Fragment key={cmd.id}>
                    {showGroup ? (
                      <div className="px-3 pb-1 pt-3 font-label-caps text-label-caps uppercase tracking-wider text-outline dark:text-slate-500">{cmd.group}</div>
                    ) : null}
                    <button
                      type="button"
                      data-cmd-index={i}
                      onMouseEnter={() => setIndex(i)}
                      onClick={cmd.run}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors ${i === index ? 'bg-primary text-on-primary dark:bg-primary' : 'text-on-surface hover:bg-surface-container-low dark:text-slate-100 dark:hover:bg-slate-800/60'}`}
                    >
                      <CmdIcon size={17} className={i === index ? 'text-on-primary' : 'text-on-surface-variant dark:text-slate-400'} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-label-ui text-label-ui font-semibold">{cmd.label}</span>
                        {cmd.hint ? <span className={`block truncate font-body-sm text-[11px] ${i === index ? 'text-on-primary/80' : 'text-on-surface-variant dark:text-slate-400'}`}>{cmd.hint}</span> : null}
                      </span>
                      <IconArrowRight size={15} className={i === index ? 'text-on-primary' : 'text-outline dark:text-slate-500'} />
                    </button>
                  </React.Fragment>
                )
              })}
            </div>
            <div className="flex items-center gap-4 border-t border-surface-container px-4 py-2.5 font-label-caps text-label-caps text-on-surface-variant dark:border-slate-800 dark:text-slate-400">
              <span>↑↓ Navigate</span><span>↵ Select</span><span>Esc Close</span>
              <span className="ml-auto hidden sm:inline">Invix command bar</span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
