// ─────────────────────────────────────────────────────────────────────────────
// Shared enums — single source of truth for all schemas and UI
// ─────────────────────────────────────────────────────────────────────────────

export enum UserRole {
  SuperAdmin = 'super_admin',
  Manager    = 'manager',
  Staff      = 'staff',
}

export enum UserStatus {
  Active   = 'active',
  Inactive = 'inactive',
  Suspended = 'suspended',
}

export enum EnquiryStatus {
  New        = 'new',
  Assigned   = 'assigned',
  InProgress = 'in_progress',
  FollowUp   = 'follow_up',
  Resolved   = 'resolved',
  Closed     = 'closed',
  Cancelled  = 'cancelled',
}

export enum EnquiryPriority {
  Low    = 'low',
  Medium = 'medium',
  High   = 'high',
  Urgent = 'urgent',
}

export enum EnquirySource {
  Web     = 'web',
  Call    = 'call',
  WalkIn  = 'walk_in',
  Email   = 'email',
  WhatsApp = 'whatsapp',
  Referral = 'referral',
}

export enum EnquiryCategory {
  General      = 'general',
  Sales        = 'sales',
  Support      = 'support',
  Complaint    = 'complaint',
  Billing      = 'billing',
  Technical    = 'technical',
  Partnership  = 'partnership',
}

export enum AssignmentType {
  Auto   = 'auto',
  Manual = 'manual',
}

export enum FollowUpType {
  Call    = 'call',
  Email   = 'email',
  Visit   = 'visit',
  Chat    = 'chat',
  Meeting = 'meeting',
}

export enum FollowUpOutcome {
  Contacted         = 'contacted',
  NoAnswer          = 'no_answer',
  CallbackRequested = 'callback_requested',
  Resolved          = 'resolved',
  Escalated         = 'escalated',
  Rescheduled       = 'rescheduled',
  NotInterested     = 'not_interested',
  LeftVoicemail     = 'left_voicemail',
}

export enum FollowUpStatus {
  Scheduled = 'scheduled',
  Completed = 'completed',
  Missed    = 'missed',
  Cancelled = 'cancelled',
}

// ── FollowUp display labels ───────────────────────────────────────────────────

export const FOLLOW_UP_TYPE_LABELS: Record<FollowUpType, string> = {
  [FollowUpType.Call]:    'Phone Call',
  [FollowUpType.Email]:   'Email',
  [FollowUpType.Visit]:   'Site Visit',
  [FollowUpType.Chat]:    'Live Chat',
  [FollowUpType.Meeting]: 'Meeting',
}

export const FOLLOW_UP_OUTCOME_LABELS: Record<FollowUpOutcome, string> = {
  [FollowUpOutcome.Contacted]:         'Contacted',
  [FollowUpOutcome.NoAnswer]:          'No Answer',
  [FollowUpOutcome.CallbackRequested]: 'Callback Requested',
  [FollowUpOutcome.Resolved]:          'Resolved',
  [FollowUpOutcome.Escalated]:         'Escalated',
  [FollowUpOutcome.Rescheduled]:       'Rescheduled',
  [FollowUpOutcome.NotInterested]:     'Not Interested',
  [FollowUpOutcome.LeftVoicemail]:     'Left Voicemail',
}

export const FOLLOW_UP_STATUS_LABELS: Record<FollowUpStatus, string> = {
  [FollowUpStatus.Scheduled]: 'Scheduled',
  [FollowUpStatus.Completed]: 'Completed',
  [FollowUpStatus.Missed]:    'Missed',
  [FollowUpStatus.Cancelled]: 'Cancelled',
}

export enum ActivityAction {
  // Enquiry actions
  EnquiryCreated    = 'enquiry.created',
  EnquiryUpdated    = 'enquiry.updated',
  EnquiryAssigned   = 'enquiry.assigned',
  EnquiryReassigned = 'enquiry.reassigned',
  EnquiryResolved   = 'enquiry.resolved',
  EnquiryClosed     = 'enquiry.closed',
  EnquiryCancelled  = 'enquiry.cancelled',
  StatusChanged     = 'enquiry.status_changed',
  PriorityChanged   = 'enquiry.priority_changed',
  // Follow-up actions
  FollowUpCreated   = 'followup.created',
  FollowUpCompleted = 'followup.completed',
  FollowUpUpdated   = 'followup.updated',
  FollowUpMissed    = 'followup.missed',
  // Call actions
  CallMade          = 'call.made',
  CallReceived      = 'call.received',
  // Note actions
  NoteAdded         = 'note.added',
  // User actions
  UserCreated       = 'user.created',
  UserUpdated       = 'user.updated',
  UserDeactivated   = 'user.deactivated',
  LoginSuccess      = 'auth.login_success',
  LoginFailed       = 'auth.login_failed',
  Logout            = 'auth.logout',
  // Session actions
  SessionStarted    = 'session.started',
  SessionEnded      = 'session.ended',
}

