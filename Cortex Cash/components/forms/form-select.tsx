'use client'

import * as React from 'react'
import { useFormContext, Controller } from 'react-hook-form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

export interface FormSelectOption {
  value: string
  label: string
  disabled?: boolean
}

export interface FormSelectProps {
  name: string
  label?: string
  description?: string
  placeholder?: string
  options: FormSelectOption[]
  required?: boolean
  disabled?: boolean
  className?: string
}

export const FormSelect = React.forwardRef<HTMLButtonElement, FormSelectProps>(
  ({ name, label, description, placeholder, options, required, disabled, className }, ref) => {
    const { control, formState: { errors } } = useFormContext()
    const error = errors[name]

    return (
      <div className="space-y-2">
        {label && (
          <Label
            htmlFor={name}
            className={cn(required && 'after:content-["*"] after:ml-0.5 after:text-red-400')}
          >
            {label}
          </Label>
        )}
        <Controller
          name={name}
          control={control}
          render={({ field }) => (
            <Select
              value={field.value}
              onValueChange={field.onChange}
              disabled={disabled}
            >
              <SelectTrigger
                ref={ref}
                id={name}
                className={cn(error && 'border-destructive', className)}
                aria-invalid={error ? 'true' : 'false'}
                aria-describedby={error ? `${name}-error` : description ? `${name}-description` : undefined}
              >
                <SelectValue
                  placeholder={placeholder}
                  className=""
                />
              </SelectTrigger>
              <SelectContent
                className=""
                position="popper"
                sideOffset={5}
              >
                {options.map((option) => (
                  <SelectItem
                    key={option.value}
                    value={option.value}
                    disabled={option.disabled}
                    className="cursor-pointer"
                  >
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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

FormSelect.displayName = 'FormSelect'
