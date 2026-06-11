import { create } from 'zustand'

type ModalKey = 'assignStaff' | 'addFollowUp' | 'changeStatus' | 'confirmClose' | null

interface UIState {
  sidebarOpen:  boolean
  activeModal:  ModalKey
  modalPayload: unknown

  toggleSidebar:  () => void
  setSidebarOpen: (open: boolean) => void
  openModal:  (key: ModalKey, payload?: unknown) => void
  closeModal: () => void
}

export const useUIStore = create<UIState>()((set) => ({
  sidebarOpen:  true,
  activeModal:  null,
  modalPayload: null,

  toggleSidebar:  () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  openModal:  (key, payload = null) => set({ activeModal: key, modalPayload: payload }),
  closeModal: () => set({ activeModal: null, modalPayload: null }),
}))
