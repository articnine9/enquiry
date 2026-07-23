import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Footprints, MapPin, ExternalLink, User, Truck, Store } from 'lucide-react'
import { requirePermission } from '@/lib/auth/session'
import { PageHeader } from '@/components/ui/PageHeader'
import { getFieldVisitAction } from '@/features/field-visits/actions/fieldVisit.actions'
import VisitTypeBadge from '@/features/field-visits/components/VisitTypeBadge'
import { formatDate } from '@/lib/utils'
import type { Metadata } from 'next'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const result = await getFieldVisitAction(id)
  if (!result.ok) return { title: 'Field Visit' }
  return { title: `${result.data.customerName} — Field Visit` }
}

export default async function FieldVisitDetailPage({ params }: PageProps) {
  const { id } = await params
  await requirePermission('visit:read')

  const result = await getFieldVisitAction(id)
  if (!result.ok) notFound()
  const visit = result.data

  const mapUrl = visit.gpsLat != null && visit.gpsLng != null
    ? `https://maps.google.com/?q=${visit.gpsLat},${visit.gpsLng}`
    : null

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-3xl mx-auto space-y-6">
      <PageHeader
        icon={Footprints}
        title={visit.customerName}
        subtitle={`${formatDate(visit.visitDate)} · logged by ${visit.staffName ?? 'staff'}`}
        backHref="/field-visits"
        backLabel="Back to field visits"
      />

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-5 space-y-5">
        <div className="flex items-center justify-between">
          <VisitTypeBadge type={visit.visitType} className="text-sm px-3 py-1" />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div>
            <p className="text-xs font-medium text-slate-400 mb-1">Visit Date</p>
            <p className="text-sm text-slate-700 dark:text-slate-300">{formatDate(visit.visitDate)}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400 mb-1 flex items-center gap-1"><User className="w-3 h-3" />Logged By</p>
            <p className="text-sm text-slate-700 dark:text-slate-300">{visit.staffName ?? '—'}</p>
          </div>
          {visit.distributorName && (
            <div>
              <p className="text-xs font-medium text-slate-400 mb-1 flex items-center gap-1"><Truck className="w-3 h-3" />Distributor</p>
              <p className="text-sm text-slate-700 dark:text-slate-300">{visit.distributorName}</p>
            </div>
          )}
          {visit.dealerName && (
            <div>
              <p className="text-xs font-medium text-slate-400 mb-1 flex items-center gap-1"><Store className="w-3 h-3" />Dealer</p>
              <p className="text-sm text-slate-700 dark:text-slate-300">{visit.dealerName}</p>
            </div>
          )}
          {visit.enquiryNo && (
            <div>
              <p className="text-xs font-medium text-slate-400 mb-1">Related Enquiry</p>
              <Link href={`/enquiries/${visit.enquiryId}`} className="text-sm font-mono text-indigo-600 dark:text-indigo-400 hover:underline">
                {visit.enquiryNo}
              </Link>
            </div>
          )}
        </div>

        {visit.notes && (
          <div>
            <p className="text-xs font-medium text-slate-400 mb-1">Visit Notes</p>
            <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{visit.notes}</p>
          </div>
        )}

        {mapUrl && (
          <div>
            <p className="text-xs font-medium text-slate-400 mb-1">GPS Location</p>
            <a
              href={mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              <MapPin className="w-4 h-4" />
              {visit.gpsLat?.toFixed(5)}, {visit.gpsLng?.toFixed(5)}
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}

        {visit.photoUrl && (
          <div>
            <p className="text-xs font-medium text-slate-400 mb-2">Photo</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={visit.photoUrl}
              alt={`Visit photo for ${visit.customerName}`}
              className="max-w-sm rounded-lg border border-slate-200 dark:border-slate-700"
            />
          </div>
        )}
      </div>
    </div>
  )
}
