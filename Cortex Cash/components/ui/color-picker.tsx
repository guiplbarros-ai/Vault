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
import { CATEGORY_COLORS, getColorName } from '@/lib/constants'

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
  const [open, setOpen] = React.useState(false)

  const handleColorSelect = (color: string) => {
    onChange?.(color)
    setOpen(false) // Fecha o popover após selecionar
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            'w-full justify-start text-left font-normal text-white',
            className
          )}
          style={{
            color: '#ffffff',
            backgroundColor: '#1e293b',
            borderColor: 'rgba(255, 255, 255, 0.2)'
          }}
        >
          <div className="flex items-center gap-2">
            {value && (
              <div
                className="h-4 w-4 rounded-full border"
                style={{
                  backgroundColor: value,
                  borderColor: 'rgba(255, 255, 255, 0.3)'
                }}
              />
            )}
            <span style={{ color: '#ffffff' }}>{value ? getColorName(value) : 'Selecione uma cor'}</span>
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-64 p-3"
        align="start"
        style={{
          backgroundColor: '#1e293b',
          borderColor: 'rgba(255, 255, 255, 0.2)'
        }}
      >
        <div className="grid grid-cols-6 gap-2">
          {colors.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => handleColorSelect(color)}
              title={getColorName(color)}
              className={cn(
                'h-8 w-8 rounded-md border-2 transition-all hover:scale-110',
                value === color ? 'border-white' : 'border-transparent'
              )}
              style={{
                backgroundColor: color,
                borderColor: value === color ? '#ffffff' : 'transparent'
              }}
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
