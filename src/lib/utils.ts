import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Merge Tailwind classes without conflicts */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Format a Date object or ISO string to a readable locale string */
export function formatDate(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat('en-MY', {
    dateStyle: 'medium',
    ...options,
  }).format(new Date(date))
}

/** Format a Date to a date + time string */
export function formatDateTime(date: Date | string): string {
  return new Intl.DateTimeFormat('en-MY', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(date))
}

/** Return initials from a full name (up to 2 chars) */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
}

/** Truncate a string to maxLen characters with an ellipsis */
export function truncate(str: string, maxLen: number): string {
  return str.length <= maxLen ? str : str.slice(0, maxLen - 1) + '…'
}

/** Convert a Server Action error into a toast-friendly message */
export function getActionError(result: { ok: false; error: string } | unknown): string {
  if (typeof result === 'object' && result !== null && 'error' in result) {
    return String((result as { error: string }).error)
  }
  return 'An unexpected error occurred'
}
