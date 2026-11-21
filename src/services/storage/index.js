import { supabase, isSupabaseConfigured } from '../supabase.js'
import { createLocalProvider, createSupabaseProvider } from './providers.js'

let current = null
let currentName = ''

/**
 * Storage settings are persisted in localStorage so the choice survives reloads.
 * Providers can be swapped without touching callers — everything goes through
 * getStorage().
 */
export const STORAGE_PROVIDERS = [
  { id: 'supabase', label: 'Supabase Storage (cloud)', available: () => isSupabaseConfigured },
  { id: 'local', label: 'This device (offline)', available: () => true },
]

// Extension points for future providers (Firebase / S3 / Cloudinary / Drive):
export const REGISTERED_PROVIDERS = new Map()
export function registerStorageProvider(id, factory) {
  REGISTERED_PROVIDERS.set(id, factory)
}

export function getStorageSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem('invix:storage') || 'null')
    if (saved && STORAGE_PROVIDERS.some((p) => p.id === saved.provider)) return saved
  } catch {
    /* ignore */
  }
  return { provider: 'supabase', bucket: 'invix-files' }
}

export function setStorageSettings(settings) {
  localStorage.setItem('invix:storage', JSON.stringify(settings))
  current = null // force re-init
}

export function getStorage() {
  const settings = getStorageSettings()
  if (current && currentName === settings.provider) return current

  const custom = REGISTERED_PROVIDERS.get(settings.provider)
  if (custom) {
    current = custom(settings)
    currentName = settings.provider
    return current
  }

  if (settings.provider === 'supabase' && isSupabaseConfigured && supabase) {
    current = createSupabaseProvider({ supabaseClient: supabase, bucket: settings.bucket || 'invix-files' })
  } else {
    current = createLocalProvider({ scope: 'invix' })
  }
  currentName = settings.provider
  return current
}
