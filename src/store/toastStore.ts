import { create } from 'zustand'

export interface ToastItem {
  id: string
  title: string
  body?: string
  variant?: 'default' | 'error' | 'success'
}

interface ToastState {
  toasts: ToastItem[]
  push: (toast: Omit<ToastItem, 'id'>) => void
  dismiss: (id: string) => void
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (toast) =>
    set((s) => ({
      toasts: [...s.toasts, { ...toast, id: `${Date.now()}-${Math.random()}` }].slice(-4),
    })),
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))

export function toast(title: string, body?: string, variant: ToastItem['variant'] = 'default') {
  useToastStore.getState().push({ title, body, variant })
}
