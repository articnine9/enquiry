/**
 * Client-side CSV export utilities.
 * All functions run in the browser — no server-side dependencies.
 */

type CsvRow = Record<string, string | number | boolean | null | undefined>

function escapeCsv(val: unknown): string {
  if (val === null || val === undefined) return ''
  const str = String(val)
  // Wrap in quotes if contains comma, quote, or newline
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function buildCsvString(headers: string[], rows: CsvRow[]): string {
  const headerLine = headers.map(escapeCsv).join(',')
  const dataLines  = rows.map((row) =>
    headers.map((h) => escapeCsv(row[h])).join(',')
  )
  return [headerLine, ...dataLines].join('\n')
}

function triggerDownload(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ── Per-report exporters ──────────────────────────────────────────────────────

export function exportEnquiryRows(
  rows: { _id: string; enquiryNo: string; name: string; status: string; priority: string; source: string; category: string; assignee?: string; createdAt: string; ageHours: number }[],
  filename = 'enquiry-report.csv'
): void {
  const headers = ['Enquiry No', 'Name', 'Status', 'Priority', 'Source', 'Category', 'Assignee', 'Created At', 'Age (hrs)']
  const csvRows: CsvRow[] = rows.map((r) => ({
    'Enquiry No':  r.enquiryNo,
    'Name':        r.name,
    'Status':      r.status,
    'Priority':    r.priority,
    'Source':      r.source,
    'Category':    r.category,
    'Assignee':    r.assignee ?? '',
    'Created At':  new Date(r.createdAt).toLocaleString('en-MY'),
    'Age (hrs)':   r.ageHours,
  }))
  triggerDownload(buildCsvString(headers, csvRows), filename)
}

export function exportStaffPerformance(
  rows: { name: string; email: string; zoneName: string; activeDays: number; enquiriesAssigned: number; enquiriesResolved: number; resolutionRate: number; callsMade: number; followUpsCompleted: number; totalOnlineMinutes: number; avgScore: number }[],
  filename = 'staff-performance.csv'
): void {
  const headers = ['Name', 'Email', 'Zone', 'Active Days', 'Assigned', 'Resolved', 'Resolution %', 'Calls Made', 'Follow-ups', 'Online (min)', 'Avg Score']
  const csvRows: CsvRow[] = rows.map((r) => ({
    'Name':          r.name,
    'Email':         r.email,
    'Zone':          r.zoneName,
    'Active Days':   r.activeDays,
    'Assigned':      r.enquiriesAssigned,
    'Resolved':      r.enquiriesResolved,
    'Resolution %':  r.resolutionRate,
    'Calls Made':    r.callsMade,
    'Follow-ups':    r.followUpsCompleted,
    'Online (min)':  r.totalOnlineMinutes,
    'Avg Score':     r.avgScore,
  }))
  triggerDownload(buildCsvString(headers, csvRows), filename)
}

export function exportZonePerformance(
  rows: { zoneName: string; total: number; open: number; resolved: number; closed: number; conversionRate: number; staffCount: number; avgLoad: number; avgResolutionHours: number }[],
  filename = 'zone-performance.csv'
): void {
  const headers = ['Zone', 'Total', 'Open', 'Resolved', 'Closed', 'Conv. Rate %', 'Staff', 'Avg Load', 'Avg Res. (hrs)']
  const csvRows: CsvRow[] = rows.map((r) => ({
    'Zone':           r.zoneName,
    'Total':          r.total,
    'Open':           r.open,
    'Resolved':       r.resolved,
    'Closed':         r.closed,
    'Conv. Rate %':   r.conversionRate,
    'Staff':          r.staffCount,
    'Avg Load':       r.avgLoad,
    'Avg Res. (hrs)': r.avgResolutionHours,
  }))
  triggerDownload(buildCsvString(headers, csvRows), filename)
}

export function exportFollowUpByStaff(
  rows: { staffName: string; scheduled: number; completed: number; missed: number; completionRate: number }[],
  filename = 'followup-report.csv'
): void {
  const headers = ['Staff', 'Scheduled', 'Completed', 'Missed', 'Completion %']
  const csvRows: CsvRow[] = rows.map((r) => ({
    'Staff':         r.staffName,
    'Scheduled':     r.scheduled,
    'Completed':     r.completed,
    'Missed':        r.missed,
    'Completion %':  r.completionRate,
  }))
  triggerDownload(buildCsvString(headers, csvRows), filename)
}
