import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

interface StatCardProps {
  label:      string
  value:      string | number
  icon:       LucideIcon
  iconColor:  string
  iconBg:     string
  delta?:     number       // positive = up, negative = down
  deltaLabel?: string
  hint?:      string
  className?: string
  size?:      'sm' | 'md' | 'lg'
}

export default function StatCard({
  label, value, icon: Icon, iconColor, iconBg,
  delta, deltaLabel, hint, className, size = 'md',
}: StatCardProps) {
  const isUp   = delta !== undefined && delta > 0
  const isDown = delta !== undefined && delta < 0

  return (
    <div
      title={hint}
      className={cn(
        'group relative rounded-xl border border-slate-200 dark:border-slate-700',
        'bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-shadow overflow-hidden',
        className
      )}
    >
      {/* Hover bg accent */}
      <div className={cn('absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity', iconBg)} />

      <div className={cn(
        'relative flex flex-col',
        size === 'sm' ? 'p-3 gap-2' : size === 'lg' ? 'p-6 gap-4' : 'p-4 gap-3'
      )}>
        {/* Icon */}
        <div className={cn(
          'rounded-xl flex items-center justify-center flex-shrink-0',
          iconBg,
          size === 'sm' ? 'w-8 h-8' : size === 'lg' ? 'w-12 h-12' : 'w-10 h-10'
        )}>
          <Icon className={cn(iconColor, size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-6 h-6' : 'w-5 h-5')} />
        </div>

        {/* Value + label */}
        <div>
          <p className={cn(
            'font-bold tabular-nums leading-none',
            iconColor,
            size === 'sm' ? 'text-xl' : size === 'lg' ? 'text-4xl' : 'text-2xl'
          )}>
            {value}
          </p>
          <p className={cn(
            'text-slate-500 dark:text-slate-400 mt-1',
            size === 'sm' ? 'text-[11px]' : 'text-xs'
          )}>
            {label}
          </p>

          {/* Delta */}
          {delta !== undefined && (
            <p className={cn(
              'text-[11px] mt-1 font-medium',
              isUp   ? 'text-green-600 dark:text-green-400' :
              isDown ? 'text-red-500 dark:text-red-400' :
                       'text-slate-400'
            )}>
              {isUp ? '▲' : isDown ? '▼' : '–'}
              {' '}{Math.abs(delta)}{deltaLabel ?? ''}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
