'use client'

import * as React from 'react'
import { useFormContext, Controller } from 'react-hook-form'
import { CurrencyInput } from '@/components/ui/currency-input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

export interface FormCurrencyInputProps {
  name: string
  label?: string
  description?: string
  required?: boolean
  currency?: string
  locale?: string
  allowNegative?: boolean
  maxValue?: number
  minValue?: number
  decimalScale?: number
  disabled?: boolean
  className?: string
}

export const FormCurrencyInput = React.forwardRef<HTMLInputElement, FormCurrencyInputProps>(
  (
    {
      name,
      label,
      description,
      required,
      currency,
      locale,
      allowNegative,
      maxValue,
      minValue,
      decimalScale,
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
          <Label htmlFor={name} className={cn('text-white', required && 'after:content-["*"] after:ml-0.5 after:text-red-400')}>
            {label}
          </Label>
        )}
        <Controller
          name={name}
          control={control}
          render={({ field }) => (
            <CurrencyInput
              ref={ref}
              id={name}
              value={field.value}
              onChange={field.onChange}
              currency={currency}
              locale={locale}
              allowNegative={allowNegative}
              maxValue={maxValue}
              minValue={minValue}
              decimalScale={decimalScale}
              disabled={disabled}
              className={cn('!bg-[#1e293b] !text-white !border-white/20', error && 'border-destructive', className)}
              style={{
                backgroundColor: '#1e293b',
                color: '#ffffff',
                borderColor: 'rgba(255, 255, 255, 0.2)'
              }}
              aria-invalid={error ? 'true' : 'false'}
              aria-describedby={error ? `${name}-error` : description ? `${name}-description` : undefined}
            />
          )}
        />
        {description && !error && (
          <p id={`${name}-description`} className="text-sm text-white/70">
            {description}
          </p>
        )}
        {error && (
          <p id={`${name}-error`} className="text-sm font-medium text-red-400">
            {error.message as string}
          </p>
        )}
      </div>
    )
  }
)

FormCurrencyInput.displayName = 'FormCurrencyInput'
