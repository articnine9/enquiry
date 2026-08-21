'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import DeleteEnquiriesTab from './DeleteEnquiriesTab'
import DeleteUsersTab from './DeleteUsersTab'

type Tab = 'enquiries' | 'users'

const TABS: { key: Tab; label: string }[] = [
  { key: 'enquiries', label: 'Enquiries' },
  { key: 'users',     label: 'Users' },
]

export default function DataManagementTabs() {
  const [tab, setTab] = useState<Tab>('enquiries')

  return (
    <div className="space-y-4">
      <div className="flex gap-1 border-b border-slate-200 dark:border-slate-700">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              'px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
              tab === t.key
                ? 'border-red-600 text-red-700 dark:text-red-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'enquiries' && <DeleteEnquiriesTab />}
      {tab === 'users'     && <DeleteUsersTab />}
    </div>
  )
}
