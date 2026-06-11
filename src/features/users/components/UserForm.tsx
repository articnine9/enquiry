'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { UserRole, UserStatus } from '@/types/enums'
import {
  createUserAction, updateUserAction, getZonesForSelectAction,
  type UserRow,
} from '../actions/user.actions'
import type { CreateUserInput, UpdateUserInput } from '../validations/user.schema'

interface UserFormProps {
  mode:        'create' | 'edit'
  user?:       UserRow
  currentRole: UserRole
}

const LABEL = 'block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1'
const INPUT = cn(
  'w-full h-9 px-3 rounded-lg border text-sm',
  'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800',
  'text-slate-800 dark:text-slate-200 placeholder:text-slate-400',
  'focus:outline-none focus:ring-2 focus:ring-indigo-500/50'
)
const SELECT = cn(INPUT, 'pr-7')

export default function UserForm({ mode, user, currentRole }: UserFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showPwd,   setShowPwd]      = useState(false)
  const [error,     setError]        = useState<string | null>(null)
  const [zones,     setZones]        = useState<{ _id: string; name: string }[]>([])

  const [form, setForm] = useState({
    name:           user?.name           ?? '',
    email:          user?.email          ?? '',
    password:       '',
    role:           user?.role           ?? UserRole.Staff,
    status:         user?.status         ?? UserStatus.Active,
    phone:          user?.phone          ?? '',
    locationZoneId: user?.locationZoneId ?? '',
  })

  useEffect(() => {
    getZonesForSelectAction().then((r) => { if (r.ok) setZones(r.data) })
  }, [])

  function set(field: string, value: string) {
    setForm((p) => ({ ...p, [field]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    startTransition(async () => {
      if (mode === 'create') {
        const input: CreateUserInput = {
          name:           form.name,
          email:          form.email,
          password:       form.password,
          role:           form.role,
          status:         form.status,
          phone:          form.phone || undefined,
          locationZoneId: form.locationZoneId || undefined,
        }
        const r = await createUserAction(input)
        if (!r.ok) { setError(r.error); return }
        router.push('/staff')
        router.refresh()
      } else {
        const input: UpdateUserInput = {
          name:           form.name,
          email:          form.email,
          role:           form.role,
          status:         form.status,
          phone:          form.phone || undefined,
          locationZoneId: form.locationZoneId || null,
        }
        const r = await updateUserAction(user!._id, input)
        if (!r.ok) { setError(r.error); return }
        router.push('/staff')
        router.refresh()
      }
    })
  }

  const isSuperAdmin = currentRole === UserRole.SuperAdmin

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-lg">
      {error && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Name */}
      <div>
        <label className={LABEL}>Full name *</label>
        <input type="text" required value={form.name} onChange={(e) => set('name', e.target.value)} className={INPUT} placeholder="John Smith" />
      </div>

      {/* Email */}
      <div>
        <label className={LABEL}>Email address *</label>
        <input type="email" required value={form.email} onChange={(e) => set('email', e.target.value)} className={INPUT} placeholder="john@example.com" />
      </div>

      {/* Password (create only) */}
      {mode === 'create' && (
        <div>
          <label className={LABEL}>Password *</label>
          <div className="relative">
            <input
              type={showPwd ? 'text' : 'password'}
              required
              minLength={8}
              value={form.password}
              onChange={(e) => set('password', e.target.value)}
              className={cn(INPUT, 'pr-10')}
              placeholder="Min. 8 characters"
            />
            <button
              type="button"
              onClick={() => setShowPwd((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              tabIndex={-1}
            >
              {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
      )}

      {/* Phone */}
      <div>
        <label className={LABEL}>Phone</label>
        <input type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} className={INPUT} placeholder="+44 7700 900000" />
      </div>

      {/* Role (SuperAdmin only) */}
      {isSuperAdmin && (
        <div>
          <label className={LABEL}>Role *</label>
          <select value={form.role} onChange={(e) => set('role', e.target.value)} className={SELECT}>
            <option value={UserRole.SuperAdmin}>Super Admin</option>
            <option value={UserRole.Manager}>Manager</option>
            <option value={UserRole.Staff}>Staff</option>
          </select>
        </div>
      )}

      {/* Status */}
      <div>
        <label className={LABEL}>Status *</label>
        <select value={form.status} onChange={(e) => set('status', e.target.value)} className={SELECT}>
          <option value={UserStatus.Active}>Active</option>
          <option value={UserStatus.Inactive}>Inactive</option>
          <option value={UserStatus.Suspended}>Suspended</option>
        </select>
      </div>

      {/* Zone */}
      <div>
        <label className={LABEL}>Location zone</label>
        <select value={form.locationZoneId} onChange={(e) => set('locationZoneId', e.target.value)} className={SELECT}>
          <option value="">No zone assigned</option>
          {zones.map((z) => (
            <option key={z._id} value={z._id}>{z.name}</option>
          ))}
        </select>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="h-9 px-5 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 flex items-center gap-2 transition-colors"
        >
          {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {mode === 'create' ? 'Create user' : 'Save changes'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="h-9 px-5 rounded-lg text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
