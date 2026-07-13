'use client'

import { useState, useTransition } from 'react'
import { Loader2, Lock, Eye, EyeOff } from 'lucide-react'
import { changePasswordAction } from '@/features/users/actions/user.actions'
import { SettingsHeader } from '@/features/settings/components/SettingsHeader'
import { cn } from '@/lib/utils'

const INPUT = cn(
  'w-full h-9 px-3 rounded-lg border text-sm',
  'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800',
  'text-slate-800 dark:text-slate-200 placeholder:text-slate-400',
  'focus:outline-none focus:ring-2 focus:ring-indigo-500/50'
)
const LABEL = 'block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1'

export default function ChangePasswordPage() {
  const [isPending, startTransition] = useTransition()
  const [show,     setShow]     = useState({ cur: false, nxt: false })
  const [success,  setSuccess]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const [form, setForm] = useState({ currentPassword: '', newPassword: '' })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    startTransition(async () => {
      const r = await changePasswordAction(form)
      if (!r.ok) { setError(r.error); return }
      setSuccess(true)
      setForm({ currentPassword: '', newPassword: '' })
    })
  }

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-2xl mx-auto space-y-6">
      <SettingsHeader icon={Lock} title="Change Password" subtitle="Update your account password and security" />

      <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm">
        {error && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-400">
            {error}
          </div>
        )}
        {success && (
          <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-sm text-green-700 dark:text-green-400">
            Password changed successfully.
          </div>
        )}

        <div>
          <label className={LABEL}>Current password</label>
          <div className="relative">
            <input
              type={show.cur ? 'text' : 'password'}
              required
              value={form.currentPassword}
              onChange={(e) => setForm((p) => ({ ...p, currentPassword: e.target.value }))}
              className={cn(INPUT, 'pr-10')}
            />
            <button type="button" onClick={() => setShow((p) => ({ ...p, cur: !p.cur }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" tabIndex={-1}>
              {show.cur ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div>
          <label className={LABEL}>New password <span className="font-normal text-slate-400">(min. 8 chars)</span></label>
          <div className="relative">
            <input
              type={show.nxt ? 'text' : 'password'}
              required
              minLength={8}
              value={form.newPassword}
              onChange={(e) => setForm((p) => ({ ...p, newPassword: e.target.value }))}
              className={cn(INPUT, 'pr-10')}
            />
            <button type="button" onClick={() => setShow((p) => ({ ...p, nxt: !p.nxt }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" tabIndex={-1}>
              {show.nxt ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="h-9 px-5 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 flex items-center gap-2 transition-colors"
        >
          {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          Update password
        </button>
      </form>
    </div>
  )
}
