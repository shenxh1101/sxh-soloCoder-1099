import { cn } from '@/utils/cn'

interface CheckboxProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export function Checkbox({
  checked,
  onChange,
  label,
  className,
  size = 'md',
}: CheckboxProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  }

  return (
    <label className={cn('inline-flex items-center gap-2 cursor-pointer select-none', className)}>
      <div className="relative">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only"
        />
        <div
          className={cn(
            sizeClasses[size],
            'rounded border-2 transition-all duration-150 flex items-center justify-center',
            checked
              ? 'bg-primary-600 border-primary-600'
              : 'bg-white border-gray-300 hover:border-primary-400'
          )}
        >
          {checked && (
            <svg
              className={cn(
                size === 'sm' ? 'w-3 h-3' : 'w-4 h-4',
                'text-white'
              )}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M5 13l4 4L19 7"
              />
            </svg>
          )}
        </div>
      </div>
      {label && <span className="text-sm text-gray-700">{label}</span>}
    </label>
  )
}
