import { notFound } from 'next/navigation'
import dynamic from 'next/dynamic'
import { Truck } from 'lucide-react'
import { requireRole } from '@/lib/auth/session'
import { PageHeader } from '@/components/ui/PageHeader'
import { getDistributorAction } from '@/features/distributors/actions/distributor.actions'
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
    </div>
  )
}
