import { cn } from '@/utils/cn'
import type { TextareaHTMLAttributes } from 'react'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string
}

export function Textarea({ error, className, ...props }: TextareaProps) {
  return (
    <div className="w-full">
      <textarea
        className={cn(
          'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 transition-colors resize-none',
          'focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500',
          error ? 'border-red-400 focus:border-red-500 focus:ring-red-500' : '',
          className
        )}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  )
}
