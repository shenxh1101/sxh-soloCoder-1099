import { cn } from '@/utils/cn'
import type { InputHTMLAttributes, ReactNode } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon?: ReactNode
  error?: string
}

export function Input({ icon, error, className, ...props }: InputProps) {
  return (
    <div className="w-full">
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
            {icon}
          </div>
        )}
        <input
          className={cn(
            'w-full rounded-lg border border-gray-300 bg-white py-2 text-sm text-gray-900 placeholder-gray-400 transition-colors',
            'focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500',
            icon ? 'pl-10' : 'pl-3',
            'pr-3',
            error ? 'border-red-400 focus:border-red-500 focus:ring-red-500' : '',
            className
          )}
          {...props}
        />
      </div>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  )
}
