'use client'

import * as React from 'react'
import { useFormContext, Controller } from 'react-hook-form'
import { DatePicker } from '@/components/ui/date-picker'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

export interface FormDatePickerProps {
  name: string
  label?: string
  description?: string
  required?: boolean
  placeholder?: string
  disabled?: boolean
  disabledDates?: (date: Date) => boolean
  fromDate?: Date
  toDate?: Date
  className?: string
}

export const FormDatePicker = React.forwardRef<HTMLButtonElement, FormDatePickerProps>(
  (
    {
      name,
      label,
      description,
      required,
      placeholder,
      disabled,
      disabledDates,
      fromDate,
      toDate,
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
            <DatePicker
              value={field.value}
              onChange={field.onChange}
              placeholder={placeholder}
              disabled={disabled}
              disabledDates={disabledDates}
              fromDate={fromDate}
              toDate={toDate}
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

FormDatePicker.displayName = 'FormDatePicker'
