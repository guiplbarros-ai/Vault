import { ButtonHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'
import { cva, type VariantProps } from 'class-variance-authority'

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-semibold transition-colors focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-45',
  {
    variants: {
      variant: {
        default: 'bg-brand-600 hover:bg-brand-700 text-[color:var(--brand-contrast)] focus:ring-brand-400',
        primary: 'bg-brand-600 hover:bg-brand-700 text-[color:var(--brand-contrast)] focus:ring-brand-400',
        secondary: 'bg-slate-100 dark:bg-graphite-700 text-slate-700 dark:text-graphite-100 border border-slate-300 dark:border-graphite-600 hover:bg-slate-200 dark:hover:bg-graphite-600 focus:ring-brand-400',
        ghost: 'text-brand-600 hover:text-brand-700 hover:bg-brand-100/40 focus:ring-brand-400',
        destructive: 'bg-error-600 text-white hover:bg-error-600/90 focus:ring-error-600/40',
        link: 'text-brand-600 hover:text-brand-700 underline-offset-4 hover:underline focus:ring-brand-400',
      },
      size: {
        default: 'h-10 px-4 py-2.5',
        sm: 'h-9 rounded-lg px-3',
        lg: 'h-11 rounded-lg px-6',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
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
