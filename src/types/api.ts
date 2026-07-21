// ─── Server Action return types ───────────────────────────────────────────────

export type ActionSuccess<T> = { ok: true;  data: T }
export type ActionError      = {
  ok: false
  error: string
  fieldErrors?: Record<string, string[]>
  // Raw submitted values, echoed back so a form bound via useActionState can
  // re-populate itself — React resets uncontrolled fields after any action
  // completes, success or failure, so without this typed input is lost.
  values?: Record<string, unknown>
}
export type ActionResult<T>  = ActionSuccess<T> | ActionError

// ─── Paginated query result ───────────────────────────────────────────────────

export interface PaginatedResult<T> {
  data:       T[]
  total:      number
  page:       number
  pageSize:   number
  totalPages: number
  hasNext:    boolean
  hasPrev:    boolean
}

// ─── Common query params ──────────────────────────────────────────────────────

export interface PaginationParams {
  page?:     number
  pageSize?: number
}

export interface SortParams {
  sortBy?:    string
  sortOrder?: 'asc' | 'desc'
}

export type QueryParams = PaginationParams & SortParams

// ─── SSE event shape ──────────────────────────────────────────────────────────

export interface SSEEvent<T = unknown> {
  type:      string
  payload:   T
  timestamp: string
}
