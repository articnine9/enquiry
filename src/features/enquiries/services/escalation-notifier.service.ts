import Enquiry from '@/lib/db/models/Enquiry'
import User from '@/lib/db/models/User'
import { createNotification, createNotifications } from '@/features/notifications/actions/notification.actions'
import { getEscalationTier } from '@/lib/escalation'
import { NotificationType, EntityType, UserRole, UserStatus } from '@/types/enums'

export interface EscalationCandidate {
  _id:          unknown
  enquiryNo:    string
  customerName: string
  assignedTo?:  unknown
  status:       string
  leadStage?:   string
  lastActionAt?: Date | string | null
  escalationNotifiedTier?: string | null
}

/**
 * Lazy escalation sweep — no cron exists in this app, so this runs as a
 * best-effort side effect whenever the enquiry list or detail is loaded (see
 * getEnquiries / getEnquiryById). Notifies exactly once per tier crossing,
 * guarded by Enquiry.escalationNotifiedTier so re-viewing the same page never
 * re-notifies. Never throws — a failed sweep shouldn't break the page render.
 */
export async function checkAndNotifyEscalations(enquiries: EscalationCandidate[]): Promise<void> {
  const now = new Date()
  const toNotifyReminder: EscalationCandidate[] = []
  const toNotifyEscalated: EscalationCandidate[] = []

  for (const e of enquiries) {
    const tier = getEscalationTier({
      lastActionAt: e.lastActionAt,
      assignedTo:   e.assignedTo,
      status:       e.status,
      leadStage:    e.leadStage,
      now,
    })
    if (tier === 'reminder' && !e.escalationNotifiedTier) {
      toNotifyReminder.push(e)
    } else if (tier === 'escalated' && e.escalationNotifiedTier !== 'escalated') {
      toNotifyEscalated.push(e)
    }
  }

  if (toNotifyReminder.length === 0 && toNotifyEscalated.length === 0) return

  try {
    for (const e of toNotifyReminder) {
      await createNotification({
        recipientId: String(e.assignedTo),
        type:        NotificationType.LeadReminder,
        title:       'Lead needs attention',
        body:        `${e.enquiryNo} — ${e.customerName} has had no action for over 24 hours.`,
        entityType:  EntityType.Enquiry,
        entityId:    String(e._id),
      })
    }

    if (toNotifyEscalated.length > 0) {
      const managers = await User.find({
        role:   { $in: [UserRole.Manager, UserRole.SuperAdmin] },
        status: UserStatus.Active,
      }).select('_id').lean()

      const inputs = toNotifyEscalated.flatMap((e) =>
        managers.map((m) => ({
          recipientId: String(m._id),
          type:        NotificationType.LeadEscalated,
          title:       'Lead escalated — no action for 48+ hours',
          body:        `${e.enquiryNo} — ${e.customerName} is assigned but untouched for over 48 hours.`,
          entityType:  EntityType.Enquiry,
          entityId:    String(e._id),
        }))
      )
      await createNotifications(inputs)
    }

    const reminderIds  = toNotifyReminder.map((e) => e._id)
    const escalatedIds = toNotifyEscalated.map((e) => e._id)
    if (reminderIds.length)  await Enquiry.updateMany({ _id: { $in: reminderIds } },  { $set: { escalationNotifiedTier: 'reminder' } })
    if (escalatedIds.length) await Enquiry.updateMany({ _id: { $in: escalatedIds } }, { $set: { escalationNotifiedTier: 'escalated' } })
  } catch (err) {
    console.error('Escalation notification sweep failed:', err)
  }
}
