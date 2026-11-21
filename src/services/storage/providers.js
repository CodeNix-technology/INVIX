/**
 * StorageProvider — common file-storage interface.
 *
 * Every provider implements:
 *   upload(path, blob)          -> { path }          stored file
 *   download(path)              -> Blob              raw bytes
 *   getPublicUrl(path)          -> { data: { publicUrl } }
 *   remove(path)                -> void
 *   list(prefix)                -> [{ path, size, updatedAt }]
 */

import { blobGet, blobSet, blobDel } from '../db.js'

/** Browser-local provider (IndexedDB). Used for guests & offline-first file caching. */
export function createLocalProvider({ scope = 'local' } = {}) {
  const prefix = scope
  return {
    name: 'local',
    async upload(path, blob) {
      await blobSet(`${prefix}/${path}`, blob)
      return { path: `${prefix}/${path}` }
    },
    async download(path) {
      return blobGet(`${prefix}/${path}`)
    },
    async getPublicUrl(path) {
      const blob = await blobGet(`${prefix}/${path}`)
      if (!blob) return { data: { publicUrl: '' } }
      return { data: { publicUrl: URL.createObjectURL(blob) } }
    },
    async remove(path) {
      await blobDel(`${prefix}/${path}`)
    },
    async list(prefixPath = '') {
      // Local provider doesn't index blobs; kept for interface completeness.
      return []
    },
  }
}

/** Supabase Storage provider (cloud default). */
export function createSupabaseProvider({ supabaseClient, bucket = 'invix-files' }) {
  return {
    name: 'supabase',
    bucket,
    async upload(path, blob) {
      const { error } = await supabaseClient.storage.from(bucket).upload(path, blob, { upsert: true, contentType: blob.type || 'application/octet-stream' })
      if (error) throw error
      return { path }
    },
    async download(path) {
      const { data, error } = await supabaseClient.storage.from(bucket).download(path)
      if (error) throw error
      return data
    },
    async getPublicUrl(path) {
      return supabaseClient.storage.from(bucket).getPublicUrl(path)
    },
    async remove(path) {
      const { error } = await supabaseClient.storage.from(bucket).remove([path])
      if (error) throw error
    },
    async list(prefix = '') {
      const { data, error } = await supabaseClient.storage.from(bucket).list(prefix, { limit: 100, sortBy: { column: 'created_at', order: 'desc' } })
      if (error) throw error
      return (data || []).map((f) => ({ path: prefix ? `${prefix}/${f.name}` : f.name, size: f.metadata?.size || 0, updatedAt: f.updated_at }))
    },
  }
}
