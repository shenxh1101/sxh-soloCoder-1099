import { cn } from '@/utils/cn'
import type { Priority } from '@/types'

interface PriorityBadgeProps {
  priority: Priority
  size?: 'sm' | 'md'
}

const priorityConfig: Record<Priority, { label: string; color: string; bg: string }> = {
  high: { label: '高优先级', color: '#dc2626', bg: '#fef2f2' },
  medium: { label: '中优先级', color: '#d97706', bg: '#fffbeb' },
  low: { label: '低优先级', color: '#059669', bg: '#ecfdf5' },
}

export function PriorityBadge({ priority, size = 'sm' }: PriorityBadgeProps) {
  const config = priorityConfig[priority]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-medium',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
      )}
      style={{ backgroundColor: config.bg, color: config.color }}
    >
      <span
        className="rounded-full"
        style={{ width: size === 'sm' ? 6 : 8, height: size === 'sm' ? 6 : 8, backgroundColor: config.color }}
      />
      {config.label}
    </span>
  )
}
