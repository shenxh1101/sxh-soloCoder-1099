import { cn } from '@/utils/cn'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  icon?: ReactNode
}

export function Button({
  variant = 'primary',
  size = 'md',
  icon,
  className,
  children,
  ...props
}: ButtonProps) {
  const baseStyles =
    'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'

  const variantStyles: Record<Variant, string> = {
    primary:
      'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500 shadow-sm',
    secondary:
      'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 focus:ring-gray-400',
    ghost:
      'bg-transparent text-gray-600 hover:bg-gray-100 focus:ring-gray-400',
    danger:
      'bg-red-500 text-white hover:bg-red-600 focus:ring-red-400',
  }

  const sizeStyles: Record<Size, string> = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  }

  return (
    <button
      className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
      {...props}
    >
      {icon}
      {children}
    </button>
  )
}
