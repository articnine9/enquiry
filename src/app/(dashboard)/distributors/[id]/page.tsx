import { notFound } from 'next/navigation'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { Truck, Footprints, MapPin, Camera } from 'lucide-react'
import { requireRole } from '@/lib/auth/session'
import { PageHeader } from '@/components/ui/PageHeader'
import { getDistributorAction } from '@/features/distributors/actions/distributor.actions'
import { getFieldVisitsAction } from '@/features/field-visits/actions/fieldVisit.actions'
import VisitTypeBadge from '@/features/field-visits/components/VisitTypeBadge'
import { formatDate } from '@/lib/utils'
import { UserRole } from '@/types/enums'
import type { Metadata } from 'next'

const DealerManager = dynamic(
  () => import('@/features/distributors/components/DealerManager')
)

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const result = await getDistributorAction(id)
  if (!result.ok) return { title: 'Distributor' }
  return { title: `${result.data.name} — Distributor` }
}

export default async function DistributorDetailPage({ params }: PageProps) {
  const { id } = await params
  await requireRole(UserRole.SuperAdmin, UserRole.Manager)

  const result = await getDistributorAction(id)
  if (!result.ok) notFound()
  const distributor = result.data

  const visitsResult = await getFieldVisitsAction({ distributorId: id, pageSize: 5 })
  const recentVisits = visitsResult.ok ? visitsResult.data.data : []

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-6">
      <PageHeader
        icon={Truck}
        title={distributor.name}
        subtitle={`${distributor.territory} · ${distributor.code}`}
        backHref="/distributors"
        backLabel="Back to distributors"
      />

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <p className="text-xs font-medium text-slate-400 mb-1">Contact</p>
            <p className="text-sm text-slate-700 dark:text-slate-300">{distributor.contactName}</p>
            <p className="text-xs text-slate-500">{distributor.contactPhone}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400 mb-1">Dealers</p>
            <p className="text-sm text-slate-700 dark:text-slate-300">{distributor.dealerCount}</p>
          </div>
          <div className="col-span-2">
            <p className="text-xs font-medium text-slate-400 mb-1">Assigned districts</p>
            <div className="flex flex-wrap gap-1">
              {distributor.assignedDistricts.length === 0
                ? <span className="text-sm text-slate-400">None assigned</span>
                : distributor.assignedDistricts.map((d) => (
                    <span key={d} className="px-2 py-0.5 rounded-full text-[11px] bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300">{d}</span>
                  ))
              }
            </div>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3">Dealers</h2>
        <DealerManager distributorId={distributor._id} distributorDistricts={distributor.assignedDistricts} />
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <Footprints className="w-4 h-4 text-slate-400" />
            Recent Visits
          </h2>
          <Link
            href={`/field-visits?distributorId=${distributor._id}`}
            className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            View all
          </Link>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          {recentVisits.length === 0 ? (
            <p className="py-8 text-center text-slate-400 text-sm">No field visits logged for this distributor yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {recentVisits.map((v) => (
                <li key={v._id} className="px-4 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <Link href={`/field-visits/${v._id}`} className="text-sm font-medium text-slate-800 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 truncate">
                      {v.customerName}
                    </Link>
                    <p className="text-xs text-slate-400">{v.staffName ?? 'Staff'} · {formatDate(v.visitDate)}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {v.gpsLat != null && <MapPin className="w-3.5 h-3.5 text-slate-400" />}
                    {v.photoUrl && <Camera className="w-3.5 h-3.5 text-slate-400" />}
                    <VisitTypeBadge type={v.visitType} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
