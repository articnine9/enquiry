// Feature-local types that extend the base IEnquiry interface
// with populated virtual fields used only in UI layer

import type { IEnquiry, IUser } from '@/types'

export interface EnquiryWithStaff extends IEnquiry {
  assignedStaff?: Pick<IUser, 'name' | 'email' | 'avatar'>
}

export interface EnquiryTableRow extends EnquiryWithStaff {
  _id:        string
  ageInDays:  number
  isOverdue:  boolean
}
