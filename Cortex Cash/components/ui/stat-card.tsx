'use client'

import * as React from 'react'
import { memo } from 'react'
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'

export interface StatCardProps {
  title: string
  value: string | number
  icon?: LucideIcon
  description?: string
  trend?: {
    value: number
    label?: string
  }
  className?: string
  valueClassName?: string
  valueColor?: string
  iconColor?: string
  iconBgColor?: string
  titleColor?: string
  cardBgColor?: string      // Cor de fundo sólida (sem gradientes)
  bottomBarColor?: string
}

// ✅ Memoizar StatCard para evitar re-renders desnecessários
// TEMA.md: Superfícies sólidas (opacidade 1, sem gradientes/blur)
export const StatCard = memo(function StatCard({
  title,
  value,
  icon: Icon,
  description,
  trend,
  className,
  valueClassName,
  valueColor,
  iconColor = 'hsl(var(--primary))',
  iconBgColor = 'hsl(var(--muted))',
  titleColor = 'hsl(var(--muted-foreground))',
  cardBgColor,
  bottomBarColor,
}: StatCardProps) {
  const isPositiveTrend = trend && trend.value > 0
  const isNegativeTrend = trend && trend.value < 0

  return (
    <Card
      className={cn(
        'glass-card-3d-intense relative overflow-hidden',
        className
      )}
    >
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <p
            className="text-sm font-semibold tracking-tight"
            style={{ color: titleColor }}
          >
            {title}
          </p>
          {Icon && (
            <div
              className="flex h-9 w-9 items-center justify-center rounded-lg"
              style={{ backgroundColor: iconBgColor }}
            >
              <Icon className="h-5 w-5" style={{ color: iconColor }} />
            </div>
          )}
        </div>
        <div>
          <div
            className={cn(
              'text-3xl font-bold mb-1 tracking-tight',
              !valueColor && 'text-foreground',
              valueClassName
            )}
            style={valueColor ? { color: valueColor } : undefined}
          >
            {value}
          </div>
          {(description || trend) && (
            <div className="flex items-center gap-2 text-xs">
              {trend && (
                <span
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-semibold',
                    isPositiveTrend && 'text-foreground',
                    isNegativeTrend && 'text-foreground',
                    !isPositiveTrend && !isNegativeTrend && 'bg-muted text-muted-foreground'
                  )}
                  style={
                    isPositiveTrend
                      ? {
                          backgroundColor: 'hsl(var(--success) / 0.2)',
                          color: 'hsl(var(--success))',
                        }
                      : isNegativeTrend
                      ? {
                          backgroundColor: 'hsl(var(--destructive) / 0.2)',
                          color: 'hsl(var(--destructive))',
                        }
                      : undefined
                  }
                >
                  {isPositiveTrend && <TrendingUp className="h-3 w-3" />}
                  {isNegativeTrend && <TrendingDown className="h-3 w-3" />}
                  {trend.value > 0 ? '+' : ''}{trend.value}%
                  {trend.label && ` ${trend.label}`}
                </span>
              )}
              {description && (
                <span
                  className="font-medium"
                  style={{ color: 'var(--fg-muted)' }}
                >
                  {description}
                </span>
              )}
            </div>
          )}
        </div>
      </CardContent>
      {bottomBarColor && (
        <div
          className="absolute bottom-0 left-0 right-0 h-1"
          style={{ backgroundColor: bottomBarColor }}
        />
      )}
    </Card>
  )
})
