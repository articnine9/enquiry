'use client'

import { useState, useTransition } from 'react'
import { Loader2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { updateUserAction } from '@/features/users/actions/user.actions'
import { cn } from '@/lib/utils'

const INPUT = cn(
  'w-full h-9 px-3 rounded-lg border text-sm',
  'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800',
  'text-slate-800 dark:text-slate-200 placeholder:text-slate-400',
  'focus:outline-none focus:ring-2 focus:ring-indigo-500/50'
)
const LABEL = 'block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1'

export default function ProfilePage() {
  const { data: session, update } = useSession()
  const [isPending, startTransition] = useTransition()
  const [success, setSuccess] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  const [form, setForm] = useState({
    name:  session?.user?.name  ?? '',
    email: session?.user?.email ?? '',
    phone: '',
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    if (!session?.user?.id) return

    startTransition(async () => {
      const r = await updateUserAction(session.user.id, {
        name:  form.name,
        email: form.email,
        phone: form.phone || undefined,
      })
      if (!r.ok) { setError(r.error); return }
      await update({ name: form.name, email: form.email })
      setSuccess(true)
    })
  }

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-lg mx-auto space-y-6">
      <Link
        href="/settings"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to settings
      </Link>

      <h1 className="text-xl font-bold text-slate-900 dark:text-white">My Profile</h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-400">
            {error}
          </div>
        )}
        {success && (
          <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-sm text-green-700 dark:text-green-400">
            Profile updated successfully.
          </div>
        )}

        <div>
          <label className={LABEL}>Full name</label>
          <input type="text" required value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} className={INPUT} />
        </div>
        <div>
          <label className={LABEL}>Email address</label>
          <input type="email" required value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} className={INPUT} />
        </div>
        <div>
          <label className={LABEL}>Phone</label>
          <input type="tel" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} className={INPUT} placeholder="+44 7700 900000" />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="h-9 px-5 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 flex items-center gap-2 transition-colors"
        >
          {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          Save changes
        </button>
      </form>
    </div>
  )
}
