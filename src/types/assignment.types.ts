import type { Types } from 'mongoose'

// ── Enums ─────────────────────────────────────────────────────────────────────

export enum AssignmentType {
  Auto       = 'auto',
  Manual     = 'manual',
  Reassigned = 'reassigned',
}

export enum AssignmentStatus {
  Active     = 'active',
  Superseded = 'superseded', // replaced by a newer assignment for the same enquiry
  Released   = 'released',   // staff released without immediate replacement
}

export enum ZoneMatchTier {
  Pincode  = 'pincode',  // exact 5-digit match
  District = 'district', // district-level fallback
  City     = 'city',     // city-level fallback
  Global   = 'global',   // no zone found — any available staff
}

// ── Location Zone ─────────────────────────────────────────────────────────────

export interface ILocationZone {
  _id:         Types.ObjectId
  name:        string
  code:        string          // slug, e.g. "KL-CENTRAL" — unique
  description?: string
  pincodes:    string[]        // exact matches, e.g. ["50000","50480"]
  districts:   string[]        // normalised lowercase, e.g. ["cheras","ampang"]
  cities:      string[]        // normalised lowercase, e.g. ["kuala lumpur"]
  maxCapacity: number          // total concurrent enquiries the zone handles
  isActive:    boolean
  managerId?:  Types.ObjectId  // optional zone manager (User ref)
  createdAt:   Date
  updatedAt:   Date
}

// ── Assignment ────────────────────────────────────────────────────────────────

export interface IAssignment {
  _id:                   Types.ObjectId
  enquiryId:             Types.ObjectId
  staffId:               Types.ObjectId
  zoneId?:               Types.ObjectId   // zone resolved during assignment (null = manual/global)
  assignedById:          Types.ObjectId   // actor who triggered the assignment
  type:                  AssignmentType
  status:                AssignmentStatus
  matchTier?:            ZoneMatchTier    // how the zone was found
  reason?:               string           // manual/reassign justification
  previousAssignmentId?: Types.ObjectId   // chain pointer for reassignments
  assignedAt:            Date
  releasedAt?:           Date
  releasedReason?:       string
  createdAt:             Date
  updatedAt:             Date
}

// ── Service layer DTOs ────────────────────────────────────────────────────────

export interface AutoAssignParams {
  enquiryId:   string
  pincode:     string
  city?:       string
  district?:   string
  actorId:     string // system/manager id triggering auto-assign
}

export interface ManualAssignParams {
  enquiryId: string
  staffId:   string
  actorId:   string
  reason?:   string
}

export interface ReassignParams {
  enquiryId: string
  staffId:   string  // new staff
  actorId:   string
  reason:    string  // required for audit
}

export interface ReleaseParams {
  enquiryId:     string
  actorId:       string
  releasedReason: string
}

// ── Resolution result ─────────────────────────────────────────────────────────

export interface ZoneResolution {
  zone:      ILocationZone | null
  matchTier: ZoneMatchTier
}

export interface StaffResolution {
  staffId:  Types.ObjectId
  zoneId?:  Types.ObjectId
  tier:     ZoneMatchTier
}

// ── History item (populated) ──────────────────────────────────────────────────

export interface AssignmentHistoryItem {
  _id:        string
  enquiryId:  string
  staff:      { _id: string; name: string; email: string }
  assignedBy: { _id: string; name: string }
  zone?:      { _id: string; name: string; code: string }
  type:       AssignmentType
  status:     AssignmentStatus
  matchTier?: ZoneMatchTier
  reason?:    string
  releasedAt?: string
  releasedReason?: string
  assignedAt: string
  createdAt:  string
}
