'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2, Mail, AlertCircle, CheckCircle2 } from 'lucide-react'
import { forgotPasswordAction } from '../actions/auth.actions'
import { cn } from '@/lib/utils'

export default function ForgotPasswordForm() {
  const [state, formAction, isPending] = useActionState(forgotPasswordAction, null)

  const isSuccess = state?.ok === true

  return (
    <div className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8 shadow-2xl">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-white">Reset your password</h2>
        <p className="text-slate-400 text-sm mt-1">
          Enter your email and we&apos;ll send you a reset link.
        </p>
      </div>

      {/* Success state */}
      {isSuccess ? (
        <div className="text-center py-4 space-y-4">
          <div className="flex justify-center">
            <div className="w-12 h-12 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-green-400" />
            </div>
          </div>
          <div>
            <p className="text-white font-medium">Check your inbox</p>
            <p className="text-slate-400 text-sm mt-1">
              If an account exists for that email, a reset link has been sent.
            </p>
          </div>
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to sign in
          </Link>
        </div>
      ) : (
        <form action={formAction} className="space-y-5">
          {state && !state.ok && (
            <div role="alert" className="flex items-start gap-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
              <p className="text-sm text-red-300">{state.error}</p>
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="email" className="block text-sm font-medium text-slate-300">
              Email address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                disabled={isPending}
                placeholder="you@company.com"
                className={cn(
                  'w-full pl-9 pr-4 py-2.5 rounded-lg bg-slate-900/80 border border-slate-600/50',
                  'text-white placeholder-slate-500 text-sm',
                  'hover:border-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500',
                  'disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
                )}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-medium text-sm bg-blue-600 hover:bg-blue-500 text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</> : 'Send reset link'}
          </button>

          <div className="text-center">
            <Link href="/login" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-300 transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to sign in
            </Link>
          </div>
        </form>
      )}
    </div>
  )
}
