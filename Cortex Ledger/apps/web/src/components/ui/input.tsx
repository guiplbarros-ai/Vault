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
          <label className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
            {label}
            {props.required && <span className="ml-1 text-error-500">*</span>}
          </label>
        )}
        <input
          ref={ref}
          className={cn(
            'w-full rounded-lg border px-3 py-2 text-sm transition-colors duration-200',
            'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
            'placeholder:text-neutral-400 dark:placeholder:text-neutral-600',
            error ? 'border-error-500' : 'border-neutral-300 dark:border-neutral-700',
            'bg-white dark:bg-neutral-900',
            'disabled:cursor-not-allowed disabled:opacity-50',
            className
          )}
          {...props}
        />
        {error && <p className="mt-1 text-xs text-error-500">{error}</p>}
        {helperText && !error && (
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{helperText}</p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'
