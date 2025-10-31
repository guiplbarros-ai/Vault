'use client'

import * as React from 'react'
import * as ProgressPrimitive from '@radix-ui/react-progress'

import { cn } from '@/lib/utils'

interface ProgressProps extends React.ComponentProps<typeof ProgressPrimitive.Root> {
  indicatorClassName?: string
  indicatorColor?: string
  backgroundColor?: string
  showGlow?: boolean
}

function Progress({
  className,
  value,
  indicatorClassName,
  indicatorColor,
  backgroundColor,
  showGlow = false,
  ...props
}: ProgressProps) {
  const indicatorStyle: React.CSSProperties = {
    transform: `translateX(-${100 - (value || 0)}%)`,
    ...(indicatorColor && { backgroundColor: indicatorColor }),
    ...(showGlow && {
      boxShadow: `0 0 12px ${indicatorColor || 'var(--primary)'}`,
    }),
  }

  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      className={cn(
        'bg-primary/20 relative h-2 w-full overflow-hidden rounded-full',
        className,
      )}
      style={backgroundColor ? { backgroundColor } : undefined}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className={cn('h-full w-full flex-1 transition-all duration-500 ease-out', indicatorClassName)}
        style={indicatorStyle}
      />
    </ProgressPrimitive.Root>
  )
}

export { Progress }
