'use client'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { type LucideIcon, TrendingDown, TrendingUp } from 'lucide-react'
import { memo } from 'react'

type StatCardVariant = 'default' | 'success' | 'error' | 'warning' | 'gold' | 'info'

const variantStyles: Record<
  StatCardVariant,
  { icon: string; iconBg: string; bar: string; glow: string; value?: string }
> = {
  default: {
    icon: 'text-primary',
    iconBg: 'bg-muted',
    bar: 'bg-primary',
    glow: 'glow-primary',
  },
  success: {
    icon: 'text-success',
    iconBg: 'bg-[#1a3329]',
    bar: 'bg-success',
    glow: 'glow-success',
  },
  error: {
    icon: 'text-destructive',
    iconBg: 'bg-[#2e1f1f]',
    bar: 'bg-destructive',
    glow: 'glow-error',
  },
  warning: {
    icon: 'text-warning',
    iconBg: 'bg-[#2e2819]',
    bar: 'bg-warning',
    glow: 'glow-warning',
  },
  gold: {
    icon: 'text-gold',
    iconBg: 'bg-[#2e2819]',
    bar: 'bg-gold',
    glow: 'glow-gold',
    value: 'text-gold',
  },
  info: {
    icon: 'text-[#7aa6bf]',
    iconBg: 'bg-[#1a262e]',
    bar: 'bg-[#7aa6bf]',
    glow: 'glow-primary',
  },
}

export interface StatCardProps {
  title: string
  value: string | number
  icon?: LucideIcon
  description?: string
  trend?: {
    value: number
    label?: string
  }
  variant?: StatCardVariant
  className?: string
  valueClassName?: string
}

export const StatCard = memo(function StatCard({
  title,
  value,
  icon: Icon,
  description,
  trend,
  variant = 'default',
  className,
  valueClassName,
}: StatCardProps) {
  const isPositiveTrend = trend && trend.value > 0
  const isNegativeTrend = trend && trend.value < 0
  const styles = variantStyles[variant]

  return (
    <Card className={cn('glass-card-3d-intense relative overflow-hidden', styles.glow, className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold tracking-tight text-muted-foreground">
            {title}
          </p>
          {Icon && (
            <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg', styles.iconBg)}>
              <Icon className={cn('h-5 w-5', styles.icon)} />
            </div>
          )}
        </div>
        <div>
          <div
            className={cn(
              'text-3xl font-bold mb-1 tracking-tight text-foreground',
              styles.value,
              valueClassName
            )}
          >
            {value}
          </div>
          {(description || trend) && (
            <div className="flex items-center gap-2 text-xs">
              {trend && (
                <span
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-semibold',
                    isPositiveTrend && 'bg-success/20 text-success',
                    isNegativeTrend && 'bg-destructive/20 text-destructive',
                    !isPositiveTrend && !isNegativeTrend && 'bg-muted text-muted-foreground'
                  )}
                >
                  {isPositiveTrend && <TrendingUp className="h-3 w-3" />}
                  {isNegativeTrend && <TrendingDown className="h-3 w-3" />}
                  {trend.value > 0 ? '+' : ''}
                  {trend.value}%{trend.label && ` ${trend.label}`}
                </span>
              )}
              {description && (
                <span className="font-medium text-muted-foreground">
                  {description}
                </span>
              )}
            </div>
          )}
        </div>
      </CardContent>
      <div className={cn('absolute bottom-0 left-0 right-0 h-1', styles.bar)} />
    </Card>
  )
})
