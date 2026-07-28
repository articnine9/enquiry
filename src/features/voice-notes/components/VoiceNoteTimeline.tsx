'use client'

import { useState } from 'react'
import { Mic2 } from 'lucide-react'
import VoiceRecorder from './VoiceRecorder'
import type { VoiceNoteRow } from '../actions/voiceNote.actions'
import { formatDateTime } from '@/lib/utils'

interface VoiceNoteTimelineProps {
  enquiryId:    string
  initialItems: VoiceNoteRow[]
  canRecord?:   boolean
}

export default function VoiceNoteTimeline({
  enquiryId,
  initialItems,
  canRecord = true,
}: VoiceNoteTimelineProps) {
  const [items, setItems] = useState(initialItems)

  function handleRecorded(note: VoiceNoteRow) {
    setItems((prev) => [note, ...prev])
  }

  return (
    <div className="space-y-4">
      {canRecord && <VoiceRecorder enquiryId={enquiryId} onRecorded={handleRecorded} />}

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700">
          <Mic2 className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-2" />
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No voice reports yet</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((note) => (
            <li
              key={note._id}
              className="rounded-xl border border-slate-200 dark:border-slate-700 p-3.5"
            >
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                    {(note.recordedByName ?? '?').charAt(0).toUpperCase()}
                  </div>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                    {note.recordedByName ?? 'Staff'}
                  </p>
                </div>
                <span className="flex-shrink-0 text-xs text-slate-400">
                  {formatDateTime(note.createdAt)} · {formatDuration(note.durationSeconds)}
                </span>
              </div>
              <audio controls src={note.audioUrl} className="w-full h-9" />
              {note.caption && (
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{note.caption}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function formatDuration(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}
