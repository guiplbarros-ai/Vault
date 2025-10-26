import { HTMLAttributes, forwardRef, TdHTMLAttributes, ThHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export const Table = forwardRef<HTMLTableElement, HTMLAttributes<HTMLTableElement>>(
  ({ className, ...props }, ref) => {
    return <table ref={ref} className={cn('w-full text-sm text-left', className)} {...props} />
  }
)

Table.displayName = 'Table'

export const TableHeader = forwardRef<HTMLTableSectionElement, HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => {
    return (
      <thead
        ref={ref}
        className={cn(
          'text-xs font-semibold uppercase tracking-wider',
          'text-neutral-700 dark:text-neutral-300',
          'bg-neutral-50 dark:bg-neutral-900',
          className
        )}
        {...props}
      />
    )
  }
)

TableHeader.displayName = 'TableHeader'

export const TableBody = forwardRef<HTMLTableSectionElement, HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => {
    return <tbody ref={ref} className={className} {...props} />
  }
)

TableBody.displayName = 'TableBody'

export const TableRow = forwardRef<HTMLTableRowElement, HTMLAttributes<HTMLTableRowElement>>(
  ({ className, ...props }, ref) => {
    return (
      <tr
        ref={ref}
        className={cn('hover:bg-neutral-50 dark:hover:bg-neutral-900/50 transition-colors', className)}
        {...props}
      />
    )
  }
)

TableRow.displayName = 'TableRow'

export const TableHead = forwardRef<HTMLTableCellElement, ThHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => {
    return (
      <th
        ref={ref}
        className={cn('px-4 py-3 border-b border-neutral-200 dark:border-neutral-800', className)}
        {...props}
      />
    )
  }
)

TableHead.displayName = 'TableHead'

export const TableCell = forwardRef<HTMLTableCellElement, TdHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => {
    return (
      <td
        ref={ref}
        className={cn('px-4 py-3 border-b border-neutral-200 dark:border-neutral-800', className)}
        {...props}
      />
    )
  }
)

TableCell.displayName = 'TableCell'
