'use server'

import { revalidatePath } from 'next/cache'
import dbConnect from '@/lib/db/connection'
import ModuleVisibility from '@/lib/db/models/ModuleVisibility'
import { requireRole } from '@/lib/auth/session'
import { UserRole } from '@/types/enums'
import { TOGGLEABLE_MODULES, type ToggleableModuleKey } from '../moduleVisibility.constants'
import { getStaffModuleVisibility } from '../services/moduleVisibility.service'
import type { ActionResult } from '@/types/api'

export async function getModuleVisibilityAction(): Promise<ActionResult<Record<ToggleableModuleKey, boolean>>> {
  try {
    await requireRole(UserRole.SuperAdmin)
    return { ok: true, data: await getStaffModuleVisibility() }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed to load module visibility' }
  }
}

export async function updateModuleVisibilityAction(
  moduleKey: ToggleableModuleKey,
  enabled: boolean
): Promise<ActionResult<null>> {
  try {
    await requireRole(UserRole.SuperAdmin)

    if (!TOGGLEABLE_MODULES.some((m) => m.key === moduleKey)) {
      return { ok: false, error: 'Unknown module' }
    }

    await dbConnect()
    await ModuleVisibility.findOneAndUpdate(
      { moduleKey },
      { $set: { enabledForStaff: enabled } },
      { upsert: true }
    )

    // Sidebar/MobileNav are rendered from the dashboard layout server-side.
    revalidatePath('/', 'layout')

    return { ok: true, data: null }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed to update module visibility' }
  }
}
