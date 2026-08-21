// Client-safe module-visibility constants. Kept separate from the Mongoose
// model so client components can import them without pulling `mongoose`
// into the browser bundle — same reasoning as masterData.constants.ts.

export const TOGGLEABLE_MODULES = [
  { key: 'follow_ups',   label: 'Follow-ups',   href: '/follow-ups' },
  { key: 'inventory',    label: 'Inventory',    href: '/inventory' },
  { key: 'field_visits', label: 'Field Visits', href: '/field-visits' },
  { key: 'complaints',   label: 'Complaints',   href: '/complaints' },
] as const

export type ToggleableModuleKey = (typeof TOGGLEABLE_MODULES)[number]['key']

export const TOGGLEABLE_MODULE_KEYS = TOGGLEABLE_MODULES.map((m) => m.key)
