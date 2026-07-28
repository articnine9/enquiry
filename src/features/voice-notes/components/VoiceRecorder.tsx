'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { Mic, Trash2, Check, RotateCcw, Send, Loader2, Upload, Paperclip } from 'lucide-react'
import { toast } from 'sonner'
import { createVoiceNoteAction, type VoiceNoteRow } from '../actions/voiceNote.actions'

const MAX_SECONDS  = 180
const WAVE_BARS    = 32

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
  const [levels,  setLevels]  = useState<number[]>(() => Array(WAVE_BARS).fill(0.08))

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef        = useRef<Blob[]>([])
  const streamRef        = useRef<MediaStream | null>(null)
  const timerRef         = useRef<ReturnType<typeof setInterval> | null>(null)
  const fileInputRef     = useRef<HTMLInputElement>(null)
  const cancelledRef     = useRef(false)

  const audioCtxRef  = useRef<AudioContext | null>(null)
  const analyserRef  = useRef<AnalyserNode | null>(null)
  const rafRef        = useRef<number | null>(null)

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
    stopWaveform()
    if (timerRef.current) clearInterval(timerRef.current)
    streamRef.current?.getTracks().forEach((t) => t.stop())
    if (previewUrl) URL.revokeObjectURL(previewUrl)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function reset() {
    setPhase('idle')
    setSeconds(0)
    setCaption('')
    setBlob(null)
    setLevels(Array(WAVE_BARS).fill(0.08))
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
  }

  function startWaveform(stream: MediaStream) {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return
    const audioCtx = new Ctx()
    const source   = audioCtx.createMediaStreamSource(stream)
    const analyser = audioCtx.createAnalyser()
    analyser.fftSize = 256
    source.connect(analyser)
    audioCtxRef.current = audioCtx
    analyserRef.current = analyser

    const data = new Uint8Array(analyser.fftSize)
    const tick = () => {
      analyser.getByteTimeDomainData(data)
      let sum = 0
      for (let i = 0; i < data.length; i++) {
        const v = (data[i] - 128) / 128
        sum += v * v
      }
      const level = Math.min(1, Math.sqrt(sum / data.length) * 4)
      setLevels((prev) => [...prev.slice(1), Math.max(0.08, level)])
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
  }

  function stopWaveform() {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null }
    analyserRef.current = null
    if (audioCtxRef.current) { audioCtxRef.current.close().catch(() => {}); audioCtxRef.current = null }
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
      cancelledRef.current = false

      const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']
        .find((t) => window.MediaRecorder?.isTypeSupported?.(t)) ?? ''
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
      chunksRef.current = []

      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop())
        stopWaveform()
        if (cancelledRef.current) {
          reset()
          return
        }
        const recordedBlob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' })
        setBlob(recordedBlob)
        setPreviewUrl(URL.createObjectURL(recordedBlob))
        setPhase('preview')
      }

      mediaRecorderRef.current = recorder
      recorder.start()
      startWaveform(stream)
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

  function cancelRecording() {
    cancelledRef.current = true
    stopRecording()
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
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={startRecording}
            aria-label="Record work report"
            className="flex-shrink-0 w-11 h-11 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center shadow-sm transition-colors"
          >
            <Mic className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Record a voice work report</p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1 mt-0.5 text-xs text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              <Paperclip className="w-3 h-3" />
              or attach an existing recording
            </button>
          </div>
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
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={cancelRecording}
            aria-label="Cancel recording"
            className="flex-shrink-0 w-9 h-9 rounded-full text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center justify-center transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <div className="flex-1 min-w-0 flex items-center gap-2.5 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 pl-3 pr-1 py-1.5">
            <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
            </span>
            <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400 flex-shrink-0">
              {mm}:{ss}
            </span>
            <div className="flex-1 flex items-center gap-[2px] h-6 overflow-hidden">
              {levels.map((lvl, i) => (
                <span
                  key={i}
                  className="flex-1 min-w-[2px] rounded-full bg-emerald-500/70 dark:bg-emerald-400/70"
                  style={{ height: `${Math.round(lvl * 100)}%` }}
                />
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={stopRecording}
            aria-label="Finish recording"
            className="flex-shrink-0 w-9 h-9 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center shadow-sm transition-colors"
          >
            <Check className="w-4 h-4" />
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
