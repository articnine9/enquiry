import { cn } from '@/lib/utils'
import { ENQUIRY_PRIORITY_LABELS, EnquiryPriority } from '@/types/enums'

// Colour-token → Tailwind classes. Tailwind can't consume fully dynamic class
// names, so master-data `color` tokens map onto this fixed set. Seeded system
// priorities use slate/blue/amber/red; custom priorities fall back to slate.
const TOKEN_STYLES: Record<string, string> = {
  slate:  'bg-slate-100 text-slate-600 dark:bg-slate-700/40 dark:text-slate-400',
  blue:   'bg-blue-50   text-blue-700  dark:bg-blue-900/30  dark:text-blue-300',
  amber:  'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  orange: 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  red:    'bg-red-50    text-red-700   dark:bg-red-900/30   dark:text-red-300',
  green:  'bg-green-50  text-green-700 dark:bg-green-900/30 dark:text-green-300',
}

const TOKEN_DOTS: Record<string, string> = {
  slate:  'bg-slate-400',
  blue:   'bg-blue-500',
  amber:  'bg-orange-500',
  orange: 'bg-orange-500',
  red:    'bg-red-500 animate-pulse',
  green:  'bg-green-500',
}

// Default colour token per seeded priority code (when no explicit token given).
const DEFAULT_TOKENS: Record<string, string> = {
  [EnquiryPriority.Low]:    'slate',
  [EnquiryPriority.Medium]: 'blue',
  [EnquiryPriority.High]:   'amber',
  [EnquiryPriority.Urgent]: 'red',
}

function humanize(code: string): string {
  return code.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

interface PriorityBadgeProps {
  priority: string
  /** Colour token from MasterData (optional — resolved from the code otherwise). */
  color?:   string
  /** Display label (optional — resolved from the code otherwise). */
  label?:   string
  dot?:     boolean
}

export function PriorityBadge({ priority, color, label, dot = true }: PriorityBadgeProps) {
  const token = color ?? DEFAULT_TOKENS[priority] ?? 'slate'
  const text  = label ?? ENQUIRY_PRIORITY_LABELS[priority as EnquiryPriority] ?? humanize(priority)

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
        TOKEN_STYLES[token] ?? TOKEN_STYLES.slate
      )}
    >
      {dot && <span className={cn('w-1.5 h-1.5 rounded-full', TOKEN_DOTS[token] ?? TOKEN_DOTS.slate)} />}
      {text}
    </span>
  )
}
