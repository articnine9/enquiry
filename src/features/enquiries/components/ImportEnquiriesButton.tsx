'use client'

import { useState } from 'react'
import { Upload } from 'lucide-react'
import ImportEnquiriesModal from './ImportEnquiriesModal'

export default function ImportEnquiriesButton() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-medium transition-colors"
      >
        <Upload className="w-4 h-4" />
        Import
      </button>

      {isOpen && <ImportEnquiriesModal onClose={() => setIsOpen(false)} />}
    </>
  )
}
