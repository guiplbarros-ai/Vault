'use client'

import * as React from 'react'
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
}

export function StatCard({
  title,
  value,
  icon: Icon,
  description,
  trend,
  className,
  valueClassName,
}: StatCardProps) {
  const isPositiveTrend = trend && trend.value > 0
  const isNegativeTrend = trend && trend.value < 0

  return (
    <Card className={className}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          {Icon && (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
              <Icon className="h-4 w-4 text-muted-foreground" />
            </div>
          )}
        </div>
        <div className="mt-2">
          <div className={cn('text-2xl font-bold', valueClassName)}>
            {value}
          </div>
          {(description || trend) && (
            <div className="mt-1 flex items-center gap-2 text-xs">
              {trend && (
                <span
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium',
                    isPositiveTrend && 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400',
                    isNegativeTrend && 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400',
                    !isPositiveTrend && !isNegativeTrend && 'bg-muted text-muted-foreground'
                  )}
                >
                  {isPositiveTrend && <TrendingUp className="h-3 w-3" />}
                  {isNegativeTrend && <TrendingDown className="h-3 w-3" />}
                  {trend.value > 0 ? '+' : ''}{trend.value}%
                  {trend.label && ` ${trend.label}`}
                </span>
              )}
              {description && (
                <span className="text-muted-foreground">{description}</span>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
