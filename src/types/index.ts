import type { Document, Types } from 'mongoose'
import type {
  UserRole, UserStatus, EnquiryStatus, EnquiryPriority, EnquirySource,
  EnquiryCategory, AssignmentType, FollowUpType, FollowUpOutcome,
  ActivityAction, EntityType, NotificationType, NotificationChannel,
} from './enums'

// ─────────────────────────────────────────────────────────────────────────────
// Shared sub-document interfaces
// ─────────────────────────────────────────────────────────────────────────────

export interface IAddress {
  line1:    string
  line2?:   string
  city:     string
  state:    string
  country:  string
  postcode: string
}

export interface IGeoPoint {
  type:        'Point'
  coordinates: [number, number] // [longitude, latitude]
}

export interface IAttachment {
  fileName:    string
  url:         string
  mimeType:    string
  sizeBytes:   number
  uploadedAt:  Date
  uploadedBy:  Types.ObjectId
}

export interface IPermission {
  resource: string   // e.g. 'enquiry', 'user', 'report'
  actions:  string[] // e.g. ['read', 'create', 'update']
}

// ─────────────────────────────────────────────────────────────────────────────
// Document interfaces (plain data shape — no Mongoose methods)
// ─────────────────────────────────────────────────────────────────────────────

export interface IUser {
  name:          string
  email:         string
  passwordHash:  string
  role:          UserRole
  status:        UserStatus
  locationZoneId?: Types.ObjectId
  avatar?:       string
  phone?:        string
  maxLoad:       number
  currentLoad:   number
  isAvailable:   boolean
  lastLoginAt?:  Date
  createdAt:     Date
  updatedAt:     Date
}

export interface IRole {
  name:        string
  slug:        UserRole
  description: string
  permissions: IPermission[]
  isSystem:    boolean
  createdAt:   Date
  updatedAt:   Date
}

export interface IEnquiry {
  enquiryNo:      string
  customerName:   string
  customerEmail?: string
  customerPhone?: string
  subject:        string
  description:    string
  category:       EnquiryCategory
  priority:       EnquiryPriority
  status:         EnquiryStatus
  source:         EnquirySource
  locationZoneId: Types.ObjectId
  assignedTo?:    Types.ObjectId
  assignedBy?:    Types.ObjectId | 'system'
  assignedAt?:    Date
  tags:           string[]
  attachments:    IAttachment[]
  internalNotes?: string
  resolvedAt?:    Date
  closedAt?:      Date
  createdBy:      Types.ObjectId
  createdAt:      Date
  updatedAt:      Date
}

export interface IAssignment {
  enquiryId:      Types.ObjectId
  assignedTo:     Types.ObjectId
  assignedBy:     Types.ObjectId | 'system'
  assignmentType: AssignmentType
  reason?:        string
  unassignedAt?:  Date
  unassignedBy?:  Types.ObjectId
  isActive:       boolean
  createdAt:      Date
  updatedAt:      Date
}

export interface IFollowUp {
  enquiryId:        Types.ObjectId
  staffId:          Types.ObjectId
  type:             FollowUpType
  notes:            string
  outcome:          FollowUpOutcome
  nextFollowUpDate?: Date
  nextFollowUpType?: FollowUpType
  isDone:           boolean
  doneAt?:          Date
  attachments:      IAttachment[]
  createdAt:        Date
  updatedAt:        Date
}

export interface IActivityLog {
  actorId:    Types.ObjectId
  actorRole:  UserRole
  action:     ActivityAction
  entityType: EntityType
  entityId:   Types.ObjectId
  changes?: {
    before: Record<string, unknown>
    after:  Record<string, unknown>
  }
  metadata?: Record<string, unknown>
  ip?:        string
  userAgent?: string
  createdAt:  Date
}

export interface ILocationZone {
  name:         string
  code:         string
  description?: string
  zones:        string[]
  address:      IAddress
  coordinates:  IGeoPoint
  managerId?:   Types.ObjectId
  isActive:     boolean
  createdAt:    Date
  updatedAt:    Date
}

export interface INotification {
  recipientId:  Types.ObjectId
  type:         NotificationType
  channel:      NotificationChannel
  title:        string
  body:         string
  entityType?:  EntityType
  entityId?:    Types.ObjectId
  isRead:       boolean
  readAt?:      Date
  sentAt?:      Date
  createdAt:    Date
}

// ─────────────────────────────────────────────────────────────────────────────
// Mongoose document types (extend Document for use in models)
// ─────────────────────────────────────────────────────────────────────────────

export type UserDocument          = IUser          & Document
export type RoleDocument          = IRole          & Document
export type EnquiryDocument       = IEnquiry       & Document
export type AssignmentDocument    = IAssignment    & Document
export type FollowUpDocument      = IFollowUp      & Document
export type ActivityLogDocument   = IActivityLog   & Document
export type LocationZoneDocument  = ILocationZone  & Document
export type NotificationDocument  = INotification  & Document
