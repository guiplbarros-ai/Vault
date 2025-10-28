'use client'

import * as React from 'react'
import { useFormContext, Controller } from 'react-hook-form'
import { DateRangePicker } from '@/components/ui/date-range-picker'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

export interface FormDateRangePickerProps {
  name: string
  label?: string
  description?: string
  required?: boolean
  placeholder?: string
  disabled?: boolean
  showPresets?: boolean
  className?: string
}

export const FormDateRangePicker = React.forwardRef<HTMLButtonElement, FormDateRangePickerProps>(
  (
    {
      name,
      label,
      description,
      required,
      placeholder,
      disabled,
      showPresets = true,
      className,
    },
    ref
  ) => {
    const { control, formState: { errors } } = useFormContext()
    const error = errors[name]

    return (
      <div className="space-y-2">
        {label && (
          <Label htmlFor={name} className={cn(required && 'after:content-["*"] after:ml-0.5 after:text-destructive')}>
            {label}
          </Label>
        )}
        <Controller
          name={name}
          control={control}
          render={({ field }) => (
            <DateRangePicker
              value={field.value}
              onChange={field.onChange}
              placeholder={placeholder}
              disabled={disabled}
              showPresets={showPresets}
              className={cn(error && 'border-destructive', className)}
            />
          )}
        />
        {description && !error && (
          <p id={`${name}-description`} className="text-sm text-muted-foreground">
            {description}
          </p>
        )}
        {error && (
          <p id={`${name}-error`} className="text-sm font-medium text-destructive">
            {error.message as string}
          </p>
        )}
      </div>
    )
  }
)

FormDateRangePicker.displayName = 'FormDateRangePicker'
