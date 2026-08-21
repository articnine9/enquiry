/**
 * Client-side CSV export/import column definitions for the Enquiries list —
 * runs in the browser, no server-side dependencies. Mirrors the pattern in
 * src/features/reports/utils/csv-export.ts, kept feature-local since the row
 * shapes and column sets differ.
 *
 * The column list is shared between export and import: `importable` marks
 * the subset of columns import actually reads (the rest — Enquiry No,
 * Status, SLA, Distributor, Dealer, Assigned To, Created At — are
 * system-derived, so a re-exported file can be re-imported as-is without
 * editing; those columns are simply ignored on the way back in).
 */
import type { ExportEnquiryRow } from '../actions/enquiry.actions'

export function escapeCsv(val: unknown): string {
  if (val === null || val === undefined) return ''
  const str = String(val)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export interface EnquiryColumnDef {
  key:        keyof ExportEnquiryRow
  label:      string
  importable: boolean
}

export const ENQUIRY_CSV_COLUMNS: EnquiryColumnDef[] = [
  { key: 'enquiryNo',           label: 'Enquiry No',         importable: false },
  { key: 'customerName',        label: 'Customer Name',      importable: true },
  { key: 'phone',                label: 'Phone',              importable: true },
  { key: 'email',                label: 'Email',              importable: true },
  { key: 'address',              label: 'Address',            importable: true },
  { key: 'state',                label: 'State',              importable: true },
  { key: 'district',             label: 'District',           importable: true },
  { key: 'taluks',               label: 'Taluks',             importable: true },
  { key: 'pincode',              label: 'Pincode',            importable: true },
  { key: 'location',             label: 'Location',           importable: true },
  { key: 'status',               label: 'Status',             importable: false },
  { key: 'leadStage',            label: 'Lead Stage',         importable: false },
  { key: 'priority',             label: 'Priority',           importable: true },
  { key: 'enquirySource',        label: 'Source',             importable: true },
  { key: 'businessCategory',     label: 'Business Category',  importable: true },
  { key: 'businessSubCategory',  label: 'Sub-Category',       importable: true },
  { key: 'product',              label: 'Product',            importable: true },
  { key: 'category',             label: 'Category',           importable: true },
  { key: 'subject',              label: 'Subject',            importable: true },
  { key: 'description',          label: 'Description',        importable: true },
  { key: 'tags',                 label: 'Tags',                importable: true },
  { key: 'slaMet',               label: 'SLA',                importable: false },
  { key: 'distributor',          label: 'Distributor',        importable: false },
  { key: 'dealer',               label: 'Dealer',             importable: false },
  { key: 'assignedTo',           label: 'Assigned To',        importable: false },
  { key: 'createdAt',            label: 'Created At',         importable: false },
]

export function exportEnquiryListRows(rows: ExportEnquiryRow[], filename = 'enquiries.csv'): void {
  const headerLine = ENQUIRY_CSV_COLUMNS.map((c) => escapeCsv(c.label)).join(',')
  const dataLines   = rows.map((row) => ENQUIRY_CSV_COLUMNS.map((c) => escapeCsv(row[c.key])).join(','))
  const csv = [headerLine, ...dataLines].join('\n')
  triggerCsvDownload(csv, filename)
}

export function triggerCsvDownload(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
