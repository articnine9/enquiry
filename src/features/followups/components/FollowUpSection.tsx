/**
 * RSC wrapper — fetches follow-up data on the server then hands it
 * to the client-side FollowUpTimeline component.
 *
 * Usage (inside an enquiry detail page):
 *   <FollowUpSection enquiryId={id} canCreate canEdit />
 */

import { getFollowUpsForEnquiry } from '../actions/followup.actions'
import FollowUpTimeline from './FollowUpTimeline'

interface FollowUpSectionProps {
  enquiryId:  string
  canCreate?: boolean
  canEdit?:   boolean
}

export default async function FollowUpSection({
  enquiryId,
  canCreate = true,
  canEdit   = true,
}: FollowUpSectionProps) {
  const result = await getFollowUpsForEnquiry(enquiryId)
  const items  = result.ok ? result.data : []

  return (
    <FollowUpTimeline
      enquiryId={enquiryId}
      initialItems={items as never}
      canCreate={canCreate}
      canEdit={canEdit}
    />
  )
}