export enum EntityType {
  Enquiry   = 'enquiry',
  FollowUp  = 'followup',
  User      = 'user',
  Assignment = 'assignment',
  Session    = 'session',
}

export enum NotificationType {
  Assigned         = 'assigned',
  Reassigned       = 'reassigned',
  FollowUpDue      = 'followup_due',
  StatusChanged    = 'status_changed',
  EnquiryResolved  = 'enquiry_resolved',
  MentionedInNote  = 'mentioned_in_note',
  SystemAlert      = 'system_alert',
}

export enum NotificationChannel {
  InApp = 'in_app',
  Email = 'email',
  SMS   = 'sms',
}

// ── Enquiry-specific enums (extended from base EnquirySource/Priority/Status) ─

export enum EnquiryProduct {
  ProductA     = 'product_a',
  ProductB     = 'product_b',
  ProductC     = 'product_c',
  ServicePlan  = 'service_plan',
  Consultation = 'consultation',
  Other        = 'other',
}

// UI display labels — consumed by forms and badge components
export const ENQUIRY_STATUS_LABELS: Record<EnquiryStatus, string> = {
  [EnquiryStatus.New]:        'New',
  [EnquiryStatus.Assigned]:   'Assigned',
  [EnquiryStatus.InProgress]: 'In Progress',
  [EnquiryStatus.FollowUp]:   'Follow Up',
  [EnquiryStatus.Resolved]:   'Resolved',
  [EnquiryStatus.Closed]:     'Closed',
  [EnquiryStatus.Cancelled]:  'Cancelled',
}

export const ENQUIRY_PRIORITY_LABELS: Record<EnquiryPriority, string> = {
  [EnquiryPriority.Low]:    'Low',
  [EnquiryPriority.Medium]: 'Medium',
  [EnquiryPriority.High]:   'High',
  [EnquiryPriority.Urgent]: 'Urgent',
}

export const ENQUIRY_SOURCE_LABELS: Record<EnquirySource, string> = {
  [EnquirySource.Web]:      'Website',
  [EnquirySource.Call]:     'Phone Call',
  [EnquirySource.WalkIn]:   'Walk-In',
  [EnquirySource.Email]:    'Email',
  [EnquirySource.WhatsApp]: 'WhatsApp',
  [EnquirySource.Referral]: 'Referral',
}

export const ENQUIRY_PRODUCT_LABELS: Record<EnquiryProduct, string> = {
  [EnquiryProduct.ProductA]:     'Product A',
  [EnquiryProduct.ProductB]:     'Product B',
  [EnquiryProduct.ProductC]:     'Product C',
  [EnquiryProduct.ServicePlan]:  'Service Plan',
  [EnquiryProduct.Consultation]: 'Consultation',
  [EnquiryProduct.Other]:        'Other',
}

// FSM: allowed status transitions — mirrored from Enquiry model for UI use
export const ALLOWED_TRANSITIONS: Partial<Record<EnquiryStatus, EnquiryStatus[]>> = {
  [EnquiryStatus.New]:        [EnquiryStatus.Assigned,   EnquiryStatus.Cancelled],
  [EnquiryStatus.Assigned]:   [EnquiryStatus.InProgress, EnquiryStatus.Cancelled],
  [EnquiryStatus.InProgress]: [EnquiryStatus.FollowUp,   EnquiryStatus.Resolved,  EnquiryStatus.Cancelled],
  [EnquiryStatus.FollowUp]:   [EnquiryStatus.InProgress, EnquiryStatus.Resolved,  EnquiryStatus.Cancelled],
  [EnquiryStatus.Resolved]:   [EnquiryStatus.Closed,     EnquiryStatus.InProgress],
  [EnquiryStatus.Closed]:     [],
  [EnquiryStatus.Cancelled]:  [],
}
