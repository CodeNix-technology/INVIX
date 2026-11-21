import { create } from 'zustand'
import { supabase, isSupabaseConfigured } from '../services/supabase'
import { toast } from './ui'
import { useData } from './data'

export const useAuth = create((set, get) => ({
  user: null,
  profile: null,
  loading: true,
  initialized: false,

  init() {
    if (!isSupabaseConfigured || !supabase) {
      set({ loading: false, initialized: true })
      return
    }
    supabase.auth.getSession().then(({ data }) => {
      set({ user: data.session?.user || null, loading: false, initialized: true })
      if (data.session?.user) get().loadProfile(data.session.user.id)
    })
    supabase.auth.onAuthStateChange((_evt, session) => {
      const user = session?.user || null
      set({ user, loading: false, initialized: true })
      if (user) {
        get().loadProfile(user.id)
        useData.getState().pullCloud().catch(() => {})
      } else {
        set({ profile: null })
      }
    })
  },

  async loadProfile(userId) {
    try {
      const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
      set({ profile: data || null })
    } catch {
      set({ profile: null })
    }
  },

  async signIn(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    toast('Signed in — syncing your workspace…', 'success')
    await useData.getState().pullCloud()
  },

  async signUp(email, password, name) {
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { name } } })
    if (error) throw error
    if (data.user) {
      await supabase.from('profiles').upsert({ id: data.user.id, name, email })
    }
    toast('Account created! Check your email to confirm if required.', 'success')
  },

  async signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' })
    if (error) throw error
  },

  async resetPassword(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin })
    if (error) throw error
  },

  async signOut() {
    await supabase?.auth.signOut()
    set({ user: null, profile: null })
    toast('Signed out', 'info')
  },
}))
