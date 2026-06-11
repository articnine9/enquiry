import type { ReportFilters } from '../types/report.types'

export function resolveDateRange(
  filters: Pick<ReportFilters, 'period' | 'dateFrom' | 'dateTo'>
): { dateFrom: string; dateTo: string } {
  if (filters.period === 'custom') {
    return { dateFrom: filters.dateFrom, dateTo: filters.dateTo }
  }

  const today = new Date()
  const fmt   = (d: Date) => d.toISOString().slice(0, 10)

  const yest = new Date(today)
  yest.setDate(today.getDate() - 1)

  const weekStart = new Date(today)
  weekStart.setDate(today.getDate() - today.getDay())

  const lastWeekStart = new Date(weekStart)
  lastWeekStart.setDate(weekStart.getDate() - 7)
  const lastWeekEnd = new Date(weekStart)
  lastWeekEnd.setDate(weekStart.getDate() - 1)

  const monthStart    = new Date(today.getFullYear(), today.getMonth(), 1)
  const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1)
  const lastMonthEnd   = new Date(today.getFullYear(), today.getMonth(), 0)

  const quarterStart = new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3, 1)
  const yearStart    = new Date(today.getFullYear(), 0, 1)

  const MAP: Record<string, { dateFrom: string; dateTo: string }> = {
    today:      { dateFrom: fmt(today),          dateTo: fmt(today)        },
    yesterday:  { dateFrom: fmt(yest),            dateTo: fmt(yest)         },
    week:       { dateFrom: fmt(weekStart),        dateTo: fmt(today)        },
    last_week:  { dateFrom: fmt(lastWeekStart),    dateTo: fmt(lastWeekEnd)  },
    month:      { dateFrom: fmt(monthStart),       dateTo: fmt(today)        },
    last_month: { dateFrom: fmt(lastMonthStart),   dateTo: fmt(lastMonthEnd) },
    quarter:    { dateFrom: fmt(quarterStart),     dateTo: fmt(today)        },
    year:       { dateFrom: fmt(yearStart),        dateTo: fmt(today)        },
  }

  return MAP[filters.period] ?? { dateFrom: fmt(monthStart), dateTo: fmt(today) }
}
