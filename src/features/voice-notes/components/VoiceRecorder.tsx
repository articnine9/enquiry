'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { Mic, Square, RotateCcw, Send, Loader2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { createVoiceNoteAction, type VoiceNoteRow } from '../actions/voiceNote.actions'

const MAX_SECONDS = 180

interface VoiceRecorderProps {
  enquiryId:  string
  onRecorded: (note: VoiceNoteRow) => void
}

type Phase = 'idle' | 'recording' | 'preview'

export default function VoiceRecorder({ enquiryId, onRecorded }: VoiceRecorderProps) {
  const [phase,   setPhase]   = useState<Phase>('idle')
  const [seconds, setSeconds] = useState(0)
  const [caption, setCaption] = useState('')
  const [error,   setError]   = useState<string | null>(null)
  const [blob,       setBlob]       = useState<Blob | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef        = useRef<Blob[]>([])
  const streamRef        = useRef<MediaStream | null>(null)
  const timerRef         = useRef<ReturnType<typeof setInterval> | null>(null)
  const fileInputRef     = useRef<HTMLInputElement>(null)

  const [state, formAction, isPending] = useActionState(createVoiceNoteAction, null)

  useEffect(() => {
    if (!state) return
    if (state.ok) {
      toast.success('Voice report added')
      onRecorded(state.data)
      reset()
    } else {
      toast.error(state.error)
    }
  }, [state]) // eslint-disable-line react-hooks/exhaustive-deps

  // Release the mic / clean up on unmount
  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current)
    streamRef.current?.getTracks().forEach((t) => t.stop())
    if (previewUrl) URL.revokeObjectURL(previewUrl)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function reset() {
    setPhase('idle')
    setSeconds(0)
    setCaption('')
    setBlob(null)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
  }

  async function startRecording() {
    setError(null)

    if (!window.isSecureContext) {
      setError('Recording requires HTTPS (or localhost) — this page was loaded over an insecure connection')
      return
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('This browser does not support microphone recording')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']
        .find((t) => window.MediaRecorder?.isTypeSupported?.(t)) ?? ''
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
      chunksRef.current = []

      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      recorder.onstop = () => {
        const recordedBlob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' })
        setBlob(recordedBlob)
        setPreviewUrl(URL.createObjectURL(recordedBlob))
        setPhase('preview')
        stream.getTracks().forEach((t) => t.stop())
      }

      mediaRecorderRef.current = recorder
      recorder.start()
      setPhase('recording')
      setSeconds(0)

      timerRef.current = setInterval(() => {
        setSeconds((s) => {
          if (s + 1 >= MAX_SECONDS) {
            stopRecording()
            return MAX_SECONDS
          }
          return s + 1
        })
      }, 1000)
    } catch (err) {
      setError(describeMicError(err))
    }
  }

  function stopRecording() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    mediaRecorderRef.current?.stop()
  }

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-selecting the same file later
    if (!file) return

    setError(null)
    if (!file.type.startsWith('audio/')) {
      setError('Please choose an audio file')
      return
    }

    const url   = URL.createObjectURL(file)
    const probe = new Audio()
    probe.preload = 'metadata'
    probe.src = url

    const useDuration = (raw: number) => {
      const dur = Number.isFinite(raw) ? Math.round(raw) : 0
      if (dur > MAX_SECONDS) {
        setError('That recording is longer than 3 minutes — please choose a shorter clip')
        URL.revokeObjectURL(url)
        return
      }
      setBlob(file)
      setPreviewUrl(url)
      setSeconds(Math.max(dur, 1))
      setPhase('preview')
    }

    probe.onloadedmetadata = () => useDuration(probe.duration)
    // Some browsers report Infinity until a seek — fall back once duration settles.
    probe.ondurationchange = () => {
      if (Number.isFinite(probe.duration)) useDuration(probe.duration)
    }
  }

  function handleSubmit() {
    if (!blob) return
    const ext  = (blob.type.split('/')[1] || 'webm').split(';')[0]
    const file = new File([blob], `voice-note.${ext}`, { type: blob.type })

    const fd = new FormData()
    fd.set('enquiryId', enquiryId)
    fd.set('durationSeconds', String(seconds))
    if (caption.trim()) fd.set('caption', caption.trim())
    fd.set('audio', file)

    formAction(fd)
  }

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0')
  const ss = String(seconds % 60).padStart(2, '0')

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 bg-slate-50 dark:bg-slate-800/50">
      {error && <p className="text-xs text-red-600 dark:text-red-400 mb-2">{error}</p>}

      {phase === 'idle' && (
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={startRecording}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors shadow-sm"
          >
            <Mic className="w-4 h-4" />
            Record work report
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            Upload a recording
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            onChange={handleFileSelected}
            className="hidden"
          />
        </div>
      )}

      {phase === 'recording' && (
        <div className="flex items-center gap-3">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
          </span>
          <span className="text-sm font-mono tabular-nums text-slate-700 dark:text-slate-300">
            {mm}:{ss} / 03:00
          </span>
          <button
            type="button"
            onClick={stopRecording}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-800 text-white text-xs font-medium transition-colors ml-auto"
          >
            <Square className="w-3.5 h-3.5" />
            Stop
          </button>
        </div>
      )}

      {phase === 'preview' && previewUrl && (
        <div className="space-y-3">
          <audio controls src={previewUrl} className="w-full h-9" />
          <input
            type="text"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Add a short caption (optional)"
            maxLength={500}
            disabled={isPending}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
          />
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={reset}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Re-record
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium disabled:opacity-60 transition-colors shadow-sm"
            >
              {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              {isPending ? 'Uploading…' : 'Submit report'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function describeMicError(err: unknown): string {
  const name = err instanceof DOMException ? err.name : undefined
  switch (name) {
    case 'NotAllowedError':
      return 'Microphone access was denied. If you already allowed it for this site, check your OS-level microphone privacy settings (another app or Windows may be blocking browser access).'
    case 'NotFoundError':
      return 'No microphone was found on this device.'
    case 'NotReadableError':
      return 'The microphone is already in use by another application.'
    case 'SecurityError':
      return 'Recording requires HTTPS (or localhost).'
    default:
      return `Microphone access failed${name ? ` (${name})` : ''}. Please check your browser and OS microphone permissions.`
  }
}
