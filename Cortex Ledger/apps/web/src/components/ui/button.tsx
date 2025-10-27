import { ButtonHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'
import { cva, type VariantProps } from 'class-variance-authority'

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-semibold ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-4 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-brand text-brand-contrast hover:brightness-90 focus-visible:ring-brand/25',
        primary: 'bg-brand text-brand-contrast hover:brightness-90 focus-visible:ring-brand/25',
        destructive: 'bg-danger text-white hover:brightness-90 focus-visible:ring-danger/25',
        outline: 'border border-line/25 bg-surface hover:bg-elev focus-visible:ring-line/20',
        secondary: 'border border-line/25 bg-surface text-text hover:bg-elev focus-visible:ring-line/20',
        ghost: 'hover:bg-surface focus-visible:ring-line/15',
        link: 'text-brand underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2.5',
        sm: 'h-9 rounded-lg px-3',
        lg: 'h-11 rounded-xl px-6',
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
