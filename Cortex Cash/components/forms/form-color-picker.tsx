'use client'

import * as React from 'react'
import { useFormContext, Controller } from 'react-hook-form'
import { ColorPicker } from '@/components/ui/color-picker'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

export interface FormColorPickerProps {
  name: string
  label?: string
  description?: string
  required?: boolean
  colors?: readonly string[]
  disabled?: boolean
  className?: string
}

export const FormColorPicker = React.forwardRef<HTMLButtonElement, FormColorPickerProps>(
  (
    {
      name,
      label,
      description,
      required,
      colors,
      disabled,
      className,
    },
    ref
  ) => {
    const { control, formState: { errors } } = useFormContext()
    const error = errors[name]

    return (
      <div className="space-y-2">
        {label && (
          <Label
            htmlFor={name}
            className={cn('text-white', required && 'after:content-["*"] after:ml-0.5 after:text-red-400')}
            style={{ color: '#ffffff !important' } as React.CSSProperties}
          >
            {label}
          </Label>
        )}
        <Controller
          name={name}
          control={control}
          render={({ field }) => (
            <ColorPicker
              value={field.value}
              onChange={field.onChange}
              colors={colors}
              disabled={disabled}
              className={cn(error && 'border-destructive', className)}
            />
          )}
        />
        {description && !error && (
          <p id={`${name}-description`} className="text-sm text-white/70" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
            {description}
          </p>
        )}
        {error && (
          <p id={`${name}-error`} className="text-sm font-medium text-red-400" style={{ color: '#f87171' }}>
            {error.message as string}
          </p>
        )}
      </div>
    )
  }
)

FormColorPicker.displayName = 'FormColorPicker'
