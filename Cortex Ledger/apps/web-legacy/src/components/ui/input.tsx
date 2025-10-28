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
          <label className="mb-2 block text-sm text-slate-700 dark:text-graphite-200">
            {label}
            {props.required && <span className="ml-1 text-error-600">*</span>}
          </label>
        )}
        <input
          ref={ref}
          className={cn(
            'flex h-10 w-full rounded-lg border px-3 py-2 text-sm transition-colors',
            'bg-white dark:bg-graphite-700',
            'border-slate-300 dark:border-graphite-600',
            'text-slate-900 dark:text-graphite-100',
            'placeholder:text-slate-500 dark:placeholder:text-graphite-300',
            'focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-600',
            'disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-error-600 focus:ring-error-600/40',
            className
          )}
          {...props}
        />
        {error && <p className="mt-1 text-sm text-error-600">{error}</p>}
        {helperText && !error && (
          <p className="mt-1 text-sm text-slate-600 dark:text-graphite-300">{helperText}</p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'
