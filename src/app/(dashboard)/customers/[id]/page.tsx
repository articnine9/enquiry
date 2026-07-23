import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Users2, Repeat, Package } from 'lucide-react'
import { requireRole } from '@/lib/auth/session'
import { PageHeader } from '@/components/ui/PageHeader'
import { getCustomerAction } from '@/features/customers/actions/customer.actions'
import { formatDate } from '@/lib/utils'
import { UserRole } from '@/types/enums'
import type { Metadata } from 'next'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const result = await getCustomerAction(id)
  if (!result.ok) return { title: 'Customer' }
  return { title: `${result.data.name} — Customer` }
}

export default async function CustomerDetailPage({ params }: PageProps) {
  const { id } = await params
  await requireRole(UserRole.SuperAdmin, UserRole.Manager)

  const result = await getCustomerAction(id)
  if (!result.ok) notFound()
  const customer = result.data

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-6">
      <PageHeader
        icon={Users2}
        title={customer.name}
        subtitle={`${customer.phone}${customer.territory ? ` · ${customer.territory}` : ''}`}
        backHref="/customers"
        backLabel="Back to customers"
      />

      {/* Profile summary */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <p className="text-xs font-medium text-slate-400 mb-1">Contact</p>
            <p className="text-sm text-slate-700 dark:text-slate-300">{customer.phone}</p>
            {customer.email && <p className="text-xs text-slate-500">{customer.email}</p>}
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400 mb-1">Location</p>
            <p className="text-sm text-slate-700 dark:text-slate-300">
              {[customer.city, customer.district].filter(Boolean).join(', ') || '—'}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400 mb-1">Total Purchases</p>
            <p className={`text-sm font-semibold flex items-center gap-1 ${customer.totalPurchases > 1 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300'}`}>
              {customer.totalPurchases > 1 && <Repeat className="w-3.5 h-3.5" />}
              {customer.totalPurchases}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400 mb-1">Total Revenue</p>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              {customer.totalRevenue > 0 ? `₹${customer.totalRevenue.toLocaleString()}` : '—'}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400 mb-1">Dealer / Distributor</p>
            <p className="text-sm text-slate-700 dark:text-slate-300">{customer.dealerName ?? '—'}</p>
            {customer.distributorName && <p className="text-xs text-slate-500">{customer.distributorName}</p>}
          </div>
          {customer.address && (
            <div className="col-span-2 sm:col-span-4">
              <p className="text-xs font-medium text-slate-400 mb-1">Address</p>
              <p className="text-sm text-slate-700 dark:text-slate-300">{customer.address}</p>
            </div>
          )}
          <div className="col-span-2 sm:col-span-4">
            <p className="text-xs font-medium text-slate-400 mb-1">Product Categories</p>
            <div className="flex flex-wrap gap-1.5">
              {customer.productCategories.length === 0
                ? <span className="text-sm text-slate-400">None</span>
                : customer.productCategories.map((cat) => (
                    <span key={cat} className="px-2 py-0.5 rounded-full text-[11px] bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300">{cat}</span>
                  ))
              }
            </div>
          </div>
        </div>
      </div>

      {/* Purchase history */}
      <div>
        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
          <Package className="w-4 h-4 text-slate-400" />
          Purchase History
        </h2>
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Enquiry</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Product</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Category</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Dealer / Distributor</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Value</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {customer.purchaseHistory.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400 text-sm">No purchases recorded.</td>
                </tr>
              ) : customer.purchaseHistory.map((p, i) => (
                <tr key={i} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 py-3">
                    {p.enquiryNo ? (
                      <Link href={`/enquiries/${p.enquiryId}`} className="text-xs font-mono text-indigo-600 dark:text-indigo-400 hover:underline">
                        {p.enquiryNo}
                      </Link>
                    ) : <span className="text-xs text-slate-400">—</span>}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">{p.product?.replace(/_/g, ' ')}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{p.category}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {p.dealerName ?? p.distributorName ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {p.dealValue != null ? `₹${p.dealValue.toLocaleString()}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{formatDate(p.convertedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
