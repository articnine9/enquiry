'use client'

import { useState, useEffect } from 'react'
import {
  UserPlus, CalendarClock, CheckCircle2, XCircle,
  ShoppingCart, IndianRupee, Store, Truck,
} from 'lucide-react'
import { getManagementSnapshotAction, type ManagementSnapshotData } from '../actions/dashboard.actions'
import StatCard from './StatCard'

export default function ManagementSnapshot() {
  const [data,      setData]      = useState<ManagementSnapshotData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error,     setError]     = useState<string | null>(null)

  useEffect(() => {
    getManagementSnapshotAction().then((r) => {
      if (r.ok) setData(r.data)
      else       setError(r.error)
      setIsLoading(false)
    })
  }, [])

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-pulse">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-slate-100 dark:bg-slate-800" />
        ))}
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-4 text-sm text-red-700 dark:text-red-400">
        {error ?? 'Failed to load management snapshot'}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">This Month at a Glance</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="New Leads Today" value={data.newLeadsToday}
          icon={UserPlus}      iconColor="text-sky-600 dark:text-sky-400"       iconBg="bg-sky-50 dark:bg-sky-900/30" />
        <StatCard label="Pending Follow-Ups" value={data.pendingFollowUps}
          icon={CalendarClock} iconColor="text-indigo-600 dark:text-indigo-400" iconBg="bg-indigo-50 dark:bg-indigo-900/30" />
        <StatCard label="Converted Leads" value={data.convertedThisMonth}
          icon={CheckCircle2}  iconColor="text-green-600 dark:text-green-400"   iconBg="bg-green-50 dark:bg-green-900/30" />
        <StatCard label="Lost Leads" value={data.lostThisMonth}
          icon={XCircle}       iconColor="text-red-600 dark:text-red-400"       iconBg="bg-red-50 dark:bg-red-900/30" />
        <StatCard label="Monthly Orders" value={data.monthlyOrders}
          icon={ShoppingCart}  iconColor="text-amber-600 dark:text-amber-400"   iconBg="bg-amber-50 dark:bg-amber-900/30" />
        <StatCard label="Monthly Sales Value"
          value={data.monthlySalesValue > 0 ? `₹${data.monthlySalesValue.toLocaleString()}` : '—'}
          icon={IndianRupee}   iconColor="text-emerald-600 dark:text-emerald-400" iconBg="bg-emerald-50 dark:bg-emerald-900/30" />
        <StatCard label="Best Dealer"
          value={data.bestDealer?.name ?? '—'}
          hint={data.bestDealer ? `₹${data.bestDealer.revenue.toLocaleString()} · ${data.bestDealer.orders} orders` : undefined}
          icon={Store}         iconColor="text-violet-600 dark:text-violet-400" iconBg="bg-violet-50 dark:bg-violet-900/30" size="sm" />
        <StatCard label="Best Distributor"
          value={data.bestDistributor?.name ?? '—'}
          hint={data.bestDistributor ? `₹${data.bestDistributor.revenue.toLocaleString()} · ${data.bestDistributor.orders} orders` : undefined}
          icon={Truck}         iconColor="text-teal-600 dark:text-teal-400"     iconBg="bg-teal-50 dark:bg-teal-900/30" size="sm" />
      </div>
    </div>
  )
}
