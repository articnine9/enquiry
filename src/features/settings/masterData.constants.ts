// Client-safe master-data constants & types.
// Kept separate from the Mongoose model so client components can import them
// without pulling `mongoose` into the browser bundle.

export const MASTER_DATA_TYPES = [
  'enquiry_source',
  'enquiry_category',
  'enquiry_product',
  'enquiry_priority',
  'business_category',
  'business_subcategory',
] as const

export type MasterDataType = (typeof MASTER_DATA_TYPES)[number]

export const MASTER_DATA_TYPE_LABELS: Record<MasterDataType, string> = {
  enquiry_source:        'Enquiry Source',
  enquiry_category:      'Category',
  enquiry_product:       'Product / Service',
  enquiry_priority:      'Priority',
  business_category:     'Business Category',
  business_subcategory:  'Business Sub-Category',
}

// Types where each row belongs under a parent row of another type — the admin
// CRUD form shows a parent picker for these instead of a flat list.
export const MASTER_DATA_PARENT_TYPE: Partial<Record<MasterDataType, MasterDataType>> = {
  business_subcategory: 'business_category',
}
