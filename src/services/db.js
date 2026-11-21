/**
 * Tiny dependency-free IndexedDB key/value store.
 * Falls back to localStorage when IndexedDB is unavailable.
 */
const DB_NAME = 'invix'
const STORE = 'kv'

let dbPromise = null

function openDB() {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve) => {
    if (!('indexedDB' in globalThis)) return resolve(null)
    try {
      const req = indexedDB.open(DB_NAME, 1)
      req.onupgradeneeded = () => {
        const db = req.result
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE)
      }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => resolve(null)
    } catch {
      resolve(null)
    }
  })
  return dbPromise
}

export async function idbGet(key) {
  const db = await openDB()
  if (!db) {
    try {
      const raw = localStorage.getItem(`invix:${key}`)
      return raw ? JSON.parse(raw) : undefined
    } catch {
      return undefined
    }
  }
  return new Promise((resolve) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).get(key)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => resolve(undefined)
  })
}

export async function idbSet(key, value) {
  const db = await openDB()
  if (!db) {
    try {
      localStorage.setItem(`invix:${key}`, JSON.stringify(value))
    } catch {
      /* quota */
    }
    return
  }
  return new Promise((resolve) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(value, key)
    tx.oncomplete = () => resolve(true)
    tx.onerror = () => resolve(false)
  })
}

export async function idbDel(key) {
  const db = await openDB()
  if (!db) {
    localStorage.removeItem(`invix:${key}`)
    return
  }
  return new Promise((resolve) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).delete(key)
    tx.oncomplete = () => resolve(true)
    tx.onerror = () => resolve(false)
  })
}

/** Blob store for files when using the local storage provider */
export async function blobGet(path) {
  const db = await openDB()
  if (!db) return null
  return new Promise((resolve) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).get(`blob:${path}`)
    req.onsuccess = () => resolve(req.result || null)
    req.onerror = () => resolve(null)
  })
}

export async function blobSet(path, blob) {
  const db = await openDB()
  if (!db) return false
  return new Promise((resolve) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(blob, `blob:${path}`)
    tx.oncomplete = () => resolve(true)
    tx.onerror = () => resolve(false)
  })
}

export async function blobDel(path) {
  const db = await openDB()
  if (!db) return false
  return new Promise((resolve) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).delete(`blob:${path}`)
    tx.oncomplete = () => resolve(true)
    tx.onerror = () => resolve(false)
  })
}
