'use client'

import { useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Eye, EyeOff, Loader2, KeyRound, CheckCircle2, AlertCircle } from 'lucide-react'
import { resetPasswordAction } from '../actions/auth.actions'
import { cn } from '@/lib/utils'

interface PasswordRule {
  label: string
  test:  (v: string) => boolean
}

const RULES: PasswordRule[] = [
  { label: 'At least 8 characters',        test: (v) => v.length >= 8 },
  { label: 'At least one uppercase letter', test: (v) => /[A-Z]/.test(v) },
  { label: 'At least one number',           test: (v) => /[0-9]/.test(v) },
  { label: 'At least one special character',test: (v) => /[^A-Za-z0-9]/.test(v) },
]

export default function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter()
  const [state, formAction, isPending] = useActionState(resetPasswordAction, null)
  const [showPw,  setShowPw]  = useState(false)
  const [showCpw, setShowCpw] = useState(false)
  const [password, setPassword] = useState('')

  useEffect(() => {
    if (state?.ok) {
      const t = setTimeout(() => router.push('/login'), 2000)
      return () => clearTimeout(t)
    }
  }, [state, router])

  const fieldErrors = (!state?.ok && state?.fieldErrors) ? state.fieldErrors : {}

  return (
    <div className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8 shadow-2xl">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-white">Choose a new password</h2>
        <p className="text-slate-400 text-sm mt-1">Make it strong and unique.</p>
      </div>

      {state?.ok ? (
        <div className="text-center py-4 space-y-4">
          <div className="flex justify-center">
            <div className="w-12 h-12 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-green-400" />
            </div>
          </div>
          <p className="text-white font-medium">Password updated!</p>
          <p className="text-slate-400 text-sm">Redirecting you to sign in…</p>
        </div>
      ) : (
        <form action={formAction} className="space-y-5">
          <input type="hidden" name="token" value={token} />

          {state && !state.ok && !Object.keys(fieldErrors).length && (
            <div role="alert" className="flex items-start gap-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
              <p className="text-sm text-red-300">{state.error}</p>
            </div>
          )}

          {/* New password */}
          <div className="space-y-1.5">
            <label htmlFor="password" className="block text-sm font-medium text-slate-300">
              New password
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPw ? 'text' : 'password'}
                autoComplete="new-password"
                required
                disabled={isPending}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={cn(
                  'w-full px-4 py-2.5 pr-10 rounded-lg bg-slate-900/80 border text-white placeholder-slate-500 text-sm',
                  'focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500',
                  'disabled:opacity-50 transition-colors',
                  fieldErrors.password ? 'border-red-500/60' : 'border-slate-600/50 hover:border-slate-500'
                )}
              />
              <button type="button" onClick={() => setShowPw(s => !s)} aria-label={showPw ? 'Hide' : 'Show'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200">
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Password strength rules */}
            {password.length > 0 && (
              <ul className="space-y-1 pt-1">
                {RULES.map(rule => (
                  <li key={rule.label} className={cn('flex items-center gap-1.5 text-xs',
                    rule.test(password) ? 'text-green-400' : 'text-slate-500')}>
                    <CheckCircle2 className="w-3 h-3 shrink-0" />
                    {rule.label}
                  </li>
                ))}
              </ul>
            )}

            {fieldErrors.password && (
              <p className="text-xs text-red-400 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />{fieldErrors.password[0]}
              </p>
            )}
          </div>

          {/* Confirm password */}
          <div className="space-y-1.5">
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-300">
              Confirm password
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showCpw ? 'text' : 'password'}
                autoComplete="new-password"
                required
                disabled={isPending}
                placeholder="••••••••"
                className={cn(
                  'w-full px-4 py-2.5 pr-10 rounded-lg bg-slate-900/80 border text-white placeholder-slate-500 text-sm',
                  'focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500',
                  'disabled:opacity-50 transition-colors',
                  fieldErrors.confirmPassword ? 'border-red-500/60' : 'border-slate-600/50 hover:border-slate-500'
                )}
              />
              <button type="button" onClick={() => setShowCpw(s => !s)} aria-label={showCpw ? 'Hide' : 'Show'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200">
                {showCpw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {fieldErrors.confirmPassword && (
              <p className="text-xs text-red-400 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />{fieldErrors.confirmPassword[0]}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-medium text-sm bg-blue-600 hover:bg-blue-500 text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isPending
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Updating…</>
              : <><KeyRound className="w-4 h-4" /> Update password</>}
          </button>

          <div className="text-center">
            <Link href="/login" className="text-sm text-slate-400 hover:text-slate-300 transition-colors">
              Back to sign in
            </Link>
          </div>
        </form>
      )}
    </div>
  )
}
