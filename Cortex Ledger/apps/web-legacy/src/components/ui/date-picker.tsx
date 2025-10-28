'use client'

import { forwardRef, useState } from 'react'
import { Calendar } from 'lucide-react'
import { format, parse, isValid } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Input } from './input'
import { Button } from './button'
import { cn } from '@/lib/utils'

/**
 * DatePicker Component
 *
 * Seletor de data com formato brasileiro (DD/MM/YYYY).
 * Permite digitação direta ou seleção via calendário.
 *
 * @example
 * ```tsx
 * <DatePicker
 *   value={data}
 *   onChange={setData}
 *   placeholder="Selecione a data"
 * />
 * ```
 */
export interface DatePickerProps {
  /** Data selecionada (Date ou string ISO) */
  value?: Date | string | null
  /** Callback quando data muda */
  onChange?: (date: Date | null) => void
  /** Placeholder */
  placeholder?: string
  /** Desabilitar campo */
  disabled?: boolean
  /** Classes CSS adicionais */
  className?: string
  /** Data mínima permitida */
  minDate?: Date
  /** Data máxima permitida */
  maxDate?: Date
  /** Formato de exibição (padrão: dd/MM/yyyy) */
  displayFormat?: string
}

/**
 * Converte valor para Date
 */
function toDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null
  if (value instanceof Date) return value
  const parsed = new Date(value)
  return isNaN(parsed.getTime()) ? null : parsed
}

/**
 * Formata data para exibição brasileira
 */
function formatDateBR(date: Date | null): string {
  if (!date || !isValid(date)) return ''
  return format(date, 'dd/MM/yyyy')
}

/**
 * Parse string DD/MM/YYYY para Date
 */
function parseDateBR(value: string): Date | null {
  if (!value) return null
  try {
    const parsed = parse(value, 'dd/MM/yyyy', new Date())
    return isValid(parsed) ? parsed : null
  } catch {
    return null
  }
}

export const DatePicker = forwardRef<HTMLInputElement, DatePickerProps>(
  (
    {
      value,
      onChange,
      placeholder = 'DD/MM/AAAA',
      disabled = false,
      className,
      minDate,
      maxDate,
      displayFormat = 'dd/MM/yyyy',
    },
    ref
  ) => {
    const dateValue = toDate(value)
    const [inputValue, setInputValue] = useState(
      dateValue ? formatDateBR(dateValue) : ''
    )
    const [showCalendar, setShowCalendar] = useState(false)

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value
      setInputValue(raw)

      // Auto-format com /
      let formatted = raw.replace(/\D/g, '')
      if (formatted.length >= 2) {
        formatted = formatted.slice(0, 2) + '/' + formatted.slice(2)
      }
      if (formatted.length >= 5) {
        formatted = formatted.slice(0, 5) + '/' + formatted.slice(5, 9)
      }

      if (formatted !== raw) {
        setInputValue(formatted)
      }

      // Parse e validar
      if (formatted.length === 10) {
        const parsed = parseDateBR(formatted)
        if (parsed && isValid(parsed)) {
          // Validar min/max
          if (minDate && parsed < minDate) return
          if (maxDate && parsed > maxDate) return

          onChange?.(parsed)
        }
      } else if (raw === '') {
        onChange?.(null)
      }
    }

    const handleBlur = () => {
      // Revalidar ao sair do campo
      if (inputValue) {
        const parsed = parseDateBR(inputValue)
        if (parsed && isValid(parsed)) {
          setInputValue(formatDateBR(parsed))
          onChange?.(parsed)
        } else {
          // Reset em caso de data inválida
          setInputValue(dateValue ? formatDateBR(dateValue) : '')
        }
      }
    }

    const handleTodayClick = () => {
      const today = new Date()
      setInputValue(formatDateBR(today))
      onChange?.(today)
      setShowCalendar(false)
    }

    const handleClearClick = () => {
      setInputValue('')
      onChange?.(null)
    }

    return (
      <div className={cn('relative', className)}>
        <div className="relative">
          <Input
            ref={ref}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleBlur}
            placeholder={placeholder}
            disabled={disabled}
            maxLength={10}
            className="pr-20"
          />
          <div className="absolute right-1 top-1/2 flex -translate-y-1/2 gap-1">
            {inputValue && !disabled && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClearClick}
                className="h-7 px-2"
              >
                ✕
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleTodayClick}
              disabled={disabled}
              className="h-7 px-2"
              title="Hoje"
            >
              <Calendar className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Nota: Implementação completa do calendário visual pode usar @radix-ui/react-popover */}
        {/* Por ora, implementamos input direto + botão "Hoje" */}
      </div>
    )
  }
)

DatePicker.displayName = 'DatePicker'

/**
 * DateRangePicker Component (Placeholder)
 *
 * Para seleção de intervalo de datas.
 * TODO: Implementar quando necessário para filtros avançados.
 */
export interface DateRangePickerProps {
  startDate?: Date | null
  endDate?: Date | null
  onStartDateChange?: (date: Date | null) => void
  onEndDateChange?: (date: Date | null) => void
  disabled?: boolean
  className?: string
}

export function DateRangePicker({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  disabled,
  className,
}: DateRangePickerProps) {
  return (
    <div className={cn('flex gap-2', className)}>
      <DatePicker
        value={startDate}
        onChange={onStartDateChange}
        placeholder="Data inicial"
        disabled={disabled}
        maxDate={endDate || undefined}
      />
      <span className="flex items-center text-neutral-500">até</span>
      <DatePicker
        value={endDate}
        onChange={onEndDateChange}
        placeholder="Data final"
        disabled={disabled}
        minDate={startDate || undefined}
      />
    </div>
  )
}
