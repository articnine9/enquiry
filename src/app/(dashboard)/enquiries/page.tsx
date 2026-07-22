import { Suspense } from 'react'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { auth } from '@/lib/auth/auth'
import { getEnquiries, getEnquiryStats } from '@/features/enquiries/actions/enquiry.actions'
import EnquiryFilters from '@/features/enquiries/components/EnquiryFilters'
import EnquiryTableContainer from '@/features/enquiries/components/EnquiryTableContainer'
import EnquiryStatsBar from '@/features/enquiries/components/EnquiryStatsBar'
import { getEnquiryFormOptions } from '@/features/settings/services/masterData.service'
import { UserRole } from '@/types/enums'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Enquiries — EnquiryPro' }

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function EnquiriesPage({ searchParams }: PageProps) {
  const session = await auth()
  const params  = await searchParams

  function sp(key: string) {
    const v = params[key]
    return Array.isArray(v) ? v[0] : v
  }

  const [enquiriesResult, statsResult] = await Promise.all([
    getEnquiries({
      search:        sp('search'),
      status:        sp('status') as never,
      priority:      sp('priority') as never,
      enquirySource: sp('enquirySource') as never,
      product:       sp('product') as never,
      slaStatus:     sp('slaStatus') as never,
      distributorId: sp('distributorId'),
      dealerId:      sp('dealerId'),
      city:          sp('city'),
      page:          sp('page') ? Number(sp('page')) : 1,
      pageSize:      sp('pageSize') ? Number(sp('pageSize')) : 20,
      sortBy:        (sp('sortBy') ?? 'createdAt') as never,
      sortOrder:     (sp('sortOrder') ?? 'desc') as never,
    }),
    getEnquiryStats(),
  ])

  const filterOptions = await getEnquiryFormOptions()
  const canCreate = session?.user?.role !== UserRole.Staff

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Enquiries
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Manage and track all customer enquiries
          </p>
        </div>

        {canCreate && (
          <Link
            href="/enquiries/new"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            New Enquiry
          </Link>
        )}
      </div>

      {/* ── Stats bar ────────────────────────────────────────────────────────── */}
      {statsResult.ok && (() => {
        const raw      = statsResult.data as { byStatus?: { _id: string; count: number }[]; totals?: { total?: number; unassigned?: number; resolved?: number; slaBreached?: number }[] }
        const byStatus = raw?.byStatus ?? []
        const totals   = raw?.totals?.[0] ?? {}
        const openStatuses = ['new', 'assigned', 'in_progress', 'paused']
        const open = byStatus.filter((s) => openStatuses.includes(s._id)).reduce((a, s) => a + s.count, 0)
        return (
          <EnquiryStatsBar stats={{
            total:       totals?.total       ?? 0,
            open,
            resolved:    totals?.resolved    ?? 0,
            slaBreached: totals?.slaBreached ?? 0,
            byStatus:    byStatus as { _id: import('@/types/enums').EnquiryStatus; count: number }[],
          }} />
        )
      })()}

      {/* ── Filters ──────────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
        <Suspense>
          <EnquiryFilters options={{
            priorities: filterOptions.priorities,
            sources:    filterOptions.sources,
            products:   filterOptions.products,
          }} />
        </Suspense>
      </div>

      {/* ── Table ────────────────────────────────────────────────────────────── */}
      {enquiriesResult.ok ? (
        <EnquiryTableContainer
          data={enquiriesResult.data}
          userRole={session?.user?.role as UserRole}
          sortBy={sp('sortBy') ?? 'createdAt'}
          sortOrder={(sp('sortOrder') as 'asc' | 'desc') ?? 'desc'}
        />
      ) : (
        <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-4 text-sm text-red-700 dark:text-red-400">
          {enquiriesResult.error}
        </div>
      )}
    </div>
  )
}
