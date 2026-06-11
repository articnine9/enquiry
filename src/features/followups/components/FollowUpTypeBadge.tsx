import { Phone, Mail, MapPin, MessageCircle, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { FollowUpType, FOLLOW_UP_TYPE_LABELS } from '@/types/enums'

const TYPE_CONFIG: Record<
  FollowUpType,
  { icon: React.ElementType; className: string }
> = {
  [FollowUpType.Call]:    { icon: Phone,         className: 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-900/30' },
  [FollowUpType.Email]:   { icon: Mail,          className: 'text-blue-600    bg-blue-50    dark:text-blue-400    dark:bg-blue-900/30'    },
  [FollowUpType.Visit]:   { icon: MapPin,        className: 'text-purple-600  bg-purple-50  dark:text-purple-400  dark:bg-purple-900/30'  },
  [FollowUpType.Chat]:    { icon: MessageCircle, className: 'text-amber-600   bg-amber-50   dark:text-amber-400   dark:bg-amber-900/30'   },
  [FollowUpType.Meeting]: { icon: Users,         className: 'text-indigo-600  bg-indigo-50  dark:text-indigo-400  dark:bg-indigo-900/30'  },
}

interface Props {
  type:      FollowUpType
  showLabel?: boolean
  size?:     'sm' | 'md'
}

export function FollowUpTypeBadge({ type, showLabel = true, size = 'md' }: Props) {
  const { icon: Icon, className } = TYPE_CONFIG[type]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs',
        className
      )}
    >
      <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      {showLabel && FOLLOW_UP_TYPE_LABELS[type]}
    </span>
  )
}
