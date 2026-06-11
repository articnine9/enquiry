import Link from 'next/link'
import { User, Lock, Settings } from 'lucide-react'
import { requireSession } from '@/lib/auth/session'
import { UserRole } from '@/types/enums'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Settings' }

export default async function SettingsPage() {
  const session = await requireSession()

  const cards = [
    {
      href:     '/settings/profile',
      icon:     User,
      iconBg:   'bg-indigo-100 dark:bg-indigo-900/30',
      iconColor:'text-indigo-600 dark:text-indigo-400',
      title:    'My Profile',
      desc:     'Update your name, email, and phone number',
      roles:    [UserRole.SuperAdmin, UserRole.Manager, UserRole.Staff],
    },
    {
      href:     '/settings/password',
      icon:     Lock,
      iconBg:   'bg-amber-100 dark:bg-amber-900/30',
      iconColor:'text-amber-600 dark:text-amber-400',
      title:    'Change Password',
      desc:     'Update your account password',
      roles:    [UserRole.SuperAdmin, UserRole.Manager, UserRole.Staff],
    },
  ]

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
          <Settings className="w-5 h-5 text-slate-600 dark:text-slate-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Settings</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Manage your account preferences</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
        {cards
          .filter((c) => c.roles.includes(session.user.role))
          .map((c) => {
            const Icon = c.icon
            return (
              <Link
                key={c.href}
                href={c.href}
                className="group rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-600 transition-all"
              >
                <div className={`w-10 h-10 rounded-xl ${c.iconBg} flex items-center justify-center mb-3`}>
                  <Icon className={`w-5 h-5 ${c.iconColor}`} />
                </div>
                <h2 className="text-sm font-semibold text-slate-800 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  {c.title}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">{c.desc}</p>
              </Link>
            )
          })}
      </div>
    </div>
  )
}
