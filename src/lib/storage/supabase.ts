import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Server-only. Never import this from a Client Component — the service role
// key bypasses Row Level Security and must not reach the browser bundle.

const FIELD_VISIT_PHOTOS_BUCKET = 'field-visit-photos'
const MAX_PHOTO_BYTES = 8 * 1024 * 1024 // 8 MB

let client: SupabaseClient | null = null

function getClient(): SupabaseClient {
  if (client) return client

  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error(
      'Supabase Storage is not configured — set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local'
    )
  }

  client = createClient(url, key, { auth: { persistSession: false } })
  return client
}

/**
 * Uploads a field visit photo to Supabase Storage and returns its public URL.
 * Path is a random UUID, not derived from user input, to avoid path traversal
 * or collisions.
 */
export async function uploadFieldVisitPhoto(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Photo must be an image file')
  }
  if (file.size > MAX_PHOTO_BYTES) {
    throw new Error('Photo must be smaller than 8 MB')
  }

  const supabase = getClient()
  const ext  = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
  const path = `${crypto.randomUUID()}.${ext}`

  const { error } = await supabase.storage
    .from(FIELD_VISIT_PHOTOS_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false })

  if (error) throw new Error(`Photo upload failed: ${error.message}`)

  const { data } = supabase.storage.from(FIELD_VISIT_PHOTOS_BUCKET).getPublicUrl(path)
  return data.publicUrl
}
