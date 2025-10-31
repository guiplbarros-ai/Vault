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
  valueColor?: string
  iconColor?: string
  iconBgColor?: string
  titleColor?: string
  cardBgGradient?: string
  cardBgColor?: string
  bottomBarColor?: string
}

export function StatCard({
  title,
  value,
  icon: Icon,
  description,
  trend,
  className,
  valueClassName,
  valueColor,
  iconColor = 'hsl(var(--primary))',
  iconBgColor = 'hsl(var(--primary) / 0.1)',
  titleColor,
  cardBgGradient,
  cardBgColor,
  bottomBarColor,
}: StatCardProps) {
  const isPositiveTrend = trend && trend.value > 0
  const isNegativeTrend = trend && trend.value < 0

  const cardElement = (
    <Card
      className={cn(
        !cardBgGradient && 'shadow-md hover:shadow-lg transition-all duration-200', // Só aplica shadows se não tiver wrapper
        cardBgGradient && '!bg-transparent border-0', // Remove bg e border quando temos wrapper customizado
        !cardBgGradient && className // Só aplica className se não tiver wrapper (senão fica no wrapper)
      )}
    >
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <p
            className="text-sm font-semibold"
            style={titleColor ? { color: titleColor } : undefined}
          >{title}</p>
          {Icon && (
            <div
              className="flex h-12 w-12 items-center justify-center rounded-xl shadow-sm"
              style={{ backgroundColor: iconBgColor }}
            >
              <Icon className="h-6 w-6" style={{ color: iconColor }} />
            </div>
          )}
        </div>
        <div>
          <div
            className={cn(
              'text-3xl font-bold mb-1',
              !valueColor && (cardBgGradient ? 'text-white dark:text-white' : 'text-foreground'),
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
                          backgroundColor: 'hsl(var(--chart-8) / 0.2)',
                          color: 'hsl(var(--chart-8))',
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
                <span className={cn(
                  "font-medium",
                  cardBgGradient ? "text-white/70 dark:text-white/70" : "text-muted-foreground"
                )}>{description}</span>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )

  // Se temos gradient customizado, envolvemos em um div com o background
  if (cardBgGradient) {
    return (
      <div
        className={cn(
          'rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-all duration-200 relative',
          className // Aplica as classes CSS 3D (com border) no wrapper
        )}
        style={{
          background: cardBgGradient,
          backgroundColor: cardBgColor || '#FFFFFF',
        }}
      >
        {cardElement}
        {bottomBarColor && (
          <div
            className="absolute bottom-0 left-0 right-0 h-1.5"
            style={{ backgroundColor: bottomBarColor }}
          />
        )}
      </div>
    )
  }

  return cardElement
}
