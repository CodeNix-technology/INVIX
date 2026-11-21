export const uid = () =>
  (globalThis.crypto?.randomUUID?.() || `id_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`)

export const nowISO = () => new Date().toISOString()

export const clamp = (n, min, max) => Math.min(max, Math.max(min, n))

export const deepClone = (obj) => (typeof structuredClone === 'function' ? structuredClone(obj) : JSON.parse(JSON.stringify(obj)))

export const move = (arr, from, to) => {
  const a = [...arr]
  const [item] = a.splice(from, 1)
  a.splice(clamp(to, 0, a.length), 0, item)
  return a
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
