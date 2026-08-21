import { redirect } from 'next/navigation'
import dbConnect from '@/lib/db/connection'
import ModuleVisibility from '@/lib/db/models/ModuleVisibility'
import { UserRole } from '@/types/enums'
import { TOGGLEABLE_MODULES, type ToggleableModuleKey } from '../moduleVisibility.constants'

/** Full visibility map for Staff, keyed by module — missing rows default to enabled. */
export async function getStaffModuleVisibility(): Promise<Record<ToggleableModuleKey, boolean>> {
  await dbConnect()
  const rows = await ModuleVisibility.find({ moduleKey: { $in: TOGGLEABLE_MODULES.map((m) => m.key) } }).lean()

  const map = Object.fromEntries(TOGGLEABLE_MODULES.map((m) => [m.key, true])) as Record<ToggleableModuleKey, boolean>
  for (const r of rows) {
    if (r.moduleKey in map) map[r.moduleKey as ToggleableModuleKey] = r.enabledForStaff
  }
  return map
}

/**
 * Server-side gate for a toggleable module's page — call right after
 * resolving the session. No-op for non-Staff roles (only Staff visibility is
 * configurable); redirects Staff to the dashboard if the module is disabled,
 * so a direct URL visit is blocked, not just hidden from the sidebar.
 */
export async function enforceStaffModuleAccess(
  role: UserRole,
  moduleKey: ToggleableModuleKey
): Promise<void> {
  if (role !== UserRole.Staff) return
  const visibility = await getStaffModuleVisibility()
  if (!visibility[moduleKey]) redirect('/dashboard')
}
