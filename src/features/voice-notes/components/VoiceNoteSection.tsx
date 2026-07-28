/**
 * RSC wrapper — fetches voice-note data on the server then hands it
 * to the client-side VoiceNoteTimeline component.
 *
 * Usage (inside an enquiry detail page):
 *   <VoiceNoteSection enquiryId={id} canRecord />
 */

import { getVoiceNotesForEnquiry } from '../actions/voiceNote.actions'
import VoiceNoteTimeline from './VoiceNoteTimeline'

interface VoiceNoteSectionProps {
  enquiryId:  string
  canRecord?: boolean
}

export default async function VoiceNoteSection({
  enquiryId,
  canRecord = true,
}: VoiceNoteSectionProps) {
  const result = await getVoiceNotesForEnquiry(enquiryId)
  const items  = result.ok ? result.data : []

  return (
    <VoiceNoteTimeline
      enquiryId={enquiryId}
      initialItems={items}
      canRecord={canRecord}
    />
  )
}
