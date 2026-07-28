import { Schema, model, models, type Model, type Types } from 'mongoose'

// ─── VoiceNote ────────────────────────────────────────────────────────────────
// A short spoken work-report a staff member records against an Enquiry.
// Visible to everyone with access to the enquiry (staff + managers) — a
// shared audio log, not a private note.

export interface IVoiceNote {
  _id:             Types.ObjectId
  enquiryId:       Types.ObjectId          // ref Enquiry
  recordedBy:      Types.ObjectId          // ref User — who recorded it
  audioUrl:        string
  durationSeconds: number
  caption?:        string
  createdAt:       Date
  updatedAt:       Date
}

export type VoiceNoteDocument = IVoiceNote

const VoiceNoteSchema = new Schema<VoiceNoteDocument>(
  {
    enquiryId: {
      type:     Schema.Types.ObjectId,
      ref:      'Enquiry',
      required: [true, 'Enquiry reference is required'],
      index:    true,
    },
    recordedBy: {
      type:     Schema.Types.ObjectId,
      ref:      'User',
      required: [true, 'Recording staff member is required'],
    },
    audioUrl: {
      type:     String,
      required: [true, 'Audio URL is required'],
    },
    durationSeconds: {
      type:     Number,
      required: [true, 'Duration is required'],
      min:      [1, 'Duration must be at least 1 second'],
      max:      [180, 'Recordings cannot exceed 3 minutes'],
    },
    caption: {
      type:      String,
      trim:      true,
      maxlength: [500, 'Caption cannot exceed 500 characters'],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
)

// ─── Indexes ──────────────────────────────────────────────────────────────────

VoiceNoteSchema.index({ enquiryId: 1, createdAt: -1 })

// ─── Model ────────────────────────────────────────────────────────────────────

const VoiceNote: Model<VoiceNoteDocument> =
  models.VoiceNote ?? model<VoiceNoteDocument>('VoiceNote', VoiceNoteSchema)

export default VoiceNote
