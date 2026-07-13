import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface SettingsHeaderProps {
  icon:       LucideIcon
  title:      string
  subtitle?:  string
  backHref?:  string
  backLabel?: string
}

/** Shared gradient hero for settings sub-pages — matches the Settings landing page. */
export function SettingsHeader({
  icon: Icon,
  title,
  subtitle,
  backHref  = '/settings',
  backLabel = 'Back to settings',
}: SettingsHeaderProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-600 to-violet-600 p-6 shadow-sm sm:p-7">
      {/* decorative glow */}
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />

      <div className="relative">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-100 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {backLabel}
        </Link>

        <div className="mt-4 flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25 backdrop-blur-sm">
            <Icon className="h-6 w-6 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-white sm:text-2xl">{title}</h1>
            {subtitle && <p className="text-sm text-indigo-100">{subtitle}</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
