import { useData } from '../store/data'
import { useAuth } from '../store/auth'
import { useUI, toast } from '../store/ui'
import { isSupabaseConfigured } from './supabase'

/**
 * Auto-sync engine: pushes local changes to the cloud and pulls remote
 * updates on sign-in, when the network returns, on a 5-minute interval,
 * and after every save. Offline changes are queued in IndexedDB.
 */
let started = false
let interval = null

export function startAutoSync() {
  if (started) return
  started = true

  window.addEventListener('online', () => {
    flushWhenAuthed()
  })

  interval = setInterval(() => flushWhenAuthed(), 5 * 60 * 1000)

  // Offline queue: flag pending writes in IndexedDB
  useData.subscribe((state, prev) => {
    if (!isSupabaseConfigured) return
    const changed =
      state.invoices !== prev.invoices || state.clients !== prev.clients || state.items !== prev.items || state.businesses !== prev.businesses || state.customTemplates !== prev.customTemplates
    if (changed && useAuth.getState().user) {
      markPending(true)
    }
  })
}

async function flushWhenAuthed() {
  if (!navigator.onLine) return
  if (!isSupabaseConfigured) return
  if (!useAuth.getState().user) return
  try {
    await useData.getState().pushCloud()
    await useData.getState().pullCloud()
  } catch {
    /* offline — stays queued */
  }
}

export async function markPending() {
  await import('./db').then((m) => m.idbSet('invix:sync-pending', Date.now()))
}

export async function hasPending() {
  const t = await import('./db').then((m) => m.idbGet('invix:sync-pending'))
  return Boolean(t)
}

/** One-click manual sync used in Settings */
export async function syncNow() {
  if (!isSupabaseConfigured) {
    toast('Configure Supabase to enable cloud sync', 'warn')
    return
  }
  const user = useAuth.getState().user
  if (!user) {
    toast('Cloud sync is not active for this workspace', 'warn')
    return
  }
  const data = useData.getState()
  try {
    await data.pushCloud()
    await data.pullCloud()
    toast('Workspace synced', 'success')
  } catch (e) {
    toast(`Sync failed: ${e.message}`, 'error')
  }
}

export function stopAutoSync() {
  if (interval) clearInterval(interval)
  interval = null
  started = false
}
