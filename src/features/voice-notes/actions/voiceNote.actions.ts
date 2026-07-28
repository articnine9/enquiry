'use server'

import { revalidateTag } from 'next/cache'
import dbConnect from '@/lib/db/connection'
import VoiceNote from '@/lib/db/models/VoiceNote'
import ActivityLog from '@/lib/db/models/ActivityLog'
import { requirePermission, authErrorToResult } from '@/lib/auth/session'
import { uploadEnquiryVoiceNote } from '@/lib/storage/supabase'
import { CACHE_TAGS } from '@/lib/cache'
import { ActivityAction, EntityType } from '@/types/enums'
import { CreateVoiceNoteSchema } from '../validations/voiceNote.schema'
import type { ActionResult } from '@/types/api'

function toPlain<T>(v: T): T { return JSON.parse(JSON.stringify(v)) }

// ── Row shape ─────────────────────────────────────────────────────────────────

export interface VoiceNoteRow {
  _id:             string
  enquiryId:       string
  recordedBy:      string
  recordedByName?: string
  audioUrl:        string
  durationSeconds: number
  caption?:        string
  createdAt:       string
}

const POPULATE = [{ path: 'recordedBy', select: 'name email' }]

function mapRow(v: Record<string, unknown>): VoiceNoteRow {
  const staff = v.recordedBy as { _id?: unknown; name?: string } | null

  return {
    _id:             String(v._id),
    enquiryId:       String(v.enquiryId),
    recordedBy:      String(staff?._id ?? v.recordedBy ?? ''),
    recordedByName:  staff?.name,
    audioUrl:        String(v.audioUrl),
    durationSeconds: Number(v.durationSeconds),
    caption:         v.caption as string | undefined,
    createdAt:       String(v.createdAt),
  }
}

// ── Create ────────────────────────────────────────────────────────────────────

export async function createVoiceNoteAction(
  _prev: ActionResult<VoiceNoteRow> | null,
  formData: FormData
): Promise<ActionResult<VoiceNoteRow>> {
  try {
    const session = await requirePermission('voicenote:create')
    await dbConnect()

    const raw = {
      enquiryId:       formData.get('enquiryId'),
      durationSeconds: formData.get('durationSeconds'),
      caption:         formData.get('caption') || undefined,
    }

    const parsed = CreateVoiceNoteSchema.safeParse(raw)
    if (!parsed.success) {
      return {
        ok:          false,
        error:       'Validation failed',
        fieldErrors: parsed.error.flatten().fieldErrors,
      }
    }

    const audio = formData.get('audio')
    if (!(audio instanceof File) || audio.size === 0) {
      return { ok: false, error: 'No recording was captured' }
    }

    let audioUrl: string
    try {
      audioUrl = await uploadEnquiryVoiceNote(audio)
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Recording upload failed' }
    }

    const note = await VoiceNote.create({
      enquiryId:       parsed.data.enquiryId,
      durationSeconds: parsed.data.durationSeconds,
      caption:         parsed.data.caption,
      recordedBy:      session.user.id,
      audioUrl,
    })

    await ActivityLog.create({
      actorId:    session.user.id,
      actorRole:  session.user.role,
      action:     ActivityAction.VoiceNoteLogged,
      entityType: EntityType.VoiceNote,
      entityId:   note._id,
      metadata:   { enquiryId: parsed.data.enquiryId, durationSeconds: parsed.data.durationSeconds },
    })

    revalidateTag(CACHE_TAGS.voiceNotes(parsed.data.enquiryId))

    await note.populate(POPULATE)

    return { ok: true, data: toPlain(mapRow(note.toObject() as unknown as Record<string, unknown>)) }
  } catch (err) {
    return authErrorToResult(err)
  }
}

// ── List ──────────────────────────────────────────────────────────────────────

export async function getVoiceNotesForEnquiry(enquiryId: string): Promise<ActionResult<VoiceNoteRow[]>> {
  try {
    await requirePermission('voicenote:read')
    await dbConnect()

    const docs = await VoiceNote.find({ enquiryId })
      .sort({ createdAt: -1 })
      .populate(POPULATE)
      .lean()

    return { ok: true, data: toPlain(docs.map((d) => mapRow(d as unknown as Record<string, unknown>))) }
  } catch (err) {
    return authErrorToResult(err)
  }
}
