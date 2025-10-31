import * as React from 'react'

import { cn } from '@/lib/utils'

function Card({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card"
      className={cn(
        // Base: fundo opaco com efeito 3D
        'bg-white dark:bg-zinc-900/95',
        'text-card-foreground flex flex-col gap-6 rounded-xl',
        // Borda com sutil gradiente
        'border-2 border-zinc-200/80 dark:border-zinc-700/50',
        // Efeito 3D: sombras múltiplas para profundidade
        'shadow-[0_2px_8px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.06)]',
        'dark:shadow-[0_4px_16px_rgba(0,0,0,0.3),0_8px_24px_rgba(0,0,0,0.2)]',
        // Hover: aumenta elevação
        'hover:shadow-[0_4px_12px_rgba(0,0,0,0.08),0_8px_24px_rgba(0,0,0,0.1)]',
        'dark:hover:shadow-[0_8px_24px_rgba(0,0,0,0.4),0_12px_32px_rgba(0,0,0,0.3)]',
        // Transição suave
        'transition-all duration-300',
        // Borda superior sutil para efeito de luz
        'before:content-[""] before:absolute before:inset-x-0 before:top-0 before:h-px',
        'before:bg-gradient-to-r before:from-transparent before:via-zinc-200/50 before:to-transparent',
        'dark:before:via-zinc-700/30',
        'relative py-6',
        className,
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        '@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-2 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6',
        className,
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-title"
      className={cn('leading-none font-semibold', className)}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-description"
      className={cn('text-muted-foreground text-sm', className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        'col-start-2 row-span-2 row-start-1 self-start justify-self-end',
        className,
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-content"
      className={cn('px-6', className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-footer"
      className={cn('flex items-center px-6 [.border-t]:pt-6', className)}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}
