'use client'

import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'
import type * as React from 'react'

export interface PageHeaderProps {
  title: string
  description?: string
  icon?: LucideIcon
  actions?: React.ReactNode
  className?: string
}

export function PageHeader({ title, description, icon: Icon, actions, className }: PageHeaderProps) {
  return (
    <div className={cn('flex items-start justify-between', className)}>
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          {Icon && <Icon className="h-7 w-7 text-primary" />}
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
        </div>
        {description && <p className="text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}
