'use client'

import * as React from 'react'
import { useFormContext } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

export interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  name: string
  label?: string
  description?: string
  required?: boolean
}

export const FormInput = React.forwardRef<HTMLInputElement, FormInputProps>(
  ({ name, label, description, required, className, ...props }, ref) => {
    const { register, formState: { errors } } = useFormContext()
    const error = errors[name]

    // Register the field and merge with forwarded ref
    const { ref: registerRef, ...registerRest } = register(name)

    return (
      <div className="space-y-2">
        {label && (
          <Label htmlFor={name} className={cn('text-white', required && 'after:content-["*"] after:ml-0.5 after:text-red-400')}>
            {label}
          </Label>
        )}
        <Input
          id={name}
          {...registerRest}
          {...props}
          ref={(e) => {
            registerRef(e)
            if (ref) {
              if (typeof ref === 'function') {
                ref(e)
              } else {
                ref.current = e
              }
            }
          }}
          className={cn(error && 'border-destructive', className)}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? `${name}-error` : description ? `${name}-description` : undefined}
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

FormInput.displayName = 'FormInput'
