'use client'

import * as React from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

export interface DataTableColumnHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  sortable?: boolean
  sortDirection?: 'asc' | 'desc' | null
  onSort?: () => void
  onHide?: () => void
}

export function DataTableColumnHeader({
  title,
  sortable = false,
  sortDirection,
  onSort,
  onHide,
  className,
  ...props
}: DataTableColumnHeaderProps) {
  if (!sortable) {
    return <div className={cn(className)} {...props}>{title}</div>
  }

  return (
    <div className={cn('flex items-center space-x-2', className)} {...props}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3 h-8 data-[state=open]:bg-accent"
          >
            <span>{title}</span>
            {sortDirection === 'desc' ? (
              <ArrowDown className="ml-2 h-4 w-4" />
            ) : sortDirection === 'asc' ? (
              <ArrowUp className="ml-2 h-4 w-4" />
            ) : (
              <ArrowUpDown className="ml-2 h-4 w-4" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={onSort}>
            <ArrowUp className="mr-2 h-3.5 w-3.5 text-muted-foreground/70" />
            Ordenar Crescente
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onSort}>
            <ArrowDown className="mr-2 h-3.5 w-3.5 text-muted-foreground/70" />
            Ordenar Decrescente
          </DropdownMenuItem>
          {onHide && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onHide}>
                <EyeOff className="mr-2 h-3.5 w-3.5 text-muted-foreground/70" />
                Ocultar Coluna
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
