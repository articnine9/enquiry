import { type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface FormFieldProps {
  id:       string
  label:    string
  error?:   string | string[]
  required?: boolean
  hint?:    string
  children: ReactNode
  className?: string
}

export function FormField({
  id, label, error, required, hint, children, className,
}: FormFieldProps) {
  const errorMsg = Array.isArray(error) ? error[0] : error

  return (
    <div className={cn('space-y-1.5', className)}>
      <label
        htmlFor={id}
        className="block text-sm font-medium text-slate-700 dark:text-slate-300"
      >
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>

      {children}

      {hint && !errorMsg && (
        <p className="text-xs text-slate-500 dark:text-slate-400">{hint}</p>
      )}
      {errorMsg && (
        <p id={`${id}-error`} role="alert" className="text-xs text-red-500 flex items-center gap-1">
          <svg className="w-3 h-3 shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {errorMsg}
        </p>
      )}
    </div>
  )
}

// ── Shared input / select class factories ────────────────────────────────────

export function inputClass(hasError?: boolean) {
  return cn(
    'w-full px-3 py-2 rounded-lg border bg-white dark:bg-slate-900 text-sm',
    'text-slate-900 dark:text-slate-100 placeholder-slate-400',
    'focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500',
    'disabled:opacity-50 disabled:cursor-not-allowed transition-colors',
    hasError
      ? 'border-red-400 focus:ring-red-400/40 focus:border-red-400'
      : 'border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500'
  )
}

export function selectClass(hasError?: boolean) {
  return cn(inputClass(hasError), 'cursor-pointer')
}
