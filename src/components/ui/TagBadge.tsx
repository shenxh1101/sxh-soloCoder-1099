import { cn } from '@/utils/cn'
import { useAppStore } from '@/store/appStore'
import { X } from 'lucide-react'

interface TagBadgeProps {
  tagId: string
  size?: 'sm' | 'md'
  removable?: boolean
  onRemove?: () => void
  onClick?: () => void
  active?: boolean
}

export function TagBadge({
  tagId,
  size = 'sm',
  removable = false,
  onRemove,
  onClick,
  active = false,
}: TagBadgeProps) {
  const tag = useAppStore((s) => s.tags.find((t) => t.id === tagId))
  if (!tag) return null

  return (
    <span
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-medium transition-all',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm',
        onClick ? 'cursor-pointer hover:opacity-80' : '',
        active
          ? 'text-white'
          : 'bg-opacity-15',
        removable ? 'pr-1' : ''
      )}
      style={{
        backgroundColor: active ? tag.color : `${tag.color}20`,
        color: active ? '#fff' : tag.color,
      }}
    >
      {tag.name}
      {removable && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onRemove?.()
          }}
          className="ml-0.5 rounded-full p-0.5 hover:bg-black/10"
        >
          <X size={12} />
        </button>
      )}
    </span>
  )
}
