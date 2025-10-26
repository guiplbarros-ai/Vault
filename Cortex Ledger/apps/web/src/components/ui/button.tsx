import { ButtonHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'
import { cva, type VariantProps } from 'class-variance-authority'

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-lg text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed',
  {
    variants: {
      variant: {
        primary: 'bg-teal-500 text-white hover:bg-teal-600 active:bg-teal-700',
        secondary: 'bg-neutral-200 text-neutral-900 hover:bg-neutral-300',
        danger: 'bg-red-500 text-white hover:bg-red-600',
        outline: 'border border-neutral-300 bg-transparent hover:bg-neutral-50',
        ghost: 'hover:bg-neutral-100 active:bg-neutral-200 dark:hover:bg-neutral-800',
      },
      size: {
        sm: 'h-8 px-3 text-xs',
        md: 'h-10 px-4',
        lg: 'h-12 px-6',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
)

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <span className="mr-2">...</span>}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'
