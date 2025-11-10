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
            <Select
              value={field.value}
              onValueChange={field.onChange}
              disabled={disabled}
            >
              <SelectTrigger
                ref={ref}
                id={name}
                className={cn('!bg-[#1e293b] !text-white !border-white/20', error && 'border-destructive', className)}
                style={{
                  backgroundColor: '#1e293b !important',
                  color: '#ffffff !important',
                  borderColor: 'rgba(255, 255, 255, 0.2) !important'
                } as React.CSSProperties}
                aria-invalid={error ? 'true' : 'false'}
                aria-describedby={error ? `${name}-error` : description ? `${name}-description` : undefined}
              >
                <SelectValue
                  placeholder={placeholder}
                  className="!text-white/70"
                  style={{ color: 'rgba(255, 255, 255, 0.7) !important' } as React.CSSProperties}
                />
              </SelectTrigger>
              <SelectContent
                className="!bg-gray-800 !border-gray-700"
                style={{
                  backgroundColor: '#1f2937 !important',
                  borderColor: '#374151 !important'
                } as React.CSSProperties}
              >
                {options.map((option) => (
                  <SelectItem
                    key={option.value}
                    value={option.value}
                    disabled={option.disabled}
                    className="!text-white hover:!bg-gray-700 cursor-pointer"
                    style={{ color: '#ffffff !important' } as React.CSSProperties}
                  >
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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

FormSelect.displayName = 'FormSelect'
