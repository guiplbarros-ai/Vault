import { forwardRef, useState, useEffect } from 'react'
import { Input, InputProps } from './input'
import { cn } from '@/lib/utils'

/**
 * MoneyInput Component
 *
 * Input especializado para valores monetários em BRL.
 * Formata automaticamente o valor conforme o usuário digita.
 *
 * @example
 * ```tsx
 * <MoneyInput
 *   value={valor}
 *   onChange={(e) => setValor(parseFloat(e.target.value))}
 *   currency="BRL"
 * />
 * ```
 */
export interface MoneyInputProps extends Omit<InputProps, 'value' | 'onChange' | 'type'> {
  /** Valor numérico (ex: 1234.56) */
  value?: number | string
  /** Callback com valor numérico parseado */
  onChange?: (value: number) => void
  /** Moeda (padrão: BRL) */
  currency?: 'BRL' | 'USD' | 'EUR'
  /** Permite valores negativos */
  allowNegative?: boolean
}

/**
 * Formata número para formato brasileiro de dinheiro
 */
function formatMoney(value: number, currency: string = 'BRL'): string {
  const currencySymbols: Record<string, string> = {
    BRL: 'R$',
    USD: '$',
    EUR: '€',
  }

  const symbol = currencySymbols[currency] || 'R$'
  const absValue = Math.abs(value)
  const formatted = new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(absValue)

  return value < 0 ? `-${symbol} ${formatted}` : `${symbol} ${formatted}`
}

/**
 * Converte string formatada para número
 */
function parseMoneyString(value: string): number {
  // Remove tudo exceto números, vírgula e sinal negativo
  const cleaned = value.replace(/[^\d,\-]/g, '')
  // Substitui vírgula por ponto
  const normalized = cleaned.replace(',', '.')
  const parsed = parseFloat(normalized)
  return isNaN(parsed) ? 0 : parsed
}

export const MoneyInput = forwardRef<HTMLInputElement, MoneyInputProps>(
  (
    {
      value = 0,
      onChange,
      currency = 'BRL',
      allowNegative = false,
      className,
      disabled,
      ...props
    },
    ref
  ) => {
    const numericValue = typeof value === 'string' ? parseMoneyString(value) : value
    const [displayValue, setDisplayValue] = useState(formatMoney(numericValue, currency))
    const [isFocused, setIsFocused] = useState(false)

    // Atualiza display quando valor externo muda
    useEffect(() => {
      if (!isFocused) {
        setDisplayValue(formatMoney(numericValue, currency))
      }
    }, [numericValue, currency, isFocused])

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true)
      // Mostra apenas o número sem formatação ao focar
      const numOnly = numericValue.toFixed(2).replace('.', ',')
      setDisplayValue(numOnly)
      // Seleciona todo o texto
      e.target.select()
    }

    const handleBlur = () => {
      setIsFocused(false)
      // Reaplica formatação ao desfocar
      setDisplayValue(formatMoney(numericValue, currency))
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawValue = e.target.value
      setDisplayValue(rawValue)

      // Parse e callback
      let parsed = parseMoneyString(rawValue)

      // Validar negativos
      if (!allowNegative && parsed < 0) {
        parsed = Math.abs(parsed)
      }

      onChange?.(parsed)
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
          disabled={disabled}
          className={cn(
            'font-mono tabular-nums',
            numericValue < 0 && 'text-red-600 dark:text-red-400',
            className
          )}
          {...props}
        />
      </div>
    )
  }
)

MoneyInput.displayName = 'MoneyInput'
