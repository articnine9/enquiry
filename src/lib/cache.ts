// Centralised cache tag constants.
// Use these in unstable_cache() calls and revalidateTag() calls so
// they stay in sync across the codebase.

export const CACHE_TAGS = {
  // per-resource tags
  enquiries:     'enquiries',
  enquiry:       (id: string) => `enquiry-${id}`,
  staff:         'staff',
  assignment:    (id: string) => `assignment-${id}`,
  assignments:   'assignments',
  followUps:     'follow-ups',
  notifications: 'notifications',
  zones:         'zones',
  zone:          (id: string) => `zone-${id}`,
  masterData:    'master-data',
  distributors:  'distributors',
  dealers:       'dealers',
  fieldVisits:   'field-visits',
  // aggregate tags (invalidated when any record in the domain changes)
  dashboard:     'dashboard',
  reports:       'reports',
} as const

export type CacheTag = typeof CACHE_TAGS[keyof typeof CACHE_TAGS]
