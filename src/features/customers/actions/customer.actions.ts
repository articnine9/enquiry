'use server'

import dbConnect from '@/lib/db/connection'
import Customer from '@/lib/db/models/Customer'
import { requireRole, requirePermission } from '@/lib/auth/session'
import { UserRole } from '@/types/enums'
import type { ActionResult, PaginatedResult } from '@/types/api'
import type { IPurchaseHistoryEntry } from '@/lib/db/models/Customer'

function toPlain<T>(v: T): T { return JSON.parse(JSON.stringify(v)) }

// ── Row shapes ────────────────────────────────────────────────────────────────

export interface CustomerRow {
  _id:               string
  name:              string
  phone:             string
  email?:            string
  district?:         string
  city?:             string
  territory?:        string
  distributorName?:  string
  dealerName?:       string
  productCategories: string[]
  totalPurchases:    number
  totalRevenue:      number
  lastPurchaseAt:    string
}

export interface CustomerDetail extends CustomerRow {
  address?:          string
  firstConvertedAt:  string
  purchaseHistory: (Omit<IPurchaseHistoryEntry, 'enquiryId' | 'distributorId' | 'dealerId'> & {
    enquiryId:        string
    enquiryNo?:       string
    distributorId?:   string
    distributorName?: string
    dealerId?:        string
    dealerName?:      string
  })[]
}

export interface CustomerFilters {
  search?:        string
  district?:      string
  distributorId?: string
  dealerId?:      string
  page?:          number
  pageSize?:      number
}

// ── List ───────────────────────────────────────────────────────────────────────

export async function getCustomersAction(
  filters: CustomerFilters = {}
): Promise<ActionResult<PaginatedResult<CustomerRow>>> {
  try {
    await requireRole(UserRole.SuperAdmin, UserRole.Manager)
    await dbConnect()

    const page     = Math.max(filters.page ?? 1, 1)
    const pageSize = Math.min(filters.pageSize ?? 20, 100)
    const skip     = (page - 1) * pageSize

    const query: Record<string, unknown> = {}
    if (filters.search) {
      const rx = new RegExp(filters.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
      query.$or = [{ name: rx }, { phone: rx }, { email: rx }]
    }
    if (filters.district)      query.district      = new RegExp(`^${filters.district}$`, 'i')
    if (filters.distributorId) query.distributorId = filters.distributorId
    if (filters.dealerId)      query.dealerId      = filters.dealerId

    const [docs, total] = await Promise.all([
      Customer.find(query)
        .sort({ lastPurchaseAt: -1 })
        .skip(skip)
        .limit(pageSize)
        .populate<{ distributorId: { name: string } | null }>('distributorId', 'name')
        .populate<{ dealerId: { name: string } | null }>('dealerId', 'name')
        .lean(),
      Customer.countDocuments(query),
    ])

    const data: CustomerRow[] = docs.map((c) => ({
      _id:               String(c._id),
      name:              c.name,
      phone:             c.phone,
      email:             c.email,
      district:          c.district,
      city:              c.city,
      territory:         c.territory,
      distributorName:   (c.distributorId as unknown as { name?: string } | null)?.name,
      dealerName:        (c.dealerId as unknown as { name?: string } | null)?.name,
      productCategories: c.productCategories ?? [],
      totalPurchases:    c.totalPurchases,
      totalRevenue:      c.totalRevenue ?? 0,
      lastPurchaseAt:    String(c.lastPurchaseAt),
    }))

    return {
      ok: true,
      data: toPlain({
        data, total, page, pageSize,
        totalPages: Math.ceil(total / pageSize),
        hasNext:    page < Math.ceil(total / pageSize),
        hasPrev:    page > 1,
      }),
    }
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed to load customers' }
  }
}

// ── Get single ────────────────────────────────────────────────────────────────

export async function getCustomerAction(id: string): Promise<ActionResult<CustomerDetail>> {
  try {
    await requireRole(UserRole.SuperAdmin, UserRole.Manager)
    await dbConnect()

    const c = await Customer.findById(id)
      .populate<{ distributorId: { name: string } | null }>('distributorId', 'name')
      .populate<{ dealerId: { name: string } | null }>('dealerId', 'name')
      .populate<{ 'purchaseHistory.enquiryId': { enquiryNo: string } }>('purchaseHistory.enquiryId', 'enquiryNo')
      .populate<{ 'purchaseHistory.distributorId': { name: string } | null }>('purchaseHistory.distributorId', 'name')
      .populate<{ 'purchaseHistory.dealerId': { name: string } | null }>('purchaseHistory.dealerId', 'name')
      .lean()

    if (!c) return { ok: false, error: 'Customer not found' }

    return {
      ok: true,
      data: toPlain({
        _id:               String(c._id),
        name:              c.name,
        phone:             c.phone,
        email:             c.email,
        address:           c.address,
        district:          c.district,
        city:              c.city,
        territory:         c.territory,
        distributorName:   (c.distributorId as unknown as { name?: string } | null)?.name,
        dealerName:        (c.dealerId as unknown as { name?: string } | null)?.name,
        productCategories: c.productCategories ?? [],
        totalPurchases:    c.totalPurchases,
        totalRevenue:      c.totalRevenue ?? 0,
        firstConvertedAt:  String(c.firstConvertedAt),
        lastPurchaseAt:    String(c.lastPurchaseAt),
        purchaseHistory: (c.purchaseHistory ?? []).map((p) => ({
          ...p,
          enquiryId:       String((p.enquiryId as unknown as { _id?: unknown })?._id ?? p.enquiryId ?? ''),
          enquiryNo:       (p.enquiryId as unknown as { enquiryNo?: string })?.enquiryNo,
          distributorId:   (p.distributorId as unknown as { _id?: unknown })?._id ? String((p.distributorId as unknown as { _id: unknown })._id) : p.distributorId ? String(p.distributorId) : undefined,
          distributorName: (p.distributorId as unknown as { name?: string } | null)?.name,
          dealerId:        (p.dealerId as unknown as { _id?: unknown })?._id ? String((p.dealerId as unknown as { _id: unknown })._id) : p.dealerId ? String(p.dealerId) : undefined,
          dealerName:      (p.dealerId as unknown as { name?: string } | null)?.name,
        })).sort((a, b) => new Date(b.convertedAt).getTime() - new Date(a.convertedAt).getTime()),
      }),
    }
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed to load customer' }
  }
}

// ── Lookup by phone (used by the Enquiry detail page's "existing customer" card) ──

export async function getCustomerByPhoneAction(
  phone: string
): Promise<ActionResult<CustomerRow | null>> {
  try {
    await requirePermission('enquiry:read')
    await dbConnect()

    const c = await Customer.findOne({ phone })
      .populate<{ distributorId: { name: string } | null }>('distributorId', 'name')
      .populate<{ dealerId: { name: string } | null }>('dealerId', 'name')
      .lean()

    if (!c) return { ok: true, data: null }

    return {
      ok: true,
      data: toPlain({
        _id:               String(c._id),
        name:              c.name,
        phone:             c.phone,
        email:             c.email,
        district:          c.district,
        city:              c.city,
        territory:         c.territory,
        distributorName:   (c.distributorId as unknown as { name?: string } | null)?.name,
        dealerName:        (c.dealerId as unknown as { name?: string } | null)?.name,
        productCategories: c.productCategories ?? [],
        totalPurchases:    c.totalPurchases,
        totalRevenue:      c.totalRevenue ?? 0,
        lastPurchaseAt:    String(c.lastPurchaseAt),
      }),
    }
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed to look up customer' }
  }
}
