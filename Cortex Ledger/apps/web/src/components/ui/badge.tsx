import { HTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'
import { cva, type VariantProps } from 'class-variance-authority'

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
  {
    variants: {
      variant: {
        primary: 'bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-100',
        success: 'bg-success-100 text-success-800 dark:bg-success-900 dark:text-success-100',
        warning: 'bg-warning-100 text-warning-800 dark:bg-warning-900 dark:text-warning-100',
        error: 'bg-error-100 text-error-800 dark:bg-error-900 dark:text-error-100',
        neutral: 'bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-100',
      },
    },
    defaultVariants: {
      variant: 'primary',
    },
  }
)

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(badgeVariants({ variant }), className)}
        {...props}
      />
    )
  }
)

Badge.displayName = 'Badge'
