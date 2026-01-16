'use client'

import * as SwitchPrimitive from '@radix-ui/react-switch'
import type * as React from 'react'

import { cn } from '@/lib/utils'

function Switch({ className, ...props }: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  const isChecked = props.checked ?? false

  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        'peer inline-flex h-7 w-16 shrink-0 cursor-pointer items-center rounded-full border border-transparent shadow-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        isChecked ? 'bg-primary' : 'bg-slate-400',
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          'pointer-events-none flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-md ring-0 transition-transform text-xs font-bold relative',
          isChecked ? 'translate-x-[2.25rem]' : 'translate-x-0'
        )}
      >
        <span
          className={cn(
            'text-xs font-bold transition-colors',
            isChecked ? 'text-green-400' : 'text-slate-500'
          )}
        >
          {isChecked ? 'on' : 'off'}
        </span>
      </SwitchPrimitive.Thumb>
    </SwitchPrimitive.Root>
  )
}

export { Switch }
