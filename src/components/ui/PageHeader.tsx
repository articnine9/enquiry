import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

interface PageHeaderProps {
  icon:       LucideIcon
  title:      string
  subtitle?:  string
  backHref?:  string
  backLabel?: string
  actions?:   ReactNode   // right-aligned slot, e.g. a primary action button
}

/** Shared gradient hero banner — used across Settings and other feature pages for a consistent look. */
export function PageHeader({
  icon: Icon,
  title,
  subtitle,
  backHref,
  backLabel = 'Back',
  actions,
}: PageHeaderProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-600 to-violet-600 p-6 shadow-sm sm:p-7">
      {/* decorative glow */}
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />

      <div className="relative">
        {backHref && (
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-100 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {backLabel}
          </Link>
        )}

        <div className={cn('flex items-center justify-between gap-4', backHref && 'mt-4')}>
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25 backdrop-blur-sm">
              <Icon className="h-6 w-6 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-xl font-bold text-white sm:text-2xl">{title}</h1>
              {subtitle && <p className="truncate text-sm text-indigo-100">{subtitle}</p>}
            </div>
          </div>
          {actions && <div className="shrink-0">{actions}</div>}
        </div>
      </div>
    </div>
  )
}
