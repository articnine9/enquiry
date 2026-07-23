'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, ClipboardList, Users, MapPin,
  BarChart3, Bell, Shield, Settings, ChevronLeft,
  CalendarClock, Activity, Truck, Users2, Footprints,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { UserRole } from '@/types/enums'

interface NavItem {
  href:   string
  label:  string
  icon:   React.ElementType
  roles:  UserRole[]
  badge?: number
}

const NAV_ITEMS: NavItem[] = [
  {
    href:  '/dashboard',
    label: 'Dashboard',
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
    href:  '/assignments',
    label: 'Assignments',
    icon:  MapPin,
    roles: [UserRole.SuperAdmin, UserRole.Manager],
  },
  {
    href:  '/distributors',
    label: 'Distributors',
    icon:  Truck,
    roles: [UserRole.SuperAdmin, UserRole.Manager],
  },
  {
    href:  '/customers',
    label: 'Customers',
    icon:  Users2,
    roles: [UserRole.SuperAdmin, UserRole.Manager],
  },
  {
    href:  '/field-visits',
    label: 'Field Visits',
    icon:  Footprints,
    roles: [UserRole.SuperAdmin, UserRole.Manager, UserRole.Staff],
  },
  {
    href:  '/reports',
    label: 'Reports',
    icon:  BarChart3,
    roles: [UserRole.SuperAdmin, UserRole.Manager],
  },
  {
    href:  '/activity',
    label: 'Activity',
    icon:  Activity,
    roles: [UserRole.SuperAdmin, UserRole.Manager],
  },
  {
    href:  '/audit',
    label: 'Audit Logs',
    icon:  Shield,
    roles: [UserRole.SuperAdmin],
  },
  {
    href:  '/settings',
    label: 'Settings',
    icon:  Settings,
    roles: [UserRole.SuperAdmin, UserRole.Manager, UserRole.Staff],
  },
]

interface SidebarProps {
  open:    boolean
  role:    UserRole
  onClose: () => void
}

export default function Sidebar({ open, role, onClose }: SidebarProps) {
  const pathname = usePathname()
  const items    = NAV_ITEMS.filter((i) => i.roles.includes(role))

  return (
    <aside className={cn(
      'relative flex flex-col h-full border-r border-slate-200 dark:border-slate-700',
      'bg-white dark:bg-slate-900 transition-all duration-200 ease-in-out flex-shrink-0',
      open ? 'w-56' : 'w-16'
    )}>
      {/* Brand */}
      <div className={cn(
        'flex items-center h-16 border-b border-slate-100 dark:border-slate-800 px-4 flex-shrink-0',
        open ? 'gap-3' : 'justify-center'
      )}>
        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center flex-shrink-0">
          <ClipboardList className="w-4 h-4 text-white" />
        </div>
        {open && (
          <span className="font-bold text-sm text-slate-800 dark:text-white truncate">
            EnquiryPro
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 space-y-0.5 overflow-y-auto px-2">
        {items.map((item) => {
          const Icon    = item.icon
          const active  = pathname === item.href || pathname.startsWith(`${item.href}/`)

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center h-9 rounded-lg transition-colors group relative',
                open ? 'gap-3 px-3' : 'justify-center px-0',
                active
                  ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
              )}
            >
              <Icon className={cn('w-4 h-4 flex-shrink-0', active && 'text-indigo-600 dark:text-indigo-400')} />
              {open && (
                <span className={cn('text-sm font-medium truncate', active && 'font-semibold')}>
                  {item.label}
                </span>
              )}
              {item.badge && item.badge > 0 && (
                <span className={cn(
                  'ml-auto min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold bg-indigo-600 text-white flex items-center justify-center tabular-nums',
                  !open && 'absolute -top-1 -right-1'
                )}>
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}
              {/* Tooltip when collapsed */}
              {!open && (
                <div className="absolute left-full ml-2 px-2 py-1 rounded-md text-xs font-medium bg-slate-800 text-white whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                  {item.label}
                </div>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Collapse toggle */}
      <div className="border-t border-slate-100 dark:border-slate-800 p-2">
        <button
          type="button"
          onClick={onClose}
          className={cn(
            'w-full h-8 rounded-lg flex items-center transition-colors',
            'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800',
            open ? 'justify-end px-2 gap-2' : 'justify-center'
          )}
          title={open ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          <ChevronLeft className={cn('w-4 h-4 transition-transform', !open && 'rotate-180')} />
          {open && <span className="text-xs">Collapse</span>}
        </button>
      </div>
    </aside>
  )
}
