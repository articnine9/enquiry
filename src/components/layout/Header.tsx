'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { Menu, LogOut, User, ChevronDown } from 'lucide-react'
import { signOut } from 'next-auth/react'
import dynamic from 'next/dynamic'
import { cn } from '@/lib/utils'
import { UserRole } from '@/types/enums'

const NotificationBell = dynamic(
  () => import('@/features/notifications/components/NotificationBell'),
  { ssr: false }
)

interface HeaderUser {
  id:    string
  name:  string
  email: string
  role:  UserRole
  image?: string | null
}

const ROLE_LABEL: Record<UserRole, string> = {
  [UserRole.SuperAdmin]: 'Super Admin',
  [UserRole.Manager]:    'Manager',
  [UserRole.Staff]:      'Staff',
}

const ROLE_COLOR: Record<UserRole, string> = {
  [UserRole.SuperAdmin]: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  [UserRole.Manager]:    'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  [UserRole.Staff]:      'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
}

function initials(name: string): string {
  return name.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('')
}

interface HeaderProps {
  user:        HeaderUser
  onMenuClick: () => void
}

export default function Header({ user, onMenuClick }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  async function handleSignOut() {
    await signOut({ callbackUrl: '/login' })
  }

  return (
    <header className={cn(
      'flex items-center h-16 px-4 gap-4 flex-shrink-0',
      'border-b border-slate-200 dark:border-slate-700',
      'bg-white dark:bg-slate-900'
    )}>
      {/* Hamburger */}
      <button
        type="button"
        onClick={onMenuClick}
        className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors"
        aria-label="Toggle sidebar"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Breadcrumb / page title — filled by children/portal in future */}
      <div className="flex-1" />

      {/* Right actions */}
      <div className="flex items-center gap-2">
        {/* Notification bell */}
        <NotificationBell />

        {/* User menu */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className={cn(
              'flex items-center gap-2 h-9 pl-2 pr-3 rounded-lg transition-colors',
              'text-slate-700 dark:text-slate-200',
              menuOpen
                ? 'bg-slate-100 dark:bg-slate-800'
                : 'hover:bg-slate-100 dark:hover:bg-slate-800'
            )}
          >
            {/* Avatar */}
            {user.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.image} alt={user.name} className="w-7 h-7 rounded-full object-cover" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0">
                {initials(user.name)}
              </div>
            )}

            <div className="text-left hidden sm:block">
              <p className="text-xs font-semibold leading-none truncate max-w-[120px]">{user.name}</p>
              <p className="text-[10px] text-slate-400 leading-none mt-0.5">{ROLE_LABEL[user.role]}</p>
            </div>

            <ChevronDown className={cn('w-3.5 h-3.5 text-slate-400 transition-transform', menuOpen && 'rotate-180')} />
          </button>

          {/* Dropdown */}
          {menuOpen && (
            <div className={cn(
              'absolute right-0 top-full mt-2 w-56 rounded-xl border z-50',
              'border-slate-200 dark:border-slate-700',
              'bg-white dark:bg-slate-900 shadow-xl overflow-hidden'
            )}>
              {/* User info */}
              <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{user.name}</p>
                <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
                <span className={cn('mt-1.5 inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold', ROLE_COLOR[user.role])}>
                  {ROLE_LABEL[user.role]}
                </span>
              </div>

              {/* Menu items */}
              <div className="py-1">
                <Link
                  href="/settings/profile"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  <User className="w-4 h-4" />
                  My Profile
                </Link>

                <button
                  type="button"
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
