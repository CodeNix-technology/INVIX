import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { LogoMark } from '../brand'
import CommandPalette from '../CommandPalette'
import { useUI, applyTheme } from '../../store/ui'
import { useData } from '../../store/data'
import {
  IconDashboard, IconInvoice, IconUsers, IconPackage, IconPalette, IconChart,
  IconSettings, IconX, IconMenu, IconSun, IconMoon, IconRefresh,
  IconBell, IconAlert, IconClock, IconCheck, IconChevronDown, IconSearch,
} from '../icons'
import { buildFacts, collectPayments } from '../../utils/analytics'
import { buildNotifications } from '../../utils/analyticsExtras'
import { formatDate } from '../../utils/date'
import { useSyncLang } from '../../i18n'
import { isSupabaseConfigured } from '../../services/supabase'

const NOTIF_ICONS = { alert: IconAlert, clock: IconClock, check: IconCheck }
const NOTIF_COLORS = {
  danger: 'bg-error-container text-error dark:bg-danger-500/15 dark:text-danger-300',
  warning: 'bg-surface-container-high text-tertiary dark:bg-warning-500/15 dark:text-warning-300',
  success: 'bg-secondary-container/50 text-secondary dark:bg-secondary-500/15 dark:text-secondary-300',
}

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: IconDashboard },
  { to: '/analytics', label: 'Analytics', icon: IconChart },
  { to: '/invoices', label: 'Invoices', icon: IconInvoice },
  { to: '/clients', label: 'Clients', icon: IconUsers },
  { to: '/items', label: 'Items', icon: IconPackage },
  { to: '/templates', label: 'Templates', icon: IconPalette },
  { to: '/reports', label: 'Reports', icon: IconChart },
  { to: '/settings', label: 'Settings', icon: IconSettings },
]

const MOBILE_NAV = [
  { to: '/dashboard', label: 'Home', icon: IconDashboard },
  { to: '/invoices', label: 'Invoices', icon: IconInvoice },
  { to: '/clients', label: 'Clients', icon: IconUsers },
  { to: '/analytics', label: 'Analytics', icon: IconChart },
  { to: '/settings', label: 'Settings', icon: IconSettings },
]

const CRUMBS = {
  '/dashboard': 'Overview',
  '/analytics': 'Analytics',
  '/invoices': 'Live Ledger',
  '/clients': 'Clients',
  '/items': 'Catalog',
  '/templates': 'Templates',
  '/reports': 'Reports',
  '/settings': 'Settings',
  '/builder': 'Invoice Studio',
}

function Breadcrumb({ pathname }) {
  let current = CRUMBS[pathname]
  if (!current && pathname.startsWith('/builder')) current = 'Invoice Studio'
  if (!current && pathname.startsWith('/templates/')) current = 'Template Preview'
  if (!current) current = 'Workspace'
  return (
    <div className="hidden items-center gap-2 sm:flex" aria-label="Breadcrumb">
      <span className="font-label-ui text-label-ui text-on-surface-variant dark:text-slate-400">Workspace</span>
      <span className="text-outline-variant dark:text-slate-600">/</span>
      <span className="font-label-ui text-label-ui font-semibold text-on-surface dark:text-slate-100">{current}</span>
    </div>
  )
}

