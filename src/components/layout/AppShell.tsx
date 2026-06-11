'use client'

import { useState } from 'react'
import Sidebar from './Sidebar'
import Header from './Header'
import MobileNav from './MobileNav'
import { useIsMobile } from '@/hooks/useMediaQuery'
import type { UserRole } from '@/types/enums'

interface AppShellProps {
  user: {
    id:    string
    name:  string
    email: string
    role:  UserRole
    image?: string | null
  }
  children: React.ReactNode
}

export default function AppShell({ user, children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const isMobile = useIsMobile()

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar */}
      {!isMobile && (
        <Sidebar
          open={sidebarOpen}
          role={user.role}
          onClose={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          user={user}
          onMenuClick={() => setSidebarOpen((o) => !o)}
        />

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      {isMobile && <MobileNav role={user.role} />}
    </div>
  )
}
