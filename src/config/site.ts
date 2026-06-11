export const siteConfig = {
  name:        'EnquiryPro',
  description: 'Enterprise Enquiry Management System',
  url:         process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
  version:     '1.0.0',
  pagination: {
    defaultPageSize: 20,
    pageSizeOptions: [10, 20, 50, 100],
  },
  upload: {
    maxFileSizeBytes: 10 * 1024 * 1024, // 10 MB
    allowedMimeTypes: [
      'image/jpeg', 'image/png', 'image/webp',
      'application/pdf',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ],
  },
} as const

export type SiteConfig = typeof siteConfig