export default function Shell() {
  useSyncLang()
  const location = useLocation()
  const sidebarOpen = useUI((s) => s.sidebarOpen)
  const setSidebar = useUI((s) => s.setSidebar)
  const theme = useUI((s) => s.theme)
  const setTheme = useUI((s) => s.setTheme)
  const syncing = useData((s) => s.syncing)
  const lastSyncedAt = useData((s) => s.lastSyncedAt)
  const syncNow = useData((s) => s.syncNow)
  const businesses = useData((s) => s.businesses)
  const activeBusinessId = useData((s) => s.activeBusinessId)
  const setActiveBusiness = useData((s) => s.setActiveBusiness)
  const invoices = useData((s) => s.invoices)
  const [notifOpen, setNotifOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const notifRef = useRef(null)
  const notifications = useMemo(
    () => buildNotifications(buildFacts(invoices, activeBusinessId), collectPayments(invoices, activeBusinessId)),
    [invoices, activeBusinessId]
  )

  useEffect(() => {
    applyTheme(theme)
    if (theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const fn = () => applyTheme('system')
    mq.addEventListener('change', fn)
    return () => mq.removeEventListener('change', fn)
  }, [theme])

  useEffect(() => setSidebar(false), [location.pathname, setSidebar])

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen((v) => !v)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (!notifOpen) return
    const onDoc = (e) => { if (!notifRef.current?.contains(e.target)) setNotifOpen(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [notifOpen])

  const isDark = document.documentElement.classList.contains('dark')
  const activeBusiness = businesses.find((b) => b.id === activeBusinessId) || businesses[0]
  const navLinkClass = ({ isActive }) =>
    `group flex items-center gap-3 rounded-lg px-3 py-2 transition-colors ${
      isActive
        ? 'relative bg-surface-container-high font-semibold text-primary before:absolute before:bottom-1.5 before:left-0 before:top-1.5 before:w-1 before:rounded-r before:bg-primary dark:bg-primary/15 dark:text-primary-fixed-dim'
        : 'font-label-ui text-label-ui text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100'
    }`

  return (
    <div className="min-h-screen bg-surface font-body-md text-on-surface antialiased dark:bg-[#0b1120] dark:text-slate-100">
      {/* Fixed sidebar */}
      <aside className="fixed inset-y-0 left-0 z-50 hidden w-60 flex-col justify-between bg-surface-container-lowest shadow-[0_1px_8px_rgba(0,0,0,0.04)] dark:bg-slate-900 md:flex" aria-label="Main navigation">
        <div>
          <div className="flex h-14 items-center justify-between px-5">
            <NavLink to="/dashboard" aria-label="Invix home" className="flex items-center gap-2">
              <LogoMark size={28} />
              <span className="font-headline-sm text-[17px] font-bold tracking-tight text-on-surface dark:text-white">Invix</span>
              <span className="rounded bg-primary-container px-1.5 py-0.5 font-label-caps text-[9px] text-on-primary">PRO</span>
            </NavLink>
          </div>
          <div className="px-3 py-2">
            <div className="px-3 pb-1.5 pt-2 font-label-caps text-label-caps uppercase tracking-wider text-on-surface-variant dark:text-slate-500">Navigation</div>
            <nav className="flex flex-col space-y-1">
              {NAV.map((item) => (
                <NavLink key={item.to} to={item.to} className={navLinkClass}>
                  {({ isActive }) => (
                    <>
                      <item.icon size={19} strokeWidth={isActive ? 2.3 : 1.8} className={isActive ? 'text-primary dark:text-primary-fixed-dim' : 'text-current'} />
                      <span>{item.label}</span>
                    </>
                  )}
                </NavLink>
              ))}
            </nav>
          </div>
        </div>
        <div className="mx-3 mb-3 space-y-2.5 rounded-xl bg-surface-container-low p-3 dark:bg-slate-800/70">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-secondary opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-secondary" />
            </span>
            <span className="font-body-sm text-body-sm text-on-surface-variant dark:text-slate-400">
              {syncing ? 'Syncing now…' : lastSyncedAt ? `Synced ${new Date(lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Local workspace'}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className={`font-label-caps text-label-caps ${isSupabaseConfigured ? 'text-tertiary' : 'text-outline'}`}>
              {isSupabaseConfigured ? 'Local workspace' : 'Offline workspace'}
            </span>
            <span className="h-2 w-2 bg-secondary" />
          </div>
          <div className="space-y-0.5 pt-1 text-center text-[10px] leading-tight text-outline dark:text-slate-500">
            <div>Invix · Open source · v2.4</div>
            <div>
              Made by <a href="https://codenix-technology.xyz/" target="_blank" rel="noreferrer" className="underline hover:text-on-surface-variant dark:hover:text-slate-300">https://codenix-technology.xyz/</a> · Elements by Y. GOKUL RAAJ
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile drawer */}
      {sidebarOpen ? (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Navigation menu">
          <div className="absolute inset-0 bg-inverse-surface/40 backdrop-blur-xs" onClick={() => setSidebar(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-64 flex-col bg-surface-container-lowest p-3 shadow-2xl dark:bg-slate-900">
            <div className="mb-3 flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                <LogoMark size={26} />
                <span className="font-headline-sm text-base font-bold">Invix</span>
              </div>
              <button onClick={() => setSidebar(false)} className="rounded-lg p-1.5 text-on-surface-variant hover:bg-surface-container dark:hover:bg-slate-800" aria-label="Close menu"><IconX size={18} /></button>
            </div>
            <nav className="flex flex-col space-y-1">
              {NAV.map((item) => (
                <NavLink key={item.to} to={item.to} className={navLinkClass}>
                  <item.icon size={19} />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </nav>
            <div className="mt-auto space-y-0.5 px-2 pt-4 text-center text-[10px] leading-tight text-outline dark:text-slate-500">
              <div>Invix · Open source · v2.4</div>
              <div>
                Made by <a href="https://codenix-technology.xyz/" target="_blank" rel="noreferrer" className="underline hover:text-on-surface-variant dark:hover:text-slate-300">https://codenix-technology.xyz/</a> · Elements by Y. GOKUL RAAJ
              </div>
            </div>
          </aside>
        </div>
      ) : null}

      {/* Fixed top bar */}
      <header className="fixed left-0 right-0 top-0 z-40 flex h-14 items-center justify-between bg-surface/90 px-4 shadow-[0_1px_8px_rgba(0,0,0,0.04)] backdrop-blur-xl dark:bg-slate-900/90 lg:px-6 md:left-60">
        <div className="flex min-w-0 items-center gap-2">
          <button onClick={() => useUI.getState().toggleSidebar()} className="rounded-lg p-1.5 text-on-surface-variant hover:bg-surface-container hover:text-on-surface dark:hover:bg-slate-800" aria-label="Open menu">
            <IconMenu size={22} />
          </button>
          <div className="flex items-center gap-1.5 md:hidden">
            <LogoMark size={22} />
            <span className="font-headline-sm text-sm font-bold">Invix</span>
          </div>
          <Breadcrumb pathname={location.pathname} />
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            aria-label="Open command palette"
            className="flex h-9 items-center gap-2 rounded-lg bg-surface-container-low px-2.5 text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-100 sm:px-3"
          >
            <IconSearch size={17} />
            <span className="hidden font-label-ui text-label-ui font-medium sm:inline">Search</span>
            <kbd className="hidden rounded bg-surface-container px-1.5 py-0.5 font-label-caps text-[10px] text-outline dark:bg-slate-700 dark:text-slate-400 lg:inline">⌘K</kbd>
          </button>
          {businesses.length > 0 ? (
            <label className="hidden max-w-[190px] items-center gap-2 rounded-lg bg-surface-container-low px-2.5 py-1 hover:bg-surface-container dark:bg-slate-800 lg:flex">
              <span className="h-2 w-2 shrink-0 rounded-full bg-secondary" />
              <span className="truncate font-label-ui text-label-ui font-semibold text-on-surface dark:text-slate-100">{activeBusiness?.name || 'Business'}</span>
              <span className="hidden rounded bg-surface-container px-1.5 py-0.5 font-label-caps text-[9px] text-on-surface-variant dark:bg-slate-700 dark:text-slate-300 xl:inline">GSTIN</span>
              <select
                value={activeBusinessId || ''}
                onChange={(e) => setActiveBusiness(e.target.value)}
                aria-label="Active business profile"
                className="max-w-[24px] cursor-pointer appearance-none bg-transparent text-transparent outline-none"
              >
                {businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
              <IconChevronDown size={14} className="text-on-surface-variant" />
            </label>
          ) : null}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setNotifOpen((v) => !v)}
              className="relative rounded-lg p-1.5 text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-on-surface dark:text-slate-400 dark:hover:bg-slate-800"
              aria-label="Notifications"
              aria-expanded={notifOpen}
            >
              <IconBell size={20} />
              {notifications.length ? (
                <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-error px-1 font-label-caps text-[9px] font-bold text-on-error">
                  {notifications.length > 9 ? '9+' : notifications.length}
                </span>
              ) : null}
            </button>
            {notifOpen ? (
              <div className="absolute right-0 top-11 z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-surface-container bg-surface-container-lowest shadow-xl dark:border-slate-700 dark:bg-slate-900">
                <div className="flex items-center justify-between border-b border-surface-container px-4 py-3 dark:border-slate-800">
                  <span className="font-headline-sm text-sm font-bold">Notifications</span>
                  <span className="rounded-full bg-surface-container px-2 py-0.5 font-label-caps text-[10px] text-primary dark:bg-primary/15">{notifications.length} new</span>
                </div>
                {!notifications.length ? (
                  <div className="px-4 py-8 text-center font-body-sm text-body-sm text-on-surface-variant">You're all caught up.</div>
                ) : (
                  <div className="no-scrollbar max-h-[22rem] divide-y divide-surface-container overflow-y-auto dark:divide-slate-800">
                    {notifications.map((n) => {
                      const I = NOTIF_ICONS[n.icon] || IconBell
                      return (
                        <Link key={n.id} to={n.href || '/analytics?tab=payments'} onClick={() => setNotifOpen(false)} className="flex items-start gap-3 p-3 hover:bg-surface-container-low dark:hover:bg-slate-800/60">
                          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${NOTIF_COLORS[n.type] || NOTIF_COLORS.success}`}><I size={15} /></span>
                          <span className="min-w-0 flex-1">
                            <span className="block font-body-sm text-xs font-bold text-on-surface dark:text-slate-100">{n.title}</span>
                            <span className="mt-0.5 block truncate font-body-sm text-[11px] text-on-surface-variant dark:text-slate-400">{n.text}</span>
                            <span className="mt-0.5 block font-label-caps text-[9px] text-outline dark:text-slate-500">{formatDate(n.date)}</span>
                          </span>
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            ) : null}
          </div>
          <button
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className="rounded-lg p-1.5 text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-on-surface dark:text-slate-400 dark:hover:bg-slate-800"
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark ? <IconSun size={20} /> : <IconMoon size={20} />}
          </button>
        </div>
      </header>

      <main className="min-h-screen bg-surface pt-14 md:pl-60">
        <Outlet />
      </main>

      {/* Mobile bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex h-14 items-center justify-around border-t border-surface-container bg-surface-container-lowest px-2 shadow-[0_-1px_8px_rgba(0,0,0,0.06)] dark:border-slate-800 dark:bg-slate-900 md:hidden" aria-label="Mobile navigation">
        {MOBILE_NAV.map((item) => (
          <NavLink key={item.to} to={item.to} className={({ isActive }) => `flex flex-col items-center gap-0.5 py-1 transition-colors ${isActive ? 'text-primary dark:text-primary-fixed-dim' : 'text-on-surface-variant hover:text-primary dark:text-slate-400'}`}>
            <item.icon size={20} />
            <span className="font-label-caps text-[9px]">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  )
}
