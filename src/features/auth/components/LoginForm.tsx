'use client'

import { useActionState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, Loader2, LogIn, AlertCircle } from 'lucide-react'
import { useState } from 'react'
import { loginAction } from '../actions/auth.actions'
import { cn } from '@/lib/utils'
import type { ActionResult } from '@/types/api'

// ── Error code → human message map (NextAuth appends ?error=CODE to the URL) ──
const AUTH_ERRORS: Record<string, string> = {
  CredentialsSignin: 'Invalid email or password.',
  SessionRequired:   'You must be signed in to access that page.',
  AccessDenied:      'You do not have permission to access that page.',
  Default:           'Something went wrong. Please try again.',
}

interface LoginFormProps {
  callbackUrl?: string
  errorCode?:   string
}

const INITIAL_STATE: ActionResult<null> = { ok: true, data: null }

export default function LoginForm({ errorCode }: LoginFormProps) {
  const router              = useRouter()
  const [state, formAction, isPending] = useActionState(loginAction, null)
  const [showPassword, setShowPassword] = useState(false)
  const emailRef = useRef<HTMLInputElement>(null)

  // Focus email on mount
  useEffect(() => { emailRef.current?.focus() }, [])

  // Redirect on success (loginAction redirects server-side, but handle client fallback)
  useEffect(() => {
    if (state?.ok) router.push('/dashboard')
  }, [state, router])

  // Derive displayed error: URL error code > action error
  const displayError =
    (!state || state.ok) && errorCode
      ? (AUTH_ERRORS[errorCode] ?? AUTH_ERRORS.Default)
      : (!state?.ok ? state?.error : null)

  const fieldErrors = (!state?.ok && state?.fieldErrors) ? state.fieldErrors : {}

  return (
    <div className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8 shadow-2xl">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-white">Welcome back</h2>
        <p className="text-slate-400 text-sm mt-1">Sign in to your account to continue</p>
      </div>

      {/* Global error alert */}
      {displayError && (
        <div
          role="alert"
          className="flex items-start gap-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20 mb-5"
        >
          <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
          <p className="text-sm text-red-300">{displayError}</p>
        </div>
      )}

      <form action={formAction} className="space-y-5" noValidate>
        {/* Email */}
        <div className="space-y-1.5">
          <label htmlFor="email" className="block text-sm font-medium text-slate-300">
            Email address
          </label>
          <input
            ref={emailRef}
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            disabled={isPending}
            placeholder="you@company.com"
            aria-describedby={fieldErrors.email ? 'email-error' : undefined}
            className={cn(
              'w-full px-4 py-2.5 rounded-lg bg-slate-900/80 border text-white placeholder-slate-500',
              'focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500',
              'disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm',
              fieldErrors.email
                ? 'border-red-500/60 focus:ring-red-500/50 focus:border-red-500'
                : 'border-slate-600/50 hover:border-slate-500'
            )}
          />
          {fieldErrors.email && (
            <p id="email-error" className="text-xs text-red-400 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {fieldErrors.email[0]}
            </p>
          )}
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="block text-sm font-medium text-slate-300">
              Password
            </label>
            <Link
              href="/forgot-password"
              className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
            >
              Forgot password?
            </Link>
          </div>

          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              required
              disabled={isPending}
              placeholder="••••••••"
              aria-describedby={fieldErrors.password ? 'password-error' : undefined}
              className={cn(
                'w-full px-4 py-2.5 pr-10 rounded-lg bg-slate-900/80 border text-white placeholder-slate-500',
                'focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500',
                'disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm',
                fieldErrors.password
                  ? 'border-red-500/60 focus:ring-red-500/50 focus:border-red-500'
                  : 'border-slate-600/50 hover:border-slate-500'
              )}
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
            >
              {showPassword
                ? <EyeOff className="w-4 h-4" />
                : <Eye    className="w-4 h-4" />}
            </button>
          </div>

          {fieldErrors.password && (
            <p id="password-error" className="text-xs text-red-400 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {fieldErrors.password[0]}
            </p>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isPending}
          className={cn(
            'w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-medium text-sm',
            'bg-blue-600 hover:bg-blue-500 text-white transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-800',
            'disabled:opacity-60 disabled:cursor-not-allowed'
          )}
        >
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Signing in…
            </>
          ) : (
            <>
              <LogIn className="w-4 h-4" />
              Sign in
            </>
          )}
        </button>
      </form>

      {/* Footer */}
      <p className="text-center text-xs text-slate-500 mt-6">
        Having trouble?{' '}
        <a href="mailto:support@enquirypro.com" className="text-slate-400 hover:text-slate-300">
          Contact support
        </a>
      </p>
    </div>
  )
}
