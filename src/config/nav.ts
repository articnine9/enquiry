import {
  LayoutDashboard, ClipboardList, Users, GitBranch,
  PhoneCall, BarChart3, Settings, type LucideIcon,
} from 'lucide-react'
import { UserRole } from '@/types/enums'

export interface NavItem {
  label:    string
  href:     string
  icon:     LucideIcon
  roles:    UserRole[]      // which roles see this item
  badge?:   string          // optional badge key resolved at runtime
  children?: NavItem[]
}

export const NAV_ITEMS: NavItem[] = [
  {
    label: 'Dashboard',
    href:  '/dashboard',
    icon:  LayoutDashboard,
    roles: [UserRole.SuperAdmin, UserRole.Manager, UserRole.Staff],
  },
  {
    label: 'Enquiries',
    href:  '/enquiries',
    icon:  ClipboardList,
    roles: [UserRole.SuperAdmin, UserRole.Manager, UserRole.Staff],
    badge: 'unassignedCount',
  },
  {
    label: 'Staff',
    href:  '/staff',
    icon:  Users,
    roles: [UserRole.SuperAdmin, UserRole.Manager],
  },
  {
    label: 'Assignments',
    href:  '/assignments',
    icon:  GitBranch,
    roles: [UserRole.SuperAdmin, UserRole.Manager],
  },
  {
    label: 'Follow-Ups',
    href:  '/follow-ups',
    icon:  PhoneCall,
    roles: [UserRole.SuperAdmin, UserRole.Manager, UserRole.Staff],
    badge: 'overdueFollowUps',
  },
  {
    label: 'Reports',
    href:  '/reports',
    icon:  BarChart3,
    roles: [UserRole.SuperAdmin, UserRole.Manager],
    children: [
      { label: 'Enquiry Summary',    href: '/reports/enquiry-summary',    icon: BarChart3, roles: [UserRole.SuperAdmin, UserRole.Manager] },
      { label: 'Staff Performance',  href: '/reports/staff-performance',  icon: BarChart3, roles: [UserRole.SuperAdmin, UserRole.Manager] },
      { label: 'Follow-Up Rate',     href: '/reports/follow-up-rate',     icon: BarChart3, roles: [UserRole.SuperAdmin, UserRole.Manager] },
    ],
  },
  {
    label: 'Settings',
    href:  '/settings',
    icon:  Settings,
    roles: [UserRole.SuperAdmin, UserRole.Manager, UserRole.Staff],
    children: [
      { label: 'Profile',      href: '/settings/profile', icon: Settings, roles: [UserRole.SuperAdmin, UserRole.Manager, UserRole.Staff] },
      { label: 'Zones',        href: '/settings/zones',   icon: Settings, roles: [UserRole.SuperAdmin] },
      { label: 'Roles',        href: '/settings/roles',   icon: Settings, roles: [UserRole.SuperAdmin] },
    ],
  },
]

export function getNavForRole(role: UserRole): NavItem[] {
  return NAV_ITEMS
    .filter(item => item.roles.includes(role))
    .map(item => ({
      ...item,
      children: item.children?.filter(c => c.roles.includes(role)),
    }))
}
