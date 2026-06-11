'use client'

import { LogOut, Loader2 } from 'lucide-react'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { cn } from '@/lib/utils'

interface LogoutButtonProps {
  className?:  string
  showLabel?:  boolean
  variant?:    'default' | 'ghost' | 'destructive'
}

export default function LogoutButton({
  className,
  showLabel = true,
  variant   = 'ghost',
}: LogoutButtonProps) {
  const { logout, isLoggingOut } = useAuth()

  const baseStyles = 'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'

  const variantStyles = {
    default:     'bg-slate-700 hover:bg-slate-600 text-white focus:ring-slate-500',
    ghost:       'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 focus:ring-slate-400',
    destructive: 'hover:bg-red-50 dark:hover:bg-red-950 text-red-600 dark:text-red-400 focus:ring-red-500',
  }

  return (
    <button
      onClick={logout}
      disabled={isLoggingOut}
      aria-label="Sign out"
      className={cn(baseStyles, variantStyles[variant], className)}
    >
      {isLoggingOut
        ? <Loader2 className="w-4 h-4 animate-spin" />
        : <LogOut  className="w-4 h-4" />}
      {showLabel && (isLoggingOut ? 'Signing out…' : 'Sign out')}
    </button>
  )
}
