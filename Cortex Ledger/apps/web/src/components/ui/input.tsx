import { InputHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="mb-1.5 block text-sm font-medium text-text">
            {label}
            {props.required && <span className="ml-1 text-danger">*</span>}
          </label>
        )}
        <input
          ref={ref}
          className={cn(
            'flex h-10 w-full rounded-xl border border-line/25 bg-surface px-3 py-2 text-sm text-text',
            'placeholder:text-muted',
            'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/20',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'transition-all duration-200',
            error && 'border-danger focus-visible:ring-danger/20',
            className
          )}
          {...props}
        />
        {error && <p className="mt-1 text-xs text-danger">{error}</p>}
        {helperText && !error && (
          <p className="mt-1 text-xs text-muted">{helperText}</p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'
