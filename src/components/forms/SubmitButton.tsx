'use client'

import { useFormStatus } from 'react-dom'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SubmitButtonProps {
  label:        string
  loadingLabel?: string
  className?:   string
  variant?:     'primary' | 'danger'
  icon?:        React.ReactNode
  disabled?:    boolean
}

export function SubmitButton({
  label,
  loadingLabel,
  className,
  variant = 'primary',
  icon,
  disabled = false,
}: SubmitButtonProps) {
  const { pending } = useFormStatus()

  const base = 'inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed'

  const variants = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500',
    danger:  'bg-red-600  hover:bg-red-700  text-white focus:ring-red-500',
  }

  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className={cn(base, variants[variant], className)}
    >
      {pending
        ? <><Loader2 className="w-4 h-4 animate-spin" />{loadingLabel ?? 'Saving…'}</>
        : <>{icon}{label}</>}
    </button>
  )
}
