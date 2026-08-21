'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  X, Upload, Download, Loader2, CheckCircle2, XCircle, FileWarning,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { parseCsvToRecords } from '../utils/csv-parse'
import { ENQUIRY_CSV_COLUMNS, triggerCsvDownload } from '../utils/csv-export'
import {
  previewEnquiryImportAction, importEnquiriesAction, type ImportRowResult,
} from '../actions/enquiry.actions'

type Stage = 'pick' | 'previewing' | 'preview' | 'importing' | 'done'

interface ImportEnquiriesModalProps {
  onClose: () => void
}

function downloadTemplate() {
  const importable = ENQUIRY_CSV_COLUMNS.filter((c) => c.importable)
  const header = importable.map((c) => c.label).join(',')
  triggerCsvDownload(header, 'enquiries-import-template.csv')
}

export default function ImportEnquiriesModal({ onClose }: ImportEnquiriesModalProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [stage,      setStage]      = useState<Stage>('pick')
  const [fileName,   setFileName]   = useState('')
  const [records,    setRecords]    = useState<Record<string, string>[]>([])
  const [rows,       setRows]       = useState<ImportRowResult[]>([])
  const [error,      setError]      = useState<string | null>(null)

  const validCount   = rows.filter((r) => r.ok).length
  const invalidCount = rows.length - validCount

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    setFileName(file.name)

    const text = await file.text()
    const parsed = parseCsvToRecords(text)
    setRecords(parsed)

    setStage('previewing')
    const result = await previewEnquiryImportAction(parsed)
    if (!result.ok) {
      setError(result.error)
      setStage('pick')
      return
    }
    setRows(result.data)
    setStage('preview')
  }

  async function handleImport() {
    setStage('importing')
    const result = await importEnquiriesAction(records)
    if (!result.ok) {
      setError(result.error)
      setStage('preview')
      return
    }
    setRows(result.data)
    setStage('done')
  }

  function handleFinish() {
    router.refresh()
    onClose()
  }

  const createdCount = rows.filter((r) => r.ok && r.enquiryNo).length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 overflow-y-auto">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xl my-8">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-white">
            Import Enquiries
          </h2>
          <button type="button" onClick={onClose} className="w-7 h-7 rounded flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-400">
              {error}
            </div>
          )}

          {/* ── Step 1: pick a file ─────────────────────────────────────────── */}
          {(stage === 'pick' || stage === 'previewing') && (
            <div className="space-y-4">
              <button
                type="button"
                onClick={downloadTemplate}
                className="inline-flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                <Download className="w-3.5 h-3.5" />
                Download CSV template
              </button>

              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center gap-2 py-10 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 cursor-pointer transition-colors"
              >
                {stage === 'previewing' ? (
                  <>
                    <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                    <p className="text-sm text-slate-500">Validating {fileName}…</p>
                  </>
                ) : (
                  <>
                    <Upload className="w-6 h-6 text-slate-400" />
                    <p className="text-sm text-slate-600 dark:text-slate-300">Click to choose a CSV file</p>
                    <p className="text-xs text-slate-400">Same column layout as Export — up to 500 rows</p>
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileChange}
                  disabled={stage === 'previewing'}
                  className="hidden"
                />
              </div>
            </div>
          )}

          {/* ── Step 2: preview ─────────────────────────────────────────────── */}
          {(stage === 'preview' || stage === 'importing') && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 text-sm">
                <span className="inline-flex items-center gap-1.5 text-green-700 dark:text-green-400">
                  <CheckCircle2 className="w-4 h-4" /> {validCount} valid
                </span>
                {invalidCount > 0 && (
                  <span className="inline-flex items-center gap-1.5 text-red-600 dark:text-red-400">
                    <FileWarning className="w-4 h-4" /> {invalidCount} will be skipped
                  </span>
                )}
                <span className="text-slate-400">· {fileName}</span>
              </div>

              <RowPreviewTable rows={rows} />
            </div>
          )}

          {/* ── Step 3: done ────────────────────────────────────────────────── */}
          {stage === 'done' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
                <CheckCircle2 className="w-5 h-5" />
                Created {createdCount} enquir{createdCount === 1 ? 'y' : 'ies'}
                {invalidCount > 0 && <span className="text-slate-500 dark:text-slate-400"> · {invalidCount} skipped</span>}
              </div>
              <RowPreviewTable rows={rows} />
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-slate-100 dark:border-slate-800">
          {stage === 'preview' && (
            <>
              <button type="button" onClick={onClose} className="h-9 px-4 rounded-lg text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                Cancel
              </button>
              <button
                type="button"
                onClick={handleImport}
                disabled={validCount === 0}
                className="h-9 px-5 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 transition-colors"
              >
                Import {validCount} row{validCount === 1 ? '' : 's'}
              </button>
            </>
          )}
          {stage === 'importing' && (
            <button type="button" disabled className="h-9 px-5 rounded-lg text-sm font-medium bg-indigo-600 text-white opacity-50 flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Importing…
            </button>
          )}
          {stage === 'done' && (
            <button type="button" onClick={handleFinish} className="h-9 px-5 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white transition-colors">
              Done
            </button>
          )}
          {(stage === 'pick' || stage === 'previewing') && (
            <button type="button" onClick={onClose} className="h-9 px-4 rounded-lg text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Row preview/result table ────────────────────────────────────────────────

function RowPreviewTable({ rows }: { rows: ImportRowResult[] }) {
  if (rows.length === 0) return null
  return (
    <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
      <div className="max-h-72 overflow-y-auto">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 dark:bg-slate-800/60 sticky top-0">
            <tr>
              <th className="text-left px-3 py-2 font-semibold text-slate-500">#</th>
              <th className="text-left px-3 py-2 font-semibold text-slate-500">Customer</th>
              <th className="text-left px-3 py-2 font-semibold text-slate-500">Phone</th>
              <th className="text-left px-3 py-2 font-semibold text-slate-500">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {rows.map((r) => (
              <tr key={r.rowIndex} className={cn(!r.ok && 'bg-red-50/50 dark:bg-red-950/20')}>
                <td className="px-3 py-2 text-slate-400">{r.rowIndex}</td>
                <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{r.customerName}</td>
                <td className="px-3 py-2 text-slate-500">{r.phone || '—'}</td>
                <td className="px-3 py-2">
                  {r.ok ? (
                    r.enquiryNo ? (
                      <span className="inline-flex items-center gap-1 text-green-700 dark:text-green-400">
                        <CheckCircle2 className="w-3.5 h-3.5" /> {r.enquiryNo}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-green-700 dark:text-green-400">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Valid
                      </span>
                    )
                  ) : (
                    <span className="inline-flex items-start gap-1 text-red-600 dark:text-red-400">
                      <XCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span>{r.errors.join('; ')}</span>
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
