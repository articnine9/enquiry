import { create } from 'zustand'
import type { UserRole } from '@/types/enums'

interface SessionUser {
  id:             string
  name:           string
  email:          string
  role:           UserRole
  locationZoneId: string | null
  avatar?:        string
}

interface UserState {
  user: SessionUser | null
  setUser: (user: SessionUser | null) => void
}

export const useUserStore = create<UserState>()((set) => ({
  user: null,
  setUser: (user) => set({ user }),
}))
