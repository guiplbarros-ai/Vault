'use client'

import * as React from 'react'
import { useFormContext, Controller } from 'react-hook-form'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

export interface FormRadioOption {
  value: string
  label: string
  description?: string
  disabled?: boolean
}

export interface FormRadioGroupProps {
  name: string
  label?: string
  description?: string
  options: FormRadioOption[]
  required?: boolean
  disabled?: boolean
  orientation?: 'horizontal' | 'vertical'
  className?: string
}

export const FormRadioGroup = React.forwardRef<HTMLDivElement, FormRadioGroupProps>(
  ({ name, label, description, options, required, disabled, orientation = 'vertical', className }, ref) => {
    const { control, formState: { errors } } = useFormContext()
    const error = errors[name]

    return (
      <div className="space-y-3">
        {label && (
          <Label className={cn(required && 'after:content-["*"] after:ml-0.5 after:text-destructive')}>
            {label}
          </Label>
        )}
        <Controller
          name={name}
          control={control}
          render={({ field }) => (
            <RadioGroup
              ref={ref}
              value={field.value}
              onValueChange={field.onChange}
              disabled={disabled}
              className={cn(
                orientation === 'horizontal' && 'flex flex-wrap gap-4',
                className
              )}
              aria-invalid={error ? 'true' : 'false'}
              aria-describedby={error ? `${name}-error` : description ? `${name}-description` : undefined}
            >
              {options.map((option) => (
                <div key={option.value} className="flex items-start space-x-3">
                  <RadioGroupItem
                    value={option.value}
                    id={`${name}-${option.value}`}
                    disabled={option.disabled}
                    className={cn(error && 'border-destructive')}
                  />
                  <div className="space-y-1 leading-none">
                    <Label
                      htmlFor={`${name}-${option.value}`}
                      className="text-sm font-medium cursor-pointer"
                    >
                      {option.label}
                    </Label>
                    {option.description && (
                      <p className="text-sm text-muted-foreground">
                        {option.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </RadioGroup>
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

FormRadioGroup.displayName = 'FormRadioGroup'
