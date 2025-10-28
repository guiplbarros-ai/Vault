import { HTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'
import { cva, type VariantProps } from 'class-variance-authority'

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium',
  {
    variants: {
      variant: {
        // Semantic variants
        success: 'bg-success-100 text-success-600',
        warning: 'bg-warning-100 text-warning-600',
        error: 'bg-error-100 text-error-600',
        info: 'bg-info-100 text-info-600',
        insight: 'bg-insight-100 text-insight-600',

        // Budget state variants (seção 5.5)
        healthy: 'bg-brand-100 text-brand-700',      // <80% saudável
        attention: 'bg-warning-100 text-warning-600', // ≥80% atenção
        exceeded: 'bg-error-100 text-error-600',      // ≥100% estourado

        // Brand variant
        primary: 'bg-brand-100 text-brand-700',
        neutral: 'bg-slate-100 dark:bg-graphite-700 text-slate-700 dark:text-graphite-200',
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

/**
 * Helper function to determine the badge variant based on budget percentage
 * @param percentage - The budget usage percentage (0-100+)
 * @returns The appropriate badge variant
 *
 * @example
 * getBudgetBadgeVariant(75) // 'healthy'
 * getBudgetBadgeVariant(85) // 'attention'
 * getBudgetBadgeVariant(105) // 'exceeded'
 */
export function getBudgetBadgeVariant(percentage: number): 'healthy' | 'attention' | 'exceeded' {
  if (percentage >= 100) return 'exceeded'
  if (percentage >= 80) return 'attention'
  return 'healthy'
}
