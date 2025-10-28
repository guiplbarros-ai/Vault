'use client'

import * as React from 'react'
import { useFormContext, Controller } from 'react-hook-form'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

export interface FormCheckboxProps {
  name: string
  label?: string
  description?: string
  disabled?: boolean
  className?: string
}

export const FormCheckbox = React.forwardRef<HTMLButtonElement, FormCheckboxProps>(
  ({ name, label, description, disabled, className }, ref) => {
    const { control, formState: { errors } } = useFormContext()
    const error = errors[name]

    return (
      <div className={cn('space-y-2', className)}>
        <div className="flex items-start space-x-3">
          <Controller
            name={name}
            control={control}
            render={({ field }) => (
              <Checkbox
                ref={ref}
                id={name}
                checked={field.value}
                onCheckedChange={field.onChange}
                disabled={disabled}
                className={cn(error && 'border-destructive')}
                aria-invalid={error ? 'true' : 'false'}
                aria-describedby={error ? `${name}-error` : description ? `${name}-description` : undefined}
              />
            )}
          />
          {label && (
            <div className="space-y-1 leading-none">
              <Label
                htmlFor={name}
                className="text-sm font-medium cursor-pointer"
              >
                {label}
              </Label>
              {description && !error && (
                <p id={`${name}-description`} className="text-sm text-muted-foreground">
                  {description}
                </p>
              )}
            </div>
          )}
        </div>
        {error && (
          <p id={`${name}-error`} className="text-sm font-medium text-destructive">
            {error.message as string}
          </p>
        )}
      </div>
    )
  }
)

FormCheckbox.displayName = 'FormCheckbox'
