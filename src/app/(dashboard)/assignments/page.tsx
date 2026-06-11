import Link from 'next/link'
import { MapPin, GitBranch } from 'lucide-react'
import { requireRole } from '@/lib/auth/session'
import { UserRole } from '@/types/enums'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Assignments' }

export default async function AssignmentsPage() {
  const session = await requireRole(UserRole.SuperAdmin, UserRole.Manager)

  const cards = [
    {
      href:     '/assignments/zones',
      icon:     MapPin,
      iconBg:   'bg-teal-100 dark:bg-teal-900/30',
      iconColor:'text-teal-600 dark:text-teal-400',
      title:    'Zone Management',
      desc:     'Create and manage location zones and coverage areas',
      roles:    [UserRole.SuperAdmin],
    },
    {
      href:     '/enquiries?view=unassigned',
      icon:     GitBranch,
      iconBg:   'bg-indigo-100 dark:bg-indigo-900/30',
      iconColor:'text-indigo-600 dark:text-indigo-400',
      title:    'Manual Assignment',
      desc:     'Manually assign unassigned enquiries to staff members',
      roles:    [UserRole.SuperAdmin, UserRole.Manager],
    },
  ]

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Assignments</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Manage zones and enquiry assignment</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {cards
          .filter((c) => c.roles.includes(session.user.role))
          .map((c) => {
            const Icon = c.icon
            return (
              <Link
                key={c.href}
                href={c.href}
                className="group rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-600 transition-all"
              >
                <div className={`w-10 h-10 rounded-xl ${c.iconBg} flex items-center justify-center mb-4`}>
                  <Icon className={`w-5 h-5 ${c.iconColor}`} />
                </div>
                <h2 className="text-sm font-semibold text-slate-800 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  {c.title}
                </h2>
                <p className="text-xs text-slate-500 mt-1">{c.desc}</p>
              </Link>
            )
          })}
      </div>
    </div>
  )
}
