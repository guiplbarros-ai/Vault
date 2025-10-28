'use client'

import * as React from 'react'
import { useFormContext } from 'react-hook-form'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

export interface FormTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  name: string
  label?: string
  description?: string
  required?: boolean
  maxLength?: number
  showCount?: boolean
}

export const FormTextarea = React.forwardRef<HTMLTextAreaElement, FormTextareaProps>(
  ({ name, label, description, required, maxLength, showCount, className, ...props }, ref) => {
    const { register, watch, formState: { errors } } = useFormContext()
    const error = errors[name]
    const value = watch(name)
    const currentLength = value?.length || 0

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          {label && (
            <Label htmlFor={name} className={cn(required && 'after:content-["*"] after:ml-0.5 after:text-destructive')}>
              {label}
            </Label>
          )}
          {showCount && maxLength && (
            <span className={cn(
              'text-xs',
              currentLength > maxLength ? 'text-destructive' : 'text-muted-foreground'
            )}>
              {currentLength}/{maxLength}
            </span>
          )}
        </div>
        <Textarea
          id={name}
          {...register(name)}
          {...props}
          ref={ref}
          maxLength={maxLength}
          className={cn(error && 'border-destructive', className)}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? `${name}-error` : description ? `${name}-description` : undefined}
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

FormTextarea.displayName = 'FormTextarea'
