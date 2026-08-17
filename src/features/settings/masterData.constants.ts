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
  'state',
  'district',
  'city',
  'taluk',
  'pincode',
  'inventory_product_category',
  'inventory_product_subcategory',
  'inventory_uom',
  'inventory_warehouse_type',
  'inventory_adjustment_reason',
  'inventory_tax_rate',
] as const

export type MasterDataType = (typeof MASTER_DATA_TYPES)[number]

export const MASTER_DATA_TYPE_LABELS: Record<MasterDataType, string> = {
  enquiry_source:                'Enquiry Source',
  enquiry_category:              'Enquiry Category',
  enquiry_product:               'Enquiry Product / Service',
  enquiry_priority:              'Enquiry Priority',
  business_category:             'Business Category',
  business_subcategory:          'Business Sub-Category',
  state:                         'State',
  district:                      'District',
  city:                          'City',
  taluk:                         'Taluk',
  pincode:                       'Pincode',
  inventory_product_category:    'Product Category (Inventory)',
  inventory_product_subcategory: 'Product Sub-Category (Inventory)',
  inventory_uom:                 'Unit of Measure (UOM)',
  inventory_warehouse_type:      'Warehouse Type',
  inventory_adjustment_reason:   'Stock Adjustment Reason',
  inventory_tax_rate:            'Tax Rate (GST %)',
}

// Types where each row belongs under a parent row of another type — the admin
// CRUD form shows a parent picker for these instead of a flat list.
export const MASTER_DATA_PARENT_TYPE: Partial<Record<MasterDataType, MasterDataType>> = {
  business_subcategory:          'business_category',
  enquiry_product:               'business_category',
  enquiry_category:              'business_category',
  district:                      'state',
  city:                          'district',
  taluk:                         'district',
  pincode:                       'taluk',
  inventory_product_subcategory: 'inventory_product_category',
}
