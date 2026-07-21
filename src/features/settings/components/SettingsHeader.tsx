import { PageHeader } from '@/components/ui/PageHeader'
import type { LucideIcon } from 'lucide-react'

interface SettingsHeaderProps {
  icon:       LucideIcon
  title:      string
  subtitle?:  string
  backHref?:  string
  backLabel?: string
}

/** Settings-flavoured wrapper around the shared PageHeader — defaults the back link to /settings. */
export function SettingsHeader({
  icon,
  title,
  subtitle,
  backHref  = '/settings',
  backLabel = 'Back to settings',
}: SettingsHeaderProps) {
  return (
    <PageHeader
      icon={icon}
      title={title}
      subtitle={subtitle}
      backHref={backHref}
      backLabel={backLabel}
    />
  )
}
