'use client'

import * as React from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { CATEGORY_COLORS } from '@/lib/constants'

export interface ColorPickerProps {
  value?: string
  onChange?: (color: string) => void
  colors?: readonly string[]
  disabled?: boolean
  className?: string
}

export function ColorPicker({
  value,
  onChange,
  colors = CATEGORY_COLORS,
  disabled = false,
  className,
}: ColorPickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            'w-full justify-start text-left font-normal',
            !value && 'text-muted-foreground',
            className
          )}
        >
          <div className="flex items-center gap-2">
            {value && (
              <div
                className="h-4 w-4 rounded-full border"
                style={{ backgroundColor: value }}
              />
            )}
            <span>{value || 'Selecione uma cor'}</span>
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="start">
        <div className="grid grid-cols-6 gap-2">
          {colors.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => onChange?.(color)}
              className={cn(
                'h-8 w-8 rounded-md border-2 transition-all hover:scale-110',
                value === color ? 'border-foreground' : 'border-transparent'
              )}
              style={{ backgroundColor: color }}
            >
              {value === color && (
                <Check className="h-4 w-4 text-white drop-shadow-md mx-auto" />
              )}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}
