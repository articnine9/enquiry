import Link from 'next/link'
import { User, Lock, Database, ChevronRight, ShieldCheck } from 'lucide-react'
import { requireSession } from '@/lib/auth/session'
import { getInitials } from '@/lib/utils'
import { UserRole } from '@/types/enums'
import type { LucideIcon } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Settings' }

const ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.SuperAdmin]: 'Super Admin',
  [UserRole.Manager]:    'Manager',
  [UserRole.Staff]:      'Staff',
}

type Group = 'account' | 'admin'

interface SettingCard {
  href:      string
  icon:      LucideIcon
  iconBg:    string
  iconColor: string
  title:     string
  desc:      string
  group:     Group
  roles:     UserRole[]
}

const CARDS: SettingCard[] = [
  {
    href:      '/settings/profile',
    icon:      User,
    iconBg:    'bg-indigo-100 dark:bg-indigo-900/30',
    iconColor: 'text-indigo-600 dark:text-indigo-400',
    title:     'My Profile',
    desc:      'Update your name, email, and phone number',
    group:     'account',
    roles:     [UserRole.SuperAdmin, UserRole.Manager, UserRole.Staff],
  },
  {
    href:      '/settings/password',
    icon:      Lock,
    iconBg:    'bg-amber-100 dark:bg-amber-900/30',
    iconColor: 'text-amber-600 dark:text-amber-400',
    title:     'Change Password',
    desc:      'Update your account password and security',
    group:     'account',
    roles:     [UserRole.SuperAdmin, UserRole.Manager, UserRole.Staff],
  },
  {
    href:      '/settings/master-data',
    icon:      Database,
    iconBg:    'bg-emerald-100 dark:bg-emerald-900/30',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    title:     'Master Data',
    desc:      'Manage enquiry dropdown options — source, category, product, priority',
    group:     'admin',
    roles:     [UserRole.SuperAdmin],
  },
]

const GROUP_META: Record<Group, { label: string; hint: string }> = {
  account: { label: 'Account',        hint: 'Your personal details and sign-in' },
  admin:   { label: 'Administration', hint: 'Workspace configuration' },
}

export default async function SettingsPage() {
  const session = await requireSession()
  const { name, email, role } = session.user

  const visible = CARDS.filter((c) => c.roles.includes(role))
  const groups: Group[] = ['account', 'admin']

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-3xl mx-auto space-y-8">
      {/* ── Hero header ─────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-600 to-violet-600 p-6 sm:p-7 shadow-sm">
        {/* decorative glow */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />

        <div className="relative flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-lg font-semibold text-white ring-1 ring-white/25 backdrop-blur-sm">
            {getInitials(name)}
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold text-white sm:text-2xl">{name}</h1>
            <p className="truncate text-sm text-indigo-100">{email}</p>
            <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-medium text-white ring-1 ring-white/25">
              <ShieldCheck className="h-3.5 w-3.5" />
              {ROLE_LABELS[role]}
            </span>
          </div>
        </div>
      </div>

      {/* ── Grouped setting cards ───────────────────────────────────────────── */}
      {groups.map((g) => {
        const cards = visible.filter((c) => c.group === g)
        if (cards.length === 0) return null

        return (
          <section key={g} className="space-y-3">
            <div className="px-1">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {GROUP_META[g].label}
              </h2>
              <p className="text-xs text-slate-400 dark:text-slate-500">{GROUP_META[g].hint}</p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {cards.map((c) => {
                const Icon = c.icon
                return (
                  <Link
                    key={c.href}
                    href={c.href}
                    className="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-900 dark:hover:border-indigo-600"
                  >
                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${c.iconBg} transition-transform group-hover:scale-105`}>
                      <Icon className={`h-5 w-5 ${c.iconColor}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-semibold text-slate-800 transition-colors group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-400">
                        {c.title}
                      </h3>
                      <p className="mt-0.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{c.desc}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 transition-all group-hover:translate-x-0.5 group-hover:text-indigo-500 dark:text-slate-600" />
                  </Link>
                )
              })}
            </div>
          </section>
        )
      })}
    </div>
  )
}
