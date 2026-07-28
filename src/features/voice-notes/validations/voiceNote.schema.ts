import { z } from 'zod'

const objectId = z
  .string({ required_error: 'ID is required' })
  .regex(/^[a-f\d]{24}$/i, 'Invalid ID format')

export const CreateVoiceNoteSchema = z.object({
  enquiryId: objectId,

  durationSeconds: z.coerce
    .number({ required_error: 'Duration is required' })
    .int()
    .min(1, 'Recording is too short')
    .max(180, 'Recordings cannot exceed 3 minutes'),

  caption: z
    .string()
    .trim()
    .max(500, 'Caption cannot exceed 500 characters')
    .optional()
    .transform((v) => v || undefined),
})

export type CreateVoiceNoteInput = z.infer<typeof CreateVoiceNoteSchema>
