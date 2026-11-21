import { create } from 'zustand'

let toastId = 0

export const useUI = create((set, get) => ({
  theme: localStorage.getItem('invix:theme') || 'system',
  language: localStorage.getItem('invix:lang') || 'en',
  sidebarOpen: false,
  toasts: [],

  setTheme(theme) {
    localStorage.setItem('invix:theme', theme)
    applyTheme(theme)
    set({ theme })
  },
  setLanguage(language) {
    localStorage.setItem('invix:lang', language)
    document.documentElement.lang = language
    set({ language })
  },
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebar: (v) => set({ sidebarOpen: v }),

  toast(message, type = 'info', duration = 3500) {
    const id = ++toastId
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }))
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), duration)
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))

export function applyTheme(theme) {
  const dark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', dark)
}
export const toast = (msg, type, dur) => useUI.getState().toast(msg, type, dur)
