/**
 * RSC wrapper — fetches voice-note data on the server then hands it
 * to the client-side VoiceNoteTimeline component.
 *
 * Usage — attach to exactly one parent record:
 *   <VoiceNoteSection enquiryId={id} canRecord />
 *   <VoiceNoteSection complaintId={id} canRecord />
 */

import { getVoiceNotesForEnquiry, getVoiceNotesForComplaint } from '../actions/voiceNote.actions'
import VoiceNoteTimeline from './VoiceNoteTimeline'

interface VoiceNoteSectionProps {
  enquiryId?:   string
  complaintId?: string
  canRecord?:   boolean
}

export default async function VoiceNoteSection({
  enquiryId,
  complaintId,
  canRecord = true,
}: VoiceNoteSectionProps) {
  const result = enquiryId
    ? await getVoiceNotesForEnquiry(enquiryId)
    : await getVoiceNotesForComplaint(complaintId!)
  const items = result.ok ? result.data : []

  return (
    <VoiceNoteTimeline
      enquiryId={enquiryId}
      complaintId={complaintId}
      initialItems={items}
      canRecord={canRecord}
    />
  )
}
