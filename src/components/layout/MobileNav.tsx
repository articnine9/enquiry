'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, ClipboardList, CalendarClock,
  Users, BarChart3, Settings,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { UserRole } from '@/types/enums'

interface NavItem {
  href:  string
  label: string
  icon:  React.ElementType
  roles: UserRole[]
}

const MOBILE_ITEMS: NavItem[] = [
  {
    href:  '/dashboard',
    label: 'Home',
    icon:  LayoutDashboard,
    roles: [UserRole.SuperAdmin, UserRole.Manager, UserRole.Staff],
  },
  {
    href:  '/enquiries',
    label: 'Enquiries',
    icon:  ClipboardList,
    roles: [UserRole.SuperAdmin, UserRole.Manager, UserRole.Staff],
  },
  {
    href:  '/follow-ups',
    label: 'Follow-ups',
    icon:  CalendarClock,
    roles: [UserRole.SuperAdmin, UserRole.Manager, UserRole.Staff],
  },
  {
    href:  '/staff',
    label: 'Staff',
    icon:  Users,
    roles: [UserRole.SuperAdmin, UserRole.Manager],
  },
  {
    href:  '/reports',
    label: 'Reports',
    icon:  BarChart3,
    roles: [UserRole.SuperAdmin, UserRole.Manager],
  },
  {
    href:  '/settings',
    label: 'Settings',
    icon:  Settings,
    roles: [UserRole.SuperAdmin, UserRole.Manager, UserRole.Staff],
  },
]

interface MobileNavProps {
  role: UserRole
}

export default function MobileNav({ role }: MobileNavProps) {
  const pathname = usePathname()
  const items    = MOBILE_ITEMS.filter((i) => i.roles.includes(role))

  return (
    <nav className={cn(
      'fixed bottom-0 inset-x-0 z-40 h-16',
      'bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700',
      'flex items-stretch'
    )}>
      {items.map((item) => {
        const Icon   = item.icon
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`)

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors',
              active
                ? 'text-indigo-600 dark:text-indigo-400'
                : 'text-slate-500 dark:text-slate-400'
            )}
          >
            <Icon className="w-5 h-5" />
            <span className="text-[10px] font-medium">{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
