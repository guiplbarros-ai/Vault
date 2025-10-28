'use client'

import * as React from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { getCurrency, DEFAULT_CURRENCY } from '@/lib/constants'

export interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value?: number
  onChange?: (value: number) => void
  currency?: string
  locale?: string
  allowNegative?: boolean
  maxValue?: number
  minValue?: number
  decimalScale?: number
}

export const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  (
    {
      value = 0,
      onChange,
      currency: currencyCode = DEFAULT_CURRENCY,
      locale: customLocale,
      allowNegative = false,
      maxValue,
      minValue = 0,
      decimalScale = 2,
      className,
      disabled,
      ...props
    },
    ref
  ) => {
    const currency = getCurrency(currencyCode)
    const locale = customLocale || currency.locale

    const [displayValue, setDisplayValue] = React.useState('')
    const [isFocused, setIsFocused] = React.useState(false)

    // Format number to currency string
    const formatCurrency = React.useCallback(
      (num: number): string => {
        try {
          return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: currency.code,
            minimumFractionDigits: decimalScale,
            maximumFractionDigits: decimalScale,
          }).format(num)
        } catch {
          return `${currency.symbol} ${num.toFixed(decimalScale)}`
        }
      },
      [locale, currency, decimalScale]
    )

    // Parse currency string to number
    const parseCurrency = React.useCallback(
      (str: string): number => {
        // Remove all non-numeric characters except decimal separator and minus
        const cleaned = str.replace(/[^\d,.-]/g, '')

        // Replace comma with dot for parsing (handle different locales)
        const normalized = cleaned.replace(',', '.')

        const parsed = parseFloat(normalized)
        return isNaN(parsed) ? 0 : parsed
      },
      []
    )

    // Update display value when value prop changes (only when not focused)
    React.useEffect(() => {
      if (!isFocused) {
        setDisplayValue(formatCurrency(value))
      }
    }, [value, formatCurrency, isFocused])

    // Initialize display value on mount
    React.useEffect(() => {
      setDisplayValue(formatCurrency(value))
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true)
      // Show raw number when focused for easier editing
      setDisplayValue(value.toFixed(decimalScale))
      // Select all text for easy replacement
      e.target.select()
    }

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false)
      const numericValue = parseCurrency(displayValue)

      // Apply constraints
      let constrainedValue = numericValue

      if (!allowNegative && constrainedValue < 0) {
        constrainedValue = 0
      }

      if (minValue !== undefined && constrainedValue < minValue) {
        constrainedValue = minValue
      }

      if (maxValue !== undefined && constrainedValue > maxValue) {
        constrainedValue = maxValue
      }

      // Update both display and call onChange
      setDisplayValue(formatCurrency(constrainedValue))

      if (constrainedValue !== value) {
        onChange?.(constrainedValue)
      }

      props.onBlur?.(e)
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value
      setDisplayValue(inputValue)
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Allow: backspace, delete, tab, escape, enter
      if ([8, 9, 27, 13, 46].includes(e.keyCode)) {
        return
      }

      // Allow: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
      if ((e.ctrlKey || e.metaKey) && [65, 67, 86, 88].includes(e.keyCode)) {
        return
      }

      // Allow: home, end, left, right, up, down
      if (e.keyCode >= 35 && e.keyCode <= 40) {
        return
      }

      // Allow decimal separator
      if ([188, 190, 110].includes(e.keyCode)) { // comma, period, numpad decimal
        // Only allow one decimal separator
        if (displayValue.includes('.') || displayValue.includes(',')) {
          e.preventDefault()
        }
        return
      }

      // Allow minus sign only at the beginning if negative is allowed
      if (e.keyCode === 189 || e.keyCode === 109) { // minus, numpad minus
        if (!allowNegative || displayValue.includes('-')) {
          e.preventDefault()
        }
        return
      }

      // Ensure that it is a number and stop the keypress if not
      if ((e.shiftKey || e.keyCode < 48 || e.keyCode > 57) && (e.keyCode < 96 || e.keyCode > 105)) {
        e.preventDefault()
      }

      props.onKeyDown?.(e)
    }

    return (
      <div className="relative">
        <Input
          ref={ref}
          type="text"
          inputMode="decimal"
          value={displayValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          className={cn('text-right font-mono', className)}
          {...props}
        />
      </div>
    )
  }
)

CurrencyInput.displayName = 'CurrencyInput'
